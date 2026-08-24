import { ActivityWriterService } from '../../activity/services/activity-writer.service';
import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/database/prisma.service';
import { Prisma } from 'src/generated/prisma/client';
import { ActivityActorType, ActivityEntityType, ApplicationActivityType } from 'src/generated/prisma/enums';

/**
 * Cross-domain helpers shared by the development templates, milestones,
 * tasks, and blockers services. Nothing here belongs to a single domain.
 */
@Injectable()
export class DevelopmentSharedService {
  constructor(private readonly activityWriter: ActivityWriterService) {}

  async requireApplication(client: PrismaService | Prisma.TransactionClient, workspaceId: string, applicationId: string) {
    const application = await client.saasApplication.findFirst({
      where: {
        id: applicationId,
        workspaceId,
      },
    });

    if (!application) {
      throw new NotFoundException('SaaS application not found');
    }

    return application;
  }

  ensureApplicationActive(application: { archivedAt: Date | null }): void {
    if (application.archivedAt) {
      throw new ConflictException('Restore the application before modifying development records');
    }
  }

  validateOrderedIds(existingIds: string[], orderedIds: string[], resourceName: string): void {
    if (existingIds.length !== orderedIds.length) {
      throw new BadRequestException(`All ${resourceName} must be included when reordering`);
    }

    const existing = new Set(existingIds);
    const valid = orderedIds.every((id) => existing.has(id));

    if (!valid) {
      throw new BadRequestException(`The ${resourceName} reorder list contains invalid IDs`);
    }
  }

  validateDateRange(startsAt: Date | null, dueAt: Date | null): void {
    if (startsAt && dueAt && dueAt < startsAt) {
      throw new BadRequestException('Due date cannot be before the start date');
    }
  }

  toNullableDate(value?: string | null): Date | null {
    if (!value) {
      return null;
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException('Invalid date value');
    }

    return date;
  }

  requiredText(value: string, fieldName: string): string {
    const normalized = value.trim().replace(/\s+/g, ' ');

    if (!normalized) {
      throw new BadRequestException(`${fieldName} is required`);
    }

    return normalized;
  }

  optionalText(value?: string | null): string | null {
    if (value === undefined || value === null) {
      return null;
    }

    return value.trim() || null;
  }

  async writeActivity(
    transaction: Prisma.TransactionClient,
    application: {
      id: string;
      workspaceId: string;
      name: string;
    },
    actorUserId: string,
    input: {
      activityType: ApplicationActivityType;
      entityType: ActivityEntityType;
      entityId?: string | null;
      title: string;
      description?: string | null;
      metadata?: Record<string, unknown>;
    },
  ): Promise<void> {
    await this.activityWriter.writeWithTransaction(transaction, {
      workspaceId: application.workspaceId,
      applicationId: application.id,
      applicationName: application.name,
      actorType: ActivityActorType.USER,
      actorUserId,
      activityType: input.activityType,
      entityType: input.entityType,
      entityId: input.entityId ?? null,
      title: input.title,
      description: input.description ?? null,
      metadata: input.metadata,
    });
  }
}
