/* eslint-disable @typescript-eslint/no-unsafe-argument */
import {
    ApiProperty,
    ApiPropertyOptional,
    PartialType,
} from '@nestjs/swagger';

import {
    Type,
} from 'class-transformer';

import {
    IsBoolean,
    IsEnum,
    IsInt,
    IsOptional,
    IsString,
    IsUrl,
    IsUUID,
    Max,
    MaxLength,
    Min,
    ValidateIf,
} from 'class-validator';

import {
    HealthCheckStatus,
    HealthIncidentStatus,
    HealthTargetType,
} from '../../../generated/prisma/client';

export class CreateHealthCheckDto {
    @ApiProperty({
        enum: HealthTargetType,
    })
    @IsEnum(
        HealthTargetType,
    )
    targetType!:
        HealthTargetType;

    @ApiPropertyOptional()
    @ValidateIf(
        (
            dto:
                CreateHealthCheckDto,
        ) =>
            dto.targetType ===
            HealthTargetType
                .APPLICATION,
    )
    @IsUUID()
    applicationId?:
        string;

    @ApiPropertyOptional()
    @ValidateIf(
        (
            dto:
                CreateHealthCheckDto,
        ) =>
            dto.targetType ===
            HealthTargetType
                .WEBSITE,
    )
    @IsUUID()
    websiteId?:
        string;

    @ApiProperty({
        example:
            'Production API',
    })
    @IsString()
    @MaxLength(100)
    name!: string;

    @ApiProperty({
        example:
            'https://api.example.com/health',
    })
    @IsUrl({
        protocols: [
            'http',
            'https',
        ],

        require_protocol:
            true,
    })
    @MaxLength(2_000)
    url!: string;

    @ApiProperty({
        default: 300,
    })
    @Type(() => Number)
    @IsInt()
    @Min(60)
    @Max(86_400)
    intervalSeconds =
        300;

    @ApiProperty({
        default: 10_000,
    })
    @Type(() => Number)
    @IsInt()
    @Min(1_000)
    @Max(30_000)
    timeoutMs =
        10_000;

    @ApiProperty({
        default: 200,
    })
    @Type(() => Number)
    @IsInt()
    @Min(100)
    @Max(599)
    expectedStatusMin =
        200;

    @ApiProperty({
        default: 399,
    })
    @Type(() => Number)
    @IsInt()
    @Min(100)
    @Max(599)
    expectedStatusMax =
        399;

    @ApiProperty({
        default: 1_500,
    })
    @Type(() => Number)
    @IsInt()
    @Min(1)
    @Max(30_000)
    degradedAfterMs =
        1_500;

    @ApiProperty({
        default: 3,
    })
    @Type(() => Number)
    @IsInt()
    @Min(1)
    @Max(20)
    failureThreshold =
        3;

    @ApiProperty({
        default: true,
    })
    @IsBoolean()
    enabled =
        true;
}

export class UpdateHealthCheckDto
    extends PartialType(
        CreateHealthCheckDto,
    ) { }

export class HealthCheckListQueryDto {
    @ApiPropertyOptional({
        enum:
            HealthCheckStatus,
    })
    @IsOptional()
    @IsEnum(
        HealthCheckStatus,
    )
    status?:
        HealthCheckStatus;

    @ApiPropertyOptional({
        enum:
            HealthTargetType,
    })
    @IsOptional()
    @IsEnum(
        HealthTargetType,
    )
    targetType?:
        HealthTargetType;

    @ApiPropertyOptional()
    @IsOptional()
    @Type(() => Boolean)
    @IsBoolean()
    enabled?:
        boolean;

    @ApiPropertyOptional()
    @IsOptional()
    @IsUUID()
    applicationId?:
        string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsUUID()
    websiteId?:
        string;
}

export class IncidentListQueryDto {
    @ApiPropertyOptional({
        enum:
            HealthIncidentStatus,
    })
    @IsOptional()
    @IsEnum(
        HealthIncidentStatus,
    )
    status?:
        HealthIncidentStatus;
}