import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { DesktopAnalysisAction } from 'src/generated/prisma/enums';

export class AnalyzeDesktopAppDto {
  @ApiProperty({ enum: DesktopAnalysisAction })
  @IsEnum(DesktopAnalysisAction)
  action!: DesktopAnalysisAction;

  @ApiPropertyOptional({ maxLength: 2000 })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  question?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  buildId?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  releaseId?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  crashId?: string;
}