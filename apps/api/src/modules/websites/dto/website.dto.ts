import { Transform, Type } from 'class-transformer';

import {
  ArrayMaxSize,
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';

function transformBoolean({
  value,
  obj,
  key,
}: {
  value: unknown;
  obj?: Record<string, unknown>;
  key?: string;
}): unknown {
  const rawValue = obj && key ? obj[key] : value;

  if (rawValue === true || rawValue === 'true') {
    return true;
  }

  if (rawValue === false || rawValue === 'false') {
    return false;
  }

  return rawValue;
}
export class CreateWebsiteDto {
  @ApiProperty({
    example: 'SaaS Command Center',
  })
  @IsString()
  @Length(2, 160)
  name!: string;

  @ApiProperty({
    example: 'command-center.example.com',
    description: 'Domain without a path. Protocol is optional.',
  })
  @IsString()
  @Length(1, 253)
  domain!: string;

  @ApiPropertyOptional({
    example: 'Asia/Dubai',
    default: 'UTC',
  })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  timeZone?: string;

  @ApiPropertyOptional({
    type: [String],
    example: ['https://command-center.example.com', 'http://localhost:3000'],
  })
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @ArrayMaxSize(20)
  @IsString({
    each: true,
  })
  allowedOrigins?: string[];

  @ApiPropertyOptional({
    description: 'Optional SaaS application to connect to.',
  })
  @IsOptional()
  @IsUUID()
  applicationId?: string | null;

  @ApiPropertyOptional({
    default: true,
  })
  @IsOptional()
  @Transform(transformBoolean)
  @IsBoolean()
  enabled?: boolean;
}

export class UpdateWebsiteDto extends PartialType(CreateWebsiteDto) {}

export class ConnectWebsiteDto {
  @ApiProperty()
  @IsUUID()
  applicationId!: string;
}

export class WebsiteListQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(160)
  search?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  applicationId?: string;

  @ApiPropertyOptional({
    description: 'Filter connected or unconnected websites.',
  })
  @IsOptional()
  @Transform(transformBoolean)
  @IsBoolean()
  connected?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(transformBoolean)
  @IsBoolean()
  enabled?: boolean;

  @ApiPropertyOptional({
    default: false,
  })
  @IsOptional()
  @Transform(transformBoolean)
  @IsBoolean()
  archived?: boolean;

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
