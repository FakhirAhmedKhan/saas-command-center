/* eslint-disable @typescript-eslint/no-unsafe-call */
import {
    Injectable,
    NotFoundException,
} from '@nestjs/common';

import {
    Prisma,
} from 'src/generated/prisma/client';

import {
    RawAnalyticsEventType,
} from 'src/generated/prisma/enums';

import {
    PrismaService,
} from 'src/database/prisma.service';

import {
    RawEventQueryDto,
} from '../dto/raw-event-query.dto';

const rawEventSelect = {
    id: true,
    websiteId: true,
    eventId: true,
    type: true,
    visitorId: true,
    sessionId: true,
    occurredAt: true,
    receivedAt: true,
    pageUrl: true,
    pagePath: true,
    pageTitle: true,
    referrerUrl: true,
    eventName: true,
    properties: true,
    screenWidth: true,
    screenHeight: true,
    viewportWidth: true,
    viewportHeight: true,
    language: true,
    clientTimeZone: true,
    durationMs: true,
    origin: true,
    sdkVersion: true,
} satisfies Prisma.RawAnalyticsEventSelect;

@Injectable()
export class TrackingAdminService {
    constructor(
        private readonly prisma:
            PrismaService,
    ) { }

    async getStatus(
        workspaceId: string,
        websiteId: string,
    ) {
        const website =
            await this.requireWebsite(
                workspaceId,
                websiteId,
            );

        const [
            totalEvents,
            grouped,
            recentEvents,
        ] =
            await this.prisma
                .$transaction([
                    this.prisma
                        .rawAnalyticsEvent
                        .count({
                            where: {
                                websiteId,
                            },
                        }),

                    this.prisma
                        .rawAnalyticsEvent
                        .groupBy({
                            by: ['type'],

                            where: {
                                websiteId,
                            },

                            orderBy: {
                            type: 'asc',
                        },

                        _count: {
                            id: true,
                        },
                        }),

                    this.prisma
                        .rawAnalyticsEvent
                        .findMany({
                            where: {
                                websiteId,
                            },

                            select:
                                rawEventSelect,

                            orderBy: {
                                receivedAt:
                                    'desc',
                            },

                            take: 5,
                        }),
                ]);

        const counts:
            Record<
                RawAnalyticsEventType,
                number
            > = {
            PAGE_VIEW: 0,
            HEARTBEAT: 0,
            CUSTOM: 0,
        };

        for (
            const item of grouped
        ) {
            counts[item.type] =
                typeof item._count === 'object' &&
                item._count !== null
                    ? item._count.id ?? 0
                    : 0;
        }

        return {
            website: {
                id: website.id,
                name: website.name,
                domain: website.domain,
                enabled:
                    website.enabled,
                archivedAt:
                    website.archivedAt,
                lastEventAt:
                    website.lastEventAt,
                trackingKeyPrefix:
                    website.trackingKeyPrefix,
            },

            connected:
                Boolean(
                    website.lastEventAt,
                ),

            totalEvents,

            counts,

            recentEvents,
        };
    }

    async listEvents(
        workspaceId: string,
        websiteId: string,
        query: RawEventQueryDto,
    ) {
        await this.requireWebsite(
            workspaceId,
            websiteId,
        );

        const where:
            Prisma.RawAnalyticsEventWhereInput =
        {
            websiteId,

            ...(query.type
                ? {
                    type:
                        query.type,
                }
                : {}),

            ...(query.eventName
                ? {
                    eventName: {
                        contains:
                            query.eventName
                                .trim(),

                        mode:
                            'insensitive',
                    },
                }
                : {}),

            ...(query.visitorId
                ? {
                    visitorId:
                        query.visitorId,
                }
                : {}),

            ...(query.sessionId
                ? {
                    sessionId:
                        query.sessionId,
                }
                : {}),

            ...(query.dateFrom ||
                query.dateTo
                ? {
                    occurredAt: {
                        ...(query.dateFrom
                            ? {
                                gte:
                                    new Date(
                                        query.dateFrom,
                                    ),
                            }
                            : {}),

                        ...(query.dateTo
                            ? {
                                lte:
                                    new Date(
                                        query.dateTo,
                                    ),
                            }
                            : {}),
                    },
                }
                : {}),
        };

        const skip =
            (query.page - 1) *
            query.limit;

        const [
            events,
            total,
        ] =
            await this.prisma
                .$transaction([
                    this.prisma
                        .rawAnalyticsEvent
                        .findMany({
                            where,

                            select:
                                rawEventSelect,

                            orderBy: [
                                {
                                    occurredAt:
                                        'desc',
                                },

                                {
                                    id: 'desc',
                                },
                            ],

                            skip,

                            take:
                                query.limit,
                        }),

                    this.prisma
                        .rawAnalyticsEvent
                        .count({
                            where,
                        }),
                ]);

        const totalPages =
            Math.ceil(
                total / query.limit,
            );

        return {
            data: events,

            meta: {
                page: query.page,
                limit: query.limit,
                total,
                totalPages,

                hasNextPage:
                    query.page <
                    totalPages,

                hasPreviousPage:
                    query.page > 1,
            },
        };
    }

    private async requireWebsite(
        workspaceId: string,
        websiteId: string,
    ) {
        const website =
            await this.prisma
                .website.findFirst({
                    where: {
                        id: websiteId,
                        workspaceId,
                    },

                    select: {
                        id: true,
                        name: true,
                        domain: true,
                        enabled: true,
                        archivedAt: true,
                        lastEventAt: true,
                        trackingKeyPrefix:
                            true,
                    },
                });

        if (!website) {
            throw new NotFoundException(
                'Website not found',
            );
        }

        return website;
    }
}