import { Type } from 'class-transformer';

import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

import { RawAnalyticsEventType } from 'src/generated/prisma/enums';

export class TrackerEventDto {
  @IsString()
  @Matches(/^[a-zA-Z0-9_-]{16,80}$/)
  eventId!: string;

  @IsEnum(RawAnalyticsEventType)
  type!: RawAnalyticsEventType;

  @IsString()
  @Matches(/^[a-zA-Z0-9_-]{16,80}$/)
  visitorId!: string;

  @IsString()
  @Matches(/^[a-zA-Z0-9_-]{16,80}$/)
  sessionId!: string;

  @IsDateString()
  timestamp!: string;

  @IsString()
  @MaxLength(2048)
  url!: string;

  @IsOptional()
  @IsString()
  @MaxLength(512)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2048)
  referrer?: string;

  @IsOptional()
  @IsString()
  @Matches(/^[a-zA-Z][a-zA-Z0-9_.:-]{1,99}$/)
  eventName?: string;

  @IsOptional()
  @IsObject()
  properties?: Record<string, unknown>;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100_000)
  screenWidth?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100_000)
  screenHeight?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100_000)
  viewportWidth?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100_000)
  viewportHeight?: number;

  @IsOptional()
  @IsString()
  @MaxLength(35)
  language?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  timeZone?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(300_000)
  durationMs?: number;
}

export class CollectEventsDto {
  @IsUUID()
  websiteId!: string;

  @IsString()
  @MaxLength(160)
  trackingKey!: string;

  @IsString()
  @MaxLength(32)
  sdkVersion!: string;

  @IsDateString()
  sentAt!: string;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(25)
  @ValidateNested({
    each: true,
  })
  @Type(() => TrackerEventDto)
  events!: TrackerEventDto[];
}
