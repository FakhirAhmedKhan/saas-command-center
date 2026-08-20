import type { TypedConfigService } from '../../../config/runtime-config';
import { PrismaService } from '../../../database/prisma.service';
import { getAnalyticsBucket } from '../../analytics-engine/utils/analytics-time';
import { AnalyticsAggregatePeriod } from '@command-center/shared-types';
import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AnalyticsAggregationService } from 'src/modules/analytics-engine/services/analytics-aggregation.service';
import { RawEventProcessingService } from 'src/modules/analytics-engine/services/raw-event-processing.service';
import { SessionRebuilderService } from 'src/modules/analytics-engine/services/session-rebuilder.service';
import { VisitorRebuilderService } from 'src/modules/analytics-engine/services/visitor-rebuilder.service';

export interface ProcessAnalyticsRangeInput {
  workspaceId: string;
  websiteId: string;
  from: Date;
  to: Date;
}

export interface ProcessAnalyticsRangeResult {
  pendingEventsAtStart: number;
  processedEvents: number;
  failedEvents: number;
}

@Injectable()
export class AnalyticsRangeProcessorService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly rawEvents: RawEventProcessingService,
    private readonly visitors: VisitorRebuilderService,
    private readonly sessions: SessionRebuilderService,
    private readonly aggregates: AnalyticsAggregationService,

    @Inject(ConfigService)
    private readonly config: TypedConfigService,
  ) {}

  async processRange(input: ProcessAnalyticsRangeInput): Promise<ProcessAnalyticsRangeResult> {
    const timeout = this.config.get('ANALYTICS_PROCESSING_TIMEOUT_MS', {
      infer: true,
    });

    return this.prisma.$transaction(
      async (transaction) => {
        const pendingEventsAtStart = await transaction.rawAnalyticsEvent.count({
          where: {
            websiteId: input.websiteId,

            occurredAt: {
              gte: input.from,
              lt: input.to,
            },

            processedAt: null,
          },
        });

        /*
         * Keep all processing sequential inside the interactive
         * transaction. Parallel Prisma queries on one transaction
         * client previously caused pg warnings.
         */
        const rawResult = await this.rawEvents.processRange(transaction, input);

        /*
         * Rebuilding a session also rebuilds its page-view
         * entry/exit state through PageViewRebuilderService.
         */
        const rebuiltSessions = await this.sessions.rebuildMany(transaction, rawResult.affectedSessionIds);

        await this.visitors.rebuildMany(transaction, rawResult.affectedVisitorIds);

        const website = await transaction.website.findFirstOrThrow({
          where: {
            id: input.websiteId,
            workspaceId: input.workspaceId,
            archivedAt: null,
          },

          select: {
            id: true,
            timeZone: true,
          },
        });

        /*
         * Event/page-view aggregates belong to buckets based on
         * event occurrence time.
         *
         * Session aggregates belong to the bucket in which the
         * session started. A late event may move startedAt to an
         * earlier bucket, so both the previous and new start
         * buckets must be rebuilt.
         */
        const hourlyBuckets = new Set(rawResult.hourlyBuckets);

        const dailyBuckets = new Set(rawResult.dailyBuckets);

        for (const rebuilt of rebuiltSessions) {
          for (const startedAt of [rebuilt.previousStartedAt, rebuilt.session.startedAt]) {
            hourlyBuckets.add(getAnalyticsBucket(startedAt, website.timeZone, AnalyticsAggregatePeriod.HOURLY).start.toISOString());

            dailyBuckets.add(getAnalyticsBucket(startedAt, website.timeZone, AnalyticsAggregatePeriod.DAILY).start.toISOString());
          }
        }

        await this.aggregates.rebuildBucketsInTransaction(
          transaction,
          website,
          AnalyticsAggregatePeriod.HOURLY,
          [...hourlyBuckets].map((value) => new Date(value)),
        );

        await this.aggregates.rebuildBucketsInTransaction(
          transaction,
          website,
          AnalyticsAggregatePeriod.DAILY,
          [...dailyBuckets].map((value) => new Date(value)),
        );

        return {
          pendingEventsAtStart,
          processedEvents: rawResult.processedEvents,
          failedEvents: rawResult.failedEvents,
        };
      },
      {
        isolationLevel: 'Serializable',
        maxWait: 10_000,
        timeout,
      },
    );
  }
}
