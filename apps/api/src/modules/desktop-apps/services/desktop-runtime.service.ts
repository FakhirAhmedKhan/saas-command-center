import { PrismaService } from '../../../database/prisma.service';
import {
    DesktopTelemetryIntegrationStatus,
} from 'src/generated/prisma/enums';
import {
    BadRequestException,
    Injectable,
} from '@nestjs/common';
import type {
    DesktopTelemetryCrashSample,
    DesktopTelemetryPerformanceSample,
} from '@command-center/shared-types';
import type { IngestDesktopRuntimeDto } from '../dto/desktop-runtime.dto';
import { DesktopAppsService } from './desktop-apps.service';
import { DesktopTelemetryService } from './desktop-telemetry.service';

@Injectable()
export class DesktopRuntimeService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly desktopApps: DesktopAppsService,
        private readonly telemetry: DesktopTelemetryService,
    ) { }

    async syncProvider(
        workspaceId: string,
        desktopAppId: string,
        integrationId: string,
    ) {
        const { integration, snapshot } =
            await this.telemetry.snapshotForSync(
                workspaceId,
                desktopAppId,
                integrationId,
            );

        const result = await this.persist(
            workspaceId,
            desktopAppId,
            integration.id,
            snapshot.performance,
            snapshot.crashes,
        );

        const updated =
            await this.prisma.desktopTelemetryIntegration.update({
                where: { id: integration.id },
                data: {
                    status: DesktopTelemetryIntegrationStatus.CONNECTED,
                    lastSyncedAt: new Date(),
                    lastError: null,
                },
            });

        return {
            integration: this.telemetry.publicIntegration(updated),
            ...result,
            versionsSeen: snapshot.versions.length,
        };
    }

    async ingestNormalized(
        workspaceId: string,
        desktopAppId: string,
        dto: IngestDesktopRuntimeDto,
    ) {
        await this.desktopApps.findOne(workspaceId, desktopAppId);

        const integration = await this.telemetry.requireIntegration(
            workspaceId,
            desktopAppId,
            dto.integrationId,
        );

        if (
            integration.status ===
            DesktopTelemetryIntegrationStatus.DISCONNECTED
        ) {
            throw new BadRequestException(
                'Disconnected integrations cannot ingest runtime data.',
            );
        }

        const result = await this.persist(
            workspaceId,
            desktopAppId,
            integration.id,
            dto.performance,
            dto.crashes,
        );

        await this.prisma.desktopTelemetryIntegration.update({
            where: { id: integration.id },
            data: {
                status: DesktopTelemetryIntegrationStatus.CONNECTED,
                lastSyncedAt: new Date(),
                lastError: null,
            },
        });

        return result;
    }

    private async persist(
        workspaceId: string,
        desktopAppId: string,
        telemetryIntegrationId: string,
        performance: DesktopTelemetryPerformanceSample[],
        crashes: DesktopTelemetryCrashSample[],
    ) {
        let performanceInserted = 0;
        let performanceUpdated = 0;
        let crashesUpserted = 0;

        await this.prisma.$transaction(async (transaction) => {
            for (const metric of performance) {
                const existing = await transaction.desktopMetric.findUnique({
                    where: {
                        telemetryIntegrationId_externalId: {
                            telemetryIntegrationId,
                            externalId: metric.externalId,
                        },
                    },
                    select: { id: true },
                });

                await transaction.desktopMetric.upsert({
                    where: {
                        telemetryIntegrationId_externalId: {
                            telemetryIntegrationId,
                            externalId: metric.externalId,
                        },
                    },
                    create: {
                        workspaceId,
                        desktopAppId,
                        telemetryIntegrationId,
                        externalId: metric.externalId,
                        type: metric.type,
                        value: metric.value,
                        unit: metric.unit,
                        version: metric.version ?? null,
                        platform: metric.platform ?? null,
                        architecture: metric.architecture ?? null,
                        channel: metric.channel ?? null,
                        recordedAt: new Date(metric.recordedAt),
                    },
                    update: {
                        type: metric.type,
                        value: metric.value,
                        unit: metric.unit,
                        version: metric.version ?? null,
                        platform: metric.platform ?? null,
                        architecture: metric.architecture ?? null,
                        channel: metric.channel ?? null,
                        recordedAt: new Date(metric.recordedAt),
                    },
                });

                if (existing) {
                    performanceUpdated += 1;
                } else {
                    performanceInserted += 1;
                }
            }

            for (const crash of crashes) {
                await transaction.desktopCrash.upsert({
                    where: {
                        telemetryIntegrationId_externalId: {
                            telemetryIntegrationId,
                            externalId: crash.externalId,
                        },
                    },
                    create: {
                        workspaceId,
                        desktopAppId,
                        telemetryIntegrationId,
                        externalId: crash.externalId,
                        fingerprint: crash.fingerprint,
                        message: crash.message,
                        count: crash.count,
                        affectedUsers: crash.affectedUsers,
                        version: crash.version ?? null,
                        platform: crash.platform ?? null,
                        architecture: crash.architecture ?? null,
                        channel: crash.channel ?? null,
                        firstSeenAt: new Date(crash.firstSeenAt),
                        lastSeenAt: new Date(crash.lastSeenAt),
                    },
                    update: {
                        fingerprint: crash.fingerprint,
                        message: crash.message,
                        count: crash.count,
                        affectedUsers: crash.affectedUsers,
                        version: crash.version ?? null,
                        platform: crash.platform ?? null,
                        architecture: crash.architecture ?? null,
                        channel: crash.channel ?? null,
                        firstSeenAt: new Date(crash.firstSeenAt),
                        lastSeenAt: new Date(crash.lastSeenAt),
                    },
                });

                crashesUpserted += 1;
            }
        });

        return {
            performanceInserted,
            performanceUpdated,
            crashesUpserted,
        };
    }
}