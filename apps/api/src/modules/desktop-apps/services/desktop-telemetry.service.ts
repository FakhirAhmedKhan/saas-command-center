import { DesktopAppsService } from './desktop-apps.service';
import { DesktopTelemetryProviderRegistryService } from './desktop-telemetry-provider-registry.service';
import { DesktopTelemetrySecretService } from './desktop-telemetry-secret.service';
import { DesktopTelemetryUrlPolicyService } from './desktop-telemetry-url-policy.service';
import { PrismaService } from '../../../database/prisma.service';
import type { ConnectDesktopTelemetryDto } from '../dto/desktop-telemetry.dto';
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { DesktopTelemetryIntegrationStatus } from 'src/generated/prisma/enums';

@Injectable()
export class DesktopTelemetryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly desktopApps: DesktopAppsService,
    private readonly secrets: DesktopTelemetrySecretService,
    private readonly urls: DesktopTelemetryUrlPolicyService,
    private readonly providers: DesktopTelemetryProviderRegistryService,
  ) {}

  async list(workspaceId: string, desktopAppId: string) {
    await this.desktopApps.findOne(workspaceId, desktopAppId);

    const integrations = await this.prisma.desktopTelemetryIntegration.findMany({
      where: {
        workspaceId,
        desktopAppId,
      },
      orderBy: {
        configuredAt: 'desc',
      },
    });

    return integrations.map((integration) => this.publicIntegration(integration));
  }

  async connect(workspaceId: string, desktopAppId: string, dto: ConnectDesktopTelemetryDto) {
    const app = await this.desktopApps.findOne(workspaceId, desktopAppId);

    if (app.application.archivedAt) {
      throw new BadRequestException('Archived desktop applications cannot configure telemetry.');
    }

    const safeUrl = await this.urls.assertSafe(dto.endpointUrl.trim());
    const encrypted = this.secrets.encrypt(dto.secret);

    const integration = await this.prisma.desktopTelemetryIntegration.upsert({
      where: {
        desktopAppId_provider: {
          desktopAppId,
          provider: dto.provider,
        },
      },
      create: {
        workspaceId,
        desktopAppId,
        provider: dto.provider,
        status: DesktopTelemetryIntegrationStatus.CONNECTED,
        externalProjectId: dto.externalProjectId.trim(),
        endpointUrl: safeUrl.toString(),
        secretCiphertext: encrypted,
        configuredAt: new Date(),
        lastError: null,
      },
      update: {
        status: DesktopTelemetryIntegrationStatus.CONNECTED,
        externalProjectId: dto.externalProjectId.trim(),
        endpointUrl: safeUrl.toString(),
        secretCiphertext: encrypted,
        configuredAt: new Date(),
        lastError: null,
      },
    });

    return this.publicIntegration(integration);
  }

  async preview(workspaceId: string, desktopAppId: string, integrationId: string) {
    const integration = await this.requireIntegration(workspaceId, desktopAppId, integrationId);

    const adapter = this.providers.get();

    try {
      const snapshot = await adapter.getSnapshot({
        provider: integration.provider,
        workspaceId,
        desktopAppId,
        externalProjectId: integration.externalProjectId,
        endpointUrl: integration.endpointUrl,
        secret: this.secrets.decrypt(integration.secretCiphertext),
      });

      await this.prisma.desktopTelemetryIntegration.update({
        where: { id: integration.id },
        data: {
          status: DesktopTelemetryIntegrationStatus.CONNECTED,
          lastSyncedAt: new Date(),
          lastError: null,
        },
      });

      return snapshot;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message.slice(0, 2000) : 'Unknown telemetry provider failure';

      await this.prisma.desktopTelemetryIntegration.update({
        where: { id: integration.id },
        data: {
          status: DesktopTelemetryIntegrationStatus.ERROR,
          lastError: message,
        },
      });

      throw error;
    }
  }

  async disconnect(workspaceId: string, desktopAppId: string, integrationId: string) {
    const integration = await this.requireIntegration(workspaceId, desktopAppId, integrationId);

    await this.prisma.desktopTelemetryIntegration.update({
      where: { id: integration.id },
      data: {
        status: DesktopTelemetryIntegrationStatus.DISCONNECTED,
        secretCiphertext: '',
        lastError: null,
      },
    });

    return { success: true as const };
  }

  async requireIntegration(workspaceId: string, desktopAppId: string, integrationId: string) {
    await this.desktopApps.findOne(workspaceId, desktopAppId);

    const integration = await this.prisma.desktopTelemetryIntegration.findFirst({
      where: {
        id: integrationId,
        workspaceId,
        desktopAppId,
      },
    });

    if (!integration) {
      throw new NotFoundException('Desktop telemetry integration not found.');
    }

    return integration;
  }

  async snapshotForSync(workspaceId: string, desktopAppId: string, integrationId: string) {
    const integration = await this.requireIntegration(workspaceId, desktopAppId, integrationId);

    if (integration.status === DesktopTelemetryIntegrationStatus.DISCONNECTED) {
      throw new BadRequestException('Telemetry integration is disconnected.');
    }

    const snapshot = await this.providers.get().getSnapshot({
      provider: integration.provider,
      workspaceId,
      desktopAppId,
      externalProjectId: integration.externalProjectId,
      endpointUrl: integration.endpointUrl,
      secret: this.secrets.decrypt(integration.secretCiphertext),
    });

    return { integration, snapshot };
  }

  publicIntegration<
    T extends {
      id: string;
      workspaceId: string;
      desktopAppId: string;
      provider: unknown;
      status: unknown;
      externalProjectId: string;
      endpointUrl: string;
      secretCiphertext: string;
      configuredAt: Date;
      lastSyncedAt: Date | null;
      lastError: string | null;
      createdAt: Date;
      updatedAt: Date;
    },
  >(integration: T) {
    return {
      id: integration.id,
      workspaceId: integration.workspaceId,
      desktopAppId: integration.desktopAppId,
      provider: integration.provider,
      status: integration.status,
      externalProjectId: integration.externalProjectId,
      endpointUrl: integration.endpointUrl,
      configuredAt: integration.configuredAt,
      lastSyncedAt: integration.lastSyncedAt,
      lastError: integration.lastError,
      createdAt: integration.createdAt,
      updatedAt: integration.updatedAt,
      hasSecret: integration.secretCiphertext.length > 0,
    };
  }
}
