import type { ActivityWriteInput } from '../interfaces/activity-writer.interface';
import { sanitizeActivityMetadata } from '../utils/activity-metadata-sanitizer';
import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/database/prisma.service';
import { Prisma } from 'src/generated/prisma/client';

@Injectable()
export class ActivityWriterService {
  constructor(private readonly prisma: PrismaService) {}

  async write(input: ActivityWriteInput): Promise<void> {
    await this.prisma.$transaction(async (transaction) => {
      await this.writeWithTransaction(transaction, input);
    });
  }

  async writeMany(inputs: ActivityWriteInput[]): Promise<void> {
    if (inputs.length === 0) {
      return;
    }

    await this.prisma.$transaction(async (transaction) => {
      await this.writeManyWithTransaction(transaction, inputs);
    });
  }

  async writeWithTransaction(transaction: Prisma.TransactionClient, input: ActivityWriteInput): Promise<void> {
    await this.writeManyWithTransaction(transaction, [input]);
  }

  async writeManyWithTransaction(transaction: Prisma.TransactionClient, inputs: ActivityWriteInput[]): Promise<void> {
    if (inputs.length === 0) {
      return;
    }

    const createdAt = new Date();

    const data: Prisma.ApplicationActivityCreateManyInput[] = inputs.map((input) => {
      const metadata = sanitizeActivityMetadata(input.metadata);

      return {
        workspaceId: input.workspaceId,
        applicationId: input.applicationId ?? null,
        applicationName: input.applicationName.trim().slice(0, 160),
        actorType: input.actorType,
        actorUserId: input.actorUserId ?? null,
        activityType: input.activityType,
        entityType: input.entityType,
        entityId: input.entityId ?? null,
        title: input.title.trim().slice(0, 180),
        description: input.description?.trim().slice(0, 500) ?? null,

        ...(metadata
          ? {
              metadata,
            }
          : {}),

        createdAt,
      };
    });

    await transaction.applicationActivity.createMany({
      data,
    });

    const applicationIds = [...new Set(inputs.map((input) => input.applicationId).filter((applicationId): applicationId is string => Boolean(applicationId)))];

    for (const applicationId of applicationIds) {
      const relatedInput = inputs.find((input) => input.applicationId === applicationId);

      if (!relatedInput) {
        continue;
      }

      await transaction.saasApplication.updateMany({
        where: {
          id: applicationId,
          workspaceId: relatedInput.workspaceId,
        },

        data: {
          lastActivityAt: createdAt,
        },
      });
    }
  }
}
