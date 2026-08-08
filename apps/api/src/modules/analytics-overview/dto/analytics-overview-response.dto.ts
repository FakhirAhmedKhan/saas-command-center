import { ApiProperty } from '@nestjs/swagger';

export class AnalyticsWebsiteDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  domain!: string;

  @ApiProperty({
    example: 'Asia/Dubai',
  })
  timeZone!: string;

  @ApiProperty({
    nullable: true,
  })
  lastEventAt!: string | null;
}

export class AnalyticsRangeDto {
  @ApiProperty({
    example: '7d',
  })
  preset!: string;

  @ApiProperty({
    example: '2026-08-01',
  })
  from!: string;

  @ApiProperty({
    example: '2026-08-07',
  })
  to!: string;

  @ApiProperty({
    example: '2026-07-25',
  })
  previousFrom!: string;

  @ApiProperty({
    example: '2026-07-31',
  })
  previousTo!: string;

  @ApiProperty({
    enum: ['hour', 'day'],
  })
  granularity!: 'hour' | 'day';

  @ApiProperty()
  days!: number;
}

export class AnalyticsMetricDto {
  @ApiProperty()
  value!: number;

  @ApiProperty()
  previousValue!: number;

  @ApiProperty({
    nullable: true,
    description:
      'Null means the previous period was zero and no meaningful percentage can be calculated.',
  })
  changePercent!: number | null;
}

export class AnalyticsMetricsDto {
  @ApiProperty({
    type: AnalyticsMetricDto,
  })
  visitors!: AnalyticsMetricDto;

  @ApiProperty({
    type: AnalyticsMetricDto,
  })
  sessions!: AnalyticsMetricDto;

  @ApiProperty({
    type: AnalyticsMetricDto,
  })
  pageViews!: AnalyticsMetricDto;

  @ApiProperty({
    type: AnalyticsMetricDto,
  })
  bounceRate!: AnalyticsMetricDto;

  @ApiProperty({
    type: AnalyticsMetricDto,
  })
  averageDurationSeconds!: AnalyticsMetricDto;
}

export class AnalyticsTrendPointDto {
  @ApiProperty()
  bucketStart!: string;

  @ApiProperty()
  visitors!: number;

  @ApiProperty()
  sessions!: number;

  @ApiProperty()
  pageViews!: number;
}

export class AnalyticsBreakdownItemDto {
  @ApiProperty()
  key!: string;

  @ApiProperty()
  label!: string;

  @ApiProperty()
  value!: number;

  @ApiProperty()
  percentage!: number;
}

export class AnalyticsOverviewResponseDto {
  @ApiProperty({
    type: AnalyticsWebsiteDto,
  })
  website!: AnalyticsWebsiteDto;

  @ApiProperty({
    type: AnalyticsRangeDto,
  })
  range!: AnalyticsRangeDto;

  @ApiProperty({
    type: AnalyticsMetricsDto,
  })
  metrics!: AnalyticsMetricsDto;

  @ApiProperty({
    type: [AnalyticsTrendPointDto],
  })
  trend!: AnalyticsTrendPointDto[];

  @ApiProperty({
    type: [AnalyticsBreakdownItemDto],
  })
  topPages!: AnalyticsBreakdownItemDto[];

  @ApiProperty({
    type: [AnalyticsBreakdownItemDto],
  })
  topSources!: AnalyticsBreakdownItemDto[];

  @ApiProperty({
    type: [AnalyticsBreakdownItemDto],
  })
  topCountries!: AnalyticsBreakdownItemDto[];

  @ApiProperty({
    type: [AnalyticsBreakdownItemDto],
  })
  topDevices!: AnalyticsBreakdownItemDto[];

  @ApiProperty({
    type: [AnalyticsBreakdownItemDto],
  })
  topBrowsers!: AnalyticsBreakdownItemDto[];

  @ApiProperty({ type: [AnalyticsBreakdownItemDto] })
  topOperatingSystems!: AnalyticsBreakdownItemDto[];

  @ApiProperty()
  empty!: boolean;
}
