import { resolveAnalyticsDateRange } from '../../analytics-overview/utils/analytics-date-range';
import { roundMetric, toSafeNumber } from '../../analytics-overview/utils/analytics-overview-metrics';
import { ANALYTICS_EXPORT_MAX_DAYS, ANALYTICS_EXPORT_MAX_ROWS } from '../analytics-reports.constants';
import {
  AnalyticsReportDimension,
  AnalyticsSortDirection,
  DimensionReportQueryDto,
  DimensionReportSortField,
  EventReportQueryDto,
  EventReportSortField,
  PageReportQueryDto,
  PageReportSortField,
} from '../dto/analytics-report-query.dto';
import type {
  AnalyticsPaginationDto,
  AnalyticsReportRangeDto,
  DimensionReportItemDto,
  DimensionReportResponseDto,
  EventReportItemDto,
  EventReportResponseDto,
  PageReportItemDto,
  PageReportResponseDto,
} from '../dto/analytics-report-response.dto';
import { createCsv, createCsvFilename } from '../utils/analytics-csv';
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/database/prisma.service';
import { Prisma } from 'src/generated/prisma/client';
import { AnalyticsAggregateDimension } from 'src/generated/prisma/enums';

interface WebsiteReportContext {
  websiteId: string;

  websiteName: string;

  timeZone: string;

  range: ReturnType<typeof resolveAnalyticsDateRange>;
}

interface PageDatabaseRow {
  path: string;

  title: string | null;

  views: bigint | number | string;

  visitors: bigint | number | string;

  sessions: bigint | number | string;

  entrances: bigint | number | string;

  exits: bigint | number | string;

  bounced_sessions: bigint | number | string;

  total_duration_ms: bigint | number | string;

  total_count: bigint | number | string;
}

interface EventDatabaseRow {
  name: string;

  events: bigint | number | string;

  visitors: bigint | number | string;

  sessions: bigint | number | string;

  total_count: bigint | number | string;
}

interface EventSummaryDatabaseRow {
  total_events: bigint | number | string;

  unique_visitors: bigint | number | string;

  unique_sessions: bigint | number | string;
}

interface DimensionDatabaseRow {
  key: string;

  label: string;

  visitors: bigint | number | string;

  sessions: bigint | number | string;

  page_views: bigint | number | string;

  total_count: bigint | number | string;

  total_sessions: bigint | number | string;
}

export interface CsvExportResult {
  filename: string;

  content: string;
}

@Injectable()
export class AnalyticsReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async getPagesReport(workspaceId: string, websiteId: string, query: PageReportQueryDto): Promise<PageReportResponseDto> {
    const context = await this.resolveContext(workspaceId, websiteId, query);

    return this.loadPagesReport(context, query, query.page, query.limit);
  }

  async getEventsReport(workspaceId: string, websiteId: string, query: EventReportQueryDto): Promise<EventReportResponseDto> {
    const context = await this.resolveContext(workspaceId, websiteId, query);

    return this.loadEventsReport(context, query, query.page, query.limit);
  }

  async getDimensionReport(
    workspaceId: string,
    websiteId: string,
    dimension: AnalyticsReportDimension,
    query: DimensionReportQueryDto,
  ): Promise<DimensionReportResponseDto> {
    const context = await this.resolveContext(workspaceId, websiteId, query);

    return this.loadDimensionReport(context, dimension, query, query.page, query.limit);
  }

  async exportPages(workspaceId: string, websiteId: string, query: PageReportQueryDto): Promise<CsvExportResult> {
    const context = await this.resolveContext(workspaceId, websiteId, query);

    this.assertExportRange(context);

    const report = await this.loadPagesReport(context, query, 1, ANALYTICS_EXPORT_MAX_ROWS);

    return {
      filename: createCsvFilename('pages', context.range.current.from, context.range.current.to),
      content: createCsv(
        [
          {
            header: 'Path',
            value: (row) => row.path,
          },

          {
            header: 'Title',
            value: (row) => row.title,
          },

          {
            header: 'Views',
            value: (row) => row.views,
          },

          {
            header: 'Visitors',
            value: (row) => row.visitors,
          },

          {
            header: 'Sessions',
            value: (row) => row.sessions,
          },

          {
            header: 'Entrances',
            value: (row) => row.entrances,
          },

          {
            header: 'Exits',
            value: (row) => row.exits,
          },

          {
            header: 'Bounce Rate',
            value: (row) => row.bounceRate,
          },

          {
            header: 'Average Duration Seconds',
            value: (row) => row.averageDurationSeconds,
          },
        ],

        report.items,
      ),
    };
  }

  async exportEvents(workspaceId: string, websiteId: string, query: EventReportQueryDto): Promise<CsvExportResult> {
    const context = await this.resolveContext(workspaceId, websiteId, query);

    this.assertExportRange(context);

    const report = await this.loadEventsReport(context, query, 1, ANALYTICS_EXPORT_MAX_ROWS);

    return {
      filename: createCsvFilename('events', context.range.current.from, context.range.current.to),
      content: createCsv(
        [
          {
            header: 'Event',
            value: (row) => row.name,
          },

          {
            header: 'Total Events',
            value: (row) => row.events,
          },

          {
            header: 'Unique Visitors',
            value: (row) => row.visitors,
          },

          {
            header: 'Sessions',
            value: (row) => row.sessions,
          },
        ],

        report.items,
      ),
    };
  }

  async exportDimension(workspaceId: string, websiteId: string, dimension: AnalyticsReportDimension, query: DimensionReportQueryDto): Promise<CsvExportResult> {
    const context = await this.resolveContext(workspaceId, websiteId, query);

    this.assertExportRange(context);

    const report = await this.loadDimensionReport(context, dimension, query, 1, ANALYTICS_EXPORT_MAX_ROWS);

    return {
      filename: createCsvFilename(dimension, context.range.current.from, context.range.current.to),
      content: createCsv(
        [
          {
            header: 'Value',
            value: (row) => row.label,
          },

          {
            header: 'Visitors',
            value: (row) => row.visitors,
          },

          {
            header: 'Sessions',
            value: (row) => row.sessions,
          },

          {
            header: 'Page Views',
            value: (row) => row.pageViews,
          },

          {
            header: 'Percentage',
            value: (row) => row.percentage,
          },
        ],

        report.items,
      ),
    };
  }

  private async resolveContext(
    workspaceId: string,
    websiteId: string,
    query:
      | {
          preset?: never;
          from?: string;
          to?: string;
        }
      | PageReportQueryDto
      | EventReportQueryDto
      | DimensionReportQueryDto,
  ): Promise<WebsiteReportContext> {
    const website = await this.prisma.website.findFirst({
      where: {
        id: websiteId,

        workspaceId,

        archivedAt: null,
      },

      select: {
        id: true,
        name: true,
        timeZone: true,
      },
    });

    if (!website) {
      throw new NotFoundException('Website not found');
    }

    return {
      websiteId: website.id,
      websiteName: website.name,
      timeZone: website.timeZone,
      range: resolveAnalyticsDateRange(query as Parameters<typeof resolveAnalyticsDateRange>[0], website.timeZone),
    };
  }

  private async loadPagesReport(context: WebsiteReportContext, query: PageReportQueryDto, page: number, limit: number): Promise<PageReportResponseDto> {
    const offset = (page - 1) * limit;

    const search = query.search?.trim() ?? '';

    const searchPattern = `%${search}%`;

    const sortColumn = this.getPageSortColumn(query.sortBy);

    const sortDirection = query.sortDirection === AnalyticsSortDirection.ASC ? Prisma.sql`ASC` : Prisma.sql`DESC`;

    const rows = await this.prisma.$queryRaw<PageDatabaseRow[]>(
      Prisma.sql`
                        WITH page_report AS (
                            SELECT
                                pv.normalized_path AS path,

                                COALESCE(
                                    NULLIF(
                                        MAX(
                                            pv.title
                                        ),
                                        ''
                                    ),
                                    pv.normalized_path
                                ) AS title,

                                COUNT(*)::bigint
                                    AS views,

                                COUNT(
                                    DISTINCT
                                    pv.visitor_id
                                )::bigint
                                    AS visitors,

                                COUNT(
                                    DISTINCT
                                    pv.session_id
                                )::bigint
                                    AS sessions,

                                COUNT(
                                    DISTINCT
                                    pv.session_id
                                ) FILTER (
                                    WHERE
                                        pv.is_entry =
                                            TRUE
                                )::bigint
                                    AS entrances,

                                COUNT(
                                    DISTINCT
                                    pv.session_id
                                ) FILTER (
                                    WHERE
                                        pv.is_exit =
                                            TRUE
                                )::bigint
                                    AS exits,

                                COUNT(
                                    DISTINCT
                                    pv.session_id
                                ) FILTER (
                                    WHERE
                                        pv.is_entry =
                                            TRUE
                                        AND
                                        analytics_session
                                            .bounced =
                                            TRUE
                                )::bigint
                                    AS bounced_sessions,

                                COALESCE(
                                    SUM(
                                        analytics_event.duration_ms
                                    ),
                                    0
                                )::bigint
                                    AS total_duration_ms

                            FROM
                                analytics_page_views
                                    AS pv

                            LEFT JOIN
                                analytics_sessions
                                    AS analytics_session
                                ON
                                    analytics_session.id =
                                        pv.session_id
                                    AND
                                    analytics_session.website_id =
                                        pv.website_id

                            LEFT JOIN
                                analytics_events
                                    AS analytics_event
                                ON
                                    analytics_event.id =
                                        pv.analytics_event_id
                                    AND
                                    analytics_event.website_id =
                                        pv.website_id


                            WHERE
                                pv.website_id =
                                    ${context.websiteId}::uuid

                                AND
                                pv.occurred_at >=
                                    ${context.range.current.start}

                                AND
                                pv.occurred_at <
                                    ${context.range.current.end}

                            GROUP BY
                                pv.normalized_path
                        ),

                        filtered_report AS (
                            SELECT
                                *,

                                COUNT(*) OVER()::bigint
                                    AS total_count

                            FROM
                                page_report

                            WHERE
                                ${search} = ''
                                OR
                                path ILIKE
                                    ${searchPattern}
                                OR
                                title ILIKE
                                    ${searchPattern}
                        )

                        SELECT
                            *

                        FROM
                            filtered_report

                        ORDER BY
                            ${sortColumn}
                            ${sortDirection},

                            path ASC

                        LIMIT
                            ${limit}

                        OFFSET
                            ${offset}
                    `,
    );

    const total = toSafeNumber(rows[0]?.total_count);

    const items = rows.map((row) => this.mapPageRow(row));

    return {
      items,

      pagination: this.createPagination(page, limit, total),
      range: this.createRangeDto(context),
    };
  }

  private async loadEventsReport(context: WebsiteReportContext, query: EventReportQueryDto, page: number, limit: number): Promise<EventReportResponseDto> {
    const offset = (page - 1) * limit;

    const search = query.search?.trim() ?? '';

    const searchPattern = `%${search}%`;

    const sortColumn = this.getEventSortColumn(query.sortBy);

    const sortDirection = query.sortDirection === AnalyticsSortDirection.ASC ? Prisma.sql`ASC` : Prisma.sql`DESC`;

    const [rows, summaryRows] = await Promise.all([
      this.prisma.$queryRaw<EventDatabaseRow[]>(
        Prisma.sql`
                        WITH event_report AS (
                            SELECT
                                analytics_event
                                    .event_name
                                    AS name,

                                COUNT(*)::bigint
                                    AS events,

                                COUNT(
                                    DISTINCT
                                    analytics_event
                                        .visitor_id
                                )::bigint
                                    AS visitors,

                                COUNT(
                                    DISTINCT
                                    analytics_event
                                        .session_id
                                )::bigint
                                    AS sessions

                            FROM
                                analytics_events
                                    AS analytics_event

                            WHERE
                                analytics_event.website_id =
                                    ${context.websiteId}::uuid

                                AND
                                analytics_event.occurred_at >=
                                    ${context.range.current.start}

                                AND
                                analytics_event.occurred_at <
                                    ${context.range.current.end}

                                AND
                                analytics_event.event_name
                                    IS NOT NULL

                                AND
                                analytics_event.event_name
                                    <> ''

                            GROUP BY
                                analytics_event
                                    .event_name
                        ),

                        filtered_report AS (
                            SELECT
                                *,

                                COUNT(*) OVER()::bigint
                                    AS total_count

                            FROM
                                event_report

                            WHERE
                                ${search} = ''
                                OR
                                name ILIKE
                                    ${searchPattern}
                        )

                        SELECT
                            *

                        FROM
                            filtered_report

                        ORDER BY
                            ${sortColumn}
                            ${sortDirection},

                            name ASC

                        LIMIT
                            ${limit}

                        OFFSET
                            ${offset}
                    `,
      ),

      this.prisma.$queryRaw<EventSummaryDatabaseRow[]>(
        Prisma.sql`
                        SELECT
                            COUNT(*)::bigint
                                AS total_events,

                            COUNT(
                                DISTINCT
                                visitor_id
                            )::bigint
                                AS unique_visitors,

                            COUNT(
                                DISTINCT
                                session_id
                            )::bigint
                                AS unique_sessions

                        FROM
                            analytics_events

                        WHERE
                            website_id =
                                ${context.websiteId}::uuid

                            AND
                            occurred_at >=
                                ${context.range.current.start}

                            AND
                            occurred_at <
                                ${context.range.current.end}

                            AND
                            event_name
                                IS NOT NULL

                            AND
                            event_name
                                <> ''
                    `,
      ),
    ]);

    const total = toSafeNumber(rows[0]?.total_count);

    const summary = summaryRows[0];

    return {
      items: rows.map((row): EventReportItemDto => ({
        name: row.name,
        events: toSafeNumber(row.events),
        visitors: toSafeNumber(row.visitors),
        sessions: toSafeNumber(row.sessions),
      })),

      summary: {
        totalEvents: toSafeNumber(summary?.total_events),
        uniqueVisitors: toSafeNumber(summary?.unique_visitors),
        uniqueSessions: toSafeNumber(summary?.unique_sessions),
      },

      pagination: this.createPagination(page, limit, total),
      range: this.createRangeDto(context),
    };
  }

  private async loadDimensionReport(
    context: WebsiteReportContext,
    dimension: AnalyticsReportDimension,
    query: DimensionReportQueryDto,
    page: number,
    limit: number,
  ): Promise<DimensionReportResponseDto> {
    const aggregateDimension = this.mapDimension(dimension);

    const offset = (page - 1) * limit;

    const search = query.search?.trim() ?? '';

    const searchPattern = `%${search}%`;

    const sortColumn = this.getDimensionSortColumn(query.sortBy);

    const sortDirection = query.sortDirection === AnalyticsSortDirection.ASC ? Prisma.sql`ASC` : Prisma.sql`DESC`;

    /*
     * The aggregate table name can't be a bind parameter, but it is never
     * derived from user input -- it's chosen solely from the server-computed
     * date-range granularity, so Prisma.raw here does not open a SQL
     * injection path.
     */
    const aggregateTable = context.range.granularity === 'hour' ? Prisma.raw('analytics_hourly_aggregates') : Prisma.raw('analytics_daily_aggregates');

    const rows = await this.prisma.$queryRaw<DimensionDatabaseRow[]>(
      Prisma.sql`
                        WITH dimension_agg AS (
                            SELECT
                                COALESCE(NULLIF(TRIM(dimension_value), ''), 'unknown') AS key,

                                COALESCE(NULLIF(TRIM(MAX(dimension_label)), ''), 'Unknown') AS label,

                                SUM(visitors)::bigint AS visitors,

                                SUM(sessions)::bigint AS sessions,

                                SUM(page_views)::bigint AS page_views

                            FROM
                                ${aggregateTable}

                            WHERE
                                website_id =
                                    ${context.websiteId}::uuid

                                AND
                                dimension =
                                    ${aggregateDimension}::"AnalyticsAggregateDimension"

                                AND
                                bucket_start >=
                                    ${context.range.current.start}

                                AND
                                bucket_start <
                                    ${context.range.current.end}

                            GROUP BY
                                COALESCE(NULLIF(TRIM(dimension_value), ''), 'unknown')
                        ),

                        filtered_report AS (
                            SELECT
                                *,

                                COUNT(*) OVER()::bigint
                                    AS total_count,

                                COALESCE(SUM(sessions) OVER(), 0)::bigint
                                    AS total_sessions

                            FROM
                                dimension_agg

                            WHERE
                                ${search} = ''
                                OR
                                key ILIKE
                                    ${searchPattern}
                                OR
                                label ILIKE
                                    ${searchPattern}
                        )

                        SELECT
                            *

                        FROM
                            filtered_report

                        ORDER BY
                            ${sortColumn}
                            ${sortDirection},

                            label ASC

                        LIMIT
                            ${limit}

                        OFFSET
                            ${offset}
                    `,
    );

    const total = toSafeNumber(rows[0]?.total_count);

    const totalSessions = toSafeNumber(rows[0]?.total_sessions);

    const items: DimensionReportItemDto[] = rows.map((row) => {
      const sessions = toSafeNumber(row.sessions);

      return {
        key: row.key,
        label: row.label,
        visitors: toSafeNumber(row.visitors),

        sessions,

        pageViews: toSafeNumber(row.page_views),
        percentage: totalSessions === 0 ? 0 : roundMetric((sessions / totalSessions) * 100, 1),
      };
    });

    return {
      items,

      pagination: this.createPagination(page, limit, total),
      range: this.createRangeDto(context),
    };
  }

  private mapPageRow(row: PageDatabaseRow): PageReportItemDto {
    const views = toSafeNumber(row.views);

    const entrances = toSafeNumber(row.entrances);

    const bouncedSessions = toSafeNumber(row.bounced_sessions);

    const totalDurationMs = toSafeNumber(row.total_duration_ms);

    return {
      path: row.path,
      title: row.title ?? row.path,

      views,

      visitors: toSafeNumber(row.visitors),
      sessions: toSafeNumber(row.sessions),

      entrances,

      exits: toSafeNumber(row.exits),
      bounceRate:
        entrances === 0
          ? 0
          : roundMetric(
              (bouncedSessions / entrances) * 100,

              1,
            ),

      averageDurationSeconds:
        views === 0
          ? 0
          : roundMetric(
              totalDurationMs / views / 1000,

              1,
            ),
    };
  }

  private getPageSortColumn(field: PageReportSortField): Prisma.Sql {
    switch (field) {
      case PageReportSortField.VISITORS:
        return Prisma.sql`visitors`;

      case PageReportSortField.SESSIONS:
        return Prisma.sql`sessions`;

      case PageReportSortField.ENTRANCES:
        return Prisma.sql`entrances`;

      case PageReportSortField.EXITS:
        return Prisma.sql`exits`;

      case PageReportSortField.BOUNCE_RATE:
        return Prisma.sql`
                    CASE
                        WHEN entrances = 0
                            THEN 0
                        ELSE
                            bounced_sessions::numeric /
                            entrances
                    END
                `;

      case PageReportSortField.AVERAGE_DURATION:
        return Prisma.sql`
                    CASE
                        WHEN views = 0
                            THEN 0
                        ELSE
                            total_duration_ms::numeric /
                            views
                    END
                `;

      case PageReportSortField.PATH:
        return Prisma.sql`path`;

      case PageReportSortField.VIEWS:
      default:
        return Prisma.sql`views`;
    }
  }

  private getEventSortColumn(field: EventReportSortField): Prisma.Sql {
    switch (field) {
      case EventReportSortField.VISITORS:
        return Prisma.sql`visitors`;

      case EventReportSortField.SESSIONS:
        return Prisma.sql`sessions`;

      case EventReportSortField.NAME:
        return Prisma.sql`name`;

      case EventReportSortField.EVENTS:
      default:
        return Prisma.sql`events`;
    }
  }

  private mapDimension(dimension: AnalyticsReportDimension): AnalyticsAggregateDimension {
    switch (dimension) {
      case AnalyticsReportDimension.SOURCES:
        return AnalyticsAggregateDimension.SOURCE;

      case AnalyticsReportDimension.COUNTRIES:
        return AnalyticsAggregateDimension.COUNTRY;

      case AnalyticsReportDimension.DEVICES:
        return AnalyticsAggregateDimension.DEVICE;

      case AnalyticsReportDimension.BROWSERS:
        return AnalyticsAggregateDimension.BROWSER;

      case AnalyticsReportDimension.OPERATING_SYSTEMS:
        return AnalyticsAggregateDimension.OPERATING_SYSTEM;
    }
  }

  private getDimensionSortColumn(field: DimensionReportSortField): Prisma.Sql {
    switch (field) {
      case DimensionReportSortField.VISITORS:
        return Prisma.sql`visitors`;

      case DimensionReportSortField.PAGE_VIEWS:
        return Prisma.sql`page_views`;

      case DimensionReportSortField.LABEL:
        return Prisma.sql`label`;

      case DimensionReportSortField.SESSIONS:
      default:
        return Prisma.sql`sessions`;
    }
  }

  private createPagination(page: number, limit: number, total: number): AnalyticsPaginationDto {
    const totalPages = Math.max(1, Math.ceil(total / limit));

    return {
      page,

      limit,

      total,

      totalPages,

      hasPreviousPage: page > 1,
      hasNextPage: page < totalPages,
    };
  }

  private createRangeDto(context: WebsiteReportContext): AnalyticsReportRangeDto {
    return {
      from: context.range.current.from,
      to: context.range.current.to,
      timeZone: context.timeZone,
      days: context.range.days,
    };
  }

  private assertExportRange(context: WebsiteReportContext): void {
    if (context.range.days > ANALYTICS_EXPORT_MAX_DAYS) {
      throw new BadRequestException(`CSV exports cannot exceed ${ANALYTICS_EXPORT_MAX_DAYS} days`);
    }
  }
}
