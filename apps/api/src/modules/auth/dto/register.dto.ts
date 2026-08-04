import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsOptional,
  IsString,
  Length,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class RegisterDto {
  @ApiProperty({
    example: 'owner@example.com',
  })
  @IsEmail()
  @MaxLength(320)
  email!: string;

  @ApiProperty({
    minLength: 12,
    example: 'StrongPassword123!',
  })
  @IsString()
  @MinLength(12)
  @MaxLength(128)
  password!: string;

  @ApiPropertyOptional({
    example: 'John Developer',
  })
  @IsOptional()
  @IsString()
  @Length(2, 120)
  displayName?: string;

  @ApiProperty({
    example: 'My SaaS Workspace',
  })
  @IsString()
  @Length(2, 120)
  workspaceName!: string;

  @ApiPropertyOptional({
    example: 'my-saas-workspace',
  })
  @IsOptional()
  @IsString()
  @Length(2, 120)
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message:
      'workspaceSlug can contain lowercase letters, numbers and hyphens only',
  })
  workspaceSlug?: string;
}