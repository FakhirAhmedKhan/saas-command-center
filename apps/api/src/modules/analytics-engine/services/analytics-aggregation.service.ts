import { createHash } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { DefaultArgs } from '@prisma/client/runtime/client';
import { PrismaService } from 'src/database/prisma.service';
import { AnalyticsAggregateDimension, AnalyticsDeviceType, RawAnalyticsEventType } from 'src/generated/prisma/enums';
import { PrismaClient } from 'src/generated/prisma/internal/class';
import { GlobalOmitConfig } from 'src/generated/prisma/internal/prismaNamespace';
import { ProcessAnalyticsRangeInput } from 'src/modules/analytics-processing/services/analytics-range-processor.service';
import { AnalyticsAggregatePeriod } from '@command-center/shared-types';
import { getAnalyticsBucket } from '../utils/analytics-time';

export interface AnalyticsAggregationWebsite {
  id: string;
  timeZone: string;
}

interface MutableAggregate {
  dimension: AnalyticsAggregateDimension;
  value: string;
  label: string;
  visitors: Set<string>;
  sessions: Set<string>;
  pageViews: number;
  events: number;
  customEvents: number;
  bounces: number;
  totalDurationMs: bigint;
}

@Injectable()
export class AnalyticsAggregationService {
  rebuildRange(
    D: Omit<PrismaClient<never, GlobalOmitConfig | undefined, DefaultArgs>, '$connect' | '$disconnect' | '$on' | '$use' | '$extends'>,
    input: ProcessAnalyticsRangeInput,
  ) {
    throw new Error('Method not implemented.');
  }
  constructor(private readonly prisma: PrismaService) {}

  async rebuildBucket(website: AnalyticsAggregationWebsite, period: AnalyticsAggregatePeriod, bucketStart: Date): Promise<void> {
    const bucket = getAnalyticsBucket(bucketStart, website.timeZone, period);

    const [events, pageViews, sessions] = await this.prisma.$transaction([
      this.prisma.analyticsEvent.findMany({
        where: {
          websiteId: website.id,

          occurredAt: {
            gte: bucket.start,

            lt: bucket.end,
          },
        },

        select: {
          visitorId: true,

          sessionId: true,

          type: true,

          eventName: true,
        },
      }),

      this.prisma.analyticsPageView.findMany({
        where: {
          websiteId: website.id,

          occurredAt: {
            gte: bucket.start,

            lt: bucket.end,
          },
        },

        select: {
          visitorId: true,

          sessionId: true,

          normalizedPath: true,

          title: true,
        },
      }),

      this.prisma.analyticsSession.findMany({
        where: {
          websiteId: website.id,

          startedAt: {
            gte: bucket.start,

            lt: bucket.end,
          },
        },

        select: {
          id: true,

          visitorId: true,

          sourceName: true,

          countryCode: true,

          deviceType: true,

          browserName: true,

          operatingSystem: true,

          pageViewCount: true,

          eventCount: true,

          customEventCount: true,

          bounced: true,

          durationMs: true,
        },
      }),
    ]);

    const aggregates = new Map<string, MutableAggregate>();

    const overview = this.getAggregate(aggregates, AnalyticsAggregateDimension.OVERVIEW, 'overview', 'Overview');

    for (const event of events) {
      overview.visitors.add(event.visitorId);

      overview.events += 1;

      if (event.type === RawAnalyticsEventType.CUSTOM) {
        overview.customEvents += 1;

        const eventName = event.eventName ?? 'Unknown';

        const custom = this.getAggregate(
          aggregates,

          AnalyticsAggregateDimension.CUSTOM_EVENT,

          eventName,
          eventName,
        );

        custom.visitors.add(event.visitorId);

        custom.sessions.add(event.sessionId);

        custom.events += 1;

        custom.customEvents += 1;
      }
    }

    for (const pageView of pageViews) {
      overview.visitors.add(pageView.visitorId);

      overview.pageViews += 1;

      const page = this.getAggregate(
        aggregates,

        AnalyticsAggregateDimension.PAGE,

        pageView.normalizedPath,

        pageView.title ?? pageView.normalizedPath,
      );

      page.visitors.add(pageView.visitorId);

      page.sessions.add(pageView.sessionId);

      page.pageViews += 1;

      page.events += 1;
    }

    for (const session of sessions) {
      overview.visitors.add(session.visitorId);

      overview.sessions.add(session.id);

      overview.bounces += session.bounced ? 1 : 0;

      overview.totalDurationMs += BigInt(session.durationMs);

      this.addSessionDimension(
        aggregates,

        AnalyticsAggregateDimension.SOURCE,

        session.sourceName || 'Unknown',

        session.sourceName || 'Unknown',

        session,
      );

      this.addSessionDimension(
        aggregates,

        AnalyticsAggregateDimension.COUNTRY,

        session.countryCode ?? 'Unknown',

        session.countryCode ?? 'Unknown',

        session,
      );

      this.addSessionDimension(
        aggregates,
        AnalyticsAggregateDimension.DEVICE,
        session.deviceType ?? AnalyticsDeviceType.OTHER,
        session.deviceType ?? AnalyticsDeviceType.OTHER,
        session,
      );

      this.addSessionDimension(aggregates, AnalyticsAggregateDimension.BROWSER, session.browserName || 'Unknown', session.browserName || 'Unknown', session);

      this.addSessionDimension(
        aggregates,
        AnalyticsAggregateDimension.OPERATING_SYSTEM,
        session.operatingSystem || 'Unknown',
        session.operatingSystem || 'Unknown',
        session,
      );
    }

    const generatedAt = new Date();

    const data = [...aggregates.values()].map((item) => ({
      websiteId: website.id,
      bucketStart: bucket.start,
      bucketEnd: bucket.end,
      timeZone: website.timeZone,
      dimension: item.dimension,
      dimensionKey: this.createDimensionKey(item.dimension, item.value),
      dimensionValue: item.value.slice(0, 2048),
      dimensionLabel: item.label.slice(0, 256),
      visitors: item.visitors.size,
      sessions: item.sessions.size,
      pageViews: item.pageViews,
      events: item.events,
      customEvents: item.customEvents,
      bounces: item.bounces,
      totalDurationMs: item.totalDurationMs,
      generatedAt,
    }));

    if (period === AnalyticsAggregatePeriod.HOURLY) {
      await this.prisma.$transaction(async (transaction) => {
        await transaction.analyticsHourlyAggregate.deleteMany({
          where: {
            websiteId: website.id,
            bucketStart: bucket.start,
          },
        });

        if (data.length > 0) {
          await transaction.analyticsHourlyAggregate.createMany({ data });
        }
      });

      return;
    }

    await this.prisma.$transaction(async (transaction) => {
      await transaction.analyticsDailyAggregate.deleteMany({
        where: {
          websiteId: website.id,
          bucketStart: bucket.start,
        },
      });

      if (data.length > 0) {
        await transaction.analyticsDailyAggregate.createMany({
          data,
        });
      }
    });
  }

  async rebuild(website: AnalyticsAggregationWebsite, period: AnalyticsAggregatePeriod, bucketStart: Date): Promise<void> {
    await this.rebuildBucket(website, period, bucketStart);
  }

  async rebuildBuckets(website: AnalyticsAggregationWebsite, period: AnalyticsAggregatePeriod, bucketStarts: readonly Date[]): Promise<void> {
    for (const bucketStart of bucketStarts) {
      await this.rebuildBucket(website, period, bucketStart);
    }
  }

  private getAggregate(
    collection: Map<string, MutableAggregate>,

    dimension: AnalyticsAggregateDimension,

    value: string,

    label: string,
  ): MutableAggregate {
    const key = `${dimension}:${value}`;

    const existing = collection.get(key);

    if (existing) {
      return existing;
    }

    const created: MutableAggregate = {
      dimension,
      value,
      label,

      visitors: new Set<string>(),

      sessions: new Set<string>(),

      pageViews: 0,

      events: 0,

      customEvents: 0,

      bounces: 0,

      totalDurationMs: 0n,
    };

    collection.set(key, created);

    return created;
  }

  private addSessionDimension(
    collection: Map<string, MutableAggregate>,

    dimension: AnalyticsAggregateDimension,

    value: string,

    label: string,

    session: {
      id: string;
      visitorId: string;
      pageViewCount: number;
      eventCount: number;
      customEventCount: number;
      bounced: boolean;
      durationMs: number;
    },
  ): void {
    const aggregate = this.getAggregate(collection, dimension, value, label);

    aggregate.visitors.add(session.visitorId);

    aggregate.sessions.add(session.id);

    aggregate.pageViews += session.pageViewCount;

    aggregate.events += session.eventCount;

    aggregate.customEvents += session.customEventCount;

    aggregate.bounces += session.bounced ? 1 : 0;

    aggregate.totalDurationMs += BigInt(session.durationMs);
  }

  private createDimensionKey(
    dimension: AnalyticsAggregateDimension,

    value: string,
  ): string {
    if (dimension === AnalyticsAggregateDimension.OVERVIEW) {
      return 'overview';
    }

    return createHash('sha256').update(`${dimension}:${value}`).digest('hex');
  }
}
