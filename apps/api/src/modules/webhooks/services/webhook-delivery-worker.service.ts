import { ConfigService } from '@nestjs/config';
import { Injectable, Logger, Inject } from '@nestjs/common';

import { Interval } from '@nestjs/schedule';

import { WebhookAttemptOutcome, WebhookDeliveryStatus } from '../../../generated/prisma/client';

import type { TypedConfigService } from '../../../config/runtime-config';

import { PrismaService } from '../../../database/prisma.service';

import { PostgresAdvisoryLockService } from '../../../infrastructure/database/postgres-advisory-lock.service';

import { WEBHOOK_RETRY_BASE_DELAY_MS, WEBHOOK_RETRY_MAX_DELAY_MS } from '../webhooks.constants';

import { WebhookOutboundClientService } from './webhook-outbound-client.service';

import { WebhookSecretCryptoService } from './webhook-secret-crypto.service';

import { WebhookSignatureService } from './webhook-signature.service';

@Injectable()
export class WebhookDeliveryWorkerService {
  private readonly logger = new Logger(WebhookDeliveryWorkerService.name);

  private running = false;

  constructor(
    private readonly prisma: PrismaService,

    @Inject(ConfigService)
    private readonly config: TypedConfigService,

    private readonly locks: PostgresAdvisoryLockService,

    private readonly crypto: WebhookSecretCryptoService,

    private readonly signature: WebhookSignatureService,

    private readonly outbound: WebhookOutboundClientService,
  ) {}

  @Interval(5_000)
  async tick(): Promise<void> {
    if (
      !this.config.get('WEBHOOK_WORKER_ENABLED', {
        infer: true,
      }) ||
      this.running
    ) {
      return;
    }

    this.running = true;

    try {
      await this.recoverStaleDeliveries();

      const batchSize = this.config.get('WEBHOOK_WORKER_BATCH_SIZE', {
        infer: true,
      });

      const concurrency = this.config.get('WEBHOOK_WORKER_CONCURRENCY', {
        infer: true,
      });

      const deliveries = await this.prisma.webhookDelivery.findMany({
        where: {
          status: {
            in: [WebhookDeliveryStatus.PENDING, WebhookDeliveryStatus.RETRY_SCHEDULED],
          },

          nextAttemptAt: {
            lte: new Date(),
          },

          endpoint: {
            enabled: true,
          },
        },

        select: {
          id: true,
        },

        orderBy: {
          nextAttemptAt: 'asc',
        },

        take: batchSize,
      });

      for (let index = 0; index < deliveries.length; index += concurrency) {
        const chunk = deliveries.slice(index, index + concurrency);

        await Promise.all(chunk.map((delivery) => this.runWithLock(delivery.id)));
      }
    } finally {
      this.running = false;
    }
  }

  private async runWithLock(deliveryId: string): Promise<void> {
    await this.locks.withLock(
      `webhook-delivery:${deliveryId}`,

      async () => {
        await this.processDelivery(deliveryId);
      },
    );
  }

  private async processDelivery(deliveryId: string): Promise<void> {
    const delivery = await this.prisma.webhookDelivery.findUnique({
      where: {
        id: deliveryId,
      },

      include: {
        endpoint: true,

        event: true,
      },
    });

    if (!delivery) {
      return;
    }

    if (!delivery.endpoint.enabled) {
      await this.prisma.webhookDelivery.updateMany({
        where: {
          id: delivery.id,

          status: {
            in: [WebhookDeliveryStatus.PENDING, WebhookDeliveryStatus.RETRY_SCHEDULED],
          },
        },

        data: {
          status: WebhookDeliveryStatus.CANCELLED,

          failureCode: 'ENDPOINT_DISABLED',

          failureReason: 'Webhook endpoint is disabled.',

          finishedAt: new Date(),
        },
      });

      return;
    }

    const claimed = await this.prisma.webhookDelivery.updateMany({
      where: {
        id: delivery.id,

        status: {
          in: [WebhookDeliveryStatus.PENDING, WebhookDeliveryStatus.RETRY_SCHEDULED],
        },
      },

      data: {
        status: WebhookDeliveryStatus.PROCESSING,

        startedAt: new Date(),
      },
    });

    if (claimed.count === 0) {
      return;
    }

    const attemptNumber = delivery.attemptCount + 1;

    const attemptStartedAt = new Date();

    const rawPayload = JSON.stringify({
      apiVersion: delivery.event.payloadVersion,

      id: delivery.event.id,

      type: delivery.event.type,

      source: 'saas-command-center',

      time: delivery.event.occurredAt.toISOString(),

      workspaceId: delivery.workspaceId,

      resource: {
        type: delivery.event.resourceType,

        id: delivery.event.resourceId,
      },

      data: delivery.event.payload,
    });

    const timestamp = Math.floor(Date.now() / 1_000).toString();

    let result: Awaited<ReturnType<WebhookOutboundClientService['sendJson']>>;

    try {
      const secret = this.crypto.decrypt({
        ciphertext: delivery.endpoint.secretCiphertext,

        iv: delivery.endpoint.secretIv,

        authTag: delivery.endpoint.secretAuthTag,

        keyVersion: delivery.endpoint.secretKeyVersion,
      });

      const signature = this.signature.sign(secret, timestamp, rawPayload);

      result = await this.outbound.sendJson(
        delivery.endpoint.url,

        rawPayload,

        {
          'x-command-center-event': delivery.event.type,

          'x-command-center-event-id': delivery.event.id,

          'x-command-center-delivery-id': delivery.id,

          'x-command-center-timestamp': timestamp,

          'x-command-center-signature': signature,

          'x-command-center-webhook-version': delivery.event.payloadVersion,
        },

        delivery.endpoint.timeoutMs,
      );
    } catch (error) {
      result = {
        success: false,

        retriable: false,

        statusCode: null,

        durationMs: Math.max(0, Date.now() - attemptStartedAt.getTime()),

        errorCode: error instanceof Error ? error.name : 'SECRET_DECRYPTION_FAILED',

        errorMessage: error instanceof Error ? error.message.slice(0, 500) : 'Webhook delivery failed.',
      };
    }

    const attemptFinishedAt = new Date();

    const shouldRetry = !result.success && result.retriable && attemptNumber < delivery.maxAttempts;

    const nextDelay = Math.min(
      WEBHOOK_RETRY_BASE_DELAY_MS * 2 ** Math.max(0, attemptNumber - 1),

      WEBHOOK_RETRY_MAX_DELAY_MS,
    );

    const finalStatus = result.success
      ? WebhookDeliveryStatus.SUCCEEDED
      : shouldRetry
        ? WebhookDeliveryStatus.RETRY_SCHEDULED
        : WebhookDeliveryStatus.DEAD_LETTERED;

    await this.prisma.$transaction(async (transaction) => {
      await transaction.webhookDeliveryAttempt.create({
        data: {
          deliveryId: delivery.id,

          attemptNumber,

          outcome: result.success ? WebhookAttemptOutcome.SUCCEEDED : WebhookAttemptOutcome.FAILED,

          responseStatus: result.statusCode,

          durationMs: result.durationMs,

          errorCode: result.errorCode,

          errorMessage: result.errorMessage,

          startedAt: attemptStartedAt,

          finishedAt: attemptFinishedAt,
        },
      });

      await transaction.webhookDelivery.update({
        where: {
          id: delivery.id,
        },

        data: {
          status: finalStatus,

          attemptCount: attemptNumber,

          nextAttemptAt: shouldRetry ? new Date(Date.now() + nextDelay) : delivery.nextAttemptAt,

          responseStatus: result.statusCode,

          responseDurationMs: result.durationMs,

          failureCode: result.success ? null : result.errorCode,

          failureReason: result.success ? null : result.errorMessage,

          deliveredAt: result.success ? attemptFinishedAt : null,

          finishedAt: shouldRetry ? null : attemptFinishedAt,
        },
      });

      await transaction.webhookEndpoint.update({
        where: {
          id: delivery.endpointId,
        },

        data: {
          lastDeliveryAt: attemptFinishedAt,

          lastSuccessAt: result.success ? attemptFinishedAt : undefined,

          lastFailureAt: result.success ? undefined : attemptFinishedAt,
        },
      });
    });

    this.logger.log(
      JSON.stringify({
        event: 'webhook_delivery_completed',

        deliveryId: delivery.id,

        endpointId: delivery.endpointId,

        eventType: delivery.event.type,

        status: finalStatus,

        attemptNumber,

        responseStatus: result.statusCode,

        durationMs: result.durationMs,
      }),
    );
  }

  private async recoverStaleDeliveries(): Promise<void> {
    const timeoutMs = this.config.get('WEBHOOK_PROCESSING_TIMEOUT_MS', {
      infer: true,
    });

    const staleBefore = new Date(Date.now() - timeoutMs);

    await this.prisma.webhookDelivery.updateMany({
      where: {
        status: WebhookDeliveryStatus.PROCESSING,

        startedAt: {
          lt: staleBefore,
        },
      },

      data: {
        status: WebhookDeliveryStatus.RETRY_SCHEDULED,

        nextAttemptAt: new Date(),

        failureCode: 'PROCESSING_TIMEOUT',

        failureReason: 'Previous delivery worker stopped before completing the delivery.',
      },
    });
  }
}
