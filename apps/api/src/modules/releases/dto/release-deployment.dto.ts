import { DeploymentStatus } from '../../../generated/prisma/client';
import type {
  CreateDeploymentInput,
  CreateReleaseInput,
  DeploymentListQueryInput,
  ReleaseListQueryInput,
  TransitionDeploymentInput,
  UpdateReleaseInput,
} from '@command-center/shared-types';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDateString, IsEnum, IsInt, IsOptional, IsString, IsUrl, IsUUID, Matches, Max, MaxLength, Min, ValidateIf } from 'class-validator';

const VERSION_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,63}$/;

const URL_OPTIONS = {
  protocols: ['http', 'https'],
  require_protocol: true,
  require_tld: false,
};

export class CreateReleaseDto implements CreateReleaseInput {
  @ApiProperty({
    example: '1.4.0',
  })
  @IsString()
  @Matches(VERSION_PATTERN, {
    message: 'version may contain letters, numbers, dots, underscores, and hyphens',
  })
  version!: string;

  @ApiPropertyOptional({
    example: 'August release',
  })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(20_000)
  notes?: string;

  @ApiPropertyOptional({
    example: 'a8f21d4',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  commitRef?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl(URL_OPTIONS)
  @MaxLength(2_000)
  repositoryUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  scheduledAt?: string;
}

export class UpdateReleaseDto extends PartialType(CreateReleaseDto) implements UpdateReleaseInput {}

export class CreateDeploymentDto implements CreateDeploymentInput {
  @ApiProperty()
  @IsUUID()
  releaseId!: string;

  @ApiProperty()
  @IsUUID()
  environmentId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  commitRef?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl(URL_OPTIONS)
  @MaxLength(2_000)
  repositoryUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl(URL_OPTIONS)
  @MaxLength(2_000)
  ciJobUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl(URL_OPTIONS)
  @MaxLength(2_000)
  liveUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(20_000)
  deploymentNotes?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  scheduledAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  healthIncidentId?: string;
}

export class TransitionDeploymentDto implements TransitionDeploymentInput {
  @ApiProperty({
    enum: DeploymentStatus,
  })
  @IsEnum(DeploymentStatus)
  status!: DeploymentStatus;

  @ApiPropertyOptional()
  @ValidateIf((dto: TransitionDeploymentDto) => dto.status === DeploymentStatus.SCHEDULED)
  @IsDateString()
  scheduledAt?: string;

  @ApiPropertyOptional()
  @ValidateIf((dto: TransitionDeploymentDto) => dto.status === DeploymentStatus.FAILED)
  @IsString()
  @MaxLength(5_000)
  failureReason?: string;

  @ApiPropertyOptional()
  @ValidateIf((dto: TransitionDeploymentDto) => dto.status === DeploymentStatus.ROLLED_BACK)
  @IsUUID()
  rollbackToDeploymentId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  healthIncidentId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2_000)
  message?: string;
}

export class DeploymentListQueryDto implements DeploymentListQueryInput {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  environmentId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  releaseId?: string;

  @ApiPropertyOptional({
    enum: DeploymentStatus,
  })
  @IsOptional()
  @IsEnum(DeploymentStatus)
  status?: DeploymentStatus;

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

export class ReleaseListQueryDto implements ReleaseListQueryInput {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;

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
