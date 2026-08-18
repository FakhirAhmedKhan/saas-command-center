import { BlockerQueryDto, CreateBlockerDto, ResolveBlockerDto, UpdateBlockerDto } from '../dto/development.dto';
import { DevelopmentSharedService } from './development-shared.service';
import { MilestonesService } from './milestones.service';
import { ProgressCalculatorService } from './progress-calculator.service';
import { TasksService } from './tasks.service';
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/database/prisma.service';
import { Prisma } from 'src/generated/prisma/client';
import { ActivityEntityType, ApplicationActivityType, BlockerStatus } from 'src/generated/prisma/enums';

@Injectable()
export class BlockersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly progressCalculator: ProgressCalculatorService,
    private readonly shared: DevelopmentSharedService,
    private readonly milestones: MilestonesService,
    private readonly tasks: TasksService,
  ) {}

  async listBlockers(workspaceId: string, applicationId: string, query: BlockerQueryDto) {
    await this.shared.requireApplication(this.prisma, workspaceId, applicationId);

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
      const application = await this.shared.requireApplication(transaction, workspaceId, applicationId);

      this.shared.ensureApplicationActive(application);

      let milestoneId = dto.milestoneId ?? null;

      if (milestoneId) {
        await this.milestones.requireMilestone(transaction, applicationId, milestoneId);
      }

      if (dto.taskId) {
        const task = await this.tasks.requireTask(transaction, applicationId, dto.taskId);

        if (milestoneId && milestoneId !== task.milestoneId) {
          throw new BadRequestException('The selected task does not belong to the selected milestone');
        }

        milestoneId = task.milestoneId;

        await this.tasks.markBlockedIfActive(transaction, task);
      }

      const blocker = await transaction.applicationBlocker.create({
        data: {
          applicationId,
          milestoneId,
          taskId: dto.taskId ?? null,
          createdByUserId: actorUserId,
          title: this.shared.requiredText(dto.title, 'Blocker title'),
          description: this.shared.optionalText(dto.description),
          severity: dto.severity,
        },
        include: {
          milestone: true,
          task: true,
        },
      });

      await this.progressCalculator.recalculateWithTransaction(transaction, workspaceId, applicationId);

      await this.shared.writeActivity(transaction, application, actorUserId, {
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
      const application = await this.shared.requireApplication(transaction, workspaceId, applicationId);

      this.shared.ensureApplicationActive(application);

      const blocker = await this.requireBlocker(transaction, applicationId, blockerId);

      const updated = await transaction.applicationBlocker.update({
        where: {
          id: blockerId,
        },
        data: {
          ...(dto.title !== undefined
            ? {
                title: this.shared.requiredText(dto.title, 'Blocker title'),
              }
            : {}),
          ...(dto.description !== undefined
            ? {
                description: this.shared.optionalText(dto.description),
              }
            : {}),
          ...(dto.severity !== undefined
            ? {
                severity: dto.severity,
              }
            : {}),
        },
      });

      await this.shared.writeActivity(transaction, application, actorUserId, {
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
      const application = await this.shared.requireApplication(transaction, workspaceId, applicationId);

      this.shared.ensureApplicationActive(application);

      const blocker = await this.requireBlocker(transaction, applicationId, blockerId);

      const updated = await transaction.applicationBlocker.update({
        where: {
          id: blockerId,
        },
        data: {
          status: BlockerStatus.RESOLVED,
          resolution: this.shared.requiredText(dto.resolution, 'Resolution'),
          resolvedAt: new Date(),
          resolvedByUserId: actorUserId,
        },
      });

      if (blocker.taskId) {
        await this.tasks.releaseTaskWhenUnblocked(transaction, blocker.taskId);
      }

      await this.progressCalculator.recalculateWithTransaction(transaction, workspaceId, applicationId);

      await this.shared.writeActivity(transaction, application, actorUserId, {
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
      const application = await this.shared.requireApplication(transaction, workspaceId, applicationId);

      this.shared.ensureApplicationActive(application);

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
        await this.tasks.reblockIfActive(transaction, blocker.taskId);
      }

      await this.progressCalculator.recalculateWithTransaction(transaction, workspaceId, applicationId);

      await this.shared.writeActivity(transaction, application, actorUserId, {
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
      const application = await this.shared.requireApplication(transaction, workspaceId, applicationId);

      this.shared.ensureApplicationActive(application);

      const blocker = await this.requireBlocker(transaction, applicationId, blockerId);

      await transaction.applicationBlocker.delete({
        where: {
          id: blockerId,
        },
      });

      if (blocker.taskId) {
        await this.tasks.releaseTaskWhenUnblocked(transaction, blocker.taskId);
      }

      await this.progressCalculator.recalculateWithTransaction(transaction, workspaceId, applicationId);

      await this.shared.writeActivity(transaction, application, actorUserId, {
        activityType: ApplicationActivityType.BLOCKER_DELETED,
        entityType: ActivityEntityType.BLOCKER,
        entityId: blockerId,
        title: 'Blocker deleted',
        description: `${blocker.title} was deleted.`,
      });
    });
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
}
