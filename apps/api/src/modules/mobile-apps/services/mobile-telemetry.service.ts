import { MobileAppsService } from './mobile-apps.service';
import { PrismaService } from '../../../database/prisma.service';
import { ConnectMobileTelemetryDto } from '../dto/mobile-telemetry.dto';
import { MobileProviderSecurityService } from '../security/mobile-provider-security.service';
import { MobileTelemetryProviderRegistry } from '../telemetry/mobile-telemetry-provider.registry';
import { MobileTelemetrySecretService } from '../telemetry/mobile-telemetry-secret.service';
import type { MobileTelemetrySnapshot } from '@command-center/shared-types';
import { BadGatewayException, BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { MobilePerformanceMetricType, MobilePlatform, MobileTelemetryStatus } from 'src/generated/prisma/enums';

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

    const projectId = this.providerSecurity.normalizeExternalProjectId(dto.externalProjectId);
    const normalizedConfig = this.providerSecurity.normalizeConfig(dto.config);
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
    const mobileApp = await this.mobileApps.findOne(workspaceId, mobileAppId);
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

      await this.persistPerformanceSnapshot({
        workspaceId,
        mobileAppId,

        platform: mobileApp.platform,

        currentVersion: mobileApp.currentVersion,
        currentBuildNumber: mobileApp.currentBuildNumber,

        crashes,
        performance,
        versions,

        collectedAt: now,
      });

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

  private async persistPerformanceSnapshot(input: {
    workspaceId: string;
    mobileAppId: string;

    platform: MobilePlatform;

    currentVersion?: string | null;
    currentBuildNumber?: string | null;

    crashes: unknown;
    performance: unknown;
    versions: unknown[];

    collectedAt: Date;
  }): Promise<void> {
    const crashes = this.asRecord(input.crashes);
    const performance = this.asRecord(input.performance);
    const firstVersion = this.asRecord(input.versions[0]);
    const version = this.text(input.currentVersion) ?? this.text(firstVersion.version) ?? 'unknown';
    const buildNumber = this.text(input.currentBuildNumber) ?? this.text(firstVersion.buildNumber);
    const crashFreeUsersRate = this.number(crashes.crashFreeUsersRate);
    const explicitCrashRate = this.number(crashes.crashRate);
    const crashRate = explicitCrashRate ?? (crashFreeUsersRate === null ? null : Math.max(0, Math.min(100, 100 - crashFreeUsersRate)));
    const rows: Array<{
      metric: MobilePerformanceMetricType;
      value: number;
    }> = [];
    const add = (metric: MobilePerformanceMetricType, value: number | null) => {
      if (value !== null) {
        rows.push({
          metric,
          value,
        });
      }
    };

    add(MobilePerformanceMetricType.CRASH_FREE_USERS_RATE, crashFreeUsersRate);

    add(MobilePerformanceMetricType.CRASH_RATE, crashRate);

    add(MobilePerformanceMetricType.CRASH_COUNT, this.number(crashes.crashCount));

    add(MobilePerformanceMetricType.ANR_COUNT, this.number(crashes.anrCount));

    add(MobilePerformanceMetricType.HANG_COUNT, this.number(crashes.hangCount));

    add(MobilePerformanceMetricType.COLD_STARTUP_MS, this.number(performance.coldStartupMs));

    add(MobilePerformanceMetricType.WARM_STARTUP_MS, this.number(performance.warmStartupMs));

    add(MobilePerformanceMetricType.MEMORY_MB, this.number(performance.memoryMb));

    add(MobilePerformanceMetricType.NETWORK_LATENCY_MS, this.number(performance.networkLatencyMs));

    add(MobilePerformanceMetricType.API_FAILURE_RATE, this.number(performance.apiFailureRate));

    add(MobilePerformanceMetricType.SLOW_SCREEN_COUNT, this.number(performance.slowScreenCount));

    add(MobilePerformanceMetricType.VERSION_ADOPTION_RATE, this.number(firstVersion.adoptionRate) ?? this.number(performance.versionAdoptionRate));

    if (rows.length === 0) {
      return;
    }

    await this.prisma.mobilePerformanceMetric.createMany({
      data: rows.map((row) => ({
        workspaceId: input.workspaceId,
        mobileAppId: input.mobileAppId,

        platform: input.platform,

        version,
        buildNumber,

        collectedAt: input.collectedAt,

        metric: row.metric,
        value: row.value,
      })),
    });
  }

  private asRecord(value: unknown): Record<string, unknown> {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return {};
    }

    return value as Record<string, unknown>;
  }

  private number(value: unknown): number | null {
    return typeof value === 'number' && Number.isFinite(value) ? value : null;
  }

  private text(value: unknown): string | null {
    if (typeof value !== 'string') {
      return null;
    }

    const normalized = value.trim();

    return normalized || null;
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
