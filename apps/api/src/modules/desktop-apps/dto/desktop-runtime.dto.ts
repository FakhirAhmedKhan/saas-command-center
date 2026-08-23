import {
    DesktopArchitecture,
    DesktopPerformanceMetricType,
    DesktopPlatform,
    DesktopReleaseChannel,
} from 'src/generated/prisma/enums';
import {
    ArrayMaxSize,
    IsArray,
    IsDateString,
    IsEnum,
    IsInt,
    IsNumber,
    IsOptional,
    IsString,
    IsUUID,
    Max,
    MaxLength,
    Min,
    ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class DesktopRuntimeQueryDto {
    @ApiPropertyOptional()
    @IsOptional()
    @IsDateString()
    from?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsDateString()
    to?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    @MaxLength(64)
    version?: string;

    @ApiPropertyOptional({ enum: DesktopPlatform })
    @IsOptional()
    @IsEnum(DesktopPlatform)
    platform?: DesktopPlatform;

    @ApiPropertyOptional({ enum: DesktopArchitecture })
    @IsOptional()
    @IsEnum(DesktopArchitecture)
    architecture?: DesktopArchitecture;

    @ApiPropertyOptional({ enum: DesktopReleaseChannel })
    @IsOptional()
    @IsEnum(DesktopReleaseChannel)
    channel?: DesktopReleaseChannel;
}

export class DesktopMetricIngestItemDto {
    @IsString()
    @MaxLength(255)
    externalId!: string;

    @IsEnum(DesktopPerformanceMetricType)
    type!: DesktopPerformanceMetricType;

    @IsNumber()
    value!: number;

    @IsString()
    @MaxLength(32)
    unit!: string;

    @IsDateString()
    recordedAt!: string;

    @IsOptional()
    @IsString()
    @MaxLength(64)
    version?: string | null;

    @IsOptional()
    @IsEnum(DesktopPlatform)
    platform?: DesktopPlatform | null;

    @IsOptional()
    @IsEnum(DesktopArchitecture)
    architecture?: DesktopArchitecture | null;

    @IsOptional()
    @IsEnum(DesktopReleaseChannel)
    channel?: DesktopReleaseChannel | null;
}

export class DesktopCrashIngestItemDto {
    @IsString()
    @MaxLength(255)
    externalId!: string;

    @IsString()
    @MaxLength(512)
    fingerprint!: string;

    @IsString()
    @MaxLength(10_000)
    message!: string;

    @IsInt()
    @Min(0)
    count!: number;

    @IsInt()
    @Min(0)
    affectedUsers!: number;

    @IsDateString()
    firstSeenAt!: string;

    @IsDateString()
    lastSeenAt!: string;

    @IsOptional()
    @IsString()
    @MaxLength(64)
    version?: string | null;

    @IsOptional()
    @IsEnum(DesktopPlatform)
    platform?: DesktopPlatform | null;

    @IsOptional()
    @IsEnum(DesktopArchitecture)
    architecture?: DesktopArchitecture | null;

    @IsOptional()
    @IsEnum(DesktopReleaseChannel)
    channel?: DesktopReleaseChannel | null;
}

export class IngestDesktopRuntimeDto {
    @IsUUID()
    integrationId!: string;

    @IsArray()
    @ArrayMaxSize(5000)
    @ValidateNested({ each: true })
    @Type(() => DesktopMetricIngestItemDto)
    performance!: DesktopMetricIngestItemDto[];

    @IsArray()
    @ArrayMaxSize(2000)
    @ValidateNested({ each: true })
    @Type(() => DesktopCrashIngestItemDto)
    crashes!: DesktopCrashIngestItemDto[];
}