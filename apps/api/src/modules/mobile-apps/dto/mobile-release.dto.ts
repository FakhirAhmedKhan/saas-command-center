import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { MobileReleaseEnvironment, MobileReleaseStatus } from 'src/generated/prisma/enums';

export class CreateMobileReleaseDto {
  @ApiProperty({
    format: 'uuid',
  })
  @IsUUID()
  buildId!: string;

  @ApiProperty({
    enum: MobileReleaseEnvironment,
  })
  @IsEnum(MobileReleaseEnvironment)
  environment!: MobileReleaseEnvironment;

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

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  releaseNotes?: string | null;
}

export class UpdateMobileReleaseStatusDto {
  @ApiProperty({
    enum: MobileReleaseStatus,
  })
  @IsEnum(MobileReleaseStatus)
  status!: MobileReleaseStatus;
}

export class MobileReleaseQueryDto {
  @ApiPropertyOptional({
    enum: MobileReleaseEnvironment,
  })
  @IsOptional()
  @IsEnum(MobileReleaseEnvironment)
  environment?: MobileReleaseEnvironment;

  @ApiPropertyOptional({
    enum: MobileReleaseStatus,
  })
  @IsOptional()
  @IsEnum(MobileReleaseStatus)
  status?: MobileReleaseStatus;
}
