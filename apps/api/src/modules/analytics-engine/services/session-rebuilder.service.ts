import { PageViewRebuilderService } from './page-view-rebuilder.service';
import { calculateSessionMetrics } from '../utils/analytics-metrics';
import { Injectable } from '@nestjs/common';
import { Prisma } from 'src/generated/prisma/client';

type AnalyticsSessionRecord = Prisma.AnalyticsSessionGetPayload<Record<string, never>>;

export interface RebuiltSessionResult {
  previousStartedAt: Date;
  session: AnalyticsSessionRecord;
}

@Injectable()
export class SessionRebuilderService {
  constructor(private readonly pageViews: PageViewRebuilderService) {}

  async rebuild(transaction: Prisma.TransactionClient, sessionId: string): Promise<RebuiltSessionResult> {
    const existingSession = await transaction.analyticsSession.findUniqueOrThrow({
      where: {
        id: sessionId,
      },
    });
    const events = await transaction.analyticsEvent.findMany({
      where: {
        sessionId,
      },

      orderBy: [
        {
          occurredAt: 'asc',
        },
        {
          id: 'asc',
        },
      ],
    });
    const { pageViews, firstPage, lastPage } = await this.pageViews.rebuildForSession(transaction, sessionId);
    const firstEvent = events[0];

    if (!firstEvent) {
      return {
        previousStartedAt: existingSession.startedAt,
        session: existingSession,
      };
    }

    const metrics = calculateSessionMetrics(events, pageViews);
    const lastEvent = events.at(-1) ?? firstEvent;
    const updatedSession = await transaction.analyticsSession.update({
      where: {
        id: sessionId,
      },

      data: {
        startedAt: metrics.startedAt,
        endedAt: metrics.endedAt,
        lastEventAt: lastEvent.occurredAt,
        durationMs: metrics.durationMs,
        engagedDurationMs: metrics.engagedDurationMs,
        eventCount: metrics.eventCount,
        pageViewCount: metrics.pageViewCount,
        customEventCount: metrics.customEventCount,
        bounced: metrics.bounced,
        entryPath: firstPage?.normalizedPath ?? null,
        exitPath: lastPage?.normalizedPath ?? null,
        entryTitle: firstPage?.title ?? null,
        exitTitle: lastPage?.title ?? null,
        referrerUrl: firstPage?.referrerUrl ?? firstEvent.referrerUrl,
        sourceType: firstPage?.sourceType ?? firstEvent.sourceType,
        sourceName: firstPage?.sourceName ?? firstEvent.sourceName,
        sourceDomain: firstPage?.sourceDomain ?? firstEvent.sourceDomain,
        countryCode: firstEvent.countryCode,
        deviceType: firstEvent.deviceType,
        browserName: firstEvent.browserName,
        browserVersion: firstEvent.browserVersion,
        operatingSystem: firstEvent.operatingSystem,
        operatingSystemVersion: firstEvent.operatingSystemVersion,
      },
    });

    return {
      previousStartedAt: existingSession.startedAt,
      session: updatedSession,
    };
  }

  async rebuildSession(transaction: Prisma.TransactionClient, sessionId: string): Promise<RebuiltSessionResult> {
    return this.rebuild(transaction, sessionId);
  }

  async rebuildMany(transaction: Prisma.TransactionClient, sessionIds: readonly string[]): Promise<RebuiltSessionResult[]> {
    const results: RebuiltSessionResult[] = [];

    for (const sessionId of sessionIds) {
      results.push(await this.rebuild(transaction, sessionId));
    }

    return results;
  }
}
