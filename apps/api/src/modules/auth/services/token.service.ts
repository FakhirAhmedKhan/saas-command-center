import { createHash } from 'node:crypto';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';

import { JWT_AUDIENCE, JWT_ISSUER } from '../auth.constants';
import type { AccessTokenPayload, RefreshTokenPayload } from '../interfaces/jwt-payload.interface';

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  accessExpiresInSeconds: number;
  refreshExpiresAt: Date;
}

@Injectable()
export class TokenService {
  private readonly accessSecret: string;
  private readonly refreshSecret: string;

  private readonly accessExpiresInSeconds: number;
  private readonly refreshExpiresInSeconds: number;

  constructor(
    private readonly jwtService: JwtService,
    configService: ConfigService,
  ) {
    this.accessSecret = configService.getOrThrow<string>('JWT_ACCESS_SECRET');

    this.refreshSecret = configService.getOrThrow<string>('JWT_REFRESH_SECRET');

    this.accessExpiresInSeconds = this.parseDuration(
      configService.get<string>('ACCESS_TOKEN_TTL') ?? '15m',
    );

    this.refreshExpiresInSeconds = this.parseDuration(
      configService.get<string>('REFRESH_TOKEN_TTL') ?? '30d',
    );
  }

  async issueTokenPair(userId: string, sessionId: string, familyId: string): Promise<TokenPair> {
    const accessPayload: AccessTokenPayload = {
      sub: userId,
      type: 'access',
    };

    const refreshPayload: RefreshTokenPayload = {
      sub: userId,
      sid: sessionId,
      fid: familyId,
      type: 'refresh',
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(accessPayload, {
        secret: this.accessSecret,
        expiresIn: this.accessExpiresInSeconds,
        issuer: JWT_ISSUER,
        audience: JWT_AUDIENCE,
      }),

      this.jwtService.signAsync(refreshPayload, {
        secret: this.refreshSecret,
        expiresIn: this.refreshExpiresInSeconds,
        issuer: JWT_ISSUER,
        audience: JWT_AUDIENCE,
      }),
    ]);

    return {
      accessToken,
      refreshToken,
      accessExpiresInSeconds: this.accessExpiresInSeconds,

      refreshExpiresAt: new Date(Date.now() + this.refreshExpiresInSeconds * 1000),
    };
  }

  async verifyRefreshToken(token: string): Promise<RefreshTokenPayload> {
    try {
      const payload = await this.jwtService.verifyAsync<RefreshTokenPayload>(token, {
        secret: this.refreshSecret,
        issuer: JWT_ISSUER,
        audience: JWT_AUDIENCE,
      });

      if (payload.type !== 'refresh' || !payload.sub || !payload.sid || !payload.fid) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      return payload;
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }

  hashRefreshToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  getRefreshCookieMaxAge(): number {
    return this.refreshExpiresInSeconds * 1000;
  }

  private parseDuration(value: string): number {
    const normalized = value.trim().toLowerCase();

    if (/^\d+$/.test(normalized)) {
      const seconds = Number(normalized);

      if (!Number.isSafeInteger(seconds) || seconds <= 0) {
        throw new Error(`Invalid token duration "${value}"`);
      }

      return seconds;
    }

    const match = /^(\d+)(s|m|h|d)$/.exec(normalized);

    if (!match) {
      throw new Error(`Invalid token duration "${value}". Use values such as 30s, 15m, 1h or 30d.`);
    }

    const amountText = match.at(1);
    const unit = match.at(2);

    if (!amountText || !unit) {
      throw new Error(`Invalid token duration "${value}"`);
    }

    const amount = Number(amountText);

    if (!Number.isSafeInteger(amount) || amount <= 0) {
      throw new Error(`Invalid token duration "${value}"`);
    }

    const multiplier: Record<string, number> = {
      s: 1,
      m: 60,
      h: 60 * 60,
      d: 60 * 60 * 24,
    };

    const unitMultiplier = multiplier[unit];

    if (unitMultiplier === undefined) {
      throw new Error(`Unsupported token duration unit "${unit}"`);
    }

    return amount * unitMultiplier;
  }
}
