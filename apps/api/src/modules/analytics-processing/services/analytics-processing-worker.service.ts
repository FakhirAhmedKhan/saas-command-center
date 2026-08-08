 
 
import {
    Injectable,
    Logger,
} from '@nestjs/common';

import {
    Interval,
} from '@nestjs/schedule';

import {
    AnalyticsProcessingStatus,
} from '../../../generated/prisma/client';

import {
    PrismaService,
} from '../../../database/prisma.service';

import type {
    TypedConfigService,
} from '../../../config/runtime-config';

import {
    PostgresAdvisoryLockService,
} from '../../../infrastructure/database/postgres-advisory-lock.service';

import {
    AnalyticsRangeProcessorService,
} from './analytics-range-processor.service';

const MAX_RETRY_DELAY_MS =
    5 * 60 * 1_000;

@Injectable()
export class AnalyticsProcessingWorkerService {
    private readonly logger =
        new Logger(
            AnalyticsProcessingWorkerService.name,
        );

    private running =
        false;

    constructor(
        private readonly prisma:
            PrismaService,

        private readonly locks:
            PostgresAdvisoryLockService,

        private readonly processor:
            AnalyticsRangeProcessorService,

        private readonly config:
            TypedConfigService,
    ) { }

    @Interval(5_000)
    async tick():
        Promise<void> {
        if (
            !this.config.get(
                'ANALYTICS_WORKER_ENABLED',
                {
                    infer: true,
                },
            ) ||
            this.running
        ) {
            return;
        }

        this.running =
            true;

        try {
            await this.processNext();
        } finally {
            this.running =
                false;
        }
    }

    private async processNext():
        Promise<void> {
        const run =
            await this.prisma
                .analyticsProcessingRun
                .findFirst({
                    where: {
                        status:
                            AnalyticsProcessingStatus
                                .QUEUED,

                        nextAttemptAt: {
                            lte:
                                new Date(),
                        },
                    },

                    orderBy: [
                        {
                            nextAttemptAt:
                                'asc',
                        },

                        {
                            createdAt:
                                'asc',
                        },
                    ],
                });

        if (!run) {
            return;
        }

        const lockResult =
            await this.locks
                .withLock(
                    run.lockKey,

                    async () => {
                        await this.processRun(
                            run.id,
                        );
                    },
                );

        if (
            !lockResult.acquired
        ) {
            await this.prisma
                .analyticsProcessingRun
                .updateMany({
                    where: {
                        id:
                            run.id,

                        status:
                            AnalyticsProcessingStatus
                                .QUEUED,
                    },

                    data: {
                        nextAttemptAt:
                            new Date(
                                Date.now() +
                                5_000,
                            ),
                    },
                });
        }
    }

    private async processRun(
        runId: string,
    ): Promise<void> {
        const claimed =
            await this.prisma
                .analyticsProcessingRun
                .updateMany({
                    where: {
                        id:
                            runId,

                        status:
                            AnalyticsProcessingStatus
                                .QUEUED,
                    },

                    data: {
                        status:
                            AnalyticsProcessingStatus
                                .RUNNING,

                        startedAt:
                            new Date(),

                        heartbeatAt:
                            new Date(),

                        errorCode:
                            null,

                        errorMessage:
                            null,
                    },
                });

        if (
            claimed.count === 0
        ) {
            return;
        }

        const run =
            await this.prisma
                .analyticsProcessingRun
                .findUniqueOrThrow({
                    where: {
                        id:
                            runId,
                    },
                });

        this.logger.log(
            JSON.stringify({
                event:
                    'analytics_processing_started',

                runId:
                    run.id,

                websiteId:
                    run.websiteId,

                retryCount:
                    run.retryCount,

                rangeStart:
                    run.rangeStart,

                rangeEnd:
                    run.rangeEnd,
            }),
        );

        try {
            const result =
                await this.processor
                    .processRange({
                        workspaceId:
                            run.workspaceId,

                        websiteId:
                            run.websiteId,

                        from:
                            run.rangeStart,

                        to:
                            run.rangeEnd,
                    });

            await this.prisma
                .analyticsProcessingRun
                .update({
                    where: {
                        id:
                            run.id,
                    },

                    data: {
                        status:
                            AnalyticsProcessingStatus
                                .SUCCEEDED,

                        activeKey:
                            null,

                        pendingEventsAtStart:
                            result
                                .pendingEventsAtStart,

                        rawEventsProcessed:
                            result
                                .processedEvents,

                        failedEvents:
                            result
                                .failedEvents,

                        heartbeatAt:
                            new Date(),

                        finishedAt:
                            new Date(),
                    },
                });

            this.logger.log(
                JSON.stringify({
                    event:
                        'analytics_processing_succeeded',

                    runId:
                        run.id,

                    websiteId:
                        run.websiteId,

                    rawEventsProcessed:
                        result
                            .processedEvents,

                    failedEvents:
                        result
                            .failedEvents,
                }),
            );
        } catch (
        error
        ) {
            await this.handleFailure(
                run,
                error,
            );
        }
    }

    private async handleFailure(
        run: {
            id: string;

            workspaceId:
            string;

            websiteId:
            string;

            rangeStart:
            Date;

            rangeEnd:
            Date;

            retryCount:
            number;

            maxRetries:
            number;
        },

        error:
            unknown,
    ): Promise<void> {
        const message =
            error instanceof Error
                ? error.message
                : String(error);

        const code =
            error instanceof Error
                ? error.name
                : 'UnknownError';

        const nextRetryCount =
            run.retryCount +
            1;

        if (
            nextRetryCount <=
            run.maxRetries
        ) {
            const delay =
                Math.min(
                    5_000 *
                    2 **
                    (
                        nextRetryCount -
                        1
                    ),

                    MAX_RETRY_DELAY_MS,
                );

            await this.prisma
                .analyticsProcessingRun
                .update({
                    where: {
                        id:
                            run.id,
                    },

                    data: {
                        status:
                            AnalyticsProcessingStatus
                                .QUEUED,

                        retryCount:
                            nextRetryCount,

                        nextAttemptAt:
                            new Date(
                                Date.now() +
                                delay,
                            ),

                        errorCode:
                            code,

                        errorMessage:
                            message,

                        heartbeatAt:
                            new Date(),
                    },
                });

            this.logger.warn(
                JSON.stringify({
                    event:
                        'analytics_processing_retry_scheduled',

                    runId:
                        run.id,

                    retryCount:
                        nextRetryCount,

                    delay,

                    error:
                        message,
                }),
            );

            return;
        }

        await this.prisma
            .$transaction(
                async (
                    transaction,
                ) => {
                    await transaction
                        .analyticsProcessingRun
                        .update({
                            where: {
                                id:
                                    run.id,
                            },

                            data: {
                                status:
                                    AnalyticsProcessingStatus
                                        .DEAD_LETTERED,

                                activeKey:
                                    null,

                                retryCount:
                                    nextRetryCount,

                                errorCode:
                                    code,

                                errorMessage:
                                    message,

                                heartbeatAt:
                                    new Date(),

                                finishedAt:
                                    new Date(),
                            },
                        });

                    await transaction
                        .analyticsProcessingDeadLetter
                        .create({
                            data: {
                                runId:
                                    run.id,

                                workspaceId:
                                    run.workspaceId,

                                websiteId:
                                    run.websiteId,

                                rangeStart:
                                    run.rangeStart,

                                rangeEnd:
                                    run.rangeEnd,

                                retryCount:
                                    nextRetryCount,

                                errorCode:
                                    code,

                                errorMessage:
                                    message,
                            },
                        });
                },
            );

        this.logger.error(
            JSON.stringify({
                event:
                    'analytics_processing_dead_lettered',

                runId:
                    run.id,

                retryCount:
                    nextRetryCount,

                error:
                    message,
            }),
        );
    }
}