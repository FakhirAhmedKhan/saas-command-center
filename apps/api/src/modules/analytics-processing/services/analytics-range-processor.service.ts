
import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AnalyticsAggregationService } from 'src/modules/analytics-engine/services/analytics-aggregation.service';
import { PageViewRebuilderService } from 'src/modules/analytics-engine/services/page-view-rebuilder.service';
import { RawEventProcessingService } from 'src/modules/analytics-engine/services/raw-event-processing.service';
import { SessionRebuilderService } from 'src/modules/analytics-engine/services/session-rebuilder.service';
import { VisitorRebuilderService } from 'src/modules/analytics-engine/services/visitor-rebuilder.service';
import { PrismaService } from '../../../database/prisma.service';
import type { TypedConfigService } from '../../../config/runtime-config';

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

    private readonly pageViews: PageViewRebuilderService,

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
         * Run sequentially.
         *
         * Do not use Promise.all() with a transaction client.
         * Each step must await completion before the next step.
         */

        const rawResult = await this.rawEvents.processRange(transaction, input);

        await this.visitors.rebuildRange(transaction, input);

        await this.sessions.rebuildRange(transaction, input);

        await this.pageViews.rebuildRange(transaction, input);

        await this.aggregates.rebuildRange(transaction, input);

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
