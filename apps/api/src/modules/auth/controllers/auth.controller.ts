import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';

import {
  REFRESH_TOKEN_COOKIE,
} from '../auth.constants';
// import { AuthService } from '../auth.service';
import { CurrentUser } from '../decorators/current-user.decorator';
import { Public } from '../decorators/public.decorator';
import { LoginDto } from '../dto/login.dto';
import { RefreshTokenDto } from '../dto/refresh-token.dto';
import { RegisterDto } from '../dto/register.dto';
import type { AuthenticatedUser } from '../interfaces/authenticated-user.interface';
import { TokenService } from '../services/token.service';
import { AuthService } from '../services/auth.service';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly tokenService: TokenService,
    private readonly configService: ConfigService,
  ) { }

  @Public()
  @Post('register')
  @Throttle({
    default: {
      limit: 5,
      ttl: 60_000,
    },
  })
  @ApiOperation({
    summary: 'Register user and create owner workspace',
  })
  @ApiCreatedResponse({
    description: 'User, workspace and session created successfully.',
  })
  async register(
    @Body() dto: RegisterDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.authService.register(
      dto,
      this.getRequestMetadata(request),
    );

    this.setRefreshCookie(
      response,
      result.refreshToken,
    );

    const {
      refreshToken: _refreshToken,
      ...responseBody
    } = result;

    return responseBody;
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle({
    default: {
      limit: 10,
      ttl: 60_000,
    },
  })
  @ApiOperation({
    summary: 'Authenticate user',
  })
  @ApiOkResponse({
    description: 'Login successful.',
  })
  async login(
    @Body() dto: LoginDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.authService.login(
      dto,
      this.getRequestMetadata(request),
    );

    this.setRefreshCookie(
      response,
      result.refreshToken,
    );

    const {
      refreshToken: _refreshToken,
      ...responseBody
    } = result;

    return responseBody;
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @Throttle({
    default: {
      limit: 30,
      ttl: 60_000,
    },
  })
  @ApiOperation({
    summary: 'Rotate refresh token',
  })
  @ApiOkResponse({
    description: 'Refresh token rotated successfully.',
  })
  async refresh(
    @Body() dto: RefreshTokenDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const refreshToken = this.resolveRefreshToken(
      request,
      dto.refreshToken,
    );

    if (!refreshToken) {
      throw new UnauthorizedException(
        'Refresh token is required',
      );
    }

    const result = await this.authService.refresh(
      refreshToken,
      this.getRequestMetadata(request),
    );

    this.setRefreshCookie(
      response,
      result.refreshToken,
    );

    const {
      refreshToken: _refreshToken,
      ...responseBody
    } = result;

    return responseBody;
  }

  @Public()
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Revoke the current refresh session',
  })
  @ApiOkResponse({
    description: 'Logout successful.',
  })
  async logout(
    @Body() dto: RefreshTokenDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const refreshToken = this.resolveRefreshToken(
      request,
      dto.refreshToken,
    );

    await this.authService.logout(refreshToken);

    this.clearRefreshCookie(response);

    return {
      message: 'Logged out successfully',
    };
  }

  @Post('logout-all')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Revoke every active user session',
  })
  @ApiOkResponse({
    description: 'All sessions revoked successfully.',
  })
  async logoutAll(
    @CurrentUser() user: AuthenticatedUser,
    @Res({ passthrough: true }) response: Response,
  ) {
    const revokedSessions =
      await this.authService.logoutAll(user.id);

    this.clearRefreshCookie(response);

    return {
      message: 'All sessions revoked',
      revokedSessions,
    };
  }

  @Get('me')
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Get current authenticated user',
  })
  @ApiOkResponse({
    description: 'Authenticated user returned successfully.',
  })
  getMe(
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.authService.getCurrentUser(
      user.id,
    );
  }

  private resolveRefreshToken(
    request: Request,
    bodyToken?: string,
  ): string | undefined {
    if (bodyToken?.trim()) {
      return bodyToken.trim();
    }

    const cookieToken: unknown =
      request.cookies?.[REFRESH_TOKEN_COOKIE];

    return typeof cookieToken === 'string'
      ? cookieToken
      : undefined;
  }

  private setRefreshCookie(
    response: Response,
    token: string,
  ): void {
    const production =
      this.configService.get<string>('NODE_ENV') ===
      'production';

    response.cookie(
      REFRESH_TOKEN_COOKIE,
      token,
      {
        httpOnly: true,
        secure: production,
        sameSite: production ? 'strict' : 'lax',
        path: '/api/v1/auth',
        maxAge:
          this.tokenService.getRefreshCookieMaxAge(),
      },
    );
  }

  private clearRefreshCookie(
    response: Response,
  ): void {
    const production =
      this.configService.get<string>('NODE_ENV') ===
      'production';

    response.clearCookie(
      REFRESH_TOKEN_COOKIE,
      {
        httpOnly: true,
        secure: production,
        sameSite: production ? 'strict' : 'lax',
        path: '/api/v1/auth',
      },
    );
  }

  private getRequestMetadata(
    request: Request,
  ): {
    userAgent: string | null;
    ipAddress: string | null;
  } {
    const forwardedFor =
      request.headers['x-forwarded-for'];

    let forwardedIp: string | undefined;

    if (typeof forwardedFor === 'string') {
      const firstAddress =
        forwardedFor.split(',').at(0);

      forwardedIp = firstAddress?.trim();
    } else if (Array.isArray(forwardedFor)) {
      forwardedIp =
        forwardedFor.at(0)?.trim();
    }

    return {
      userAgent:
        request.headers['user-agent'] ?? null,

      ipAddress:
        forwardedIp ||
        request.ip ||
        request.socket.remoteAddress ||
        null,
    };
  }
}