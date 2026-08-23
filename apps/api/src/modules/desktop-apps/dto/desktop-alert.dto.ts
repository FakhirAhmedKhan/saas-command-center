import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsEnum, IsInt, IsNumber, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { DesktopAlertOperator, DesktopAlertRuleType } from 'src/generated/prisma/enums';

export class CreateDesktopAlertRuleDto {
  @ApiProperty({ example: 'Crash rate > 2%' })
  @IsString()
  @MaxLength(160)
  name!: string;

  @ApiProperty({ enum: DesktopAlertRuleType })
  @IsEnum(DesktopAlertRuleType)
  type!: DesktopAlertRuleType;

  @ApiPropertyOptional({ enum: DesktopAlertOperator, default: DesktopAlertOperator.GT })
  @IsOptional()
  @IsEnum(DesktopAlertOperator)
  operator?: DesktopAlertOperator;

  @ApiPropertyOptional({ example: 2 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  threshold?: number;

  @ApiPropertyOptional({ default: 60 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(10080)
  cooldownMinutes?: number;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;
}

export class UpdateDesktopAlertRuleDto extends PartialType(CreateDesktopAlertRuleDto) {}