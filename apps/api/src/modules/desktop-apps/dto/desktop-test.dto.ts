import { DesktopTestStatus, DesktopTestType } from 'src/generated/prisma/enums';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsDateString, IsEnum, IsInt, IsOptional, IsString, MaxLength, Min, ValidateNested } from 'class-validator';

export class DesktopTestFailureDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  suite?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  testName?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(20_000)
  message?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2048)
  file?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  line?: number | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(50_000)
  stackTrace?: string | null;
}

export class IngestDesktopTestRunDto {
  @ApiProperty({
    enum: DesktopTestType,
  })
  @IsEnum(DesktopTestType)
  type!: DesktopTestType;

  @ApiProperty({
    enum: DesktopTestStatus,
  })
  @IsEnum(DesktopTestStatus)
  status!: DesktopTestStatus;

  @ApiProperty()
  @IsInt()
  @Min(0)
  passed!: number;

  @ApiProperty()
  @IsInt()
  @Min(0)
  failed!: number;

  @ApiProperty()
  @IsInt()
  @Min(0)
  skipped!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  durationMs?: number | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  startedAt?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  completedAt?: string | null;

  @ApiPropertyOptional({
    type: [DesktopTestFailureDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({
    each: true,
  })
  @Type(() => DesktopTestFailureDto)
  failures?: DesktopTestFailureDto[];
}
