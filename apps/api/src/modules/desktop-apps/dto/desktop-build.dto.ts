import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsInt, IsOptional, IsString, IsUUID, Length, MaxLength, Min } from 'class-validator';
import { DesktopArchitecture, DesktopBuildStatus, DesktopPlatform } from 'src/generated/prisma/enums';

export class DesktopBuildQueryDto {
  @ApiPropertyOptional({
    enum: DesktopBuildStatus,
  })
  @IsOptional()
  @IsEnum(DesktopBuildStatus)
  status?: DesktopBuildStatus;

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

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  branch?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(64)
  version?: string;
}

export class IngestGithubDesktopBuildDto {
  @ApiProperty({
    format: 'uuid',
  })
  @IsUUID()
  repositoryId!: string;

  @ApiProperty({
    example: '123456789',
  })
  @IsString()
  @Length(1, 128)
  workflowRunId!: string;

  @ApiProperty({
    example: 'a93f14258b51e9b424c4d7cb05f98751feef272d',
  })
  @IsString()
  @Length(7, 64)
  commitSha!: string;

  @ApiProperty({
    example: 'main',
  })
  @IsString()
  @Length(1, 255)
  branch!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(64)
  version?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(64)
  buildNumber?: string | null;

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

  @ApiPropertyOptional({
    enum: DesktopBuildStatus,
  })
  @IsOptional()
  @IsEnum(DesktopBuildStatus)
  status?: DesktopBuildStatus;

  @ApiPropertyOptional({
    description: 'Raw GitHub Actions conclusion. Used only when status is not supplied.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  conclusion?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  startedAt?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  completedAt?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  durationMs?: number | null;
}
