import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/database/prisma.service';
import { Prisma } from 'src/generated/prisma/client';

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

export interface RotateSessionInput {
  currentSessionId: string;
  newSessionId: string;
  newRefreshTokenHash: string;
  expiresAt: Date;
  userAgent?: string | null;
  ipAddress?: string | null;
}

@Injectable()
export class AuthSessionsService {
  constructor(private readonly prisma: PrismaService) {}

  async findByTokenHash(refreshTokenHash: string): Promise<SafeAuthSession | null> {
    return this.prisma.authSession.findUnique({
      where: {
        refreshTokenHash,
      },
      select: safeSessionSelect,
    });
  }

  async rotateSession(input: RotateSessionInput): Promise<SafeAuthSession | null> {
    return this.prisma.$transaction(async (transaction) => {
      const currentSession = await transaction.authSession.findUnique({
        where: {
          id: input.currentSessionId,
        },
      });

      if (!currentSession) {
        return null;
      }

      const now = new Date();

      const updated = await transaction.authSession.updateMany({
        where: {
          id: currentSession.id,
          revokedAt: null,
          expiresAt: {
            gt: now,
          },
        },
        data: {
          revokedAt: now,
          revokeReason: 'ROTATED',
          lastUsedAt: now,
        },
      });

      if (updated.count !== 1) {
        return null;
      }

      return transaction.authSession.create({
        data: {
          id: input.newSessionId,
          userId: currentSession.userId,
          familyId: currentSession.familyId,
          parentSessionId: currentSession.id,
          refreshTokenHash: input.newRefreshTokenHash,
          expiresAt: input.expiresAt,
          userAgent: this.normalize(input.userAgent),
          ipAddress: this.normalize(input.ipAddress),
        },
        select: safeSessionSelect,
      });
    });
  }

  async revokeSession(sessionId: string, reason = 'LOGOUT'): Promise<number> {
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

  async revokeAllForUser(userId: string, reason = 'LOGOUT_ALL'): Promise<number> {
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

  private normalize(value?: string | null): string | null {
    if (!value) {
      return null;
    }

    const normalized = value.trim();

    return normalized.length > 0 ? normalized : null;
  }
}
