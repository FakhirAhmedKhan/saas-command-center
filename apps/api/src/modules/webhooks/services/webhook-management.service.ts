import { BadRequestException, ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../../database/prisma.service';
import { Prisma, WebhookDeliveryStatus, WebhookEventType } from '../../../generated/prisma/client';
import { WEBHOOK_EVENT_CATALOG, WEBHOOK_PAYLOAD_VERSION } from '../webhooks.constants';
import { WebhookAccessService } from './webhook-access.service';
import { WebhookEventPublisherService } from './webhook-event-publisher.service';
import { WebhookOutboundClientService } from './webhook-outbound-client.service';
import { WebhookSecretCryptoService } from './webhook-secret-crypto.service';
import type { TypedConfigService } from '../../../config/runtime-config';
import type { CreateWebhookEndpointDto, UpdateWebhookEndpointDto, WebhookDeliveryListQueryDto } from '../dto/webhook.dto';

@Injectable()
export class WebhookManagementService {
  constructor(
    private readonly prisma: PrismaService,

    @Inject(ConfigService)
    private readonly config: TypedConfigService,

    private readonly access: WebhookAccessService,

    private readonly crypto: WebhookSecretCryptoService,

    private readonly outbound: WebhookOutboundClientService,

    private readonly publisher: WebhookEventPublisherService,
  ) {}

  async list(
    workspaceId: string,

    userId: string,
  ) {
    const [canManage, endpoints] = await Promise.all([
      this.access.canManage(workspaceId, userId),

      this.prisma.webhookEndpoint.findMany({
        where: {
          workspaceId,
        },

        include: {
          deliveries: {
            select: {
              id: true,

              status: true,

              responseStatus: true,

              responseDurationMs: true,

              createdAt: true,

              deliveredAt: true,
            },

            orderBy: {
              createdAt: 'desc',
            },

            take: 1,
          },

          _count: {
            select: {
              deliveries: true,
            },
          },
        },

        orderBy: {
          createdAt: 'desc',
        },
      }),
    ]);

    return {
      canManage,

      eventCatalog: WEBHOOK_EVENT_CATALOG,

      items: endpoints.map((endpoint) => this.mapEndpoint(endpoint)),
    };
  }

  async create(
    workspaceId: string,

    userId: string,

    input: CreateWebhookEndpointDto,
  ) {
    await this.access.assertCanManage(workspaceId, userId);

    this.validateSubscriptions(input.eventTypes);

    await this.outbound.validateUrl(input.url);

    const rawSecret = this.crypto.generateSecret();

    const encrypted = this.crypto.encrypt(rawSecret);

    try {
      const endpoint = await this.prisma.webhookEndpoint.create({
        data: {
          workspaceId,

          name: input.name.trim(),

          url: input.url.trim(),

          eventTypes: input.eventTypes,

          payloadVersion: WEBHOOK_PAYLOAD_VERSION,

          secretCiphertext: encrypted.ciphertext,

          secretIv: encrypted.iv,

          secretAuthTag: encrypted.authTag,

          secretKeyVersion: encrypted.keyVersion,

          timeoutMs:
            input.timeoutMs ??
            this.config.get('WEBHOOK_DEFAULT_TIMEOUT_MS', {
              infer: true,
            }),

          maxAttempts:
            input.maxAttempts ??
            this.config.get('WEBHOOK_DEFAULT_MAX_ATTEMPTS', {
              infer: true,
            }),

          enabled: input.enabled ?? true,

          createdById: userId,

          updatedById: userId,
        },
      });

      return {
        endpoint: this.mapEndpoint(endpoint),

        secret: rawSecret,
      };
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('A webhook with this name already exists in the workspace.');
      }

      throw error;
    }
  }

  async update(
    workspaceId: string,

    endpointId: string,

    userId: string,

    input: UpdateWebhookEndpointDto,
  ) {
    await this.access.assertCanManage(workspaceId, userId);

    const endpoint = await this.requireEndpoint(workspaceId, endpointId);

    if (input.eventTypes) {
      this.validateSubscriptions(input.eventTypes);
    }

    if (input.url) {
      await this.outbound.validateUrl(input.url);
    }

    const updated = await this.prisma.$transaction(async (transaction) => {
      const result = await transaction.webhookEndpoint.update({
        where: {
          id: endpoint.id,
        },

        data: {
          name: input.name?.trim(),

          url: input.url?.trim(),

          eventTypes: input.eventTypes,

          timeoutMs: input.timeoutMs,

          maxAttempts: input.maxAttempts,

          enabled: input.enabled,

          updatedById: userId,
        },
      });

      if (input.enabled === false) {
        await transaction.webhookDelivery.updateMany({
          where: {
            endpointId: endpoint.id,

            status: {
              in: [WebhookDeliveryStatus.PENDING, WebhookDeliveryStatus.RETRY_SCHEDULED],
            },
          },

          data: {
            status: WebhookDeliveryStatus.CANCELLED,

            failureCode: 'ENDPOINT_DISABLED',

            failureReason: 'Webhook endpoint was disabled.',

            finishedAt: new Date(),
          },
        });
      }

      return result;
    });

    return this.mapEndpoint(updated);
  }

  async disable(
    workspaceId: string,

    endpointId: string,

    userId: string,
  ) {
    return this.update(workspaceId, endpointId, userId, {
      enabled: false,
    });
  }

  async rotateSecret(
    workspaceId: string,

    endpointId: string,

    userId: string,
  ) {
    await this.access.assertCanManage(workspaceId, userId);

    const endpoint = await this.requireEndpoint(workspaceId, endpointId);

    const rawSecret = this.crypto.generateSecret();

    const encrypted = this.crypto.encrypt(rawSecret);

    await this.prisma.webhookEndpoint.update({
      where: {
        id: endpoint.id,
      },

      data: {
        secretCiphertext: encrypted.ciphertext,

        secretIv: encrypted.iv,

        secretAuthTag: encrypted.authTag,

        secretKeyVersion: encrypted.keyVersion,

        updatedById: userId,
      },
    });

    return {
      secret: rawSecret,
    };
  }

  async testDelivery(
    workspaceId: string,

    endpointId: string,

    userId: string,
  ) {
    await this.access.assertCanManage(workspaceId, userId);

    const endpoint = await this.requireEndpoint(workspaceId, endpointId);

    if (!endpoint.enabled) {
      throw new BadRequestException('Enable the webhook before sending a test delivery.');
    }

    const delivery = await this.publisher.publishTest(workspaceId, endpoint.id);

    return {
      deliveryId: delivery.id,

      status: delivery.status,
    };
  }

  async listDeliveries(
    workspaceId: string,

    endpointId: string,

    query: WebhookDeliveryListQueryDto,
  ) {
    await this.requireEndpoint(workspaceId, endpointId);

    const where: Prisma.WebhookDeliveryWhereInput = {
      workspaceId,

      endpointId,

      status: query.status,
    };

    const [total, deliveries] = await Promise.all([
      this.prisma.webhookDelivery.count({
        where,
      }),

      this.prisma.webhookDelivery.findMany({
        where,

        include: {
          event: {
            select: {
              id: true,

              type: true,

              payloadVersion: true,

              resourceType: true,

              resourceId: true,

              occurredAt: true,
            },
          },

          attempts: {
            orderBy: {
              attemptNumber: 'desc',
            },
          },
        },

        orderBy: {
          createdAt: 'desc',
        },

        skip: (query.page - 1) * query.limit,

        take: query.limit,
      }),
    ]);

    return {
      items: deliveries.map((delivery) => ({
        id: delivery.id,

        status: delivery.status,

        attemptCount: delivery.attemptCount,

        maxAttempts: delivery.maxAttempts,

        nextAttemptAt: delivery.nextAttemptAt.toISOString(),

        responseStatus: delivery.responseStatus,

        responseDurationMs: delivery.responseDurationMs,

        failureCode: delivery.failureCode,

        failureReason: delivery.failureReason,

        deliveredAt: delivery.deliveredAt?.toISOString() ?? null,

        createdAt: delivery.createdAt.toISOString(),

        event: {
          ...delivery.event,

          occurredAt: delivery.event.occurredAt.toISOString(),
        },

        attempts: delivery.attempts.map((attempt) => ({
          id: attempt.id,

          attemptNumber: attempt.attemptNumber,

          outcome: attempt.outcome,

          responseStatus: attempt.responseStatus,

          durationMs: attempt.durationMs,

          errorCode: attempt.errorCode,

          errorMessage: attempt.errorMessage,

          startedAt: attempt.startedAt.toISOString(),

          finishedAt: attempt.finishedAt.toISOString(),
        })),
      })),

      pagination: {
        page: query.page,

        limit: query.limit,

        total,

        totalPages: Math.max(1, Math.ceil(total / query.limit)),
      },
    };
  }

  private async requireEndpoint(
    workspaceId: string,

    endpointId: string,
  ) {
    const endpoint = await this.prisma.webhookEndpoint.findFirst({
      where: {
        id: endpointId,

        workspaceId,
      },
    });

    if (!endpoint) {
      throw new NotFoundException('Webhook endpoint not found.');
    }

    return endpoint;
  }

  private validateSubscriptions(eventTypes: WebhookEventType[]): void {
    if (eventTypes.includes(WebhookEventType.WEBHOOK_TEST)) {
      throw new BadRequestException('WEBHOOK_TEST cannot be selected as a subscription.');
    }

    if (new Set(eventTypes).size !== eventTypes.length) {
      throw new BadRequestException('Webhook event subscriptions cannot contain duplicates.');
    }
  }

  private mapEndpoint(endpoint: {
    id: string;

    workspaceId: string;

    name: string;

    url: string;

    eventTypes: WebhookEventType[];

    payloadVersion: string;

    timeoutMs: number;

    maxAttempts: number;

    enabled: boolean;

    lastDeliveryAt: Date | null;

    lastSuccessAt: Date | null;

    lastFailureAt: Date | null;

    createdAt: Date;

    updatedAt: Date;

    deliveries?: Array<{
      id: string;

      status: WebhookDeliveryStatus;

      responseStatus: number | null;

      responseDurationMs: number | null;

      createdAt: Date;

      deliveredAt: Date | null;
    }>;

    _count?: {
      deliveries: number;
    };
  }) {
    return {
      id: endpoint.id,

      workspaceId: endpoint.workspaceId,

      name: endpoint.name,

      url: endpoint.url,

      eventTypes: endpoint.eventTypes,

      payloadVersion: endpoint.payloadVersion,

      timeoutMs: endpoint.timeoutMs,

      maxAttempts: endpoint.maxAttempts,

      enabled: endpoint.enabled,

      secretConfigured: true,

      lastDeliveryAt: endpoint.lastDeliveryAt?.toISOString() ?? null,

      lastSuccessAt: endpoint.lastSuccessAt?.toISOString() ?? null,

      lastFailureAt: endpoint.lastFailureAt?.toISOString() ?? null,

      createdAt: endpoint.createdAt.toISOString(),

      updatedAt: endpoint.updatedAt.toISOString(),

      deliveryCount: endpoint._count?.deliveries ?? 0,

      latestDelivery: endpoint.deliveries?.[0]
        ? {
            ...endpoint.deliveries[0],

            createdAt: endpoint.deliveries[0].createdAt.toISOString(),

            deliveredAt: endpoint.deliveries[0].deliveredAt?.toISOString() ?? null,
          }
        : null,
    };
  }
}
