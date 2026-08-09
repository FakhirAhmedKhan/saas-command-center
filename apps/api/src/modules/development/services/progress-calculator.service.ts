import { Injectable, NotFoundException } from '@nestjs/common';

import type { Prisma } from 'src/generated/prisma/client';

import { ApplicationTaskStatus, MilestoneStatus } from 'src/generated/prisma/enums';

interface ProgressTask {
  id: string;
  status: ApplicationTaskStatus;
  weight: number;
}

interface ProgressMilestone {
  id: string;
  title: string;
  status: MilestoneStatus;
  weight: number;
  progressPercent: number;
  tasks: ProgressTask[];
}

export interface MilestoneProgressExplanation {
  milestoneId: string;
  title: string;
  included: boolean;
  weight: number;
  progressPercent: number;
  applicableTaskWeight: number;
  completedTaskWeight: number;
  excludedTaskCount: number;
  derivedStatus: MilestoneStatus;
}

export interface ApplicationProgressExplanation {
  percentage: number;
  totalMilestoneWeight: number;
  weightedProgressPoints: number;
  includedMilestones: number;
  excludedMilestones: number;
  formula: string;
  milestones: MilestoneProgressExplanation[];
}

@Injectable()
export class ProgressCalculatorService {
  calculateSnapshot(milestones: ProgressMilestone[]): ApplicationProgressExplanation {
    const milestoneResults = milestones.map((milestone) => this.calculateMilestone(milestone));

    const included = milestoneResults.filter((milestone) => milestone.included);

    const totalMilestoneWeight = included.reduce((total, milestone) => total + milestone.weight, 0);

    const weightedProgressPoints = included.reduce((total, milestone) => total + milestone.weight * milestone.progressPercent, 0);

    const percentage = totalMilestoneWeight === 0 ? 0 : Math.round(weightedProgressPoints / totalMilestoneWeight);

    return {
      percentage,
      totalMilestoneWeight,
      weightedProgressPoints,
      includedMilestones: included.length,
      excludedMilestones: milestoneResults.length - included.length,
      formula: 'sum(milestone progress × milestone weight) ÷ sum(applicable milestone weights)',
      milestones: milestoneResults,
    };
  }

  async recalculateWithTransaction(transaction: Prisma.TransactionClient, workspaceId: string, applicationId: string): Promise<ApplicationProgressExplanation> {
    const application = await transaction.saasApplication.findFirst({
      where: {
        id: applicationId,
        workspaceId,
      },
      select: {
        id: true,
      },
    });

    if (!application) {
      throw new NotFoundException('SaaS application not found');
    }

    const milestones = await transaction.applicationMilestone.findMany({
      where: {
        applicationId,
      },
      orderBy: {
        position: 'asc',
      },
      include: {
        tasks: {
          select: {
            id: true,
            status: true,
            weight: true,
          },
        },
      },
    });

    const explanation = this.calculateSnapshot(milestones);

    const calculatedAt = new Date();

    for (const result of explanation.milestones) {
      if (!result.included) {
        await transaction.applicationMilestone.update({
          where: {
            id: result.milestoneId,
          },
          data: {
            progressPercent: 0,
          },
        });

        continue;
      }

      await transaction.applicationMilestone.update({
        where: {
          id: result.milestoneId,
        },
        data: {
          progressPercent: result.progressPercent,
          status: result.derivedStatus,
          completedAt: result.derivedStatus === MilestoneStatus.COMPLETED ? calculatedAt : null,
        },
      });
    }

    await transaction.saasApplication.update({
      where: {
        id: applicationId,
      },
      data: {
        progressPercent: explanation.percentage,
        progressUpdatedAt: calculatedAt,
      },
    });

    return explanation;
  }

  private calculateMilestone(milestone: ProgressMilestone): MilestoneProgressExplanation {
    if (milestone.status === MilestoneStatus.SKIPPED) {
      return {
        milestoneId: milestone.id,
        title: milestone.title,
        included: false,
        weight: milestone.weight,
        progressPercent: 0,
        applicableTaskWeight: 0,
        completedTaskWeight: 0,
        excludedTaskCount: milestone.tasks.length,
        derivedStatus: MilestoneStatus.SKIPPED,
      };
    }

    const applicableTasks = milestone.tasks.filter((task) => task.status !== ApplicationTaskStatus.SKIPPED);

    const applicableTaskWeight = applicableTasks.reduce((total, task) => total + task.weight, 0);

    const completedTaskWeight = applicableTasks
      .filter((task) => task.status === ApplicationTaskStatus.COMPLETED)
      .reduce((total, task) => total + task.weight, 0);

    let progressPercent = 0;

    if (applicableTaskWeight > 0) {
      progressPercent = Math.round((completedTaskWeight / applicableTaskWeight) * 100);
    } else if (milestone.status === MilestoneStatus.COMPLETED) {
      progressPercent = 100;
    }

    let derivedStatus: MilestoneStatus = MilestoneStatus.PLANNED;

    if (progressPercent === 100 && (applicableTasks.length > 0 || milestone.status === MilestoneStatus.COMPLETED)) {
      derivedStatus = MilestoneStatus.COMPLETED;
    } else if (applicableTasks.some((task) => task.status !== ApplicationTaskStatus.TODO)) {
      derivedStatus = MilestoneStatus.IN_PROGRESS;
    }

    return {
      milestoneId: milestone.id,
      title: milestone.title,
      included: true,
      weight: milestone.weight,
      progressPercent,
      applicableTaskWeight,
      completedTaskWeight,
      excludedTaskCount: milestone.tasks.length - applicableTasks.length,
      derivedStatus,
    };
  }
}
