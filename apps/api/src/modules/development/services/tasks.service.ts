import { DevelopmentSharedService } from './development-shared.service';
import { MilestonesService } from './milestones.service';
import { ProgressCalculatorService } from './progress-calculator.service';
import { ChangeTaskStatusDto, CreateTaskDto, MoveTaskDto, ReorderItemsDto, SkipWorkItemDto, UpdateTaskDto } from '../dto/development.dto';
import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/database/prisma.service';
import { Prisma } from 'src/generated/prisma/client';
import { ActivityEntityType, ApplicationActivityType, ApplicationTaskStatus, BlockerStatus, MilestoneStatus } from 'src/generated/prisma/enums';

const taskInclude = {
  assignee: {
    select: {
      id: true,
      email: true,
      displayName: true,
    },
  },
  blockers: true,
} satisfies Prisma.ApplicationTaskInclude;

@Injectable()
export class TasksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly progressCalculator: ProgressCalculatorService,
    private readonly shared: DevelopmentSharedService,
    private readonly milestones: MilestonesService,
  ) {}

  async createTask(workspaceId: string, applicationId: string, milestoneId: string, dto: CreateTaskDto, actorUserId: string) {
    return this.prisma.$transaction(async (transaction) => {
      const application = await this.shared.requireApplication(transaction, workspaceId, applicationId);

      this.shared.ensureApplicationActive(application);

      const milestone = await this.milestones.requireMilestone(transaction, applicationId, milestoneId);

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
          title: this.shared.requiredText(dto.title, 'Task title'),
          description: this.shared.optionalText(dto.description),
          priority: dto.priority,
          weight: dto.weight ?? 1,
          assigneeUserId: dto.assigneeUserId ?? null,
          dueAt: this.shared.toNullableDate(dto.dueAt),
          position,
        },
        include: taskInclude,
      });

      await this.progressCalculator.recalculateWithTransaction(transaction, workspaceId, applicationId);

      await this.shared.writeActivity(transaction, application, actorUserId, {
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
      const application = await this.shared.requireApplication(transaction, workspaceId, applicationId);

      this.shared.ensureApplicationActive(application);

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
                title: this.shared.requiredText(dto.title, 'Task title'),
              }
            : {}),
          ...(dto.description !== undefined
            ? {
                description: this.shared.optionalText(dto.description),
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
                dueAt: this.shared.toNullableDate(dto.dueAt),
              }
            : {}),
        },
        include: taskInclude,
      });

      await this.progressCalculator.recalculateWithTransaction(transaction, workspaceId, applicationId);

      await this.shared.writeActivity(transaction, application, actorUserId, {
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
      const application = await this.shared.requireApplication(transaction, workspaceId, applicationId);

      this.shared.ensureApplicationActive(application);

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

      await this.shared.writeActivity(transaction, application, actorUserId, {
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
      const application = await this.shared.requireApplication(transaction, workspaceId, applicationId);

      this.shared.ensureApplicationActive(application);

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

      await this.shared.writeActivity(transaction, application, actorUserId, {
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
      const application = await this.shared.requireApplication(transaction, workspaceId, applicationId);

      this.shared.ensureApplicationActive(application);

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

      await this.shared.writeActivity(transaction, application, actorUserId, {
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
      const application = await this.shared.requireApplication(transaction, workspaceId, applicationId);

      this.shared.ensureApplicationActive(application);

      const task = await this.requireTask(transaction, applicationId, taskId);
      const updated = await transaction.applicationTask.update({
        where: {
          id: taskId,
        },
        data: {
          status: ApplicationTaskStatus.SKIPPED,
          skippedAt: new Date(),
          skipReason: this.shared.requiredText(dto.reason, 'Skip reason'),
          completedAt: null,
        },
      });

      await this.progressCalculator.recalculateWithTransaction(transaction, workspaceId, applicationId);

      await this.shared.writeActivity(transaction, application, actorUserId, {
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
      const application = await this.shared.requireApplication(transaction, workspaceId, applicationId);

      this.shared.ensureApplicationActive(application);

      const task = await this.requireTask(transaction, applicationId, taskId);
      const targetMilestone = await this.milestones.requireMilestone(transaction, applicationId, dto.targetMilestoneId);

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

      await this.shared.writeActivity(transaction, application, actorUserId, {
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
      const application = await this.shared.requireApplication(transaction, workspaceId, applicationId);

      this.shared.ensureApplicationActive(application);

      await this.milestones.requireMilestone(transaction, applicationId, milestoneId);

      const tasks = await transaction.applicationTask.findMany({
        where: {
          milestoneId,
        },
        select: {
          id: true,
        },
      });

      this.shared.validateOrderedIds(
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

      await this.shared.writeActivity(transaction, application, actorUserId, {
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
      const application = await this.shared.requireApplication(transaction, workspaceId, applicationId);

      this.shared.ensureApplicationActive(application);

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

      await this.shared.writeActivity(transaction, application, actorUserId, {
        activityType: ApplicationActivityType.TASK_DELETED,
        entityType: ActivityEntityType.TASK,
        entityId: taskId,
        title: 'Task deleted',
        description: `${task.title} was deleted.`,
      });
    });
  }

  async requireTask(client: PrismaService | Prisma.TransactionClient, applicationId: string, taskId: string) {
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

  /**
   * Called by BlockersService when a task's last open blocker clears.
   */
  async releaseTaskWhenUnblocked(transaction: Prisma.TransactionClient, taskId: string): Promise<void> {
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

  /**
   * Called by BlockersService when a new blocker attaches to a task.
   */
  async markBlockedIfActive(transaction: Prisma.TransactionClient, task: { id: string; status: ApplicationTaskStatus }): Promise<void> {
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

  /**
   * Called by BlockersService when a resolved blocker is reopened. Unlike
   * markBlockedIfActive, this intentionally does not touch completedAt to
   * match the original reopenBlocker behavior exactly.
   */
  async reblockIfActive(transaction: Prisma.TransactionClient, taskId: string): Promise<void> {
    const task = await transaction.applicationTask.findUnique({
      where: {
        id: taskId,
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
}
