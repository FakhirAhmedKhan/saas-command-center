import { AnalyticsProcessingQueueService } from './analytics-processing-queue.service';
import type { TypedConfigService } from '../../../config/runtime-config';
import { PrismaService } from '../../../database/prisma.service';
import { AnalyticsProcessingTrigger } from '../../../generated/prisma/client';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';

interface PendingWebsiteRange {
  workspaceId: string;

  websiteId: string;

  firstOccurredAt: Date;

  lastOccurredAt: Date;
}

@Injectable()
export class AnalyticsProcessingSchedulerService {
  private readonly logger = new Logger(AnalyticsProcessingSchedulerService.name);

  constructor(
    private readonly prisma: PrismaService,

    private readonly queue: AnalyticsProcessingQueueService,

    @Inject(ConfigService)
    private readonly config: TypedConfigService,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async schedulePendingEvents(): Promise<void> {
    if (
      !this.config.get('ANALYTICS_SCHEDULER_ENABLED', {
        infer: true,
      })
    ) {
      return;
    }

    const ranges = await this.getPendingRanges();

    for (const range of ranges) {
      try {
        await this.queue.queue({
          workspaceId: range.workspaceId,

          websiteId: range.websiteId,

          from: range.firstOccurredAt,

          to: new Date(range.lastOccurredAt.getTime() + 1),

          trigger: AnalyticsProcessingTrigger.SCHEDULED,
        });
      } catch (error) {
        this.logger.error(
          JSON.stringify({
            event: 'analytics_schedule_failed',

            websiteId: range.websiteId,

            error: error instanceof Error ? error.message : String(error),
          }),
        );
      }
    }
  }

  private async getPendingRanges(): Promise<PendingWebsiteRange[]> {
    const groups = await this.prisma.rawAnalyticsEvent.groupBy({
      by: ['websiteId'],

      where: {
        processedAt: null,
      },

      _min: {
        occurredAt: true,
      },

      _max: {
        occurredAt: true,
      },

      orderBy: {
        _min: {
          occurredAt: 'asc',
        },
      },

      take: 20,
    });

    if (groups.length === 0) {
      return [];
    }

    const websiteIds = groups.map((group) => group.websiteId);

    const websites = await this.prisma.website.findMany({
      where: {
        id: {
          in: websiteIds,
        },
      },

      select: {
        id: true,
        workspaceId: true,
      },
    });

    const workspaceByWebsiteId = new Map(websites.map((website) => [website.id, website.workspaceId]));

    return groups.flatMap((group) => {
      const firstOccurredAt = group._min.occurredAt;
      const lastOccurredAt = group._max.occurredAt;
      const workspaceId = workspaceByWebsiteId.get(group.websiteId);

      if (!workspaceId || !firstOccurredAt || !lastOccurredAt) {
        return [];
      }

      return [
        {
          workspaceId,
          websiteId: group.websiteId,
          firstOccurredAt,
          lastOccurredAt,
        },
      ];
    });
  }
}
