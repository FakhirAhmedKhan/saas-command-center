/* eslint-disable @typescript-eslint/no-unsafe-call */
import {
    BadRequestException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';

import {
    ConfigService,
} from '@nestjs/config';

import {
    createHash,
} from 'node:crypto';

import {
    AnalyticsProcessingStatus,
    AnalyticsProcessingTrigger,
    Prisma,
} from '../../../generated/prisma/client';

import {
    PrismaService,
} from '../../../database/prisma.service';

import type {
    TypedConfigService,
} from '../../../config/runtime-config';

const MILLISECONDS_PER_DAY =
    86_400_000;

export interface QueueProcessingInput {
    workspaceId: string;

    websiteId: string;

    initiatedByUserId?:
    string;

    from: Date;

    to: Date;

    trigger:
    AnalyticsProcessingTrigger;
}

@Injectable()
export class AnalyticsProcessingQueueService {
    constructor(
        private readonly prisma:
            PrismaService,

        private readonly config:
            TypedConfigService,
    ) { }

    async queue(
        input:
            QueueProcessingInput,
    ) {
        this.validateRange(
            input.from,
            input.to,
        );

        const website =
            await this.prisma
                .website.findFirst({
                    where: {
                        id:
                            input.websiteId,

                        workspaceId:
                            input.workspaceId,

                        archivedAt:
                            null,
                    },

                    select: {
                        id: true,
                    },
                });

        if (!website) {
            throw new NotFoundException(
                'Website not found.',
            );
        }

        const lockKey =
            [
                'analytics-processing',
                input.websiteId,
                input.from
                    .toISOString(),
                input.to
                    .toISOString(),
            ].join(':');

        const activeKey =
            createHash(
                'sha256',
            )
                .update(
                    lockKey,
                )
                .digest(
                    'hex',
                );

        try {
            return await this.prisma
                .analyticsProcessingRun
                .create({
                    data: {
                        workspaceId:
                            input.workspaceId,

                        websiteId:
                            input.websiteId,

                        initiatedByUserId:
                            input.initiatedByUserId,

                        trigger:
                            input.trigger,

                        status:
                            AnalyticsProcessingStatus
                                .QUEUED,

                        rangeStart:
                            input.from,

                        rangeEnd:
                            input.to,

                        lockKey,

                        activeKey,

                        maxRetries:
                            this.config.get(
                                'ANALYTICS_MAX_RETRIES',
                                {
                                    infer: true,
                                },
                            ),
                    },
                });
        } catch (
        error
        ) {
            if (
                error instanceof
                Prisma.PrismaClientKnownRequestError &&
                error.code ===
                'P2002'
            ) {
                const existing =
                    await this.prisma
                        .analyticsProcessingRun
                        .findUnique({
                            where: {
                                activeKey,
                            },
                        });

                if (existing) {
                    return existing;
                }
            }

            throw error;
        }
    }

    async retryDeadLetter(
        runId: string,
        userId: string,
    ) {
        const run =
            await this.prisma
                .analyticsProcessingRun
                .findUnique({
                    where: {
                        id: runId,
                    },
                });

        if (
            !run ||
            run.status !==
            AnalyticsProcessingStatus
                .DEAD_LETTERED
        ) {
            throw new NotFoundException(
                'Dead-lettered processing run not found.',
            );
        }

        return this.prisma
            .$transaction(
                async (
                    transaction,
                ) => {
                    await transaction
                        .analyticsProcessingDeadLetter
                        .update({
                            where: {
                                runId:
                                    run.id,
                            },

                            data: {
                                resolvedAt:
                                    new Date(),

                                resolvedById:
                                    userId,
                            },
                        });

                    return transaction
                        .analyticsProcessingRun
                        .create({
                            data: {
                                workspaceId:
                                    run.workspaceId,

                                websiteId:
                                    run.websiteId,

                                initiatedByUserId:
                                    userId,

                                trigger:
                                    AnalyticsProcessingTrigger
                                        .RETRY,

                                status:
                                    AnalyticsProcessingStatus
                                        .QUEUED,

                                rangeStart:
                                    run.rangeStart,

                                rangeEnd:
                                    run.rangeEnd,

                                activeKey:
                                    run.lockKey,

                                lockKey:
                                    run.lockKey,

                                maxRetries:
                                    run.maxRetries,
                            },
                        });
                },
            );
    }

    private validateRange(
        from: Date,
        to: Date,
    ): void {
        if (
            Number.isNaN(
                from.getTime(),
            ) ||
            Number.isNaN(
                to.getTime(),
            )
        ) {
            throw new BadRequestException(
                'Invalid processing date range.',
            );
        }

        if (
            to <= from
        ) {
            throw new BadRequestException(
                'to must be later than from.',
            );
        }

        const rangeDays =
            (
                to.getTime() -
                from.getTime()
            ) /
            MILLISECONDS_PER_DAY;

        const maximumDays =
            this.config.get(
                'ANALYTICS_REPROCESS_MAX_DAYS',
                {
                    infer: true,
                },
            );

        if (
            rangeDays >
            maximumDays
        ) {
            throw new BadRequestException(
                `Reprocessing cannot exceed ${maximumDays} days.`,
            );
        }
    }
}