import { MobileAppsService } from './mobile-apps.service';
import { PrismaService } from '../../../database/prisma.service';
import { ConnectMobileTelemetryDto } from '../dto/mobile-telemetry.dto';
import { MobileProviderSecurityService } from '../security/mobile-provider-security.service';
import { MobileTelemetryProviderRegistry } from '../telemetry/mobile-telemetry-provider.registry';
import { MobileTelemetrySecretService } from '../telemetry/mobile-telemetry-secret.service';
import type { MobileTelemetrySnapshot } from '@command-center/shared-types';
import { BadGatewayException, BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { MobileTelemetryStatus } from 'src/generated/prisma/enums';

@Injectable()
export class MobileTelemetryService {
  constructor(
    private readonly prisma: PrismaService,

    private readonly mobileApps: MobileAppsService,

    private readonly registry: MobileTelemetryProviderRegistry,

    private readonly secrets: MobileTelemetrySecretService,

    private readonly providerSecurity: MobileProviderSecurityService,
  ) {}

  async getIntegration(workspaceId: string, mobileAppId: string) {
    await this.mobileApps.findOne(workspaceId, mobileAppId);

    return this.prisma.mobileTelemetryIntegration.findFirst({
      where: {
        workspaceId,
        mobileAppId,
      },

      select: this.publicSelect(),
    });
  }

  async connect(workspaceId: string, mobileAppId: string, dto: ConnectMobileTelemetryDto) {
    const mobileApp = await this.mobileApps.findOne(workspaceId, mobileAppId);

    if (mobileApp.application.archivedAt) {
      throw new BadRequestException('Archived mobile applications cannot connect telemetry providers.');
    }

    const projectId = dto.externalProjectId.trim();

    if (!projectId) {
      throw new BadRequestException('External project ID is required.');
    }

    const normalizedConfig = this.normalizeConfig(dto.config);

    const adapter = this.registry.get(dto.provider);

    adapter.validateConfig(normalizedConfig);

    const encryptedConfig = this.secrets.encrypt(normalizedConfig);

    return this.prisma.mobileTelemetryIntegration.upsert({
      where: {
        mobileAppId,
      },

      create: {
        workspaceId,
        mobileAppId,

        provider: dto.provider,

        status: MobileTelemetryStatus.CONNECTED,

        externalProjectId: projectId,

        encryptedConfig,

        configuredAt: new Date(),

        lastSyncedAt: null,
      },

      update: {
        workspaceId,

        provider: dto.provider,

        status: MobileTelemetryStatus.CONNECTED,

        externalProjectId: projectId,

        encryptedConfig,

        configuredAt: new Date(),

        lastSyncedAt: null,
      },

      select: this.publicSelect(),
    });
  }

  async disconnect(workspaceId: string, mobileAppId: string) {
    const integration = await this.requireIntegration(workspaceId, mobileAppId);

    return this.prisma.mobileTelemetryIntegration.update({
      where: {
        id: integration.id,
      },

      data: {
        status: MobileTelemetryStatus.DISCONNECTED,

        /*
         * Remove credentials when disconnected.
         */
        encryptedConfig: null,

        lastSyncedAt: null,
      },

      select: this.publicSelect(),
    });
  }

  async sync(workspaceId: string, mobileAppId: string): Promise<MobileTelemetrySnapshot> {
    const integration = await this.requireIntegration(workspaceId, mobileAppId);

    if (integration.status === MobileTelemetryStatus.DISCONNECTED) {
      throw new BadRequestException('Telemetry integration is disconnected.');
    }

    if (!integration.encryptedConfig) {
      throw new BadRequestException('Telemetry credentials are not configured.');
    }

    const config = this.secrets.decrypt(integration.encryptedConfig);

    const adapter = this.registry.get(integration.provider);

    try {
      const [crashes, performance, versions] = await this.withRetry(
        async () =>
          Promise.all([
            adapter.getCrashes({
              externalProjectId: integration.externalProjectId,
              config,
            }),

            adapter.getPerformance({
              externalProjectId: integration.externalProjectId,
              config,
            }),

            adapter.getVersions({
              externalProjectId: integration.externalProjectId,
              config,
            }),
          ]),
        3,
      );

      const now = new Date();

      await this.prisma.mobileTelemetryIntegration.update({
        where: {
          id: integration.id,
        },

        data: {
          status: MobileTelemetryStatus.CONNECTED,

          lastSyncedAt: now,
        },
      });

      return {
        provider: integration.provider,

        collectedAt: now.toISOString(),

        crashes,
        performance,
        versions,
      };
    } catch {
      await this.prisma.mobileTelemetryIntegration.update({
        where: {
          id: integration.id,
        },

        data: {
          status: MobileTelemetryStatus.ERROR,
        },
      });

      throw new BadGatewayException('Telemetry provider synchronization failed.');
    }
  }

  private async requireIntegration(workspaceId: string, mobileAppId: string) {
    await this.mobileApps.findOne(workspaceId, mobileAppId);

    const integration = await this.prisma.mobileTelemetryIntegration.findFirst({
      where: {
        workspaceId,
        mobileAppId,
      },
    });

    if (!integration) {
      throw new NotFoundException('Telemetry integration not found.');
    }

    return integration;
  }

  private normalizeConfig(config: Record<string, string>) {
    const result: Record<string, string> = {};

    for (const [key, value] of Object.entries(config)) {
      const normalizedKey = key.trim();

      const normalizedValue = typeof value === 'string' ? value.trim() : '';

      if (normalizedKey && normalizedValue) {
        result[normalizedKey] = normalizedValue;
      }
    }

    if (Object.keys(result).length === 0) {
      throw new BadRequestException('Telemetry configuration is required.');
    }

    return result;
  }

  private async withRetry<T>(
    operation: () => Promise<T>,

    attempts: number,
  ): Promise<T> {
    let lastError: unknown;

    for (let attempt = 1; attempt <= attempts; attempt += 1) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;

        if (attempt < attempts) {
          await new Promise((resolve) => setTimeout(resolve, 10));
        }
      }
    }

    throw lastError;
  }

  private publicSelect() {
    return {
      id: true,
      workspaceId: true,
      mobileAppId: true,

      provider: true,
      status: true,

      externalProjectId: true,

      configuredAt: true,
      lastSyncedAt: true,

      createdAt: true,
      updatedAt: true,
    } as const;
  }
}
