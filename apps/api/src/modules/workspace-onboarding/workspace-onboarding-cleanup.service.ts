import type { TypedConfigService } from '../../config/runtime-config';
import { PrismaService } from '../../database/prisma.service';
import { PostgresAdvisoryLockService } from '../../infrastructure/database/postgres-advisory-lock.service';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

const CLEANUP_LOCK_KEY = 'workspace-onboarding-retention-cleanup';

@Injectable()
export class WorkspaceOnboardingCleanupService {
  private readonly logger = new Logger(WorkspaceOnboardingCleanupService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly locks: PostgresAdvisoryLockService,
    @Inject(ConfigService)
    private readonly config: TypedConfigService,
  ) {}

  async run(): Promise<{
    expired: number;
    deleted: number;
    skipped: boolean;
  }> {
    const lock = await this.locks.withLock(CLEANUP_LOCK_KEY, async () => {
      const retentionDays = this.config.get('WORKSPACE_ONBOARDING_RETENTION_DAYS', {
        infer: true,
      });
      const cleanupBatchSize = this.config.get('WORKSPACE_ONBOARDING_CLEANUP_BATCH_SIZE', {
        infer: true,
      });
      const now = new Date();
      const retentionCutoff = new Date(now.getTime() - retentionDays * 24 * 60 * 60 * 1_000);
      const expired = await this.prisma.workspaceOnboardingSession.updateMany({
        where: {
          status: {
            in: ['IN_PROGRESS', 'BLUEPRINT_READY', 'FAILED'],
          },
          expiresAt: {
            lte: now,
          },
        },
        data: {
          status: 'EXPIRED',
        },
      });
      const candidates = await this.prisma.workspaceOnboardingSession.findMany({
        where: {
          status: 'EXPIRED',
          updatedAt: {
            lte: retentionCutoff,
          },
        },
        orderBy: {
          updatedAt: 'asc',
        },
        select: {
          id: true,
        },
        take: cleanupBatchSize,
      });
      const removed =
        candidates.length > 0
          ? await this.prisma.workspaceOnboardingSession.deleteMany({
              where: {
                id: {
                  in: candidates.map(({ id }) => id),
                },
              },
            })
          : {
              count: 0,
            };

      return {
        expired: expired.count,
        deleted: removed.count,
        skipped: false,
      };
    });

    if (!lock.acquired) {
      this.logger.debug('Workspace onboarding cleanup skipped; lock not acquired');

      return {
        expired: 0,
        deleted: 0,
        skipped: true,
      };
    }

    return (
      lock.value ?? {
        expired: 0,
        deleted: 0,
        skipped: false,
      }
    );
  }
}
