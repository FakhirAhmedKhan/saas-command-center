import { AnalyticsOverviewQueryDto } from '../../analytics-overview/dto/analytics-overview-query.dto';
import { ANALYTICS_REPORT_DEFAULT_LIMIT, ANALYTICS_REPORT_MAX_LIMIT, ANALYTICS_SEARCH_MAX_LENGTH } from '../analytics-reports.constants';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export enum AnalyticsSortDirection {
  ASC = 'asc',
  DESC = 'desc',
}

export enum PageReportSortField {
  VIEWS = 'views',
  VISITORS = 'visitors',
  SESSIONS = 'sessions',
  ENTRANCES = 'entrances',
  EXITS = 'exits',
  BOUNCE_RATE = 'bounceRate',
  AVERAGE_DURATION = 'averageDuration',
  PATH = 'path',
}

export enum EventReportSortField {
  EVENTS = 'events',
  VISITORS = 'visitors',
  SESSIONS = 'sessions',
  NAME = 'name',
}

export enum DimensionReportSortField {
  VISITORS = 'visitors',
  SESSIONS = 'sessions',
  PAGE_VIEWS = 'pageViews',
  LABEL = 'label',
}

export enum AnalyticsReportDimension {
  SOURCES = 'sources',
  COUNTRIES = 'countries',
  DEVICES = 'devices',
  BROWSERS = 'browsers',
  OPERATING_SYSTEMS = 'operating-systems',
}

export class AnalyticsReportQueryDto extends AnalyticsOverviewQueryDto {
  @ApiPropertyOptional({
    default: 1,
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @ApiPropertyOptional({
    default: ANALYTICS_REPORT_DEFAULT_LIMIT,
    maximum: ANALYTICS_REPORT_MAX_LIMIT,
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(ANALYTICS_REPORT_MAX_LIMIT)
  limit = ANALYTICS_REPORT_DEFAULT_LIMIT;

  @ApiPropertyOptional({
    maxLength: ANALYTICS_SEARCH_MAX_LENGTH,
  })
  @IsOptional()
  @IsString()
  @MaxLength(ANALYTICS_SEARCH_MAX_LENGTH)
  search?: string;

  @ApiPropertyOptional({
    enum: AnalyticsSortDirection,
    default: AnalyticsSortDirection.DESC,
  })
  @IsOptional()
  @IsEnum(AnalyticsSortDirection)
  sortDirection = AnalyticsSortDirection.DESC;
}

export class PageReportQueryDto extends AnalyticsReportQueryDto {
  @ApiPropertyOptional({
    enum: PageReportSortField,
    default: PageReportSortField.VIEWS,
  })
  @IsOptional()
  @IsEnum(PageReportSortField)
  sortBy = PageReportSortField.VIEWS;
}

export class EventReportQueryDto extends AnalyticsReportQueryDto {
  @ApiPropertyOptional({
    enum: EventReportSortField,
    default: EventReportSortField.EVENTS,
  })
  @IsOptional()
  @IsEnum(EventReportSortField)
  sortBy = EventReportSortField.EVENTS;
}

export class DimensionReportQueryDto extends AnalyticsReportQueryDto {
  @ApiPropertyOptional({
    enum: DimensionReportSortField,
    default: DimensionReportSortField.SESSIONS,
  })
  @IsOptional()
  @IsEnum(DimensionReportSortField)
  sortBy = DimensionReportSortField.SESSIONS;
}
