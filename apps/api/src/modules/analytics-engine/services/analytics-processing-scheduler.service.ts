import {
    Injectable,
    Logger,
    OnModuleDestroy,
    OnModuleInit,
} from '@nestjs/common';

import {
    PrismaService,
} from 'src/database/prisma.service';

import {
    AnalyticsProcessingService,
} from './analytics-processing.service';

@Injectable()
export class AnalyticsProcessingSchedulerService
    implements
    OnModuleInit,
    OnModuleDestroy {
    private readonly logger =
        new Logger(
            AnalyticsProcessingSchedulerService.name,
        );

    private timer:
        NodeJS.Timeout | null = null;

    private running = false;

    constructor(
        private readonly prisma:
            PrismaService,

        private readonly processor:
            AnalyticsProcessingService,
    ) { }

    onModuleInit(): void {
        if (
            process.env
                .ANALYTICS_PROCESSOR_ENABLED ===
            'false'
        ) {
            return;
        }

        const intervalMs =
            this.readPositiveInteger(
                process.env
                    .ANALYTICS_PROCESSOR_INTERVAL_MS,
                15_000,
            );

        this.timer =
            setInterval(
                () => {
                    void this.tick();
                },
                intervalMs,
            );

        this.timer.unref();

        void this.tick();
    }

    onModuleDestroy(): void {
        if (this.timer) {
            clearInterval(
                this.timer,
            );

            this.timer = null;
        }
    }

    private async tick():
        Promise<void> {
        if (this.running) {
            return;
        }

        this.running = true;

        try {
            const websites =
                await this.prisma
                    .website.findMany({
                        where: {
                            enabled: true,
                            archivedAt: null,

                            rawEvents: {
                                some: {
                                    analyticsEvent:
                                        null,
                                },
                            },
                        },

                        select: {
                            id: true,
                        },

                        take: 10,
                    });

            const maxEvents =
                this.readPositiveInteger(
                    process.env
                        .ANALYTICS_PROCESSOR_MAX_EVENTS,
                    5000,
                );

            for (
                const website
                of websites
            ) {
                try {
                    await this.processor
                        .processWebsiteById(
                            website.id,
                            maxEvents,
                        );
                } catch (error: unknown) {
                    this.logger.error(
                        `Analytics processing failed for website ${website.id}`,

                        error instanceof Error
                            ? error.stack
                            : undefined,
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
        const parsed =
            Number(value);

        return Number.isInteger(
            parsed,
        ) && parsed > 0
            ? parsed
            : fallback;
    }
}