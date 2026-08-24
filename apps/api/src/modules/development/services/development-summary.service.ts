import { milestoneInclude } from '../development.constants';
import { DevelopmentSharedService } from './development-shared.service';
import { ProgressCalculatorService } from './progress-calculator.service';
import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/database/prisma.service';
import { Prisma } from 'src/generated/prisma/client';
import { ApplicationTaskStatus, BlockerStatus } from 'src/generated/prisma/enums';

/**
 * Reads across milestones, tasks, and blockers to produce the combined
 * development-overview payload. Deliberately queries Prisma directly rather
 * than depending on MilestonesService/BlockersService, matching the original
 * behavior of DevelopmentService.getSummary.
 */
@Injectable()
export class DevelopmentSummaryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly progressCalculator: ProgressCalculatorService,
    private readonly shared: DevelopmentSharedService,
  ) {}

  async getSummary(workspaceId: string, applicationId: string) {
    return this.getSummaryWithClient(this.prisma, workspaceId, applicationId);
  }

  async getSummaryWithClient(client: PrismaService | Prisma.TransactionClient, workspaceId: string, applicationId: string) {
    const application = await this.shared.requireApplication(client, workspaceId, applicationId);
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
    const overdueTasks = allTasks.filter((task) => task.dueAt && task.dueAt < now && task.status !== ApplicationTaskStatus.COMPLETED && task.status !== ApplicationTaskStatus.SKIPPED);
    const upcomingTasks = allTasks.filter((task) => task.dueAt && task.dueAt >= now && task.dueAt <= upcomingUntil && task.status !== ApplicationTaskStatus.COMPLETED && task.status !== ApplicationTaskStatus.SKIPPED);
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
}
