import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';

import { PrismaService } from 'src/database/prisma.service';

import { AnalyticsAggregatePeriod, AnalyticsAggregateQueryDto } from '../dto/analytics-engine.dto';

@Injectable()
export class AnalyticsEngineQueryService {
  constructor(private readonly prisma: PrismaService) {}

  async getStatus(workspaceId: string, websiteId: string) {
    const website = await this.requireWebsite(workspaceId, websiteId);

    const [
      rawEvents,
      pendingRawEvents,
      visitors,
      sessions,
      normalizedEvents,
      pageViews,
      hourlyAggregates,
      dailyAggregates,
      processingState,
      latestRun,
      recentSessions,
    ] = await this.prisma.$transaction([
      this.prisma.rawAnalyticsEvent.count({
        where: {
          websiteId,
        },
      }),

      this.prisma.rawAnalyticsEvent.count({
        where: {
          websiteId,

          analyticsEvent: null,
        },
      }),

      this.prisma.analyticsVisitor.count({
        where: {
          websiteId,
        },
      }),

      this.prisma.analyticsSession.count({
        where: {
          websiteId,
        },
      }),

      this.prisma.analyticsEvent.count({
        where: {
          websiteId,
        },
      }),

      this.prisma.analyticsPageView.count({
        where: {
          websiteId,
        },
      }),

      this.prisma.analyticsHourlyAggregate.count({
        where: {
          websiteId,
        },
      }),

      this.prisma.analyticsDailyAggregate.count({
        where: {
          websiteId,
        },
      }),

      this.prisma.analyticsProcessingState.findUnique({
        where: {
          websiteId,
        },
      }),

      this.prisma.analyticsProcessingRun.findFirst({
        where: {
          websiteId,
        },

        orderBy: {
          startedAt: 'desc',
        },
      }),

      this.prisma.analyticsSession.findMany({
        where: {
          websiteId,
        },

        orderBy: {
          startedAt: 'desc',
        },

        take: 10,

        include: {
          visitor: {
            select: {
              externalVisitorId: true,
            },
          },
        },
      }),
    ]);

    return {
      website,

      counts: {
        rawEvents,
        pendingRawEvents,
        visitors,
        sessions,
        normalizedEvents,
        pageViews,
        hourlyAggregates,
        dailyAggregates,
      },

      processingState: processingState
        ? {
            ...processingState,

            totalRawEventsProcessed: processingState.totalRawEventsProcessed.toString(),
          }
        : null,

      latestRun,

      recentSessions,
    };
  }

  async listAggregates(workspaceId: string, websiteId: string, query: AnalyticsAggregateQueryDto) {
    await this.requireWebsite(workspaceId, websiteId);

    const now = new Date();

    const defaultDays = query.period === AnalyticsAggregatePeriod.HOURLY ? 7 : 30;

    const dateFrom = query.dateFrom
      ? new Date(query.dateFrom)
      : new Date(now.getTime() - defaultDays * 86_400_000);

    const dateTo = query.dateTo ? new Date(query.dateTo) : now;

    if (dateFrom > dateTo) {
      throw new BadRequestException('Aggregate dateFrom must be before or equal to dateTo');
    }

    const where = {
      websiteId,

      dimension: query.dimension,

      bucketStart: {
        gte: dateFrom,
        lte: dateTo,
      },
    };

    if (query.period === AnalyticsAggregatePeriod.HOURLY) {
      const data = await this.prisma.analyticsHourlyAggregate.findMany({
        where,

        orderBy: [
          {
            bucketStart: 'asc',
          },
          {
            dimensionLabel: 'asc',
          },
        ],

        take: query.limit,
      });

      return {
        period: query.period,

        dimension: query.dimension,

        data: data.map(this.serializeAggregate),
      };
    }

    const data = await this.prisma.analyticsDailyAggregate.findMany({
      where,

      orderBy: [
        {
          bucketStart: 'asc',
        },
        {
          dimensionLabel: 'asc',
        },
      ],

      take: query.limit,
    });

    return {
      period: query.period,

      dimension: query.dimension,

      data: data.map(this.serializeAggregate),
    };
  }

  private serializeAggregate(
    this: void,
    aggregate: {
      id: string;
      websiteId: string;
      bucketStart: Date;
      bucketEnd: Date;
      timeZone: string;
      dimension: string;
      dimensionKey: string;
      dimensionValue: string;
      dimensionLabel: string;
      visitors: number;
      sessions: number;
      pageViews: number;
      events: number;
      customEvents: number;
      bounces: number;
      totalDurationMs: bigint;
      generatedAt: Date;
      updatedAt: Date;
    },
  ) {
    return {
      ...aggregate,

      totalDurationMs:
        aggregate.totalDurationMs <= BigInt(Number.MAX_SAFE_INTEGER) &&
        aggregate.totalDurationMs >= BigInt(Number.MIN_SAFE_INTEGER)
          ? Number(aggregate.totalDurationMs)
          : aggregate.totalDurationMs.toString(),
    };
  }

  private async requireWebsite(workspaceId: string, websiteId: string) {
    const website = await this.prisma.website.findFirst({
      where: {
        id: websiteId,
        workspaceId,
      },

      select: {
        id: true,
        name: true,
        domain: true,
        timeZone: true,
        enabled: true,
        archivedAt: true,
        lastEventAt: true,
      },
    });

    if (!website) {
      throw new NotFoundException('Website not found');
    }

    return website;
  }
}
