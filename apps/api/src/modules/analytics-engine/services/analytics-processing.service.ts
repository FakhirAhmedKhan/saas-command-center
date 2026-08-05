import {
    BadRequestException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';

import {
    createHash,
} from 'node:crypto';

import {
    Prisma,
} from 'src/generated/prisma/client';

import {
    AnalyticsAggregateDimension,
    AnalyticsDeviceType,
    AnalyticsProcessingStatus,
    RawAnalyticsEventType,
} from 'src/generated/prisma/enums';

import {
    PrismaService,
} from 'src/database/prisma.service';

import {
    AnalyticsAggregatePeriod,
    ReprocessAnalyticsDto,
} from '../dto/analytics-engine.dto';

import {
    calculateSessionMetrics,
} from '../utils/analytics-metrics';

import {
    normalizeAnalyticsPage,
    normalizeSource,
    parseUserAgent,
} from '../utils/analytics-normalization';

import {
    getAnalyticsBucket,
} from '../utils/analytics-time';

type ProcessingWebsite = {
    id: string;
    workspaceId: string;
    name: string;
    timeZone: string;
};

type RawEvent =
    Prisma.RawAnalyticsEventGetPayload<Record<string, never>>;

interface BatchResult {
    processed: number;
    sessionIds: string[];
    visitorIds: string[];
    hourlyBuckets: string[];
    dailyBuckets: string[];
    lastReceivedAt:
    Date | null;
}

interface MutableAggregate {
    dimension:
    AnalyticsAggregateDimension;

    value: string;

    label: string;

    visitors:
    Set<string>;

    sessions:
    Set<string>;

    pageViews: number;

    events: number;

    customEvents: number;

    bounces: number;

    totalDurationMs: bigint;
}

@Injectable()
export class AnalyticsProcessingService {
    private readonly batchSize =
        250;

    constructor(
        private readonly prisma:
            PrismaService,
    ) { }

    async processForWorkspace(
        workspaceId: string,
        websiteId: string,
        initiatedByUserId:
            | string
            | null,

        maxEvents = 5000,
    ) {
        const website =
            await this.requireWebsite(
                workspaceId,
                websiteId,
            );

        return this.processWebsite(
            website,
            initiatedByUserId,
            maxEvents,
        );
    }

    async processWebsiteById(
        websiteId: string,
        maxEvents = 5000,
    ) {
        const website =
            await this.prisma
                .website.findUnique({
                    where: {
                        id: websiteId,
                    },

                    select: {
                        id: true,
                        workspaceId: true,
                        name: true,
                        timeZone: true,
                    },
                });

        if (!website) {
            throw new NotFoundException(
                'Website not found',
            );
        }

        return this.processWebsite(
            website,
            null,
            maxEvents,
        );
    }

    async reprocessRange(
        workspaceId: string,
        websiteId: string,
        dto: ReprocessAnalyticsDto,
        initiatedByUserId: string,
    ) {
        const website =
            await this.requireWebsite(
                workspaceId,
                websiteId,
            );

        const dateFrom =
            new Date(dto.dateFrom);

        const dateTo =
            new Date(dto.dateTo);

        this.validateReprocessRange(
            dateFrom,
            dateTo,
        );

        await this.prisma
            .$transaction(
                async (transaction) => {
                    await transaction
                        .analyticsEvent
                        .deleteMany({
                            where: {
                                websiteId,

                                occurredAt: {
                                    gte: dateFrom,
                                    lt: dateTo,
                                },
                            },
                        });
                },
            );

        return this.processWebsite(
            website,
            initiatedByUserId,
            dto.maxEvents,
        );
    }

    async runRetention(
        workspaceId: string,
        websiteId: string,
    ) {
        await this.requireWebsite(
            workspaceId,
            websiteId,
        );

        const rawRetentionDays =
            this.readPositiveInteger(
                process.env
                    .ANALYTICS_RAW_RETENTION_DAYS,
                30,
            );

        const normalizedRetentionDays =
            this.readPositiveInteger(
                process.env
                    .ANALYTICS_NORMALIZED_RETENTION_DAYS,
                400,
            );

        const aggregateRetentionDays =
            this.readPositiveInteger(
                process.env
                    .ANALYTICS_AGGREGATE_RETENTION_DAYS,
                730,
            );

        const now =
            Date.now();

        const rawCutoff =
            new Date(
                now -
                rawRetentionDays *
                86_400_000,
            );

        const normalizedCutoff =
            new Date(
                now -
                normalizedRetentionDays *
                86_400_000,
            );

        const aggregateCutoff =
            new Date(
                now -
                aggregateRetentionDays *
                86_400_000,
            );

        return this.prisma
            .$transaction(
                async (transaction) => {
                    const raw =
                        await transaction
                            .rawAnalyticsEvent
                            .deleteMany({
                                where: {
                                    websiteId,

                                    receivedAt: {
                                        lt: rawCutoff,
                                    },

                                    analyticsEvent: {
                                        isNot: null,
                                    },
                                },
                            });

                    const sessions =
                        await transaction
                            .analyticsSession
                            .deleteMany({
                                where: {
                                    websiteId,

                                    endedAt: {
                                        lt:
                                            normalizedCutoff,
                                    },
                                },
                            });

                    const visitors =
                        await transaction
                            .analyticsVisitor
                            .deleteMany({
                                where: {
                                    websiteId,

                                    sessions: {
                                        none: {},
                                    },
                                },
                            });

                    const hourly =
                        await transaction
                            .analyticsHourlyAggregate
                            .deleteMany({
                                where: {
                                    websiteId,

                                    bucketStart: {
                                        lt:
                                            aggregateCutoff,
                                    },
                                },
                            });

                    const daily =
                        await transaction
                            .analyticsDailyAggregate
                            .deleteMany({
                                where: {
                                    websiteId,

                                    bucketStart: {
                                        lt:
                                            aggregateCutoff,
                                    },
                                },
                            });

                    return {
                        rawEventsDeleted:
                            raw.count,

                        sessionsDeleted:
                            sessions.count,

                        visitorsDeleted:
                            visitors.count,

                        hourlyAggregatesDeleted:
                            hourly.count,

                        dailyAggregatesDeleted:
                            daily.count,
                    };
                },
            );
    }

    private async processWebsite(
        website: ProcessingWebsite,
        initiatedByUserId:
            | string
            | null,

        maxEvents: number,
    ) {
        const run =
            await this.prisma
                .analyticsProcessingRun
                .create({
                    data: {
                        websiteId:
                            website.id,

                        initiatedByUserId,

                        status:
                            AnalyticsProcessingStatus.RUNNING,
                    },
                });

        await this.prisma
            .analyticsProcessingState
            .upsert({
                where: {
                    websiteId:
                        website.id,
                },

                create: {
                    websiteId:
                        website.id,

                    status:
                        AnalyticsProcessingStatus.RUNNING,

                    lastStartedAt:
                        run.startedAt,
                },

                update: {
                    status:
                        AnalyticsProcessingStatus.RUNNING,

                    lastStartedAt:
                        run.startedAt,

                    lastError: null,
                },
            });

        let totalProcessed = 0;

        const sessionIds =
            new Set<string>();

        const hourlyBuckets =
            new Set<string>();

        const dailyBuckets =
            new Set<string>();

        let lastReceivedAt:
            Date | null = null;

        try {
            while (
                totalProcessed <
                maxEvents
            ) {
                const remaining =
                    maxEvents -
                    totalProcessed;

                const rawEvents =
                    await this.prisma
                        .rawAnalyticsEvent
                        .findMany({
                            where: {
                                websiteId:
                                    website.id,

                                analyticsEvent:
                                    null,
                            },

                            orderBy: [
                                {
                                    receivedAt:
                                        'asc',
                                },
                                {
                                    id: 'asc',
                                },
                            ],

                            take:
                                Math.min(
                                    this.batchSize,
                                    remaining,
                                ),
                        });

                if (
                    rawEvents.length === 0
                ) {
                    break;
                }

                const result =
                    await this.prisma
                        .$transaction(
                            (transaction) =>
                                this.processBatch(
                                    transaction,
                                    website,
                                    rawEvents,
                                ),
                        );

                totalProcessed +=
                    result.processed;

                result.sessionIds.forEach(
                    (id) =>
                        sessionIds.add(id),
                );

                result.hourlyBuckets.forEach(
                    (value) =>
                        hourlyBuckets.add(
                            value,
                        ),
                );

                result.dailyBuckets.forEach(
                    (value) =>
                        dailyBuckets.add(
                            value,
                        ),
                );

                if (
                    result.lastReceivedAt
                ) {
                    lastReceivedAt =
                        result.lastReceivedAt;
                }

                if (
                    result.processed === 0
                ) {
                    break;
                }
            }

            for (
                const bucketValue
                of hourlyBuckets
            ) {
                await this.rebuildBucket(
                    website,
                    AnalyticsAggregatePeriod.HOURLY,
                    new Date(
                        bucketValue,
                    ),
                );
            }

            for (
                const bucketValue
                of dailyBuckets
            ) {
                await this.rebuildBucket(
                    website,
                    AnalyticsAggregatePeriod.DAILY,
                    new Date(
                        bucketValue,
                    ),
                );
            }

            const completedAt =
                new Date();

            const completedRun =
                await this.prisma
                    .analyticsProcessingRun
                    .update({
                        where: {
                            id: run.id,
                        },

                        data: {
                            status:
                                AnalyticsProcessingStatus.COMPLETED,

                            rawEventsProcessed:
                                totalProcessed,

                            sessionsRebuilt:
                                sessionIds.size,

                            hourlyBuckets:
                                hourlyBuckets.size,

                            dailyBuckets:
                                dailyBuckets.size,

                            completedAt,
                        },
                    });

            await this.prisma
                .analyticsProcessingState
                .upsert({
                    where: {
                        websiteId:
                            website.id,
                    },

                    create: {
                        websiteId:
                            website.id,

                        status:
                            AnalyticsProcessingStatus.COMPLETED,

                        lastStartedAt:
                            run.startedAt,

                        lastCompletedAt:
                            completedAt,

                        lastProcessedReceivedAt:
                            lastReceivedAt,

                        totalRawEventsProcessed:
                            totalProcessed,
                    },

                    update: {
                        status:
                            AnalyticsProcessingStatus.COMPLETED,

                        lastCompletedAt:
                            completedAt,

                        lastProcessedReceivedAt:
                            lastReceivedAt ??
                            undefined,

                        lastError: null,

                        totalRawEventsProcessed: {
                            increment:
                                totalProcessed,
                        },
                    },
                });

            return completedRun;
        } catch (error: unknown) {
            const failedAt =
                new Date();

            const message =
                error instanceof Error
                    ? error.message
                    : 'Analytics processing failed';

            await this.prisma
                .$transaction([
                    this.prisma
                        .analyticsProcessingRun
                        .update({
                            where: {
                                id: run.id,
                            },

                            data: {
                                status:
                                    AnalyticsProcessingStatus.FAILED,

                                rawEventsProcessed:
                                    totalProcessed,

                                sessionsRebuilt:
                                    sessionIds.size,

                                failedAt,

                                errorMessage:
                                    message.slice(
                                        0,
                                        10_000,
                                    ),
                            },
                        }),

                    this.prisma
                        .analyticsProcessingState
                        .upsert({
                            where: {
                                websiteId:
                                    website.id,
                            },

                            create: {
                                websiteId:
                                    website.id,

                                status:
                                    AnalyticsProcessingStatus.FAILED,

                                lastStartedAt:
                                    run.startedAt,

                                lastFailedAt:
                                    failedAt,

                                lastError:
                                    message.slice(
                                        0,
                                        10_000,
                                    ),
                            },

                            update: {
                                status:
                                    AnalyticsProcessingStatus.FAILED,

                                lastFailedAt:
                                    failedAt,

                                lastError:
                                    message.slice(
                                        0,
                                        10_000,
                                    ),
                            },
                        }),
                ]);

            throw error;
        }
    }

    private async processBatch(
        transaction:
            Prisma.TransactionClient,

        website:
            ProcessingWebsite,

        rawEvents:
            RawEvent[],
    ): Promise<BatchResult> {
        const affectedSessions =
            new Set<string>();

        const affectedVisitors =
            new Set<string>();

        const hourlyBuckets =
            new Set<string>();

        const dailyBuckets =
            new Set<string>();

        let processed = 0;

        for (const raw of rawEvents) {
            const page =
                normalizeAnalyticsPage(
                    raw.pageUrl,
                );

            const source =
                normalizeSource(
                    raw.referrerUrl,
                    page.origin,
                );

            const agent =
                parseUserAgent(
                    raw.userAgent,
                );

            let visitor =
                await transaction
                    .analyticsVisitor
                    .findUnique({
                        where: {
                            websiteId_externalVisitorId:
                            {
                                websiteId:
                                    website.id,

                                externalVisitorId:
                                    raw.visitorId,
                            },
                        },
                    });

            if (!visitor) {
                visitor =
                    await transaction
                        .analyticsVisitor
                        .create({
                            data: {
                                websiteId:
                                    website.id,

                                externalVisitorId:
                                    raw.visitorId,

                                firstSeenAt:
                                    raw.occurredAt,

                                lastSeenAt:
                                    raw.occurredAt,
                            },
                        });
            }

            let session =
                await transaction
                    .analyticsSession
                    .findUnique({
                        where: {
                            websiteId_externalSessionId:
                            {
                                websiteId:
                                    website.id,

                                externalSessionId:
                                    raw.sessionId,
                            },
                        },
                    });

            if (!session) {
                session =
                    await transaction
                        .analyticsSession
                        .create({
                            data: {
                                websiteId:
                                    website.id,

                                visitorId:
                                    visitor.id,

                                externalSessionId:
                                    raw.sessionId,

                                startedAt:
                                    raw.occurredAt,

                                endedAt:
                                    raw.occurredAt,

                                lastEventAt:
                                    raw.occurredAt,

                                referrerUrl:
                                    raw.referrerUrl,

                                sourceType:
                                    source.sourceType,

                                sourceName:
                                    source.sourceName,

                                sourceDomain:
                                    source.sourceDomain,

                                countryCode:
                                    raw.countryCode,

                                deviceType:
                                    agent.deviceType,

                                browserName:
                                    agent.browserName,

                                browserVersion:
                                    agent.browserVersion,

                                operatingSystem:
                                    agent.operatingSystem,

                                operatingSystemVersion:
                                    agent.operatingSystemVersion,
                            },
                        });
            }

            const eventVisitorId =
                session.visitorId;

            const analyticsEvent =
                await transaction
                    .analyticsEvent
                    .upsert({
                        where: {
                            websiteId_sourceEventId:
                            {
                                websiteId:
                                    website.id,

                                sourceEventId:
                                    raw.eventId,
                            },
                        },

                        update: {
                            receivedAt:
                                raw.receivedAt,
                        },

                        create: {
                            websiteId:
                                website.id,

                            visitorId:
                                eventVisitorId,

                            sessionId:
                                session.id,

                            rawEventId:
                                raw.id,

                            sourceEventId:
                                raw.eventId,

                            type:
                                raw.type,

                            eventName:
                                raw.eventName,

                            occurredAt:
                                raw.occurredAt,

                            receivedAt:
                                raw.receivedAt,

                            pageUrl:
                                page.pageUrl,

                            normalizedPath:
                                page.normalizedPath,

                            pageTitle:
                                raw.pageTitle,

                            referrerUrl:
                                raw.referrerUrl,

                            ...(raw.properties !==
                                null
                                ? {
                                    properties:
                                        raw.properties as Prisma.InputJsonValue,
                                }
                                : {}),

                            durationMs:
                                raw.durationMs,

                            sourceType:
                                source.sourceType,

                            sourceName:
                                source.sourceName,

                            sourceDomain:
                                source.sourceDomain,

                            countryCode:
                                raw.countryCode,

                            deviceType:
                                agent.deviceType,

                            browserName:
                                agent.browserName,

                            browserVersion:
                                agent.browserVersion,

                            operatingSystem:
                                agent.operatingSystem,

                            operatingSystemVersion:
                                agent.operatingSystemVersion,
                        },
                    });

            if (
                raw.type ===
                RawAnalyticsEventType.PAGE_VIEW
            ) {
                await transaction
                    .analyticsPageView
                    .upsert({
                        where: {
                            analyticsEventId:
                                analyticsEvent.id,
                        },

                        update: {
                            pageUrl:
                                page.pageUrl,

                            normalizedPath:
                                page.normalizedPath,

                            title:
                                raw.pageTitle,
                        },

                        create: {
                            websiteId:
                                website.id,

                            visitorId:
                                eventVisitorId,

                            sessionId:
                                session.id,

                            analyticsEventId:
                                analyticsEvent.id,

                            occurredAt:
                                raw.occurredAt,

                            pageUrl:
                                page.pageUrl,

                            normalizedPath:
                                page.normalizedPath,

                            title:
                                raw.pageTitle,

                            referrerUrl:
                                raw.referrerUrl,

                            sourceType:
                                source.sourceType,

                            sourceName:
                                source.sourceName,

                            sourceDomain:
                                source.sourceDomain,

                            countryCode:
                                raw.countryCode,

                            deviceType:
                                agent.deviceType,

                            browserName:
                                agent.browserName,

                            operatingSystem:
                                agent.operatingSystem,
                        },
                    });
            }

            affectedSessions.add(
                session.id,
            );

            affectedVisitors.add(
                eventVisitorId,
            );

            hourlyBuckets.add(
                getAnalyticsBucket(
                    raw.occurredAt,
                    website.timeZone,
                    AnalyticsAggregatePeriod.HOURLY,
                ).start.toISOString(),
            );

            dailyBuckets.add(
                getAnalyticsBucket(
                    raw.occurredAt,
                    website.timeZone,
                    AnalyticsAggregatePeriod.DAILY,
                ).start.toISOString(),
            );

            processed += 1;
        }

        for (
            const sessionId
            of affectedSessions
        ) {
            const rebuilt =
                await this.rebuildSession(
                    transaction,
                    sessionId,
                );

            hourlyBuckets.add(
                getAnalyticsBucket(
                    rebuilt.startedAt,
                    website.timeZone,
                    AnalyticsAggregatePeriod.HOURLY,
                ).start.toISOString(),
            );

            dailyBuckets.add(
                getAnalyticsBucket(
                    rebuilt.startedAt,
                    website.timeZone,
                    AnalyticsAggregatePeriod.DAILY,
                ).start.toISOString(),
            );
        }

        for (
            const visitorId
            of affectedVisitors
        ) {
            await this.rebuildVisitor(
                transaction,
                visitorId,
            );
        }

        return {
            processed,

            sessionIds: [
                ...affectedSessions,
            ],

            visitorIds: [
                ...affectedVisitors,
            ],

            hourlyBuckets: [
                ...hourlyBuckets,
            ],

            dailyBuckets: [
                ...dailyBuckets,
            ],

            lastReceivedAt:
                rawEvents.at(-1)
                    ?.receivedAt ??
                null,
        };
    }

    private async rebuildSession(
        transaction:
            Prisma.TransactionClient,

        sessionId: string,
    ) {
        const session =
            await transaction
                .analyticsSession
                .findUniqueOrThrow({
                    where: {
                        id: sessionId,
                    },
                });

        const events =
            await transaction
                .analyticsEvent
                .findMany({
                    where: {
                        sessionId,
                    },

                    orderBy: [
                        {
                            occurredAt:
                                'asc',
                        },
                        {
                            id: 'asc',
                        },
                    ],
                });

        const pageViews =
            await transaction
                .analyticsPageView
                .findMany({
                    where: {
                        sessionId,
                    },

                    orderBy: [
                        {
                            occurredAt:
                                'asc',
                        },
                        {
                            id: 'asc',
                        },
                    ],
                });

        if (events.length === 0) {
            return session;
        }

        const metrics =
            calculateSessionMetrics(
                events,
                pageViews,
            );

        const firstEvent =
            events[0];

        const firstPage =
            pageViews[0] ??
            null;

        const lastPage =
            pageViews.at(-1) ??
            null;

        await transaction
            .analyticsPageView
            .updateMany({
                where: {
                    sessionId,
                },

                data: {
                    isEntry: false,
                    isExit: false,
                },
            });

        if (firstPage) {
            await transaction
                .analyticsPageView
                .update({
                    where: {
                        id:
                            firstPage.id,
                    },

                    data: {
                        isEntry: true,
                    },
                });
        }

        if (lastPage) {
            await transaction
                .analyticsPageView
                .update({
                    where: {
                        id:
                            lastPage.id,
                    },

                    data: {
                        isExit: true,
                    },
                });
        }

        return transaction
            .analyticsSession
            .update({
                where: {
                    id: sessionId,
                },

                data: {
                    startedAt:
                        metrics.startedAt,

                    endedAt:
                        metrics.endedAt,

                    lastEventAt:
                        events.at(-1)
                            ?.occurredAt ??
                        metrics.endedAt,

                    durationMs:
                        metrics.durationMs,

                    engagedDurationMs:
                        metrics.engagedDurationMs,

                    eventCount:
                        metrics.eventCount,

                    pageViewCount:
                        metrics.pageViewCount,

                    customEventCount:
                        metrics.customEventCount,

                    bounced:
                        metrics.bounced,

                    entryPath:
                        firstPage
                            ?.normalizedPath ??
                        null,

                    exitPath:
                        lastPage
                            ?.normalizedPath ??
                        null,

                    entryTitle:
                        firstPage?.title ??
                        null,

                    exitTitle:
                        lastPage?.title ??
                        null,

                    referrerUrl:
                        firstPage
                            ?.referrerUrl ??
                        firstEvent.referrerUrl,

                    sourceType:
                        firstPage
                            ?.sourceType ??
                        firstEvent.sourceType,

                    sourceName:
                        firstPage
                            ?.sourceName ??
                        firstEvent.sourceName,

                    sourceDomain:
                        firstPage
                            ?.sourceDomain ??
                        firstEvent.sourceDomain,

                    countryCode:
                        firstEvent.countryCode,

                    deviceType:
                        firstEvent.deviceType,

                    browserName:
                        firstEvent.browserName,

                    browserVersion:
                        firstEvent.browserVersion,

                    operatingSystem:
                        firstEvent.operatingSystem,

                    operatingSystemVersion:
                        firstEvent.operatingSystemVersion,
                },
            });
    }

    private async rebuildVisitor(
        transaction:
            Prisma.TransactionClient,

        visitorId: string,
    ): Promise<void> {
        const [
            eventStats,
            sessionCount,
            pageViewCount,
            eventCount,
        ] =
            await Promise.all([
                transaction
                    .analyticsEvent
                    .aggregate({
                        where: {
                            visitorId,
                        },

                        _min: {
                            occurredAt: true,
                        },

                        _max: {
                            occurredAt: true,
                        },
                    }),

                transaction
                    .analyticsSession
                    .count({
                        where: {
                            visitorId,
                        },
                    }),

                transaction
                    .analyticsPageView
                    .count({
                        where: {
                            visitorId,
                        },
                    }),

                transaction
                    .analyticsEvent
                    .count({
                        where: {
                            visitorId,
                        },
                    }),
            ]);

        if (
            !eventStats._min
                .occurredAt ||
            !eventStats._max
                .occurredAt
        ) {
            return;
        }

        await transaction
            .analyticsVisitor
            .update({
                where: {
                    id: visitorId,
                },

                data: {
                    firstSeenAt:
                        eventStats._min
                            .occurredAt,

                    lastSeenAt:
                        eventStats._max
                            .occurredAt,

                    sessionCount,

                    pageViewCount,

                    eventCount,
                },
            });
    }

    private async rebuildBucket(
        website:
            ProcessingWebsite,

        period:
            AnalyticsAggregatePeriod,

        bucketStart: Date,
    ): Promise<void> {
        const bucket =
            getAnalyticsBucket(
                bucketStart,
                website.timeZone,
                period,
            );

        const [
            events,
            pageViews,
            sessions,
        ] =
            await this.prisma
                .$transaction([
                    this.prisma
                        .analyticsEvent
                        .findMany({
                            where: {
                                websiteId:
                                    website.id,

                                occurredAt: {
                                    gte:
                                        bucket.start,

                                    lt:
                                        bucket.end,
                                },
                            },

                            select: {
                                visitorId: true,
                                sessionId: true,
                                type: true,
                                eventName: true,
                            },
                        }),

                    this.prisma
                        .analyticsPageView
                        .findMany({
                            where: {
                                websiteId:
                                    website.id,

                                occurredAt: {
                                    gte:
                                        bucket.start,

                                    lt:
                                        bucket.end,
                                },
                            },

                            select: {
                                visitorId: true,
                                sessionId: true,
                                normalizedPath:
                                    true,
                                title: true,
                            },
                        }),

                    this.prisma
                        .analyticsSession
                        .findMany({
                            where: {
                                websiteId:
                                    website.id,

                                startedAt: {
                                    gte:
                                        bucket.start,

                                    lt:
                                        bucket.end,
                                },
                            },

                            select: {
                                id: true,
                                visitorId: true,
                                sourceName: true,
                                countryCode: true,
                                deviceType: true,
                                browserName: true,
                                operatingSystem:
                                    true,
                                pageViewCount:
                                    true,
                                eventCount: true,
                                customEventCount:
                                    true,
                                bounced: true,
                                durationMs: true,
                            },
                        }),
                ]);

        const aggregates =
            new Map<
                string,
                MutableAggregate
            >();

        const overview =
            this.getAggregate(
                aggregates,
                AnalyticsAggregateDimension.OVERVIEW,
                'overview',
                'Overview',
            );

        for (const event of events) {
            overview.visitors.add(
                event.visitorId,
            );

            overview.sessions.add(
                event.sessionId,
            );

            overview.events += 1;

            if (
                event.type ===
                RawAnalyticsEventType.CUSTOM
            ) {
                overview.customEvents +=
                    1;

                const custom =
                    this.getAggregate(
                        aggregates,
                        AnalyticsAggregateDimension.CUSTOM_EVENT,
                        event.eventName ??
                        'Unknown',

                        event.eventName ??
                        'Unknown',
                    );

                custom.visitors.add(
                    event.visitorId,
                );

                custom.sessions.add(
                    event.sessionId,
                );

                custom.events += 1;
                custom.customEvents += 1;
            }
        }

        for (
            const pageView
            of pageViews
        ) {
            overview.pageViews +=
                1;

            const page =
                this.getAggregate(
                    aggregates,
                    AnalyticsAggregateDimension.PAGE,
                    pageView.normalizedPath,
                    pageView.title ??
                    pageView.normalizedPath,
                );

            page.visitors.add(
                pageView.visitorId,
            );

            page.sessions.add(
                pageView.sessionId,
            );

            page.pageViews += 1;
            page.events += 1;
        }

        for (
            const session of sessions
        ) {
            overview.visitors.add(
                session.visitorId,
            );

            overview.sessions.add(
                session.id,
            );

            overview.bounces +=
                session.bounced
                    ? 1
                    : 0;

            overview.totalDurationMs +=
                BigInt(
                    session.durationMs,
                );

            this.addSessionDimension(
                aggregates,
                AnalyticsAggregateDimension.SOURCE,
                session.sourceName ||
                'Unknown',
                session.sourceName ||
                'Unknown',
                session,
            );

            this.addSessionDimension(
                aggregates,
                AnalyticsAggregateDimension.COUNTRY,
                session.countryCode ??
                'Unknown',
                session.countryCode ??
                'Unknown',
                session,
            );

            this.addSessionDimension(
                aggregates,
                AnalyticsAggregateDimension.DEVICE,
                session.deviceType ??
                AnalyticsDeviceType.OTHER,
                session.deviceType ??
                'OTHER',
                session,
            );

            this.addSessionDimension(
                aggregates,
                AnalyticsAggregateDimension.BROWSER,
                session.browserName ||
                'Unknown',
                session.browserName ||
                'Unknown',
                session,
            );

            this.addSessionDimension(
                aggregates,
                AnalyticsAggregateDimension.OPERATING_SYSTEM,
                session.operatingSystem ||
                'Unknown',
                session.operatingSystem ||
                'Unknown',
                session,
            );
        }

        const data =
            [...aggregates.values()]
                .map((item) => ({
                    websiteId:
                        website.id,

                    bucketStart:
                        bucket.start,

                    bucketEnd:
                        bucket.end,

                    timeZone:
                        website.timeZone,

                    dimension:
                        item.dimension,

                    dimensionKey:
                        this.createDimensionKey(
                            item.dimension,
                            item.value,
                        ),

                    dimensionValue:
                        item.value.slice(
                            0,
                            2048,
                        ),

                    dimensionLabel:
                        item.label.slice(
                            0,
                            256,
                        ),

                    visitors:
                        item.visitors.size,

                    sessions:
                        item.sessions.size,

                    pageViews:
                        item.pageViews,

                    events:
                        item.events,

                    customEvents:
                        item.customEvents,

                    bounces:
                        item.bounces,

                    totalDurationMs:
                        item.totalDurationMs,

                    generatedAt:
                        new Date(),
                }));

        if (
            period ===
            AnalyticsAggregatePeriod.HOURLY
        ) {
            await this.prisma
                .$transaction(
                    async (transaction) => {
                        await transaction
                            .analyticsHourlyAggregate
                            .deleteMany({
                                where: {
                                    websiteId:
                                        website.id,

                                    bucketStart:
                                        bucket.start,
                                },
                            });

                        if (data.length > 0) {
                            await transaction
                                .analyticsHourlyAggregate
                                .createMany({
                                    data,
                                });
                        }
                    },
                );

            return;
        }

        await this.prisma
            .$transaction(
                async (transaction) => {
                    await transaction
                        .analyticsDailyAggregate
                        .deleteMany({
                            where: {
                                websiteId:
                                    website.id,

                                bucketStart:
                                    bucket.start,
                            },
                        });

                    if (data.length > 0) {
                        await transaction
                            .analyticsDailyAggregate
                            .createMany({
                                data,
                            });
                    }
                },
            );
    }

    private getAggregate(
        collection:
            Map<
                string,
                MutableAggregate
            >,

        dimension:
            AnalyticsAggregateDimension,

        value: string,

        label: string,
    ): MutableAggregate {
        const key =
            `${dimension}:${value}`;

        const existing =
            collection.get(key);

        if (existing) {
            return existing;
        }

        const created:
            MutableAggregate = {
            dimension,
            value,
            label,
            visitors:
                new Set<string>(),
            sessions:
                new Set<string>(),
            pageViews: 0,
            events: 0,
            customEvents: 0,
            bounces: 0,
            totalDurationMs: 0n,
        };

        collection.set(
            key,
            created,
        );

        return created;
    }

    private addSessionDimension(
        collection:
            Map<
                string,
                MutableAggregate
            >,

        dimension:
            AnalyticsAggregateDimension,

        value: string,

        label: string,

        session: {
            id: string;
            visitorId: string;
            pageViewCount: number;
            eventCount: number;
            customEventCount:
            number;
            bounced: boolean;
            durationMs: number;
        },
    ): void {
        const aggregate =
            this.getAggregate(
                collection,
                dimension,
                value,
                label,
            );

        aggregate.visitors.add(
            session.visitorId,
        );

        aggregate.sessions.add(
            session.id,
        );

        aggregate.pageViews +=
            session.pageViewCount;

        aggregate.events +=
            session.eventCount;

        aggregate.customEvents +=
            session.customEventCount;

        aggregate.bounces +=
            session.bounced
                ? 1
                : 0;

        aggregate.totalDurationMs +=
            BigInt(
                session.durationMs,
            );
    }

    private createDimensionKey(
        dimension:
            AnalyticsAggregateDimension,

        value: string,
    ): string {
        if (
            dimension ===
            AnalyticsAggregateDimension.OVERVIEW
        ) {
            return 'overview';
        }

        return createHash(
            'sha256',
        )
            .update(
                `${dimension}:${value}`,
            )
            .digest('hex');
    }

    private async requireWebsite(
        workspaceId: string,
        websiteId: string,
    ): Promise<ProcessingWebsite> {
        const website =
            await this.prisma
                .website.findFirst({
                    where: {
                        id: websiteId,
                        workspaceId,
                    },

                    select: {
                        id: true,
                        workspaceId: true,
                        name: true,
                        timeZone: true,
                    },
                });

        if (!website) {
            throw new NotFoundException(
                'Website not found',
            );
        }

        return website;
    }

    private validateReprocessRange(
        dateFrom: Date,
        dateTo: Date,
    ): void {
        if (
            Number.isNaN(
                dateFrom.getTime(),
            ) ||
            Number.isNaN(
                dateTo.getTime(),
            )
        ) {
            throw new BadRequestException(
                'Reprocessing dates are invalid',
            );
        }

        if (
            dateTo <= dateFrom
        ) {
            throw new BadRequestException(
                'dateTo must be after dateFrom',
            );
        }

        const maximumRange =
            31 * 86_400_000;

        if (
            dateTo.getTime() -
            dateFrom.getTime() >
            maximumRange
        ) {
            throw new BadRequestException(
                'A reprocessing request cannot exceed 31 days',
            );
        }
    }

    private readPositiveInteger(
        value: string | undefined,
        fallback: number,
    ): number {
        const parsed =
            Number(value);

        return Number.isInteger(
            parsed,
        ) && parsed > 0
            ? parsed
            : fallback;
    }
}