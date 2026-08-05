import { Transform, Type } from 'class-transformer';

import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

import { ApiPropertyOptional } from '@nestjs/swagger';

import {
  ActivityActorType,
  ActivityEntityType,
  ApplicationActivityType,
} from 'src/generated/prisma/enums';

export class ActivityQueryDto {
  @ApiPropertyOptional({
    example: 'status',
  })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  search?: string;

  @ApiPropertyOptional({
    enum: ApplicationActivityType,
  })
  @IsOptional()
  @IsEnum(ApplicationActivityType)
  activityType?: ApplicationActivityType;

  @ApiPropertyOptional({
    enum: ActivityActorType,
  })
  @IsOptional()
  @IsEnum(ActivityActorType)
  actorType?: ActivityActorType;

  @ApiPropertyOptional({
    enum: ActivityEntityType,
  })
  @IsOptional()
  @IsEnum(ActivityEntityType)
  entityType?: ActivityEntityType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  actorUserId?: string;

  @ApiPropertyOptional({
    example: '2026-08-01T00:00:00.000Z',
  })
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @ApiPropertyOptional({
    example: '2026-08-31T23:59:59.999Z',
  })
  @IsOptional()
  @IsDateString()
  dateTo?: string;

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
