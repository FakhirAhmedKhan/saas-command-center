 
import {
  ApiProperty,
  ApiPropertyOptional,
  PartialType,
} from '@nestjs/swagger';
import {
  IsEnum,
  IsOptional,
  IsString,
  Length,
  MaxLength,
} from 'class-validator';

import { TechnologyType } from 'src/generated/prisma/enums';

export class CreateApplicationTechnologyDto {
  @ApiProperty({
    example: 'Next.js',
  })
  @IsString()
  @Length(1, 80)
  name!: string;

  @ApiProperty({
    enum: TechnologyType,
  })
  @IsEnum(TechnologyType)
  type!: TechnologyType;

  @ApiPropertyOptional({
    example: '16.2.12',
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  version?: string | null;
}

export class UpdateApplicationTechnologyDto extends PartialType(
  CreateApplicationTechnologyDto,
) {}