import type { TypedConfigService } from '../../../config/runtime-config';
import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { CookieOptions, Request, Response } from 'express';

@Injectable()
export class AuthCookieService {
  constructor(
    @Inject(ConfigService)
    private readonly config: TypedConfigService,
  ) {}

  getRefreshToken(request: Request): string | undefined {
    const cookies = request.cookies as Record<string, unknown> | undefined;
    const token = cookies?.[this.getCookieName()];

    return typeof token === 'string' && token.length > 0 ? token : undefined;
  }

  setRefreshToken(response: Response, refreshToken: string): void {
    response.cookie(this.getCookieName(), refreshToken, {
      ...this.getBaseOptions(),

      maxAge: this.config.get('COOKIE_MAX_AGE_MS', {
        infer: true,
      }),
    });
  }

  clearRefreshToken(response: Response): void {
    response.clearCookie(this.getCookieName(), this.getBaseOptions());
  }

  private getCookieName(): string {
    return this.config.get('COOKIE_NAME', {
      infer: true,
    });
  }

  private getBaseOptions(): CookieOptions {
    const domain = this.config.get('COOKIE_DOMAIN', {
      infer: true,
    });

    return {
      httpOnly: true,
      secure: this.config.get('COOKIE_SECURE', {
        infer: true,
      }),

      sameSite: this.config.get('COOKIE_SAME_SITE', {
        infer: true,
      }),

      path: '/api/v1/auth',

      ...(domain
        ? {
            domain,
          }
        : {}),
    };
  }
}
