import type { LoginInput } from '@command-center/shared-types';
import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';

export class LoginDto implements LoginInput {
  @ApiProperty({
    example: 'owner@example.com',
  })
  @IsEmail()
  @MaxLength(320)
  email!: string;

  @ApiProperty({
    example: 'StrongPassword123!',
  })
  @IsString()
  @MinLength(1)
  @MaxLength(128)
  password!: string;
}
