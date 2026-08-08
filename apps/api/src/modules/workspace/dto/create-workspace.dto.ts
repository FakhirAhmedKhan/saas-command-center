import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { IsOptional, IsString, Length, MaxLength } from 'class-validator';

export class CreateWorkspaceDto {
  @ApiProperty({
    example: 'MadadAI Team',
    minLength: 2,
    maxLength: 120,
  })
  @IsString()
  @Length(2, 120)
  name!: string;

  @ApiPropertyOptional({
    example: 'madadai-team',
    description: 'Optional. A slug will be generated from the workspace name when omitted.',
    maxLength: 120,
  })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  slug?: string;
}
