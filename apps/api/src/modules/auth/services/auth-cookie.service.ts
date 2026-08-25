import type { TypedConfigService } from '../../../config/runtime-config';
import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { FastifyReply, FastifyRequest } from 'fastify';

@Injectable()
export class AuthCookieService {
  constructor(
    @Inject(ConfigService)
    private readonly config: TypedConfigService,
  ) {}

  getRefreshToken(request: FastifyRequest): string | undefined {
    const cookies = request.cookies as Record<string, unknown> | undefined;
    const token = cookies?.[this.getCookieName()];

    return typeof token === 'string' && token.length > 0 ? token : undefined;
  }

  setRefreshToken(response: FastifyReply, refreshToken: string): void {
    response.setCookie(this.getCookieName(), refreshToken, {
      ...this.getBaseOptions(),

      maxAge: Math.floor(
        this.config.get('COOKIE_MAX_AGE_MS', {
          infer: true,
        }) / 1000,
      ),
    });
  }

  clearRefreshToken(response: FastifyReply): void {
    response.clearCookie(this.getCookieName(), this.getBaseOptions());
  }

  private getCookieName(): string {
    return this.config.get('COOKIE_NAME', {
      infer: true,
    });
  }

  private getBaseOptions(): Parameters<FastifyReply['setCookie']>[2] {
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
