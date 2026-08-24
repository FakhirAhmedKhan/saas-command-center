import { AnalyticsProcessingService } from './analytics-processing.service';
import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaService } from 'src/database/prisma.service';

const DEFAULT_INTERVAL_MS = 60_000;
const DEFAULT_MAX_EVENTS = 5_000;
const DEFAULT_MAX_WEBSITES = 20;

@Injectable()
export class AnalyticsProcessingSchedulerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AnalyticsProcessingSchedulerService.name);

  private timer: NodeJS.Timeout | null = null;
  private running = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly processingService: AnalyticsProcessingService,
  ) {}

  onModuleInit(): void {
    const enabled = process.env.ANALYTICS_PROCESSING_SCHEDULER_ENABLED === 'true';

    if (!enabled) {
      this.logger.log('Analytics processing scheduler is disabled');

      return;
    }

    /*
     * The analytics-processing module's scheduler/worker is the canonical
     * pipeline (it owns the product-facing status/reprocess UI and the
     * queue/retry/dead-letter machinery). Both pipelines mark completion
     * on the same RawAnalyticsEvent.processedAt column, so running this
     * legacy timer at the same time as the canonical scheduler would
     * process the same raw events twice. Refuse to start rather than
     * risk that, instead of silently racing.
     */
    if (process.env.ANALYTICS_SCHEDULER_ENABLED !== 'false') {
      this.logger.error(
        'Legacy analytics-engine scheduler was requested (ANALYTICS_PROCESSING_SCHEDULER_ENABLED=true) while the ' +
          'canonical analytics-processing scheduler is also enabled (ANALYTICS_SCHEDULER_ENABLED is not "false"). ' +
          'Refusing to start the legacy timer to avoid double-processing the same RawAnalyticsEvent rows. ' +
          'Set ANALYTICS_SCHEDULER_ENABLED=false to run the legacy pipeline instead, or unset ' +
          'ANALYTICS_PROCESSING_SCHEDULER_ENABLED to use the canonical pipeline.',
      );

      return;
    }

    const intervalMs = this.readPositiveInteger(process.env.ANALYTICS_PROCESSING_INTERVAL_MS, DEFAULT_INTERVAL_MS);

    this.timer = setInterval(() => {
      void this.runOnce();
    }, intervalMs);

    this.timer.unref();

    this.logger.log(`Analytics processing scheduler started with interval ${intervalMs}ms`);
  }

  onModuleDestroy(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  async runOnce(): Promise<void> {
    if (this.running) {
      this.logger.warn('Analytics processing run is already active');

      return;
    }

    this.running = true;

    try {
      const maxEvents = this.readPositiveInteger(process.env.ANALYTICS_PROCESSING_MAX_EVENTS, DEFAULT_MAX_EVENTS);
      const maxWebsites = this.readPositiveInteger(process.env.ANALYTICS_PROCESSING_MAX_WEBSITES, DEFAULT_MAX_WEBSITES);
      const websites = await this.prisma.website.findMany({
        where: {
          enabled: true,
          archivedAt: null,
        },

        select: {
          id: true,
          name: true,
        },

        orderBy: {
          lastEventAt: 'asc',
        },

        take: maxWebsites,
      });

      for (const website of websites) {
        try {
          const result = await this.processingService.processWebsiteById(website.id, maxEvents);

          if (result.rawEventsProcessed > 0) {
            this.logger.log(`Processed ${result.rawEventsProcessed} analytics events for ${website.name}`);
          }
        } catch (error: unknown) {
          const message = error instanceof Error ? error.message : 'Unknown scheduler error';

          this.logger.error(`Analytics processing failed for website ${website.id}: ${message}`);
        }
      }
    } finally {
      this.running = false;
    }
  }

  private readPositiveInteger(value: string | undefined, fallback: number): number {
    const parsed = Number(value);

    return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
  }
}
