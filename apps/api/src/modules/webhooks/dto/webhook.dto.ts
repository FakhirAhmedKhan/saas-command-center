import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';

import { Type } from 'class-transformer';

import { ArrayMaxSize, ArrayMinSize, IsArray, IsBoolean, IsEnum, IsInt, IsOptional, IsString, IsUrl, Max, MaxLength, Min } from 'class-validator';

import { WebhookDeliveryStatus, WebhookEventType } from '../../../generated/prisma/client';

export class CreateWebhookEndpointDto {
  @ApiProperty({
    example: 'Production automation',
  })
  @IsString()
  @MaxLength(100)
  name!: string;

  @ApiProperty({
    example: 'https://automation.example.com/webhooks/command-center',
  })
  @IsUrl({
    protocols: ['http', 'https'],

    require_protocol: true,
  })
  @MaxLength(2_000)
  url!: string;

  @ApiProperty({
    enum: WebhookEventType,

    isArray: true,
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(20)
  @IsEnum(WebhookEventType, {
    each: true,
  })
  eventTypes!: WebhookEventType[];

  @ApiPropertyOptional({
    default: 10_000,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1_000)
  @Max(30_000)
  timeoutMs?: number;

  @ApiPropertyOptional({
    default: 5,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(8)
  maxAttempts?: number;

  @ApiPropertyOptional({
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;
}

export class UpdateWebhookEndpointDto extends PartialType(CreateWebhookEndpointDto) {}

export class WebhookDeliveryListQueryDto {
  @ApiPropertyOptional({
    enum: WebhookDeliveryStatus,
  })
  @IsOptional()
  @IsEnum(WebhookDeliveryStatus)
  status?: WebhookDeliveryStatus;

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
