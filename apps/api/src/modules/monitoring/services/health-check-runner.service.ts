/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-call */
import {
    Injectable,
    Logger,
    NotFoundException,
} from '@nestjs/common';

import {
    HealthCheckStatus,
    HealthIncidentStatus,
} from '../../../generated/prisma/client';

import {
    PrismaService,
} from '../../../database/prisma.service';

import {
    SafeHttpClientService,
} from './safe-http-client.service';

@Injectable()
export class HealthCheckRunnerService {
    private readonly logger =
        new Logger(
            HealthCheckRunnerService.name,
        );

    constructor(
        private readonly prisma:
            PrismaService,

        private readonly safeHttp:
            SafeHttpClientService,
    ) { }

    async run(
        workspaceId:
            string,

        healthCheckId:
            string,
    ) {
        const healthCheck =
            await this.prisma
                .healthCheck
                .findFirst({
                    where: {
                        id:
                            healthCheckId,

                        workspaceId,
                    },
                });

        if (!healthCheck) {
            throw new NotFoundException(
                'Health check not found.',
            );
        }

        if (
            !healthCheck.enabled
        ) {
            return {
                healthCheckId,

                status:
                    HealthCheckStatus
                        .DISABLED,
            };
        }

        const result =
            await this.safeHttp
                .execute({
                    url:
                        healthCheck.url,

                    timeoutMs:
                        healthCheck.timeoutMs,

                    expectedStatusMin:
                        healthCheck
                            .expectedStatusMin,

                    expectedStatusMax:
                        healthCheck
                            .expectedStatusMax,

                    degradedAfterMs:
                        healthCheck
                            .degradedAfterMs,
                });

        const now =
            new Date();

        const isFailure =
            result.status ===
            HealthCheckStatus
                .DOWN;

        const consecutiveFailures =
            isFailure
                ? healthCheck
                    .consecutiveFailures +
                1
                : 0;

        const nextRunAt =
            new Date(
                now.getTime() +
                healthCheck
                    .intervalSeconds *
                1_000,
            );

        await this.prisma
            .$transaction(
                async (
                    transaction,
                ) => {
                    await transaction
                        .healthCheckHistory
                        .create({
                            data: {
                                healthCheckId:
                                    healthCheck.id,

                                status:
                                    result.status,

                                statusCode:
                                    result.statusCode,

                                responseTimeMs:
                                    result
                                        .responseTimeMs,

                                failureReason:
                                    result
                                        .failureReason,

                                checkedAt:
                                    now,
                            },
                        });

                    await transaction
                        .healthCheck
                        .update({
                            where: {
                                id:
                                    healthCheck.id,
                            },

                            data: {
                                latestStatus:
                                    result.status,

                                lastStatusCode:
                                    result.statusCode,

                                lastResponseTimeMs:
                                    result
                                        .responseTimeMs,

                                lastFailureReason:
                                    result
                                        .failureReason,

                                consecutiveFailures,

                                lastCheckedAt:
                                    now,

                                lastSuccessfulAt:
                                    isFailure
                                        ? healthCheck
                                            .lastSuccessfulAt
                                        : now,

                                nextRunAt,
                            },
                        });

                    if (
                        isFailure &&
                        consecutiveFailures >=
                        healthCheck
                            .failureThreshold
                    ) {
                        await this.openOrUpdateIncident(
                            transaction,
                            healthCheck.id,
                            healthCheck.workspaceId,
                            healthCheck.name,
                            result.failureReason ??
                            'Health check failed.',
                            consecutiveFailures,
                            now,
                        );
                    } else if (
                        !isFailure
                    ) {
                        await transaction
                            .healthIncident
                            .updateMany({
                                where: {
                                    healthCheckId:
                                        healthCheck.id,

                                    status:
                                        HealthIncidentStatus
                                            .OPEN,
                                },

                                data: {
                                    status:
                                        HealthIncidentStatus
                                            .RESOLVED,

                                    activeKey:
                                        null,

                                    resolvedAt:
                                        now,
                                },
                            });
                    }
                },
            );

        this.logger.log(
            JSON.stringify({
                event:
                    'health_check_completed',

                healthCheckId:
                    healthCheck.id,

                workspaceId:
                    healthCheck.workspaceId,

                status:
                    result.status,

                statusCode:
                    result.statusCode,

                responseTimeMs:
                    result.responseTimeMs,

                consecutiveFailures,
            }),
        );

        return {
            healthCheckId:
                healthCheck.id,

            ...result,

            consecutiveFailures,

            nextRunAt:
                nextRunAt
                    .toISOString(),
        };
    }

    private async openOrUpdateIncident(
        transaction:
            Parameters<
                Parameters<
                    PrismaService[
                    '$transaction'
                    ]
                >[0]
            >[0],

        healthCheckId:
            string,

        workspaceId:
            string,

        healthCheckName:
            string,

        reason:
            string,

        failureCount:
            number,

        now:
            Date,
    ): Promise<void> {
        const existing =
            await transaction
                .healthIncident
                .findFirst({
                    where: {
                        healthCheckId,

                        status:
                            HealthIncidentStatus
                                .OPEN,
                    },
                });

        const summary =
            `${healthCheckName}: ${reason}`
                .slice(
                    0,
                    500,
                );

        if (existing) {
            await transaction
                .healthIncident
                .update({
                    where: {
                        id:
                            existing.id,
                    },

                    data: {
                        summary,

                        failureCount,

                        lastFailureAt:
                            now,
                    },
                });

            return;
        }

        await transaction
            .healthIncident
            .create({
                data: {
                    healthCheckId,

                    workspaceId,

                    status:
                        HealthIncidentStatus
                            .OPEN,

                    activeKey:
                        `health-check:${healthCheckId}`,

                    summary,

                    failureCount,

                    firstFailureAt:
                        now,

                    lastFailureAt:
                        now,

                    startedAt:
                        now,
                },
            });
    }
}