import { HealthCheckRunnerService } from './health-check-runner.service';
import type { TypedConfigService } from '../../../config/runtime-config';
import { PrismaService } from '../../../database/prisma.service';
import { PostgresAdvisoryLockService } from '../../../infrastructure/database/postgres-advisory-lock.service';
import { Injectable, Logger, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression, Interval } from '@nestjs/schedule';

@Injectable()
export class HealthMonitoringSchedulerService {
  private readonly logger = new Logger(HealthMonitoringSchedulerService.name);

  private schedulerRunning = false;

  constructor(
    private readonly prisma: PrismaService,

    private readonly runner: HealthCheckRunnerService,

    private readonly locks: PostgresAdvisoryLockService,

    @Inject(ConfigService)
    private readonly config: TypedConfigService,
  ) {}

  @Interval(5_000)
  async scheduleDueChecks(): Promise<void> {
    if (
      !this.config.get('HEALTH_MONITOR_ENABLED', {
        infer: true,
      }) ||
      this.schedulerRunning
    ) {
      return;
    }

    this.schedulerRunning = true;

    try {
      const batchSize = this.config.get('HEALTH_MONITOR_BATCH_SIZE', {
        infer: true,
      });

      const concurrency = this.config.get('HEALTH_MONITOR_CONCURRENCY', {
        infer: true,
      });

      const dueChecks = await this.prisma.healthCheck.findMany({
        where: {
          enabled: true,

          nextRunAt: {
            lte: new Date(),
          },
        },

        select: {
          id: true,

          workspaceId: true,
        },

        orderBy: {
          nextRunAt: 'asc',
        },

        take: batchSize,
      });

      for (let index = 0; index < dueChecks.length; index += concurrency) {
        const chunk = dueChecks.slice(index, index + concurrency);

        await Promise.all(chunk.map((check) => this.runWithLock(check.workspaceId, check.id)));
      }
    } finally {
      this.schedulerRunning = false;
    }
  }

  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async cleanupHistory(): Promise<void> {
    const retentionDays = this.config.get('HEALTH_HISTORY_RETENTION_DAYS', {
      infer: true,
    });

    const cutoff = new Date(Date.now() - retentionDays * 86_400_000);

    const result = await this.prisma.healthCheckHistory.deleteMany({
      where: {
        checkedAt: {
          lt: cutoff,
        },
      },
    });

    this.logger.log(`Deleted ${result.count} expired health-check history records.`);
  }

  private async runWithLock(
    workspaceId: string,

    checkId: string,
  ): Promise<void> {
    const lockResult = await this.locks.withLock(
      `health-check:${checkId}`,

      async () => {
        const current = await this.prisma.healthCheck.findFirst({
          where: {
            id: checkId,

            workspaceId,

            enabled: true,

            nextRunAt: {
              lte: new Date(),
            },
          },

          select: {
            id: true,
          },
        });

        if (!current) {
          return;
        }

        await this.runner.run(workspaceId, checkId);
      },
    );

    if (!lockResult.acquired) {
      this.logger.debug(`Health check ${checkId} is already running on another instance.`);
    }
  }
}
