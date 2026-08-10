import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDateString, IsEnum, IsInt, IsOptional, Max, Min } from 'class-validator';
import { AnalyticsAggregateDimension } from 'src/generated/prisma/enums';

export enum AnalyticsAggregatePeriod {
  HOURLY = 'HOURLY',
  DAILY = 'DAILY',
}

export class ProcessAnalyticsDto {
  @ApiPropertyOptional({
    default: 5000,
    minimum: 1,
    maximum: 50000,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50000)
  maxEvents = 5000;
}

export class ReprocessAnalyticsDto {
  @ApiProperty({
    example: '2026-08-01T00:00:00.000Z',
  })
  @IsDateString()
  dateFrom!: string;

  @ApiProperty({
    example: '2026-08-03T00:00:00.000Z',
  })
  @IsDateString()
  dateTo!: string;

  @ApiPropertyOptional({
    default: 50000,
    minimum: 1,
    maximum: 100000,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100000)
  maxEvents = 50000;
}

export class AnalyticsAggregateQueryDto {
  @ApiPropertyOptional({
    enum: AnalyticsAggregatePeriod,
    default: AnalyticsAggregatePeriod.DAILY,
  })
  @IsOptional()
  @IsEnum(AnalyticsAggregatePeriod)
  period = AnalyticsAggregatePeriod.DAILY;

  @ApiPropertyOptional({
    enum: AnalyticsAggregateDimension,
    default: AnalyticsAggregateDimension.OVERVIEW,
  })
  @IsOptional()
  @IsEnum(AnalyticsAggregateDimension)
  dimension = AnalyticsAggregateDimension.OVERVIEW;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  dateTo?: string;

  @ApiPropertyOptional({
    default: 500,
    maximum: 2000,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(2000)
  limit = 500;
}
