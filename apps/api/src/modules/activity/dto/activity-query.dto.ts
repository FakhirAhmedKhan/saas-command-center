import {
  Transform,
  Type,
} from 'class-transformer';

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

import {
  ApiPropertyOptional,
} from '@nestjs/swagger';

import {
  ActivityActorType,
  ActivityEntityType,
  ApplicationActivityType,
} from 'src/generated/prisma/enums';

function trimString(
  value: unknown,
): unknown {
  return typeof value ===
    'string'
    ? value.trim()
    : value;
}

export class ActivityQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  @Transform(
    ({ value }: { value: unknown }) =>
      trimString(value),
  )
  search?: string;

  @ApiPropertyOptional({
    enum:
      ApplicationActivityType,
  })
  @IsOptional()
  @IsEnum(
    ApplicationActivityType,
  )
  activityType?:
    ApplicationActivityType;

  @ApiPropertyOptional({
    enum:
      ActivityActorType,
  })
  @IsOptional()
  @IsEnum(
    ActivityActorType,
  )
  actorType?:
    ActivityActorType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  actorUserId?: string;

  @ApiPropertyOptional({
    enum:
      ActivityEntityType,
  })
  @IsOptional()
  @IsEnum(
    ActivityEntityType,
  )
  entityType?:
    ActivityEntityType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  entityId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  to?: string;

  @ApiPropertyOptional({
    default: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @ApiPropertyOptional({
    default: 25,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 25;
}