import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { MobileAnalysisAction } from 'src/generated/prisma/enums';

export class AnalyzeMobileAppDto {
  @ApiProperty({
    enum: MobileAnalysisAction,
  })
  @IsEnum(MobileAnalysisAction)
  action!: MobileAnalysisAction;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  question?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  buildId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  releaseId?: string;
}
