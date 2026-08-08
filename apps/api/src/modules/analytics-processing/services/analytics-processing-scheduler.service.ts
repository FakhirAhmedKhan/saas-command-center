import {
    Injectable,
    Logger,
} from '@nestjs/common';

import {
    Cron,
    CronExpression,
} from '@nestjs/schedule';

import {
    AnalyticsProcessingTrigger,
} from '../../../generated/prisma/client';

import {
    PrismaService,
} from '../../../database/prisma.service';

import type {
    TypedConfigService,
} from '../../../config/runtime-config';

import {
    AnalyticsProcessingQueueService,
} from './analytics-processing-queue.service';

interface PendingWebsiteRange {
    workspaceId: string;

    websiteId: string;

    firstOccurredAt:
    Date;

    lastOccurredAt:
    Date;
}

@Injectable()
export class AnalyticsProcessingSchedulerService {
    private readonly logger =
        new Logger(
            AnalyticsProcessingSchedulerService.name,
        );

    constructor(
        private readonly prisma:
            PrismaService,

        private readonly queue:
            AnalyticsProcessingQueueService,

        private readonly config:
            TypedConfigService,
    ) { }

    @Cron(
        CronExpression
            .EVERY_MINUTE,
    )
    async schedulePendingEvents():
        Promise<void> {
        if (
            !this.config.get(
                'ANALYTICS_SCHEDULER_ENABLED',
                {
                    infer: true,
                },
            )
        ) {
            return;
        }

        const ranges =
            await this.getPendingRanges();

        for (
            const range of ranges
        ) {
            try {
                await this.queue.queue({
                    workspaceId:
                        range.workspaceId,

                    websiteId:
                        range.websiteId,

                    from:
                        range
                            .firstOccurredAt,

                    to:
                        new Date(
                            range
                                .lastOccurredAt
                                .getTime() +
                            1,
                        ),

                    trigger:
                        AnalyticsProcessingTrigger
                            .SCHEDULED,
                });
            } catch (
            error
            ) {
                this.logger.error(
                    JSON.stringify({
                        event:
                            'analytics_schedule_failed',

                        websiteId:
                            range.websiteId,

                        error:
                            error instanceof
                                Error
                                ? error.message
                                : String(
                                    error,
                                ),
                    }),
                );
            }
        }
    }

    private async getPendingRanges():
        Promise<
            PendingWebsiteRange[]
        > {
        const groups =
            await this.prisma
                .rawAnalyticsEvent
                .groupBy({
                    by: [
                        'workspaceId',
                        'websiteId',
                    ],

                    where: {
                        processedAt:
                            null,
                    },

                    _min: {
                        occurredAt:
                            true,
                    },

                    _max: {
                        occurredAt:
                            true,
                    },

                    orderBy: {
                        _min: {
                            occurredAt:
                                'asc',
                        },
                    },

                    take: 20,
                });

        return (groups as Array<{
            workspaceId: string;
            websiteId: string;
            _min: {
                occurredAt: Date | null;
            };
            _max: {
                occurredAt: Date | null;
            };
        }>)
            .filter(
                (
                    group,
                ) =>
                    group._min
                        .occurredAt !==
                    null &&
                    group._max
                        .occurredAt !==
                    null,
            )
            .map(
                (
                    group,
                ) => ({
                    workspaceId:
                        group.workspaceId,

                    websiteId:
                        group.websiteId,

                    firstOccurredAt:
                        group._min
                            .occurredAt!,

                    lastOccurredAt:
                        group._max
                            .occurredAt!,
                }),
            );
    }
}