import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { Prisma, WebhookDeliveryStatus, WebhookEventType } from '../../../generated/prisma/client';
import { WEBHOOK_PAYLOAD_VERSION } from '../webhooks.constants';

export interface PublishWebhookEventInput {
  workspaceId: string;

  type: WebhookEventType;

  resourceType?: string;

  resourceId?: string;

  occurredAt?: Date;

  data: Prisma.InputJsonValue;
}

@Injectable()
export class WebhookEventPublisherService {
  constructor(private readonly prisma: PrismaService) {}

  async publish(input: PublishWebhookEventInput) {
    return this.prisma.$transaction(async (transaction) => {
      const event = await transaction.webhookEvent.create({
        data: {
          workspaceId: input.workspaceId,

          type: input.type,

          payloadVersion: WEBHOOK_PAYLOAD_VERSION,

          resourceType: input.resourceType,

          resourceId: input.resourceId,

          payload: input.data,

          occurredAt: input.occurredAt ?? new Date(),
        },
      });

      const endpoints = await transaction.webhookEndpoint.findMany({
        where: {
          workspaceId: input.workspaceId,

          enabled: true,

          eventTypes: {
            has: input.type,
          },
        },

        select: {
          id: true,

          maxAttempts: true,
        },
      });

      if (endpoints.length > 0) {
        await transaction.webhookDelivery.createMany({
          data: endpoints.map((endpoint) => ({
            workspaceId: input.workspaceId,

            endpointId: endpoint.id,

            eventId: event.id,

            status: WebhookDeliveryStatus.PENDING,

            maxAttempts: endpoint.maxAttempts,

            nextAttemptAt: new Date(),
          })),

          skipDuplicates: true,
        });
      }

      return {
        eventId: event.id,

        queuedDeliveries: endpoints.length,
      };
    });
  }

  async publishTest(
    workspaceId: string,

    endpointId: string,
  ) {
    return this.prisma.$transaction(async (transaction) => {
      const endpoint = await transaction.webhookEndpoint.findFirstOrThrow({
        where: {
          id: endpointId,

          workspaceId,

          enabled: true,
        },

        select: {
          id: true,

          maxAttempts: true,
        },
      });

      const event = await transaction.webhookEvent.create({
        data: {
          workspaceId,

          type: WebhookEventType.WEBHOOK_TEST,

          payloadVersion: WEBHOOK_PAYLOAD_VERSION,

          resourceType: 'WEBHOOK_ENDPOINT',

          resourceId: endpoint.id,

          occurredAt: new Date(),

          payload: {
            message: 'SaaS Command Center webhook test delivery.',

            endpointId: endpoint.id,
          },
        },
      });

      return transaction.webhookDelivery.create({
        data: {
          workspaceId,

          endpointId: endpoint.id,

          eventId: event.id,

          status: WebhookDeliveryStatus.PENDING,

          maxAttempts: endpoint.maxAttempts,

          nextAttemptAt: new Date(),
        },
      });
    });
  }
}
