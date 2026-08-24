import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, IsUUID, Length, MaxLength } from 'class-validator';
import { DesktopArchitecture, DesktopPlatform, DesktopReleaseChannel, DesktopReleaseStatus } from 'src/generated/prisma/enums';

export class CreateDesktopReleaseDto {
  @ApiProperty({
    format: 'uuid',
  })
  @IsUUID()
  buildId!: string;

  @ApiProperty({
    enum: DesktopReleaseChannel,
  })
  @IsEnum(DesktopReleaseChannel)
  channel!: DesktopReleaseChannel;

  @ApiPropertyOptional({
    example: '2.4.0',
  })
  @IsOptional()
  @IsString()
  @Length(1, 64)
  version?: string;

  @ApiPropertyOptional({
    example: '184',
  })
  @IsOptional()
  @IsString()
  @Length(1, 64)
  buildNumber?: string;

  @ApiPropertyOptional({
    nullable: true,
    maxLength: 20_000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(20_000)
  releaseNotes?: string | null;
}

export class UpdateDesktopReleaseStatusDto {
  @ApiProperty({
    enum: DesktopReleaseStatus,
  })
  @IsEnum(DesktopReleaseStatus)
  status!: DesktopReleaseStatus;
}

export class DesktopReleaseQueryDto {
  @ApiPropertyOptional({
    enum: DesktopReleaseChannel,
  })
  @IsOptional()
  @IsEnum(DesktopReleaseChannel)
  channel?: DesktopReleaseChannel;

  @ApiPropertyOptional({
    enum: DesktopReleaseStatus,
  })
  @IsOptional()
  @IsEnum(DesktopReleaseStatus)
  status?: DesktopReleaseStatus;

  @ApiPropertyOptional({
    enum: DesktopPlatform,
  })
  @IsOptional()
  @IsEnum(DesktopPlatform)
  platform?: DesktopPlatform;

  @ApiPropertyOptional({
    enum: DesktopArchitecture,
  })
  @IsOptional()
  @IsEnum(DesktopArchitecture)
  architecture?: DesktopArchitecture;
}
