import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/database/prisma.service';
import { Prisma } from 'src/generated/prisma/client';
import { AnalyticsAggregateDimension } from 'src/generated/prisma/enums';
import { AnalyticsOverviewQueryDto } from '../dto/analytics-overview-query.dto';
import { resolveAnalyticsDateRange } from '../utils/analytics-date-range';
import { createMetricComparison, roundMetric, toSafeNumber } from '../utils/analytics-overview-metrics';
import type { AnalyticsBreakdownItemDto, AnalyticsOverviewResponseDto, AnalyticsTrendPointDto } from '../dto/analytics-overview-response.dto';

interface MetricsDatabaseRow {
  visitors: bigint | number | string;

  sessions: bigint | number | string;

  page_views: bigint | number | string;

  bounced_sessions: bigint | number | string;

  measured_sessions: bigint | number | string;

  total_duration_ms: bigint | number | string;
}

interface PeriodMetrics {
  visitors: number;
  sessions: number;
  pageViews: number;
  bounceRate: number;
  averageDurationSeconds: number;
}

interface OverviewAggregateRow {
  bucketStart: Date;
  visitors: number;
  sessions: number;
  pageViews: number;
}

interface BreakdownAggregateRow {
  dimensionValue: string;
  dimensionLabel: string;
  sessions: number;
  pageViews: number;
}

@Injectable()
export class AnalyticsOverviewService {
  private readonly breakdownLimit = 8;

  constructor(private readonly prisma: PrismaService) {}

  async getOverview(workspaceId: string, websiteId: string, query: AnalyticsOverviewQueryDto): Promise<AnalyticsOverviewResponseDto> {
    const website = await this.requireWebsite(workspaceId, websiteId);

    const range = resolveAnalyticsDateRange(query, website.timeZone);

    const [currentMetrics, previousMetrics, trendRows, pageRows, sourceRows, countryRows, deviceRows, browserRows, operatingSystemRows] = await Promise.all([
      this.loadPeriodMetrics(website.id, range.current.start, range.current.end),

      this.loadPeriodMetrics(website.id, range.previous.start, range.previous.end),

      this.loadOverviewTrend(website.id, range.current.start, range.current.end, range.granularity),

      this.loadBreakdownRows(website.id, range.current.start, range.current.end, range.granularity, AnalyticsAggregateDimension.PAGE),

      this.loadBreakdownRows(website.id, range.current.start, range.current.end, range.granularity, AnalyticsAggregateDimension.SOURCE),

      this.loadBreakdownRows(website.id, range.current.start, range.current.end, range.granularity, AnalyticsAggregateDimension.COUNTRY),

      this.loadBreakdownRows(website.id, range.current.start, range.current.end, range.granularity, AnalyticsAggregateDimension.DEVICE),

      this.loadBreakdownRows(website.id, range.current.start, range.current.end, range.granularity, AnalyticsAggregateDimension.BROWSER),

      this.loadBreakdownRows(website.id, range.current.start, range.current.end, range.granularity, AnalyticsAggregateDimension.OPERATING_SYSTEM),
    ]);

    return {
      website: {
        id: website.id,

        name: website.name,

        domain: website.domain,

        timeZone: website.timeZone,

        lastEventAt: website.lastEventAt?.toISOString() ?? null,
      },

      range: {
        preset: range.preset,

        from: range.current.from,

        to: range.current.to,

        previousFrom: range.previous.from,

        previousTo: range.previous.to,

        granularity: range.granularity,

        days: range.days,
      },

      metrics: {
        visitors: createMetricComparison(
          currentMetrics.visitors,

          previousMetrics.visitors,
        ),

        sessions: createMetricComparison(
          currentMetrics.sessions,

          previousMetrics.sessions,
        ),

        pageViews: createMetricComparison(
          currentMetrics.pageViews,

          previousMetrics.pageViews,
        ),

        bounceRate: createMetricComparison(
          currentMetrics.bounceRate,

          previousMetrics.bounceRate,
        ),

        averageDurationSeconds: createMetricComparison(
          currentMetrics.averageDurationSeconds,

          previousMetrics.averageDurationSeconds,
        ),
      },

      trend: this.mapTrendRows(trendRows),

      topPages: this.buildBreakdown(pageRows, 'pageViews'),

      topSources: this.buildBreakdown(sourceRows, 'sessions'),

      topCountries: this.buildBreakdown(countryRows, 'sessions'),

      topDevices: this.buildBreakdown(deviceRows, 'sessions'),

      topBrowsers: this.buildBreakdown(browserRows, 'sessions'),

      topOperatingSystems: this.buildBreakdown(operatingSystemRows, 'sessions'),

      empty: currentMetrics.sessions === 0 && currentMetrics.pageViews === 0,
    };
  }

  private async requireWebsite(workspaceId: string, websiteId: string) {
    const website = await this.prisma.website.findFirst({
      where: {
        id: websiteId,

        workspaceId,

        archivedAt: null,
      },

      select: {
        id: true,

        name: true,

        domain: true,

        timeZone: true,

        lastEventAt: true,
      },
    });

    if (!website) {
      throw new NotFoundException('Website not found');
    }

    return website;
  }

  private async loadPeriodMetrics(websiteId: string, start: Date, end: Date): Promise<PeriodMetrics> {
    const rows = await this.prisma.$queryRaw<MetricsDatabaseRow[]>(
      Prisma.sql`
                        SELECT
                            (
                                SELECT
                                    COUNT(
                                        DISTINCT visitor_id
                                    )::bigint
                                FROM
                                    analytics_events
                                WHERE
                                    website_id =
                                        ${websiteId}::uuid
                                    AND occurred_at >=
                                        ${start}
                                    AND occurred_at <
                                        ${end}
                            ) AS visitors,

                            (
                                SELECT
                                    COUNT(
                                        DISTINCT session_id
                                    )::bigint
                                FROM
                                    analytics_events
                                WHERE
                                    website_id =
                                        ${websiteId}::uuid
                                    AND occurred_at >=
                                        ${start}
                                    AND occurred_at <
                                        ${end}
                            ) AS sessions,

                            (
                                SELECT
                                    COUNT(*)::bigint
                                FROM
                                    analytics_page_views
                                WHERE
                                    website_id =
                                        ${websiteId}::uuid
                                    AND occurred_at >=
                                        ${start}
                                    AND occurred_at <
                                        ${end}
                            ) AS page_views,

                            (
                                SELECT
                                    COUNT(*)::bigint
                                FROM
                                    analytics_sessions
                                WHERE
                                    website_id =
                                        ${websiteId}::uuid
                                    AND started_at >=
                                        ${start}
                                    AND started_at <
                                        ${end}
                                    AND bounced = TRUE
                            ) AS bounced_sessions,

                            (
                                SELECT
                                    COUNT(*)::bigint
                                FROM
                                    analytics_sessions
                                WHERE
                                    website_id =
                                        ${websiteId}::uuid
                                    AND started_at >=
                                        ${start}
                                    AND started_at <
                                        ${end}
                            ) AS measured_sessions,

                            (
                                SELECT
                                    COALESCE(
                                        SUM(duration_ms),
                                        0
                                    )::bigint
                                FROM
                                    analytics_sessions
                                WHERE
                                    website_id =
                                        ${websiteId}::uuid
                                    AND started_at >=
                                        ${start}
                                    AND started_at <
                                        ${end}
                            ) AS total_duration_ms
                    `,
    );

    const row = rows[0];

    const visitors = toSafeNumber(row?.visitors);

    const sessions = toSafeNumber(row?.sessions);

    const pageViews = toSafeNumber(row?.page_views);

    const bouncedSessions = toSafeNumber(row?.bounced_sessions);

    const measuredSessions = toSafeNumber(row?.measured_sessions);

    const totalDurationMs = toSafeNumber(row?.total_duration_ms);

    const bounceRate = measuredSessions === 0 ? 0 : roundMetric((bouncedSessions / measuredSessions) * 100, 1);

    const averageDurationSeconds = measuredSessions === 0 ? 0 : roundMetric(totalDurationMs / measuredSessions / 1000, 1);

    return {
      visitors,
      sessions,
      pageViews,
      bounceRate,
      averageDurationSeconds,
    };
  }

  private async loadOverviewTrend(websiteId: string, start: Date, end: Date, granularity: 'hour' | 'day'): Promise<OverviewAggregateRow[]> {
    const where = {
      websiteId,

      dimension: AnalyticsAggregateDimension.OVERVIEW,

      bucketStart: {
        gte: start,
        lt: end,
      },
    };

    const select = {
      bucketStart: true,

      visitors: true,

      sessions: true,

      pageViews: true,
    } as const;

    if (granularity === 'hour') {
      return this.prisma.analyticsHourlyAggregate.findMany({
        where,
        select,

        orderBy: {
          bucketStart: 'asc',
        },
      });
    }

    return this.prisma.analyticsDailyAggregate.findMany({
      where,
      select,

      orderBy: {
        bucketStart: 'asc',
      },
    });
  }

  private async loadBreakdownRows(
    websiteId: string,
    start: Date,
    end: Date,
    granularity: 'hour' | 'day',
    dimension: AnalyticsAggregateDimension,
  ): Promise<BreakdownAggregateRow[]> {
    const where = {
      websiteId,

      dimension,

      bucketStart: {
        gte: start,
        lt: end,
      },
    };

    const select = {
      dimensionValue: true,

      dimensionLabel: true,

      sessions: true,

      pageViews: true,
    } as const;

    if (granularity === 'hour') {
      return this.prisma.analyticsHourlyAggregate.findMany({
        where,
        select,
      });
    }

    return this.prisma.analyticsDailyAggregate.findMany({
      where,
      select,
    });
  }

  private mapTrendRows(rows: OverviewAggregateRow[]): AnalyticsTrendPointDto[] {
    return rows.map((row) => ({
      bucketStart: row.bucketStart.toISOString(),

      visitors: row.visitors,

      sessions: row.sessions,

      pageViews: row.pageViews,
    }));
  }

  private buildBreakdown(
    rows: BreakdownAggregateRow[],

    metric: 'sessions' | 'pageViews',
  ): AnalyticsBreakdownItemDto[] {
    const grouped = new Map<
      string,
      {
        label: string;
        value: number;
      }
    >();

    for (const row of rows) {
      const key = row.dimensionValue.trim() || 'unknown';

      const label = row.dimensionLabel.trim() || 'Unknown';

      const value = row[metric];

      const existing = grouped.get(key);

      if (existing) {
        existing.value += value;
      } else {
        grouped.set(key, {
          label,
          value,
        });
      }
    }

    const total = Array.from(grouped.values()).reduce(
      (sum, item) => sum + item.value,

      0,
    );

    return Array.from(grouped.entries())
      .map(([key, item]) => ({
        key,

        label: item.label,

        value: item.value,

        percentage: total === 0 ? 0 : roundMetric((item.value / total) * 100, 1),
      }))
      .sort((first, second) => second.value - first.value)
      .slice(0, this.breakdownLimit);
  }
}
