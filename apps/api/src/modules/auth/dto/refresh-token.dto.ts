import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class RefreshTokenDto {
  @ApiPropertyOptional({
    description:
      'Optional fallback. Normally the refresh token is read from the HTTP-only cookie.',
  })
  @IsOptional()
  @IsString()
  refreshToken?: string;
}