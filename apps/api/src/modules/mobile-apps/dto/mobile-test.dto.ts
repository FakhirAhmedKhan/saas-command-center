import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsEnum, IsInt, IsOptional, IsString, MaxLength, Min, ValidateNested } from 'class-validator';
import { MobileTestStatus, MobileTestType } from 'src/generated/prisma/enums';

export class MobileTestFailureDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  suite?: string | null;

  @ApiProperty()
  @IsString()
  @MaxLength(500)
  testName!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  message?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  file?: string | null;
}

export class IngestMobileTestRunDto {
  @ApiProperty({
    enum: MobileTestType,
  })
  @IsEnum(MobileTestType)
  type!: MobileTestType;

  @ApiProperty({
    enum: MobileTestStatus,
  })
  @IsEnum(MobileTestStatus)
  status!: MobileTestStatus;

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

  @ApiPropertyOptional({
    type: [MobileTestFailureDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({
    each: true,
  })
  @Type(() => MobileTestFailureDto)
  failures?: MobileTestFailureDto[];
}
