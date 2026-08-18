import { milestoneInclude } from '../development.constants';
import { CreateMilestoneDto, ReorderItemsDto, SkipWorkItemDto, UpdateMilestoneDto } from '../dto/development.dto';
import { DevelopmentSharedService } from './development-shared.service';
import { ProgressCalculatorService } from './progress-calculator.service';
import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/database/prisma.service';
import { Prisma } from 'src/generated/prisma/client';
import { ActivityEntityType, ApplicationActivityType, ApplicationTaskStatus, BlockerStatus, MilestoneStatus } from 'src/generated/prisma/enums';

@Injectable()
export class MilestonesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly progressCalculator: ProgressCalculatorService,
    private readonly shared: DevelopmentSharedService,
  ) {}

  async listMilestones(workspaceId: string, applicationId: string) {
    await this.shared.requireApplication(this.prisma, workspaceId, applicationId);

    return this.prisma.applicationMilestone.findMany({
      where: {
        applicationId,
      },
      orderBy: {
        position: 'asc',
      },
      include: milestoneInclude,
    });
  }

  async createMilestone(workspaceId: string, applicationId: string, dto: CreateMilestoneDto, actorUserId: string) {
    return this.prisma.$transaction(async (transaction) => {
      const application = await this.shared.requireApplication(transaction, workspaceId, applicationId);

      this.shared.ensureApplicationActive(application);

      const startsAt = this.shared.toNullableDate(dto.startsAt);

      const dueAt = this.shared.toNullableDate(dto.dueAt);

      this.shared.validateDateRange(startsAt, dueAt);

      const position = await this.nextMilestonePosition(transaction, applicationId);

      const milestone = await transaction.applicationMilestone.create({
        data: {
          applicationId,
          title: this.shared.requiredText(dto.title, 'Milestone title'),
          description: this.shared.optionalText(dto.description),
          weight: dto.weight ?? 1,
          position,
          startsAt,
          dueAt,
        },
        include: milestoneInclude,
      });

      await this.progressCalculator.recalculateWithTransaction(transaction, workspaceId, applicationId);

      await this.shared.writeActivity(transaction, application, actorUserId, {
        activityType: ApplicationActivityType.MILESTONE_CREATED,
        entityType: ActivityEntityType.MILESTONE,
        entityId: milestone.id,
        title: 'Milestone created',
        description: `${milestone.title} was added to ${application.name}.`,
        metadata: {
          weight: milestone.weight,
          dueAt: milestone.dueAt,
        },
      });

      return transaction.applicationMilestone.findUniqueOrThrow({
        where: {
          id: milestone.id,
        },
        include: milestoneInclude,
      });
    });
  }

  async updateMilestone(workspaceId: string, applicationId: string, milestoneId: string, dto: UpdateMilestoneDto, actorUserId: string) {
    return this.prisma.$transaction(async (transaction) => {
      const application = await this.shared.requireApplication(transaction, workspaceId, applicationId);

      this.shared.ensureApplicationActive(application);

      const milestone = await this.requireMilestone(transaction, applicationId, milestoneId);

      if (milestone.status === MilestoneStatus.SKIPPED) {
        throw new ConflictException('Reopen the milestone before editing it');
      }

      const startsAt = dto.startsAt !== undefined ? this.shared.toNullableDate(dto.startsAt) : milestone.startsAt;

      const dueAt = dto.dueAt !== undefined ? this.shared.toNullableDate(dto.dueAt) : milestone.dueAt;

      this.shared.validateDateRange(startsAt, dueAt);

      const updated = await transaction.applicationMilestone.update({
        where: {
          id: milestoneId,
        },
        data: {
          ...(dto.title !== undefined
            ? {
                title: this.shared.requiredText(dto.title, 'Milestone title'),
              }
            : {}),
          ...(dto.description !== undefined
            ? {
                description: this.shared.optionalText(dto.description),
              }
            : {}),
          ...(dto.weight !== undefined
            ? {
                weight: dto.weight,
              }
            : {}),
          ...(dto.startsAt !== undefined
            ? {
                startsAt,
              }
            : {}),
          ...(dto.dueAt !== undefined
            ? {
                dueAt,
              }
            : {}),
        },
        include: milestoneInclude,
      });

      await this.progressCalculator.recalculateWithTransaction(transaction, workspaceId, applicationId);

      await this.shared.writeActivity(transaction, application, actorUserId, {
        activityType: ApplicationActivityType.MILESTONE_UPDATED,
        entityType: ActivityEntityType.MILESTONE,
        entityId: milestoneId,
        title: 'Milestone updated',
        description: `${updated.title} was updated.`,
        metadata: {
          previous: {
            title: milestone.title,
            weight: milestone.weight,
            startsAt: milestone.startsAt,
            dueAt: milestone.dueAt,
          },
          current: {
            title: updated.title,
            weight: updated.weight,
            startsAt: updated.startsAt,
            dueAt: updated.dueAt,
          },
        },
      });

      return updated;
    });
  }

  async completeMilestone(workspaceId: string, applicationId: string, milestoneId: string, actorUserId: string) {
    return this.prisma.$transaction(async (transaction) => {
      const application = await this.shared.requireApplication(transaction, workspaceId, applicationId);

      this.shared.ensureApplicationActive(application);

      const milestone = await this.requireMilestone(transaction, applicationId, milestoneId);

      const openBlockers = await transaction.applicationBlocker.count({
        where: {
          applicationId,
          status: BlockerStatus.OPEN,
          OR: [
            {
              milestoneId,
            },
            {
              task: {
                milestoneId,
              },
            },
          ],
        },
      });

      if (openBlockers > 0) {
        throw new ConflictException('Resolve open blockers before completing this milestone');
      }

      const completedAt = new Date();

      await transaction.applicationTask.updateMany({
        where: {
          milestoneId,
          status: {
            not: ApplicationTaskStatus.SKIPPED,
          },
        },
        data: {
          status: ApplicationTaskStatus.COMPLETED,
          completedAt,
          skippedAt: null,
          skipReason: null,
        },
      });

      await transaction.applicationMilestone.update({
        where: {
          id: milestoneId,
        },
        data: {
          status: MilestoneStatus.COMPLETED,
          completedAt,
          skippedAt: null,
          skipReason: null,
        },
      });

      await this.progressCalculator.recalculateWithTransaction(transaction, workspaceId, applicationId);

      await this.shared.writeActivity(transaction, application, actorUserId, {
        activityType: ApplicationActivityType.MILESTONE_COMPLETED,
        entityType: ActivityEntityType.MILESTONE,
        entityId: milestoneId,
        title: 'Milestone completed',
        description: `${milestone.title} was completed.`,
      });

      return transaction.applicationMilestone.findUniqueOrThrow({
        where: {
          id: milestoneId,
        },
        include: milestoneInclude,
      });
    });
  }

  async reopenMilestone(workspaceId: string, applicationId: string, milestoneId: string, actorUserId: string) {
    return this.prisma.$transaction(async (transaction) => {
      const application = await this.shared.requireApplication(transaction, workspaceId, applicationId);

      this.shared.ensureApplicationActive(application);

      const milestone = await this.requireMilestone(transaction, applicationId, milestoneId);

      await transaction.applicationMilestone.update({
        where: {
          id: milestoneId,
        },
        data: {
          status: MilestoneStatus.PLANNED,
          completedAt: null,
          skippedAt: null,
          skipReason: null,
        },
      });

      await transaction.applicationTask.updateMany({
        where: {
          milestoneId,
          status: ApplicationTaskStatus.COMPLETED,
        },
        data: {
          status: ApplicationTaskStatus.TODO,
          completedAt: null,
        },
      });

      await this.progressCalculator.recalculateWithTransaction(transaction, workspaceId, applicationId);

      await this.shared.writeActivity(transaction, application, actorUserId, {
        activityType: ApplicationActivityType.MILESTONE_REOPENED,
        entityType: ActivityEntityType.MILESTONE,
        entityId: milestoneId,
        title: 'Milestone reopened',
        description: `${milestone.title} was reopened.`,
      });

      return transaction.applicationMilestone.findUniqueOrThrow({
        where: {
          id: milestoneId,
        },
        include: milestoneInclude,
      });
    });
  }

  async skipMilestone(workspaceId: string, applicationId: string, milestoneId: string, dto: SkipWorkItemDto, actorUserId: string) {
    return this.prisma.$transaction(async (transaction) => {
      const application = await this.shared.requireApplication(transaction, workspaceId, applicationId);

      this.shared.ensureApplicationActive(application);

      const milestone = await this.requireMilestone(transaction, applicationId, milestoneId);

      await transaction.applicationMilestone.update({
        where: {
          id: milestoneId,
        },
        data: {
          status: MilestoneStatus.SKIPPED,
          progressPercent: 0,
          skippedAt: new Date(),
          skipReason: this.shared.requiredText(dto.reason, 'Skip reason'),
          completedAt: null,
        },
      });

      await this.progressCalculator.recalculateWithTransaction(transaction, workspaceId, applicationId);

      await this.shared.writeActivity(transaction, application, actorUserId, {
        activityType: ApplicationActivityType.MILESTONE_SKIPPED,
        entityType: ActivityEntityType.MILESTONE,
        entityId: milestoneId,
        title: 'Milestone skipped',
        description: `${milestone.title} was removed from applicable scope.`,
        metadata: {
          reason: dto.reason,
        },
      });

      return transaction.applicationMilestone.findUniqueOrThrow({
        where: {
          id: milestoneId,
        },
        include: milestoneInclude,
      });
    });
  }

  async deleteMilestone(workspaceId: string, applicationId: string, milestoneId: string, actorUserId: string): Promise<void> {
    await this.prisma.$transaction(async (transaction) => {
      const application = await this.shared.requireApplication(transaction, workspaceId, applicationId);

      this.shared.ensureApplicationActive(application);

      const milestone = await this.requireMilestone(transaction, applicationId, milestoneId);

      await transaction.applicationBlocker.deleteMany({
        where: {
          OR: [
            {
              milestoneId,
            },
            {
              task: {
                milestoneId,
              },
            },
          ],
        },
      });

      await transaction.applicationMilestone.delete({
        where: {
          id: milestoneId,
        },
      });

      await this.normalizeMilestonePositions(transaction, applicationId);

      await this.progressCalculator.recalculateWithTransaction(transaction, workspaceId, applicationId);

      await this.shared.writeActivity(transaction, application, actorUserId, {
        activityType: ApplicationActivityType.MILESTONE_DELETED,
        entityType: ActivityEntityType.MILESTONE,
        entityId: milestoneId,
        title: 'Milestone deleted',
        description: `${milestone.title} was deleted.`,
      });
    });
  }

  async reorderMilestones(workspaceId: string, applicationId: string, dto: ReorderItemsDto, actorUserId: string) {
    return this.prisma.$transaction(async (transaction) => {
      const application = await this.shared.requireApplication(transaction, workspaceId, applicationId);

      this.shared.ensureApplicationActive(application);

      const milestones = await transaction.applicationMilestone.findMany({
        where: {
          applicationId,
        },
        select: {
          id: true,
        },
      });

      this.shared.validateOrderedIds(
        milestones.map((milestone) => milestone.id),
        dto.orderedIds,
        'milestones',
      );

      for (let index = 0; index < dto.orderedIds.length; index += 1) {
        await transaction.applicationMilestone.update({
          where: {
            id: dto.orderedIds[index],
          },
          data: {
            position: index,
          },
        });
      }

      await this.shared.writeActivity(transaction, application, actorUserId, {
        activityType: ApplicationActivityType.MILESTONE_REORDERED,
        entityType: ActivityEntityType.APPLICATION,
        entityId: applicationId,
        title: 'Milestones reordered',
        description: `Milestones for ${application.name} were reordered.`,
        metadata: {
          orderedIds: dto.orderedIds,
        },
      });

      return transaction.applicationMilestone.findMany({
        where: {
          applicationId,
        },
        orderBy: {
          position: 'asc',
        },
        include: milestoneInclude,
      });
    });
  }

  async requireMilestone(client: PrismaService | Prisma.TransactionClient, applicationId: string, milestoneId: string) {
    const milestone = await client.applicationMilestone.findFirst({
      where: {
        id: milestoneId,
        applicationId,
      },
    });

    if (!milestone) {
      throw new NotFoundException('Application milestone not found');
    }

    return milestone;
  }

  async nextMilestonePosition(transaction: Prisma.TransactionClient, applicationId: string): Promise<number> {
    const result = await transaction.applicationMilestone.aggregate({
      where: {
        applicationId,
      },
      _max: {
        position: true,
      },
    });

    return (result._max.position ?? -1) + 1;
  }

  private async normalizeMilestonePositions(transaction: Prisma.TransactionClient, applicationId: string): Promise<void> {
    const milestones = await transaction.applicationMilestone.findMany({
      where: {
        applicationId,
      },
      orderBy: {
        position: 'asc',
      },
      select: {
        id: true,
      },
    });

    for (let index = 0; index < milestones.length; index += 1) {
      await transaction.applicationMilestone.update({
        where: {
          id: milestones[index]!.id,
        },
        data: {
          position: index,
        },
      });
    }
  }
}
