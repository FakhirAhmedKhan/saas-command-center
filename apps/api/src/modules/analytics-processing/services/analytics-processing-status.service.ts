import { Injectable, NotFoundException } from '@nestjs/common';

import { AnalyticsProcessingStatus } from '../../../generated/prisma/client';

import { PrismaService } from '../../../database/prisma.service';

import type {
  AnalyticsProcessingStatusDto,
  ProcessingRunDto,
} from '../dto/analytics-processing-response.dto';
import { AnalyticsProcessingAccessService } from './analytics-processing-access.service';

@Injectable()
export class AnalyticsProcessingStatusService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: AnalyticsProcessingAccessService,
  ) {}

  async getStatus(
    workspaceId: string,
    websiteId: string,
    userId: string,
  ): Promise<AnalyticsProcessingStatusDto> {
    const website = await this.prisma.website.findFirst({
      where: {
        id: websiteId,

        workspaceId,

        archivedAt: null,
      },

      select: {
        id: true,
      },
    });

    if (!website) {
      throw new NotFoundException('Website not found.');
    }

    const [
      canReprocess,
      pendingEvents,
      unresolvedDeadLetters,
      activeRun,
      latestRun,
      lastSuccessfulRun,
      recentRuns,
    ] = await Promise.all([
      this.access.getCanReprocess(workspaceId, userId),

      this.prisma.rawAnalyticsEvent.count({
        where: {
          websiteId,

          processedAt: null,
        },
      }),

      this.prisma.analyticsProcessingDeadLetter.count({
        where: {
          websiteId,

          resolvedAt: null,
        },
      }),

      this.prisma.analyticsProcessingRun.findFirst({
        where: {
          websiteId,

          status: {
            in: [AnalyticsProcessingStatus.QUEUED, AnalyticsProcessingStatus.RUNNING],
          },
        },

        orderBy: {
          createdAt: 'desc',
        },
      }),

      this.prisma.analyticsProcessingRun.findFirst({
        where: {
          websiteId,
        },

        orderBy: {
          createdAt: 'desc',
        },
      }),

      this.prisma.analyticsProcessingRun.findFirst({
        where: {
          websiteId,

          status: AnalyticsProcessingStatus.SUCCEEDED,
        },

        orderBy: {
          finishedAt: 'desc',
        },
      }),

      this.prisma.analyticsProcessingRun.findMany({
        where: {
          websiteId,
        },

        orderBy: {
          createdAt: 'desc',
        },

        take: 10,
      }),
    ]);

    return {
      canReprocess,

      pendingEvents,

      unresolvedDeadLetters,

      activeRun: activeRun ? this.mapRun(activeRun) : null,

      latestRun: latestRun ? this.mapRun(latestRun) : null,

      lastSuccessfulRun: lastSuccessfulRun ? this.mapRun(lastSuccessfulRun) : null,

      recentRuns: recentRuns.map(
        (run: {
          id: string;
          status: unknown;
          trigger: unknown;
          rangeStart: Date;
          rangeEnd: Date;
          retryCount: number;
          maxRetries: number;
          rawEventsProcessed: number;
          failedEvents: number;
          errorMessage: string | null;
          startedAt: Date | null;
          finishedAt: Date | null;
          createdAt: Date;
        }) => this.mapRun(run),
      ),
    };
  }

  private mapRun(run: {
    id: string;

    status: unknown;

    trigger: unknown;

    rangeStart: Date;

    rangeEnd: Date;

    retryCount: number;

    maxRetries: number;

    rawEventsProcessed: number;

    failedEvents: number;

    errorMessage: string | null;

    startedAt: Date | null;

    finishedAt: Date | null;

    createdAt: Date;
  }): ProcessingRunDto {
    return {
      id: run.id,

      status: String(run.status),

      trigger: String(run.trigger),

      rangeStart: run.rangeStart.toISOString(),

      rangeEnd: run.rangeEnd.toISOString(),

      retryCount: run.retryCount,

      maxRetries: run.maxRetries,

      processedEvents: run.rawEventsProcessed,

      failedEvents: run.failedEvents,

      errorMessage: run.errorMessage,

      startedAt: run.startedAt?.toISOString() ?? null,

      finishedAt: run.finishedAt?.toISOString() ?? null,

      createdAt: run.createdAt.toISOString(),
    };
  }
}
