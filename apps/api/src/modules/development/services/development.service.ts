import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';

import { PrismaService } from 'src/database/prisma.service';

import { Prisma } from 'src/generated/prisma/client';

import {
  ActivityActorType,
  ActivityEntityType,
  ApplicationActivityType,
  ApplicationTaskStatus,
  BlockerStatus,
  MilestoneStatus,
} from 'src/generated/prisma/enums';

import { ActivityWriterService } from '../../activity/services/activity-writer.service';

import {
  ApplyDevelopmentTemplateDto,
  BlockerQueryDto,
  ChangeTaskStatusDto,
  CreateBlockerDto,
  CreateMilestoneDto,
  CreateTaskDto,
  MoveTaskDto,
  ReorderItemsDto,
  ResolveBlockerDto,
  SkipWorkItemDto,
  UpdateBlockerDto,
  UpdateMilestoneDto,
  UpdateTaskDto,
} from '../dto/development.dto';

import { DEVELOPMENT_TEMPLATES } from '../templates/development-templates';

import { ProgressCalculatorService } from './progress-calculator.service';

const milestoneInclude = {
  tasks: {
    orderBy: [
      {
        position: 'asc',
      },
      {
        createdAt: 'asc',
      },
    ],
    include: {
      assignee: {
        select: {
          id: true,
          email: true,
          displayName: true,
        },
      },
      blockers: {
        where: {
          status: BlockerStatus.OPEN,
        },
        orderBy: {
          openedAt: 'desc',
        },
      },
    },
  },
  blockers: {
    where: {
      status: BlockerStatus.OPEN,
    },
    orderBy: {
      openedAt: 'desc',
    },
  },
} satisfies Prisma.ApplicationMilestoneInclude;

@Injectable()
export class DevelopmentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly progressCalculator: ProgressCalculatorService,
    private readonly activityWriter: ActivityWriterService,
  ) {}

  getTemplates() {
    return Object.values(DEVELOPMENT_TEMPLATES).map((template) => ({
      type: template.type,
      label: template.label,
      description: template.description,
      milestoneCount: template.milestones.length,
      taskCount: template.milestones.reduce((total, milestone) => total + milestone.tasks.length, 0),
    }));
  }

  async getSummary(workspaceId: string, applicationId: string) {
    return this.getSummaryWithClient(this.prisma, workspaceId, applicationId);
  }

  async listMilestones(workspaceId: string, applicationId: string) {
    await this.requireApplication(this.prisma, workspaceId, applicationId);

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

  async applyTemplate(workspaceId: string, applicationId: string, dto: ApplyDevelopmentTemplateDto, actorUserId: string) {
    const template = DEVELOPMENT_TEMPLATES[dto.template];

    if (!template) {
      throw new BadRequestException('Development template not found');
    }

    return this.prisma.$transaction(async (transaction) => {
      const application = await this.requireApplication(transaction, workspaceId, applicationId);

      this.ensureApplicationActive(application);

      const existingMilestones = await transaction.applicationMilestone.count({
        where: {
          applicationId,
        },
      });

      if (existingMilestones > 0 && !dto.replaceExisting) {
        throw new ConflictException('This application already has milestones. Set replaceExisting to true to replace them.');
      }

      if (existingMilestones > 0 && dto.replaceExisting) {
        await transaction.applicationBlocker.deleteMany({
          where: {
            applicationId,
          },
        });

        await transaction.applicationMilestone.deleteMany({
          where: {
            applicationId,
          },
        });
      }

      for (let milestoneIndex = 0; milestoneIndex < template.milestones.length; milestoneIndex += 1) {
        const definition = template.milestones[milestoneIndex];

        const milestone = await transaction.applicationMilestone.create({
          data: {
            applicationId,
            title: definition!.title,
            description: definition!.description,
            weight: definition!.weight,
            position: milestoneIndex,
          },
        });

        if (definition!.tasks.length > 0) {
          await transaction.applicationTask.createMany({
            data: definition!.tasks.map((task, taskIndex) => ({
              milestoneId: milestone.id,
              title: task.title,
              description: task.description ?? null,
              weight: task.weight,
              priority: task.priority,
              position: taskIndex,
            })),
          });
        }
      }

      await transaction.saasApplication.update({
        where: {
          id: applicationId,
        },
        data: {
          developmentTemplate: dto.template,
          templateAppliedAt: new Date(),
        },
      });

      await this.progressCalculator.recalculateWithTransaction(transaction, workspaceId, applicationId);

      await this.writeActivity(transaction, application, actorUserId, {
        activityType: ApplicationActivityType.DEVELOPMENT_TEMPLATE_APPLIED,
        entityType: ActivityEntityType.APPLICATION,
        entityId: applicationId,
        title: 'Development template applied',
        description: `${template.label} was applied to ${application.name}.`,
        metadata: {
          template: dto.template,
          replacedExisting: Boolean(dto.replaceExisting && existingMilestones > 0),
          milestoneCount: template.milestones.length,
        },
      });

      return this.getSummaryWithClient(transaction, workspaceId, applicationId);
    });
  }

  async createMilestone(workspaceId: string, applicationId: string, dto: CreateMilestoneDto, actorUserId: string) {
    return this.prisma.$transaction(async (transaction) => {
      const application = await this.requireApplication(transaction, workspaceId, applicationId);

      this.ensureApplicationActive(application);

      const startsAt = this.toNullableDate(dto.startsAt);

      const dueAt = this.toNullableDate(dto.dueAt);

      this.validateDateRange(startsAt, dueAt);

      const position = await this.nextMilestonePosition(transaction, applicationId);

      const milestone = await transaction.applicationMilestone.create({
        data: {
          applicationId,
          title: this.requiredText(dto.title, 'Milestone title'),
          description: this.optionalText(dto.description),
          weight: dto.weight ?? 1,
          position,
          startsAt,
          dueAt,
        },
        include: milestoneInclude,
      });

      await this.progressCalculator.recalculateWithTransaction(transaction, workspaceId, applicationId);

      await this.writeActivity(transaction, application, actorUserId, {
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
      const application = await this.requireApplication(transaction, workspaceId, applicationId);

      this.ensureApplicationActive(application);

      const milestone = await this.requireMilestone(transaction, applicationId, milestoneId);

      if (milestone.status === MilestoneStatus.SKIPPED) {
        throw new ConflictException('Reopen the milestone before editing it');
      }

      const startsAt = dto.startsAt !== undefined ? this.toNullableDate(dto.startsAt) : milestone.startsAt;

      const dueAt = dto.dueAt !== undefined ? this.toNullableDate(dto.dueAt) : milestone.dueAt;

      this.validateDateRange(startsAt, dueAt);

      const updated = await transaction.applicationMilestone.update({
        where: {
          id: milestoneId,
        },
        data: {
          ...(dto.title !== undefined
            ? {
                title: this.requiredText(dto.title, 'Milestone title'),
              }
            : {}),
          ...(dto.description !== undefined
            ? {
                description: this.optionalText(dto.description),
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

      await this.writeActivity(transaction, application, actorUserId, {
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
      const application = await this.requireApplication(transaction, workspaceId, applicationId);

      this.ensureApplicationActive(application);

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

      await this.writeActivity(transaction, application, actorUserId, {
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
      const application = await this.requireApplication(transaction, workspaceId, applicationId);

      this.ensureApplicationActive(application);

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

      await this.writeActivity(transaction, application, actorUserId, {
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
      const application = await this.requireApplication(transaction, workspaceId, applicationId);

      this.ensureApplicationActive(application);

      const milestone = await this.requireMilestone(transaction, applicationId, milestoneId);

      await transaction.applicationMilestone.update({
        where: {
          id: milestoneId,
        },
        data: {
          status: MilestoneStatus.SKIPPED,
          progressPercent: 0,
          skippedAt: new Date(),
          skipReason: this.requiredText(dto.reason, 'Skip reason'),
          completedAt: null,
        },
      });

      await this.progressCalculator.recalculateWithTransaction(transaction, workspaceId, applicationId);

      await this.writeActivity(transaction, application, actorUserId, {
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
      const application = await this.requireApplication(transaction, workspaceId, applicationId);

      this.ensureApplicationActive(application);

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

      await this.writeActivity(transaction, application, actorUserId, {
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
      const application = await this.requireApplication(transaction, workspaceId, applicationId);

      this.ensureApplicationActive(application);

      const milestones = await transaction.applicationMilestone.findMany({
        where: {
          applicationId,
        },
        select: {
          id: true,
        },
      });

      this.validateOrderedIds(
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

      await this.writeActivity(transaction, application, actorUserId, {
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

  async createTask(workspaceId: string, applicationId: string, milestoneId: string, dto: CreateTaskDto, actorUserId: string) {
    return this.prisma.$transaction(async (transaction) => {
      const application = await this.requireApplication(transaction, workspaceId, applicationId);

      this.ensureApplicationActive(application);

      const milestone = await this.requireMilestone(transaction, applicationId, milestoneId);

      if (milestone.status === MilestoneStatus.SKIPPED) {
        throw new ConflictException('Reopen the milestone before adding tasks');
      }

      if (dto.assigneeUserId) {
        await this.requireWorkspaceMember(transaction, workspaceId, dto.assigneeUserId);
      }

      const position = await this.nextTaskPosition(transaction, milestoneId);

      const task = await transaction.applicationTask.create({
        data: {
          milestoneId,
          title: this.requiredText(dto.title, 'Task title'),
          description: this.optionalText(dto.description),
          priority: dto.priority,
          weight: dto.weight ?? 1,
          assigneeUserId: dto.assigneeUserId ?? null,
          dueAt: this.toNullableDate(dto.dueAt),
          position,
        },
        include: {
          assignee: {
            select: {
              id: true,
              email: true,
              displayName: true,
            },
          },
          blockers: true,
        },
      });

      await this.progressCalculator.recalculateWithTransaction(transaction, workspaceId, applicationId);

      await this.writeActivity(transaction, application, actorUserId, {
        activityType: ApplicationActivityType.TASK_CREATED,
        entityType: ActivityEntityType.TASK,
        entityId: task.id,
        title: 'Task created',
        description: `${task.title} was added to ${milestone.title}.`,
        metadata: {
          milestoneId,
          weight: task.weight,
          priority: task.priority,
        },
      });

      return task;
    });
  }

  async updateTask(workspaceId: string, applicationId: string, taskId: string, dto: UpdateTaskDto, actorUserId: string) {
    return this.prisma.$transaction(async (transaction) => {
      const application = await this.requireApplication(transaction, workspaceId, applicationId);

      this.ensureApplicationActive(application);

      const task = await this.requireTask(transaction, applicationId, taskId);

      if (task.status === ApplicationTaskStatus.SKIPPED) {
        throw new ConflictException('Reopen the task before editing it');
      }

      if (dto.assigneeUserId) {
        await this.requireWorkspaceMember(transaction, workspaceId, dto.assigneeUserId);
      }

      const updated = await transaction.applicationTask.update({
        where: {
          id: taskId,
        },
        data: {
          ...(dto.title !== undefined
            ? {
                title: this.requiredText(dto.title, 'Task title'),
              }
            : {}),
          ...(dto.description !== undefined
            ? {
                description: this.optionalText(dto.description),
              }
            : {}),
          ...(dto.priority !== undefined
            ? {
                priority: dto.priority,
              }
            : {}),
          ...(dto.weight !== undefined
            ? {
                weight: dto.weight,
              }
            : {}),
          ...(dto.assigneeUserId !== undefined
            ? {
                assigneeUserId: dto.assigneeUserId,
              }
            : {}),
          ...(dto.dueAt !== undefined
            ? {
                dueAt: this.toNullableDate(dto.dueAt),
              }
            : {}),
        },
        include: {
          assignee: {
            select: {
              id: true,
              email: true,
              displayName: true,
            },
          },
          blockers: true,
        },
      });

      await this.progressCalculator.recalculateWithTransaction(transaction, workspaceId, applicationId);

      await this.writeActivity(transaction, application, actorUserId, {
        activityType: ApplicationActivityType.TASK_UPDATED,
        entityType: ActivityEntityType.TASK,
        entityId: taskId,
        title: 'Task updated',
        description: `${updated.title} was updated.`,
        metadata: {
          previous: {
            title: task.title,
            weight: task.weight,
            priority: task.priority,
            dueAt: task.dueAt,
            assigneeUserId: task.assigneeUserId,
          },
          current: {
            title: updated.title,
            weight: updated.weight,
            priority: updated.priority,
            dueAt: updated.dueAt,
            assigneeUserId: updated.assigneeUserId,
          },
        },
      });

      return updated;
    });
  }

  async setTaskStatus(workspaceId: string, applicationId: string, taskId: string, dto: ChangeTaskStatusDto, actorUserId: string) {
    return this.prisma.$transaction(async (transaction) => {
      const application = await this.requireApplication(transaction, workspaceId, applicationId);

      this.ensureApplicationActive(application);

      const task = await this.requireTask(transaction, applicationId, taskId);

      const status = dto.status as ApplicationTaskStatus;

      const updated = await transaction.applicationTask.update({
        where: {
          id: taskId,
        },
        data: {
          status,
          completedAt: null,
          skippedAt: null,
          skipReason: null,
        },
      });

      await this.progressCalculator.recalculateWithTransaction(transaction, workspaceId, applicationId);

      await this.writeActivity(transaction, application, actorUserId, {
        activityType: ApplicationActivityType.TASK_STATUS_CHANGED,
        entityType: ActivityEntityType.TASK,
        entityId: taskId,
        title: 'Task status changed',
        description: `${task.title} moved from ${task.status} to ${status}.`,
        metadata: {
          previousStatus: task.status,
          currentStatus: status,
        },
      });

      return updated;
    });
  }

  async completeTask(workspaceId: string, applicationId: string, taskId: string, actorUserId: string) {
    return this.prisma.$transaction(async (transaction) => {
      const application = await this.requireApplication(transaction, workspaceId, applicationId);

      this.ensureApplicationActive(application);

      const task = await this.requireTask(transaction, applicationId, taskId);

      const openBlockers = await transaction.applicationBlocker.count({
        where: {
          taskId,
          status: BlockerStatus.OPEN,
        },
      });

      if (openBlockers > 0) {
        throw new ConflictException('Resolve open blockers before completing this task');
      }

      const updated = await transaction.applicationTask.update({
        where: {
          id: taskId,
        },
        data: {
          status: ApplicationTaskStatus.COMPLETED,
          completedAt: new Date(),
          skippedAt: null,
          skipReason: null,
        },
      });

      await this.progressCalculator.recalculateWithTransaction(transaction, workspaceId, applicationId);

      await this.writeActivity(transaction, application, actorUserId, {
        activityType: ApplicationActivityType.TASK_COMPLETED,
        entityType: ActivityEntityType.TASK,
        entityId: taskId,
        title: 'Task completed',
        description: `${task.title} was completed.`,
      });

      return updated;
    });
  }

  async reopenTask(workspaceId: string, applicationId: string, taskId: string, actorUserId: string) {
    return this.prisma.$transaction(async (transaction) => {
      const application = await this.requireApplication(transaction, workspaceId, applicationId);

      this.ensureApplicationActive(application);

      const task = await this.requireTask(transaction, applicationId, taskId);

      const updated = await transaction.applicationTask.update({
        where: {
          id: taskId,
        },
        data: {
          status: ApplicationTaskStatus.TODO,
          completedAt: null,
          skippedAt: null,
          skipReason: null,
        },
      });

      await this.progressCalculator.recalculateWithTransaction(transaction, workspaceId, applicationId);

      await this.writeActivity(transaction, application, actorUserId, {
        activityType: ApplicationActivityType.TASK_REOPENED,
        entityType: ActivityEntityType.TASK,
        entityId: taskId,
        title: 'Task reopened',
        description: `${task.title} was reopened.`,
      });

      return updated;
    });
  }

  async skipTask(workspaceId: string, applicationId: string, taskId: string, dto: SkipWorkItemDto, actorUserId: string) {
    return this.prisma.$transaction(async (transaction) => {
      const application = await this.requireApplication(transaction, workspaceId, applicationId);

      this.ensureApplicationActive(application);

      const task = await this.requireTask(transaction, applicationId, taskId);

      const updated = await transaction.applicationTask.update({
        where: {
          id: taskId,
        },
        data: {
          status: ApplicationTaskStatus.SKIPPED,
          skippedAt: new Date(),
          skipReason: this.requiredText(dto.reason, 'Skip reason'),
          completedAt: null,
        },
      });

      await this.progressCalculator.recalculateWithTransaction(transaction, workspaceId, applicationId);

      await this.writeActivity(transaction, application, actorUserId, {
        activityType: ApplicationActivityType.TASK_SKIPPED,
        entityType: ActivityEntityType.TASK,
        entityId: taskId,
        title: 'Task skipped',
        description: `${task.title} was removed from applicable scope.`,
        metadata: {
          reason: dto.reason,
        },
      });

      return updated;
    });
  }

  async moveTask(workspaceId: string, applicationId: string, taskId: string, dto: MoveTaskDto, actorUserId: string) {
    return this.prisma.$transaction(async (transaction) => {
      const application = await this.requireApplication(transaction, workspaceId, applicationId);

      this.ensureApplicationActive(application);

      const task = await this.requireTask(transaction, applicationId, taskId);

      const targetMilestone = await this.requireMilestone(transaction, applicationId, dto.targetMilestoneId);

      if (targetMilestone.status === MilestoneStatus.SKIPPED) {
        throw new ConflictException('Tasks cannot be moved into a skipped milestone');
      }

      const targetPosition = dto.position ?? (await this.nextTaskPosition(transaction, dto.targetMilestoneId));

      const updated = await transaction.applicationTask.update({
        where: {
          id: taskId,
        },
        data: {
          milestoneId: dto.targetMilestoneId,
          position: targetPosition,
        },
      });

      await this.normalizeTaskPositions(transaction, task.milestoneId);

      await this.normalizeTaskPositions(transaction, dto.targetMilestoneId);

      await this.progressCalculator.recalculateWithTransaction(transaction, workspaceId, applicationId);

      await this.writeActivity(transaction, application, actorUserId, {
        activityType: ApplicationActivityType.TASK_MOVED,
        entityType: ActivityEntityType.TASK,
        entityId: taskId,
        title: 'Task moved',
        description: `${task.title} was moved to ${targetMilestone.title}.`,
        metadata: {
          previousMilestoneId: task.milestoneId,
          currentMilestoneId: dto.targetMilestoneId,
        },
      });

      return updated;
    });
  }

  async reorderTasks(workspaceId: string, applicationId: string, milestoneId: string, dto: ReorderItemsDto, actorUserId: string) {
    return this.prisma.$transaction(async (transaction) => {
      const application = await this.requireApplication(transaction, workspaceId, applicationId);

      this.ensureApplicationActive(application);

      await this.requireMilestone(transaction, applicationId, milestoneId);

      const tasks = await transaction.applicationTask.findMany({
        where: {
          milestoneId,
        },
        select: {
          id: true,
        },
      });

      this.validateOrderedIds(
        tasks.map((task) => task.id),
        dto.orderedIds,
        'tasks',
      );

      for (let index = 0; index < dto.orderedIds.length; index += 1) {
        await transaction.applicationTask.update({
          where: {
            id: dto.orderedIds[index],
          },
          data: {
            position: index,
          },
        });
      }

      await this.writeActivity(transaction, application, actorUserId, {
        activityType: ApplicationActivityType.TASK_REORDERED,
        entityType: ActivityEntityType.MILESTONE,
        entityId: milestoneId,
        title: 'Tasks reordered',
        description: 'Tasks inside a milestone were reordered.',
      });

      return transaction.applicationTask.findMany({
        where: {
          milestoneId,
        },
        orderBy: {
          position: 'asc',
        },
      });
    });
  }

  async deleteTask(workspaceId: string, applicationId: string, taskId: string, actorUserId: string): Promise<void> {
    await this.prisma.$transaction(async (transaction) => {
      const application = await this.requireApplication(transaction, workspaceId, applicationId);

      this.ensureApplicationActive(application);

      const task = await this.requireTask(transaction, applicationId, taskId);

      await transaction.applicationBlocker.deleteMany({
        where: {
          taskId,
        },
      });

      await transaction.applicationTask.delete({
        where: {
          id: taskId,
        },
      });

      await this.normalizeTaskPositions(transaction, task.milestoneId);

      await this.progressCalculator.recalculateWithTransaction(transaction, workspaceId, applicationId);

      await this.writeActivity(transaction, application, actorUserId, {
        activityType: ApplicationActivityType.TASK_DELETED,
        entityType: ActivityEntityType.TASK,
        entityId: taskId,
        title: 'Task deleted',
        description: `${task.title} was deleted.`,
      });
    });
  }

  async listBlockers(workspaceId: string, applicationId: string, query: BlockerQueryDto) {
    await this.requireApplication(this.prisma, workspaceId, applicationId);

    const search = query.search?.trim();

    const where: Prisma.ApplicationBlockerWhereInput = {
      applicationId,
      ...(query.status
        ? {
            status: query.status,
          }
        : {}),
      ...(query.severity
        ? {
            severity: query.severity,
          }
        : {}),
      ...(search
        ? {
            OR: [
              {
                title: {
                  contains: search,
                  mode: 'insensitive',
                },
              },
              {
                description: {
                  contains: search,
                  mode: 'insensitive',
                },
              },
              {
                resolution: {
                  contains: search,
                  mode: 'insensitive',
                },
              },
            ],
          }
        : {}),
    };

    const skip = (query.page - 1) * query.limit;

    const [blockers, total] = await this.prisma.$transaction([
      this.prisma.applicationBlocker.findMany({
        where,
        orderBy: [
          {
            status: 'asc',
          },
          {
            openedAt: 'desc',
          },
        ],
        skip,
        take: query.limit,
        include: {
          milestone: {
            select: {
              id: true,
              title: true,
            },
          },
          task: {
            select: {
              id: true,
              title: true,
            },
          },
          createdBy: {
            select: {
              id: true,
              email: true,
              displayName: true,
            },
          },
          resolvedBy: {
            select: {
              id: true,
              email: true,
              displayName: true,
            },
          },
        },
      }),
      this.prisma.applicationBlocker.count({
        where,
      }),
    ]);

    const totalPages = Math.ceil(total / query.limit);

    return {
      data: blockers,
      meta: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages,
        hasNextPage: query.page < totalPages,
        hasPreviousPage: query.page > 1,
      },
    };
  }

  async createBlocker(workspaceId: string, applicationId: string, dto: CreateBlockerDto, actorUserId: string) {
    return this.prisma.$transaction(async (transaction) => {
      const application = await this.requireApplication(transaction, workspaceId, applicationId);

      this.ensureApplicationActive(application);

      let milestoneId = dto.milestoneId ?? null;

      if (milestoneId) {
        await this.requireMilestone(transaction, applicationId, milestoneId);
      }

      if (dto.taskId) {
        const task = await this.requireTask(transaction, applicationId, dto.taskId);

        if (milestoneId && milestoneId !== task.milestoneId) {
          throw new BadRequestException('The selected task does not belong to the selected milestone');
        }

        milestoneId = task.milestoneId;

        if (task.status !== ApplicationTaskStatus.COMPLETED && task.status !== ApplicationTaskStatus.SKIPPED) {
          await transaction.applicationTask.update({
            where: {
              id: task.id,
            },
            data: {
              status: ApplicationTaskStatus.BLOCKED,
              completedAt: null,
            },
          });
        }
      }

      const blocker = await transaction.applicationBlocker.create({
        data: {
          applicationId,
          milestoneId,
          taskId: dto.taskId ?? null,
          createdByUserId: actorUserId,
          title: this.requiredText(dto.title, 'Blocker title'),
          description: this.optionalText(dto.description),
          severity: dto.severity,
        },
        include: {
          milestone: true,
          task: true,
        },
      });

      await this.progressCalculator.recalculateWithTransaction(transaction, workspaceId, applicationId);

      await this.writeActivity(transaction, application, actorUserId, {
        activityType: ApplicationActivityType.BLOCKER_CREATED,
        entityType: ActivityEntityType.BLOCKER,
        entityId: blocker.id,
        title: 'Blocker created',
        description: `${blocker.title} is blocking progress.`,
        metadata: {
          severity: blocker.severity,
          milestoneId,
          taskId: blocker.taskId,
        },
      });

      return blocker;
    });
  }

  async updateBlocker(workspaceId: string, applicationId: string, blockerId: string, dto: UpdateBlockerDto, actorUserId: string) {
    return this.prisma.$transaction(async (transaction) => {
      const application = await this.requireApplication(transaction, workspaceId, applicationId);

      this.ensureApplicationActive(application);

      const blocker = await this.requireBlocker(transaction, applicationId, blockerId);

      const updated = await transaction.applicationBlocker.update({
        where: {
          id: blockerId,
        },
        data: {
          ...(dto.title !== undefined
            ? {
                title: this.requiredText(dto.title, 'Blocker title'),
              }
            : {}),
          ...(dto.description !== undefined
            ? {
                description: this.optionalText(dto.description),
              }
            : {}),
          ...(dto.severity !== undefined
            ? {
                severity: dto.severity,
              }
            : {}),
        },
      });

      await this.writeActivity(transaction, application, actorUserId, {
        activityType: ApplicationActivityType.BLOCKER_UPDATED,
        entityType: ActivityEntityType.BLOCKER,
        entityId: blockerId,
        title: 'Blocker updated',
        description: `${updated.title} was updated.`,
        metadata: {
          previousSeverity: blocker.severity,
          currentSeverity: updated.severity,
        },
      });

      return updated;
    });
  }

  async resolveBlocker(workspaceId: string, applicationId: string, blockerId: string, dto: ResolveBlockerDto, actorUserId: string) {
    return this.prisma.$transaction(async (transaction) => {
      const application = await this.requireApplication(transaction, workspaceId, applicationId);

      this.ensureApplicationActive(application);

      const blocker = await this.requireBlocker(transaction, applicationId, blockerId);

      const updated = await transaction.applicationBlocker.update({
        where: {
          id: blockerId,
        },
        data: {
          status: BlockerStatus.RESOLVED,
          resolution: this.requiredText(dto.resolution, 'Resolution'),
          resolvedAt: new Date(),
          resolvedByUserId: actorUserId,
        },
      });

      if (blocker.taskId) {
        await this.releaseTaskWhenUnblocked(transaction, blocker.taskId);
      }

      await this.progressCalculator.recalculateWithTransaction(transaction, workspaceId, applicationId);

      await this.writeActivity(transaction, application, actorUserId, {
        activityType: ApplicationActivityType.BLOCKER_RESOLVED,
        entityType: ActivityEntityType.BLOCKER,
        entityId: blockerId,
        title: 'Blocker resolved',
        description: `${blocker.title} was resolved.`,
        metadata: {
          resolution: updated.resolution,
        },
      });

      return updated;
    });
  }

  async reopenBlocker(workspaceId: string, applicationId: string, blockerId: string, actorUserId: string) {
    return this.prisma.$transaction(async (transaction) => {
      const application = await this.requireApplication(transaction, workspaceId, applicationId);

      this.ensureApplicationActive(application);

      const blocker = await this.requireBlocker(transaction, applicationId, blockerId);

      const updated = await transaction.applicationBlocker.update({
        where: {
          id: blockerId,
        },
        data: {
          status: BlockerStatus.OPEN,
          resolution: null,
          resolvedAt: null,
          resolvedByUserId: null,
        },
      });

      if (blocker.taskId) {
        const task = await transaction.applicationTask.findUnique({
          where: {
            id: blocker.taskId,
          },
        });

        if (task && task.status !== ApplicationTaskStatus.COMPLETED && task.status !== ApplicationTaskStatus.SKIPPED) {
          await transaction.applicationTask.update({
            where: {
              id: task.id,
            },
            data: {
              status: ApplicationTaskStatus.BLOCKED,
            },
          });
        }
      }

      await this.progressCalculator.recalculateWithTransaction(transaction, workspaceId, applicationId);

      await this.writeActivity(transaction, application, actorUserId, {
        activityType: ApplicationActivityType.BLOCKER_REOPENED,
        entityType: ActivityEntityType.BLOCKER,
        entityId: blockerId,
        title: 'Blocker reopened',
        description: `${blocker.title} was reopened.`,
      });

      return updated;
    });
  }

  async deleteBlocker(workspaceId: string, applicationId: string, blockerId: string, actorUserId: string): Promise<void> {
    await this.prisma.$transaction(async (transaction) => {
      const application = await this.requireApplication(transaction, workspaceId, applicationId);

      this.ensureApplicationActive(application);

      const blocker = await this.requireBlocker(transaction, applicationId, blockerId);

      await transaction.applicationBlocker.delete({
        where: {
          id: blockerId,
        },
      });

      if (blocker.taskId) {
        await this.releaseTaskWhenUnblocked(transaction, blocker.taskId);
      }

      await this.progressCalculator.recalculateWithTransaction(transaction, workspaceId, applicationId);

      await this.writeActivity(transaction, application, actorUserId, {
        activityType: ApplicationActivityType.BLOCKER_DELETED,
        entityType: ActivityEntityType.BLOCKER,
        entityId: blockerId,
        title: 'Blocker deleted',
        description: `${blocker.title} was deleted.`,
      });
    });
  }

  private async getSummaryWithClient(client: PrismaService | Prisma.TransactionClient, workspaceId: string, applicationId: string) {
    const application = await this.requireApplication(client, workspaceId, applicationId);

    const milestones = await client.applicationMilestone.findMany({
      where: {
        applicationId,
      },
      orderBy: {
        position: 'asc',
      },
      include: milestoneInclude,
    });

    const blockers = await client.applicationBlocker.findMany({
      where: {
        applicationId,
      },
      orderBy: [
        {
          status: 'asc',
        },
        {
          openedAt: 'desc',
        },
      ],
      include: {
        milestone: {
          select: {
            id: true,
            title: true,
          },
        },
        task: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    });

    const now = new Date();

    const upcomingUntil = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);

    const allTasks = milestones.flatMap((milestone) =>
      milestone.tasks.map((task) => ({
        ...task,
        milestoneTitle: milestone.title,
      })),
    );

    const overdueTasks = allTasks.filter(
      (task) => task.dueAt && task.dueAt < now && task.status !== ApplicationTaskStatus.COMPLETED && task.status !== ApplicationTaskStatus.SKIPPED,
    );

    const upcomingTasks = allTasks.filter(
      (task) =>
        task.dueAt &&
        task.dueAt >= now &&
        task.dueAt <= upcomingUntil &&
        task.status !== ApplicationTaskStatus.COMPLETED &&
        task.status !== ApplicationTaskStatus.SKIPPED,
    );

    const progress = this.progressCalculator.calculateSnapshot(milestones);

    return {
      application: {
        id: application.id,
        workspaceId: application.workspaceId,
        name: application.name,
        archivedAt: application.archivedAt,
        progressPercent: application.progressPercent,
        progressUpdatedAt: application.progressUpdatedAt,
        developmentTemplate: application.developmentTemplate,
        templateAppliedAt: application.templateAppliedAt,
      },
      progress,
      counts: {
        milestones: milestones.length,
        tasks: allTasks.length,
        completedTasks: allTasks.filter((task) => task.status === ApplicationTaskStatus.COMPLETED).length,
        skippedTasks: allTasks.filter((task) => task.status === ApplicationTaskStatus.SKIPPED).length,
        openBlockers: blockers.filter((blocker) => blocker.status === BlockerStatus.OPEN).length,
        overdueTasks: overdueTasks.length,
        upcomingTasks: upcomingTasks.length,
      },
      milestones,
      blockers,
      overdueTasks,
      upcomingTasks,
    };
  }

  private async requireApplication(client: PrismaService | Prisma.TransactionClient, workspaceId: string, applicationId: string) {
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

  private ensureApplicationActive(application: { archivedAt: Date | null }): void {
    if (application.archivedAt) {
      throw new ConflictException('Restore the application before modifying development records');
    }
  }

  private async requireMilestone(client: PrismaService | Prisma.TransactionClient, applicationId: string, milestoneId: string) {
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

  private async requireTask(client: PrismaService | Prisma.TransactionClient, applicationId: string, taskId: string) {
    const task = await client.applicationTask.findFirst({
      where: {
        id: taskId,
        milestone: {
          applicationId,
        },
      },
    });

    if (!task) {
      throw new NotFoundException('Application task not found');
    }

    return task;
  }

  private async requireBlocker(client: PrismaService | Prisma.TransactionClient, applicationId: string, blockerId: string) {
    const blocker = await client.applicationBlocker.findFirst({
      where: {
        id: blockerId,
        applicationId,
      },
    });

    if (!blocker) {
      throw new NotFoundException('Application blocker not found');
    }

    return blocker;
  }

  private async requireWorkspaceMember(transaction: Prisma.TransactionClient, workspaceId: string, userId: string): Promise<void> {
    const member = await transaction.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId,
          userId,
        },
      },
      select: {
        id: true,
      },
    });

    if (!member) {
      throw new BadRequestException('Task assignee must be a workspace member');
    }
  }

  private async nextMilestonePosition(transaction: Prisma.TransactionClient, applicationId: string): Promise<number> {
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

  private async nextTaskPosition(transaction: Prisma.TransactionClient, milestoneId: string): Promise<number> {
    const result = await transaction.applicationTask.aggregate({
      where: {
        milestoneId,
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

  private async normalizeTaskPositions(transaction: Prisma.TransactionClient, milestoneId: string): Promise<void> {
    const tasks = await transaction.applicationTask.findMany({
      where: {
        milestoneId,
      },
      orderBy: {
        position: 'asc',
      },
      select: {
        id: true,
      },
    });

    for (let index = 0; index < tasks.length; index += 1) {
      await transaction.applicationTask.update({
        where: {
          id: tasks[index]!.id,
        },
        data: {
          position: index,
        },
      });
    }
  }

  private async releaseTaskWhenUnblocked(transaction: Prisma.TransactionClient, taskId: string): Promise<void> {
    const openBlockers = await transaction.applicationBlocker.count({
      where: {
        taskId,
        status: BlockerStatus.OPEN,
      },
    });

    const task = await transaction.applicationTask.findUnique({
      where: {
        id: taskId,
      },
    });

    if (task && openBlockers === 0 && task.status === ApplicationTaskStatus.BLOCKED) {
      await transaction.applicationTask.update({
        where: {
          id: taskId,
        },
        data: {
          status: ApplicationTaskStatus.TODO,
        },
      });
    }
  }

  private validateOrderedIds(existingIds: string[], orderedIds: string[], resourceName: string): void {
    if (existingIds.length !== orderedIds.length) {
      throw new BadRequestException(`All ${resourceName} must be included when reordering`);
    }

    const existing = new Set(existingIds);

    const valid = orderedIds.every((id) => existing.has(id));

    if (!valid) {
      throw new BadRequestException(`The ${resourceName} reorder list contains invalid IDs`);
    }
  }

  private validateDateRange(startsAt: Date | null, dueAt: Date | null): void {
    if (startsAt && dueAt && dueAt < startsAt) {
      throw new BadRequestException('Due date cannot be before the start date');
    }
  }

  private toNullableDate(value?: string | null): Date | null {
    if (!value) {
      return null;
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException('Invalid date value');
    }

    return date;
  }

  private requiredText(value: string, fieldName: string): string {
    const normalized = value.trim().replace(/\s+/g, ' ');

    if (!normalized) {
      throw new BadRequestException(`${fieldName} is required`);
    }

    return normalized;
  }

  private optionalText(value?: string | null): string | null {
    if (value === undefined || value === null) {
      return null;
    }

    return value.trim() || null;
  }

  private async writeActivity(
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
