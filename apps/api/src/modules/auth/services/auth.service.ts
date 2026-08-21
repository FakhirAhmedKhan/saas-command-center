import { AuthSessionsService } from './auth-sessions.service';
import { PasswordService } from './password.service';
import { TokenPair, TokenService } from './token.service';
import { LoginDto } from '../dto/login.dto';
import { RegisterDto } from '../dto/register.dto';
import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { PrismaService } from 'src/database/prisma.service';
import { Prisma } from 'src/generated/prisma/client';
import { publicUserSelect, UsersService } from 'src/modules/users/users.service';
import { WorkspacesService } from 'src/modules/workspace/service/workspaces.service';

export interface AuthRequestMetadata {
  userAgent?: string | null;
  ipAddress?: string | null;
}

export interface AuthResult {
  accessToken: string;
  refreshToken: string;
  tokenType: 'Bearer';
  expiresIn: number;
  user: Awaited<ReturnType<UsersService['findByIdOrThrow']>>;
  workspaces: Awaited<ReturnType<WorkspacesService['listForUser']>>;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly usersService: UsersService,
    private readonly workspacesService: WorkspacesService,
    private readonly authSessionsService: AuthSessionsService,
    private readonly passwordService: PasswordService,
    private readonly tokenService: TokenService,
  ) {}

  async register(dto: RegisterDto, metadata: AuthRequestMetadata): Promise<AuthResult> {
    const email = dto.email.trim().toLowerCase();

    const passwordHash = await this.passwordService.hash(dto.password);

    const userId = randomUUID();
    const sessionId = randomUUID();
    const familyId = randomUUID();

    const tokens = await this.tokenService.issueTokenPair(userId, sessionId, familyId);

    const refreshTokenHash = this.tokenService.hashRefreshToken(tokens.refreshToken);

    try {
      const user = await this.prisma.$transaction(async (transaction) => {
        const createdUser = await transaction.user.create({
          data: {
            id: userId,
            email,
            passwordHash,
            displayName: dto.displayName?.trim() || null,
          },

          select: publicUserSelect,
        });

        await transaction.authSession.create({
          data: {
            id: sessionId,
            userId,
            familyId,
            refreshTokenHash,
            expiresAt: tokens.refreshExpiresAt,
            userAgent: this.normalizeMetadata(metadata.userAgent),
            ipAddress: this.normalizeMetadata(metadata.ipAddress),
          },
        });

        return createdUser;
      });

      const workspaces = await this.workspacesService.listForUser(user.id);

      return this.createAuthResult(tokens, user, workspaces);
    } catch (error: unknown) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('Email is already in use');
      }

      throw error;
    }
  }
  async login(dto: LoginDto, metadata: AuthRequestMetadata): Promise<AuthResult> {
    const user = await this.usersService.findAuthenticationRecordByEmail(dto.email);

    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const validPassword = await this.passwordService.verify(user.passwordHash, dto.password);

    if (!validPassword) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const sessionId = randomUUID();
    const familyId = randomUUID();

    const tokens = await this.tokenService.issueTokenPair(user.id, sessionId, familyId);

    const refreshTokenHash = this.tokenService.hashRefreshToken(tokens.refreshToken);

    await this.prisma.$transaction(async (transaction) => {
      await transaction.authSession.create({
        data: {
          id: sessionId,
          userId: user.id,
          familyId,
          refreshTokenHash,
          expiresAt: tokens.refreshExpiresAt,
          userAgent: this.normalizeMetadata(metadata.userAgent),
          ipAddress: this.normalizeMetadata(metadata.ipAddress),
        },
      });

      await transaction.user.update({
        where: {
          id: user.id,
        },
        data: {
          lastLoginAt: new Date(),
        },
      });
    });

    const publicUser = await this.usersService.findByIdOrThrow(user.id);

    const workspaces = await this.workspacesService.listForUser(user.id);

    return this.createAuthResult(tokens, publicUser, workspaces);
  }

  async refresh(rawRefreshToken: string, metadata: AuthRequestMetadata): Promise<AuthResult> {
    const payload = await this.tokenService.verifyRefreshToken(rawRefreshToken);

    const tokenHash = this.tokenService.hashRefreshToken(rawRefreshToken);

    const currentSession = await this.authSessionsService.findByTokenHash(tokenHash);

    if (!currentSession) {
      throw new UnauthorizedException('Refresh session not found');
    }

    const payloadMismatch = currentSession.id !== payload.sid || currentSession.familyId !== payload.fid || currentSession.userId !== payload.sub;

    if (payloadMismatch || currentSession.revokedAt) {
      await this.authSessionsService.revokeFamilyBySessionId(currentSession.id);

      throw new UnauthorizedException('Refresh token reuse detected');
    }

    if (currentSession.expiresAt <= new Date()) {
      await this.authSessionsService.revokeSession(currentSession.id, 'EXPIRED');

      throw new UnauthorizedException('Refresh session has expired');
    }

    const user = await this.usersService.findActiveById(currentSession.userId);

    if (!user) {
      await this.authSessionsService.revokeFamilyBySessionId(currentSession.id, 'USER_UNAVAILABLE');

      throw new UnauthorizedException('User account is unavailable');
    }

    const newSessionId = randomUUID();

    const tokens = await this.tokenService.issueTokenPair(user.id, newSessionId, currentSession.familyId);

    const newRefreshTokenHash = this.tokenService.hashRefreshToken(tokens.refreshToken);

    const rotated = await this.authSessionsService.rotateSession({
      currentSessionId: currentSession.id,
      newSessionId,
      newRefreshTokenHash,
      expiresAt: tokens.refreshExpiresAt,
      userAgent: metadata.userAgent,
      ipAddress: metadata.ipAddress,
    });

    if (!rotated) {
      await this.authSessionsService.revokeFamilyBySessionId(currentSession.id);

      throw new UnauthorizedException('Refresh token reuse detected');
    }

    const workspaces = await this.workspacesService.listForUser(user.id);

    return this.createAuthResult(tokens, user, workspaces);
  }

  async logout(rawRefreshToken?: string): Promise<void> {
    if (!rawRefreshToken) {
      return;
    }

    const tokenHash = this.tokenService.hashRefreshToken(rawRefreshToken);

    const session = await this.authSessionsService.findByTokenHash(tokenHash);

    if (!session) {
      return;
    }

    await this.authSessionsService.revokeSession(session.id);
  }

  async logoutAll(userId: string): Promise<number> {
    return this.authSessionsService.revokeAllForUser(userId);
  }

  async getCurrentUser(userId: string) {
    const user = await this.usersService.findByIdOrThrow(userId);

    const workspaces = await this.workspacesService.listForUser(userId);

    return {
      user,
      workspaces,
    };
  }

  private createAuthResult(tokens: TokenPair, user: AuthResult['user'], workspaces: AuthResult['workspaces']): AuthResult {
    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      tokenType: 'Bearer',
      expiresIn: tokens.accessExpiresInSeconds,
      user,
      workspaces,
    };
  }

  private normalizeMetadata(value?: string | null): string | null {
    if (!value) {
      return null;
    }

    const normalized = value.trim();

    return normalized || null;
  }
}
