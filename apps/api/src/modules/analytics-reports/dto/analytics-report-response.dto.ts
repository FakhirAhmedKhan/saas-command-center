import type {
  AnalyticsPagination,
  AnalyticsReportRange,
  DimensionReportItem,
  DimensionReportResponse,
  EventReportItem,
  EventReportResponse,
  EventReportSummary,
  PageReportItem,
  PageReportResponse,
} from '@command-center/shared-types';
import { ApiProperty } from '@nestjs/swagger';

export class AnalyticsPaginationDto implements AnalyticsPagination {
  @ApiProperty()
  page!: number;

  @ApiProperty()
  limit!: number;

  @ApiProperty()
  total!: number;

  @ApiProperty()
  totalPages!: number;

  @ApiProperty()
  hasPreviousPage!: boolean;

  @ApiProperty()
  hasNextPage!: boolean;
}

export class AnalyticsReportRangeDto implements AnalyticsReportRange {
  @ApiProperty()
  from!: string;

  @ApiProperty()
  to!: string;

  @ApiProperty()
  timeZone!: string;

  @ApiProperty()
  days!: number;
}

export class PageReportItemDto implements PageReportItem {
  @ApiProperty()
  path!: string;

  @ApiProperty()
  title!: string;

  @ApiProperty()
  views!: number;

  @ApiProperty()
  visitors!: number;

  @ApiProperty()
  sessions!: number;

  @ApiProperty()
  entrances!: number;

  @ApiProperty()
  exits!: number;

  @ApiProperty()
  bounceRate!: number;

  @ApiProperty()
  averageDurationSeconds!: number;
}

export class PageReportResponseDto implements PageReportResponse {
  @ApiProperty({
    type: [PageReportItemDto],
  })
  items!: PageReportItemDto[];

  @ApiProperty({
    type: AnalyticsPaginationDto,
  })
  pagination!: AnalyticsPaginationDto;

  @ApiProperty({
    type: AnalyticsReportRangeDto,
  })
  range!: AnalyticsReportRangeDto;
}

export class EventReportItemDto implements EventReportItem {
  @ApiProperty()
  name!: string;

  @ApiProperty()
  events!: number;

  @ApiProperty()
  visitors!: number;

  @ApiProperty()
  sessions!: number;
}

export class EventReportSummaryDto implements EventReportSummary {
  @ApiProperty()
  totalEvents!: number;

  @ApiProperty()
  uniqueVisitors!: number;

  @ApiProperty()
  uniqueSessions!: number;
}

export class EventReportResponseDto implements EventReportResponse {
  @ApiProperty({
    type: [EventReportItemDto],
  })
  items!: EventReportItemDto[];

  @ApiProperty({
    type: EventReportSummaryDto,
  })
  summary!: EventReportSummaryDto;

  @ApiProperty({
    type: AnalyticsPaginationDto,
  })
  pagination!: AnalyticsPaginationDto;

  @ApiProperty({
    type: AnalyticsReportRangeDto,
  })
  range!: AnalyticsReportRangeDto;
}

export class DimensionReportItemDto implements DimensionReportItem {
  @ApiProperty()
  key!: string;

  @ApiProperty()
  label!: string;

  @ApiProperty()
  visitors!: number;

  @ApiProperty()
  sessions!: number;

  @ApiProperty()
  pageViews!: number;

  @ApiProperty()
  percentage!: number;
}

export class DimensionReportResponseDto implements DimensionReportResponse {
  @ApiProperty({
    type: [DimensionReportItemDto],
  })
  items!: DimensionReportItemDto[];

  @ApiProperty({
    type: AnalyticsPaginationDto,
  })
  pagination!: AnalyticsPaginationDto;

  @ApiProperty({
    type: AnalyticsReportRangeDto,
  })
  range!: AnalyticsReportRangeDto;
}
