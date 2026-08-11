import type { RegisterInput } from '@command-center/shared-types';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, Length, MaxLength, MinLength } from 'class-validator';

export class RegisterDto implements RegisterInput {
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
}
