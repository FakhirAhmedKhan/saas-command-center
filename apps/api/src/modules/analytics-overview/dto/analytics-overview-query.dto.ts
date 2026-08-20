import { AnalyticsDatePreset, type AnalyticsOverviewQueryInput, type AnalyticsPreset } from '@command-center/shared-types';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, Matches, ValidateIf } from 'class-validator';

export { AnalyticsDatePreset };

const DATE_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export class AnalyticsOverviewQueryDto implements AnalyticsOverviewQueryInput {
  @ApiPropertyOptional({
    enum: AnalyticsDatePreset,
    default: AnalyticsDatePreset.SEVEN_DAYS,
    description: 'Analytics range calculated in the website timezone.',
  })
  @IsOptional()
  @IsEnum(AnalyticsDatePreset)
  preset: AnalyticsPreset = AnalyticsDatePreset.SEVEN_DAYS;

  @ApiPropertyOptional({
    example: '2026-08-01',
    description: 'Inclusive custom start date using YYYY-MM-DD.',
  })
  @ValidateIf((query: AnalyticsOverviewQueryDto) => query.from !== undefined || query.to !== undefined)
  @Matches(DATE_KEY_PATTERN, {
    message: 'from must use YYYY-MM-DD format',
  })
  from?: string;

  @ApiPropertyOptional({
    example: '2026-08-07',
    description: 'Inclusive custom end date using YYYY-MM-DD.',
  })
  @ValidateIf((query: AnalyticsOverviewQueryDto) => query.from !== undefined || query.to !== undefined)
  @Matches(DATE_KEY_PATTERN, {
    message: 'to must use YYYY-MM-DD format',
  })
  to?: string;
}
