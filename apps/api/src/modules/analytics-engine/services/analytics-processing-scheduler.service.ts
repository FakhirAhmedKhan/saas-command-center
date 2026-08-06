import {
    Injectable,
    Logger,
    OnModuleDestroy,
    OnModuleInit,
} from '@nestjs/common';

import { PrismaService } from 'src/database/prisma.service';

import { AnalyticsProcessingService } from './analytics-processing.service';

const DEFAULT_INTERVAL_MS = 60_000;
const DEFAULT_MAX_EVENTS = 5_000;
const DEFAULT_MAX_WEBSITES = 20;

@Injectable()
export class AnalyticsProcessingSchedulerService
    implements OnModuleInit, OnModuleDestroy {
    private readonly logger = new Logger(
        AnalyticsProcessingSchedulerService.name,
    );

    private timer: NodeJS.Timeout | null = null;
    private running = false;

    constructor(
        private readonly prisma: PrismaService,
        private readonly processingService: AnalyticsProcessingService,
    ) { }

    onModuleInit(): void {
        const enabled =
            process.env.ANALYTICS_PROCESSING_SCHEDULER_ENABLED ===
            'true';

        if (!enabled) {
            this.logger.log(
                'Analytics processing scheduler is disabled',
            );

            return;
        }

        const intervalMs = this.readPositiveInteger(
            process.env.ANALYTICS_PROCESSING_INTERVAL_MS,
            DEFAULT_INTERVAL_MS,
        );

        this.timer = setInterval(() => {
            void this.runOnce();
        }, intervalMs);

        this.timer.unref();

        this.logger.log(
            `Analytics processing scheduler started with interval ${intervalMs}ms`,
        );
    }

    onModuleDestroy(): void {
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }
    }

    async runOnce(): Promise<void> {
        if (this.running) {
            this.logger.warn(
                'Analytics processing run is already active',
            );

            return;
        }

        this.running = true;

        try {
            const maxEvents = this.readPositiveInteger(
                process.env.ANALYTICS_PROCESSING_MAX_EVENTS,
                DEFAULT_MAX_EVENTS,
            );

            const maxWebsites = this.readPositiveInteger(
                process.env.ANALYTICS_PROCESSING_MAX_WEBSITES,
                DEFAULT_MAX_WEBSITES,
            );

            const websites =
                await this.prisma.website.findMany({
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
                    const result =
                        await this.processingService.processWebsiteById(
                            website.id,
                            maxEvents,
                        );

                    if (result.rawEventsProcessed > 0) {
                        this.logger.log(
                            `Processed ${result.rawEventsProcessed} analytics events for ${website.name}`,
                        );
                    }
                } catch (error: unknown) {
                    const message =
                        error instanceof Error
                            ? error.message
                            : 'Unknown scheduler error';

                    this.logger.error(
                        `Analytics processing failed for website ${website.id}: ${message}`,
                    );
                }
            }
        } finally {
            this.running = false;
        }
    }

    private readPositiveInteger(
        value: string | undefined,
        fallback: number,
    ): number {
        const parsed = Number(value);

        return Number.isInteger(parsed) && parsed > 0
            ? parsed
            : fallback;
    }
}