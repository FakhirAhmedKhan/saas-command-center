import { Body, Controller, Get, Post, Req, Res, UnauthorizedException } from '@nestjs/common';

import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import type { Request, Response } from 'express';

import { CurrentUser } from '../decorators/current-user.decorator';

import { Public } from '../decorators/public.decorator';

import { LoginDto } from '../dto/login.dto';

import { RegisterDto } from '../dto/register.dto';

import { AuthCookieService } from '../services/auth-cookie.service';

import { AuthService } from '../services/auth.service';
import { AuthenticatedUser } from '../interfaces/authenticated-user.interface';

type AuthSessionResult = Awaited<ReturnType<AuthService['login']>>;

type PublicAuthSession = Omit<AuthSessionResult, 'refreshToken'>;

type AuthRequestMetadata = Parameters<AuthService['login']>[1];

function getAuthRequestMetadata(request: Request): AuthRequestMetadata {
  return {
    userAgent: request.get('user-agent')?.slice(0, 512),

    ipAddress: request.ip ?? request.socket.remoteAddress,
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
  @Post('register')
  @ApiOperation({
    summary: 'Register and create a user session',
  })
  async register(
    @Body()
    dto: RegisterDto,

    @Req()
    request: Request,

    @Res({
      passthrough: true,
    })
    response: Response,
  ): Promise<PublicAuthSession> {
    const result = await this.authService.register(dto, getAuthRequestMetadata(request));

    this.authCookieService.setRefreshToken(response, result.refreshToken);

    return toPublicAuthSession(result);
  }

  @Public()
  @Post('login')
  @ApiOperation({
    summary: 'Authenticate and create a user session',
  })
  async login(
    @Body()
    dto: LoginDto,

    @Req()
    request: Request,

    @Res({
      passthrough: true,
    })
    response: Response,
  ): Promise<PublicAuthSession> {
    const result = await this.authService.login(dto, getAuthRequestMetadata(request));

    this.authCookieService.setRefreshToken(response, result.refreshToken);

    return toPublicAuthSession(result);
  }

  @Public()
  @Post('refresh')
  @ApiOperation({
    summary: 'Rotate the current refresh session',
  })
  async refresh(
    @Req()
    request: Request,

    @Res({
      passthrough: true,
    })
    response: Response,
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
  @ApiOperation({
    summary: 'Revoke the current user session',
  })
  async logout(
    @Req()
    request: Request,

    @Res({
      passthrough: true,
    })
    response: Response,
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
  @ApiOperation({
    summary: 'Revoke every user session',
  })
  async logoutAll(
    @CurrentUser()
    user: AuthenticatedUser,

    @Res({
      passthrough: true,
    })
    response: Response,
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
