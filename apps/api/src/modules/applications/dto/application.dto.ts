import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsEnum, IsInt, IsISO8601, IsOptional, IsString, Length, Matches, Max, MaxLength, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';

import { ApplicationCategory, ApplicationPriority, ApplicationStatus } from 'src/generated/prisma/enums';

export enum ApplicationSortBy {
  NAME = 'name',
  STATUS = 'status',
  PRIORITY = 'priority',
  CREATED_AT = 'createdAt',
  UPDATED_AT = 'updatedAt',
  TARGET_LAUNCH_AT = 'targetLaunchAt',
}

export enum SortOrder {
  ASC = 'asc',
  DESC = 'desc',
}

export class CreateApplicationDto {
  @ApiProperty({
    example: 'PriceScout AI',
  })
  @IsString()
  @Length(2, 160)
  name!: string;

  @ApiPropertyOptional({
    example: 'pricescout-ai',
  })
  @IsOptional()
  @IsString()
  @Length(2, 160)
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: 'slug can contain lowercase letters, numbers and hyphens only',
  })
  slug?: string;

  @ApiPropertyOptional({
    example: 'AI-powered UAE product price comparison platform.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(280)
  shortDescription?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(10_000)
  longDescription?: string | null;

  @ApiPropertyOptional({
    enum: ApplicationCategory,
    default: ApplicationCategory.SAAS,
  })
  @IsOptional()
  @IsEnum(ApplicationCategory)
  category?: ApplicationCategory;

  @ApiPropertyOptional({
    enum: ApplicationStatus,
    default: ApplicationStatus.IDEA,
  })
  @IsOptional()
  @IsEnum(ApplicationStatus)
  status?: ApplicationStatus;

  @ApiPropertyOptional({
    enum: ApplicationPriority,
    default: ApplicationPriority.MEDIUM,
  })
  @IsOptional()
  @IsEnum(ApplicationPriority)
  priority?: ApplicationPriority;

  @ApiPropertyOptional({
    example: '2026-08-01T00:00:00.000Z',
    nullable: true,
  })
  @IsOptional()
  @IsISO8601()
  startedAt?: string | null;

  @ApiPropertyOptional({
    example: '2026-10-01T00:00:00.000Z',
    nullable: true,
  })
  @IsOptional()
  @IsISO8601()
  targetLaunchAt?: string | null;

  @ApiPropertyOptional({
    nullable: true,
  })
  @IsOptional()
  @IsISO8601()
  launchedAt?: string | null;
}

export class UpdateApplicationDto extends PartialType(CreateApplicationDto) {}

export class ApplicationListQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(160)
  search?: string;

  @ApiPropertyOptional({
    enum: ApplicationStatus,
  })
  @IsOptional()
  @IsEnum(ApplicationStatus)
  status?: ApplicationStatus;

  @ApiPropertyOptional({
    enum: ApplicationPriority,
  })
  @IsOptional()
  @IsEnum(ApplicationPriority)
  priority?: ApplicationPriority;

  @ApiPropertyOptional({
    enum: ApplicationCategory,
  })
  @IsOptional()
  @IsEnum(ApplicationCategory)
  category?: ApplicationCategory;

  @ApiPropertyOptional({
    default: false,
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === true || value === 'true') {
      return true;
    }

    if (value === false || value === 'false') {
      return false;
    }

    return value;
  })
  @IsBoolean()
  archived?: boolean;

  @ApiPropertyOptional({
    enum: ApplicationSortBy,
    default: ApplicationSortBy.UPDATED_AT,
  })
  @IsOptional()
  @IsEnum(ApplicationSortBy)
  sortBy?: ApplicationSortBy;

  @ApiPropertyOptional({
    enum: SortOrder,
    default: SortOrder.DESC,
  })
  @IsOptional()
  @IsEnum(SortOrder)
  sortOrder?: SortOrder;

  @ApiPropertyOptional({
    default: 1,
    minimum: 1,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @ApiPropertyOptional({
    default: 20,
    minimum: 1,
    maximum: 100,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 20;
}
