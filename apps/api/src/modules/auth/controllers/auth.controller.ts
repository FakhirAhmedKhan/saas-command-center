import { CurrentUser } from '../decorators/current-user.decorator';
import { Public } from '../decorators/public.decorator';
import { LoginDto } from '../dto/login.dto';
import { RegisterDto } from '../dto/register.dto';
import { AuthenticatedUser } from '../interfaces/authenticated-user.interface';
import { AuthCookieService } from '../services/auth-cookie.service';
import { AuthService } from '../services/auth.service';
import { Body, Controller, Get, HttpCode, HttpStatus, Post, Req, Res, UnauthorizedException } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { FastifyReply, FastifyRequest } from 'fastify';

/*
 * These endpoints share the app-wide 100 req/min/IP throttle by default,
 * which is far too generous for credential-guessing/brute-force resistance.
 * Override with tighter, endpoint-specific limits (SEC-01).
 *
 * Resolved via a function (not a static value) so it's read fresh per
 * request rather than once at module load — matching the same
 * env-var-driven, per-request-resolved pattern already used by
 * IngestionRateLimitService for the analytics collector. This is what lets
 * environment overrides (e.g. a relaxed test-only limit in .env.test) apply
 * correctly for a freshly-booted test app without weakening the production
 * default declared here.
 */
function readPositiveInteger(value: string | undefined, fallback: number): number {
  const parsed = Number(value);

  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

const REGISTER_THROTTLE = {
  default: {
    limit: () => readPositiveInteger(process.env.AUTH_REGISTER_RATE_LIMIT, 5),
    ttl: () => readPositiveInteger(process.env.AUTH_REGISTER_RATE_WINDOW_MS, 60_000),
  },
};
const LOGIN_THROTTLE = {
  default: {
    limit: () => readPositiveInteger(process.env.AUTH_LOGIN_RATE_LIMIT, 5),
    ttl: () => readPositiveInteger(process.env.AUTH_LOGIN_RATE_WINDOW_MS, 60_000),
  },
};
const REFRESH_THROTTLE = {
  default: {
    limit: () => readPositiveInteger(process.env.AUTH_REFRESH_RATE_LIMIT, 10),
    ttl: () => readPositiveInteger(process.env.AUTH_REFRESH_RATE_WINDOW_MS, 60_000),
  },
};

type AuthSessionResult = Awaited<ReturnType<AuthService['login']>>;

type PublicAuthSession = Omit<AuthSessionResult, 'refreshToken'>;

type AuthRequestMetadata = Parameters<AuthService['login']>[1];

function getAuthRequestMetadata(request: FastifyRequest): AuthRequestMetadata {
  return {
    userAgent: request.headers['user-agent']?.slice(0, 512),
    ipAddress: request.ip ?? request.raw.socket.remoteAddress,
  };
}

function toPublicAuthSession(result: AuthSessionResult): PublicAuthSession {
  const { refreshToken, ...publicSession } = result;

  void refreshToken;

  return publicSession;
}
@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,

    private readonly authCookieService: AuthCookieService,
  ) {}

  @Public()
  @Throttle(REGISTER_THROTTLE)
  @Post('register')
  @ApiOperation({
    summary: 'Register and create a user session',
  })
  async register(
    @Body()
    dto: RegisterDto,

    @Req()
    request: FastifyRequest,

    @Res({
      passthrough: true,
    })
    response: FastifyReply,
  ): Promise<PublicAuthSession> {
    const result = await this.authService.register(dto, getAuthRequestMetadata(request));

    this.authCookieService.setRefreshToken(response, result.refreshToken);

    return toPublicAuthSession(result);
  }

  @Public()
  @Throttle(LOGIN_THROTTLE)
  @Post('login')
  @ApiOperation({
    summary: 'Authenticate and create a user session',
  })
  async login(
    @Body()
    dto: LoginDto,

    @Req()
    request: FastifyRequest,

    @Res({
      passthrough: true,
    })
    response: FastifyReply,
  ): Promise<PublicAuthSession> {
    const result = await this.authService.login(dto, getAuthRequestMetadata(request));

    this.authCookieService.setRefreshToken(response, result.refreshToken);

    return toPublicAuthSession(result);
  }

  @Public()
  @Throttle(REFRESH_THROTTLE)
  @Post('refresh')
  @ApiOperation({
    summary: 'Rotate the current refresh session',
  })
  async refresh(
    @Req()
    request: FastifyRequest,

    @Res({
      passthrough: true,
    })
    response: FastifyReply,
  ): Promise<PublicAuthSession> {
    const refreshToken = this.authCookieService.getRefreshToken(request);

    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token is missing.');
    }

    const result = await this.authService.refresh(refreshToken, getAuthRequestMetadata(request));

    this.authCookieService.setRefreshToken(response, result.refreshToken);

    return toPublicAuthSession(result);
  }

  @Public()
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Revoke the current user session',
  })
  async logout(
    @Req()
    request: FastifyRequest,

    @Res({
      passthrough: true,
    })
    response: FastifyReply,
  ): Promise<{
    success: true;
  }> {
    const refreshToken = this.authCookieService.getRefreshToken(request);

    try {
      if (refreshToken) {
        await this.authService.logout(refreshToken);
      }
    } finally {
      this.authCookieService.clearRefreshToken(response);
    }

    return {
      success: true,
    };
  }

  @ApiBearerAuth()
  @Post('logout-all')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Revoke every user session',
  })
  async logoutAll(
    @CurrentUser()
    user: AuthenticatedUser,

    @Res({
      passthrough: true,
    })
    response: FastifyReply,
  ): Promise<{
    success: true;
  }> {
    await this.authService.logoutAll(user.id);

    this.authCookieService.clearRefreshToken(response);

    return {
      success: true,
    };
  }

  @ApiBearerAuth()
  @Get('me')
  @ApiOperation({
    summary: 'Return the active user',
  })
  getCurrentUser(
    @CurrentUser()
    user: AuthenticatedUser,
  ): Promise<unknown> {
    return this.authService.getCurrentUser(user.id);
  }
}
