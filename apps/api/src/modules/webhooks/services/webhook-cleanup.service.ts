import type { TypedConfigService } from '../../../config/runtime-config';
import { PrismaService } from '../../../database/prisma.service';
import { WebhookDeliveryStatus } from '../../../generated/prisma/client';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class WebhookCleanupService {
  private readonly logger = new Logger(WebhookCleanupService.name);

  constructor(
    private readonly prisma: PrismaService,

    @Inject(ConfigService)
    private readonly config: TypedConfigService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_4AM)
  async cleanup(): Promise<void> {
    if (
      !this.config.get('WEBHOOK_CLEANUP_ENABLED', {
        infer: true,
      })
    ) {
      return;
    }

    const retentionDays = this.config.get('WEBHOOK_RETENTION_DAYS', {
      infer: true,
    });

    const cutoff = new Date(Date.now() - retentionDays * 86_400_000);

    const deliveries = await this.prisma.webhookDelivery.deleteMany({
      where: {
        createdAt: {
          lt: cutoff,
        },

        status: {
          in: [WebhookDeliveryStatus.SUCCEEDED, WebhookDeliveryStatus.DEAD_LETTERED, WebhookDeliveryStatus.CANCELLED],
        },
      },
    });

    const events = await this.prisma.webhookEvent.deleteMany({
      where: {
        createdAt: {
          lt: cutoff,
        },

        deliveries: {
          none: {},
        },
      },
    });

    this.logger.log(
      JSON.stringify({
        event: 'webhook_retention_cleanup',

        removedDeliveries: deliveries.count,

        removedEvents: events.count,
      }),
    );
  }
}
