import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsISO8601, IsOptional, IsString, IsUUID, Length, MaxLength } from 'class-validator';
import { MobileBuildStatus, MobilePlatform } from 'src/generated/prisma/enums';

export class IngestGithubMobileBuildDto {
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
    example: 'development',
  })
  @IsString()
  @Length(1, 255)
  branch!: string;

  @ApiPropertyOptional({
    example: '6.14.0',
  })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  version?: string | null;

  @ApiPropertyOptional({
    example: '815',
  })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  buildNumber?: string | null;

  @ApiProperty({
    enum: MobilePlatform,
  })
  @IsEnum(MobilePlatform)
  platform!: MobilePlatform;

  @ApiProperty({
    enum: MobileBuildStatus,
  })
  @IsEnum(MobileBuildStatus)
  status!: MobileBuildStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsISO8601()
  startedAt?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsISO8601()
  completedAt?: string | null;
}

export class MobileBuildQueryDto {
  @ApiPropertyOptional({
    enum: MobileBuildStatus,
  })
  @IsOptional()
  @IsEnum(MobileBuildStatus)
  status?: MobileBuildStatus;

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

  @ApiPropertyOptional({
    enum: MobilePlatform,
  })
  @IsOptional()
  @IsEnum(MobilePlatform)
  platform?: MobilePlatform;
}
