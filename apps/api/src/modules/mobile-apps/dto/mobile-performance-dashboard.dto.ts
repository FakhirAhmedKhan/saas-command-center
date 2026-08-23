import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsISO8601, IsOptional, IsString, MaxLength } from 'class-validator';
import { MobilePlatform } from 'src/generated/prisma/enums';

export class MobilePerformanceQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsISO8601()
  from?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsISO8601()
  to?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(64)
  version?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(64)
  buildNumber?: string;

  @ApiPropertyOptional({
    enum: MobilePlatform,
  })
  @IsOptional()
  @IsEnum(MobilePlatform)
  platform?: MobilePlatform;
}

export class CompareMobilePerformanceDto {
  @ApiPropertyOptional()
  @IsString()
  @MaxLength(64)
  fromVersion!: string;

  @ApiPropertyOptional()
  @IsString()
  @MaxLength(64)
  toVersion!: string;
}
