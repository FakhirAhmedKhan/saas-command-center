import {
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../database/prisma.service';

const safeSessionSelect = {
  id: true,
  userId: true,
  familyId: true,
  parentSessionId: true,
  userAgent: true,
  ipAddress: true,
  expiresAt: true,
  lastUsedAt: true,
  revokedAt: true,
  revokeReason: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.AuthSessionSelect;

export type SafeAuthSession = Prisma.AuthSessionGetPayload<{
  select: typeof safeSessionSelect;
}>;

export interface CreateAuthSessionInput {
  userId: string;
  refreshTokenHash: string;
  expiresAt: Date;
  userAgent?: string | null;
  ipAddress?: string | null;
  familyId?: string;
  parentSessionId?: string;
}

export interface RotateAuthSessionInput {
  currentSessionId: string;
  newRefreshTokenHash: string;
  expiresAt: Date;
  userAgent?: string | null;
  ipAddress?: string | null;
}

@Injectable()
export class AuthSessionsService {
  constructor(private readonly prisma: PrismaService) {}

  async createSession(
    input: CreateAuthSessionInput,
  ): Promise<SafeAuthSession> {
    return this.prisma.authSession.create({
      data: {
        userId: input.userId,
        refreshTokenHash: input.refreshTokenHash,
        expiresAt: input.expiresAt,
        userAgent: this.normalizeOptionalValue(input.userAgent),
        ipAddress: this.normalizeOptionalValue(input.ipAddress),
        ...(input.familyId
          ? {
              familyId: input.familyId,
            }
          : {}),
        ...(input.parentSessionId
          ? {
              parentSessionId: input.parentSessionId,
            }
          : {}),
      },
      select: safeSessionSelect,
    });
  }

  async findByTokenHash(
    refreshTokenHash: string,
  ): Promise<SafeAuthSession | null> {
    return this.prisma.authSession.findUnique({
      where: {
        refreshTokenHash,
      },
      select: safeSessionSelect,
    });
  }

  async findActiveByTokenHash(
    refreshTokenHash: string,
  ): Promise<SafeAuthSession | null> {
    return this.prisma.authSession.findFirst({
      where: {
        refreshTokenHash,
        revokedAt: null,
        expiresAt: {
          gt: new Date(),
        },
      },
      select: safeSessionSelect,
    });
  }

  async rotateSession(
    input: RotateAuthSessionInput,
  ): Promise<SafeAuthSession> {
    const now = new Date();

    return this.prisma.$transaction(async (transaction) => {
      const currentSession =
        await transaction.authSession.findUnique({
          where: {
            id: input.currentSessionId,
          },
        });

      if (
        !currentSession ||
        currentSession.revokedAt !== null ||
        currentSession.expiresAt.getTime() <= now.getTime()
      ) {
        throw new UnauthorizedException(
          'Refresh session is no longer valid',
        );
      }

      await transaction.authSession.update({
        where: {
          id: currentSession.id,
        },
        data: {
          revokedAt: now,
          revokeReason: 'ROTATED',
          lastUsedAt: now,
        },
      });

      return transaction.authSession.create({
        data: {
          userId: currentSession.userId,
          familyId: currentSession.familyId,
          parentSessionId: currentSession.id,
          refreshTokenHash: input.newRefreshTokenHash,
          expiresAt: input.expiresAt,
          userAgent: this.normalizeOptionalValue(
            input.userAgent,
          ),
          ipAddress: this.normalizeOptionalValue(
            input.ipAddress,
          ),
        },
        select: safeSessionSelect,
      });
    });
  }

  async markUsed(sessionId: string): Promise<void> {
    await this.prisma.authSession.update({
      where: {
        id: sessionId,
      },
      data: {
        lastUsedAt: new Date(),
      },
    });
  }

  async revokeSession(
    sessionId: string,
    reason = 'LOGOUT',
  ): Promise<number> {
    const result = await this.prisma.authSession.updateMany({
      where: {
        id: sessionId,
        revokedAt: null,
      },
      data: {
        revokedAt: new Date(),
        revokeReason: reason,
      },
    });

    return result.count;
  }

  async revokeFamilyBySessionId(
    sessionId: string,
    reason = 'TOKEN_REUSE_DETECTED',
  ): Promise<number> {
    const session = await this.prisma.authSession.findUnique({
      where: {
        id: sessionId,
      },
      select: {
        familyId: true,
      },
    });

    if (!session) {
      return 0;
    }

    const result = await this.prisma.authSession.updateMany({
      where: {
        familyId: session.familyId,
        revokedAt: null,
      },
      data: {
        revokedAt: new Date(),
        revokeReason: reason,
      },
    });

    return result.count;
  }

  async revokeAllForUser(
    userId: string,
    reason = 'LOGOUT_ALL',
  ): Promise<number> {
    const result = await this.prisma.authSession.updateMany({
      where: {
        userId,
        revokedAt: null,
      },
      data: {
        revokedAt: new Date(),
        revokeReason: reason,
      },
    });

    return result.count;
  }

  async purgeExpired(before = new Date()): Promise<number> {
    const result = await this.prisma.authSession.deleteMany({
      where: {
        expiresAt: {
          lt: before,
        },
      },
    });

    return result.count;
  }

  private normalizeOptionalValue(
    value?: string | null,
  ): string | null {
    if (value === undefined || value === null) {
      return null;
    }

    const normalized = value.trim();
    return normalized.length > 0 ? normalized : null;
  }
}