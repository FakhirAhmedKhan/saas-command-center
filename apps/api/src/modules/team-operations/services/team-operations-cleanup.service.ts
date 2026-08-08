import { ConfigService } from '@nestjs/config';
import { Injectable, Logger, Inject } from '@nestjs/common';

import { Cron, CronExpression } from '@nestjs/schedule';

import { WorkspaceInvitationStatus } from '../../../generated/prisma/client';

import type { TypedConfigService } from '../../../config/runtime-config';

import { PrismaService } from '../../../database/prisma.service';

@Injectable()
export class TeamOperationsCleanupService {
  private readonly logger = new Logger(TeamOperationsCleanupService.name);

  constructor(
    private readonly prisma: PrismaService,

    @Inject(ConfigService)
    private readonly config: TypedConfigService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async cleanup(): Promise<void> {
    if (
      !this.config.get('NOTIFICATION_CLEANUP_ENABLED', {
        infer: true,
      })
    ) {
      return;
    }

    const now = new Date();

    const retentionDays = this.config.get('NOTIFICATION_RETENTION_DAYS', {
      infer: true,
    });

    const retentionCutoff = new Date(now.getTime() - retentionDays * 86_400_000);

    const [expiredInvitations, expiredNotifications, oldReadNotifications] = await Promise.all([
      this.prisma.workspaceInvitation.updateMany({
        where: {
          status: WorkspaceInvitationStatus.PENDING,

          expiresAt: {
            lte: now,
          },
        },

        data: {
          status: WorkspaceInvitationStatus.EXPIRED,
        },
      }),

      this.prisma.notification.deleteMany({
        where: {
          expiresAt: {
            lte: now,
          },
        },
      }),

      this.prisma.notification.deleteMany({
        where: {
          readAt: {
            not: null,
          },

          createdAt: {
            lt: retentionCutoff,
          },
        },
      }),
    ]);

    this.logger.log(
      JSON.stringify({
        event: 'team_operations_cleanup',

        expiredInvitations: expiredInvitations.count,

        expiredNotifications: expiredNotifications.count,

        oldReadNotifications: oldReadNotifications.count,
      }),
    );
  }
}
