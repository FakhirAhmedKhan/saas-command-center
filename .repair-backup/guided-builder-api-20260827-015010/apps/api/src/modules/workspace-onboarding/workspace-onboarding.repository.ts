import type { Prisma, WorkspaceOnboardingStatus } from '@prisma/client';
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class WorkspaceOnboardingRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(userId: string, expiresAt: Date) {
    return this.prisma.workspaceOnboardingSession.create({
      data: {
        userId,
        expiresAt,
        answers: {},
      },
    });
  }

  findOwned(id: string, userId: string) {
    return this.prisma.workspaceOnboardingSession.findFirst({
      where: { id, userId },
    });
  }

  updateAnswers(id: string, answers: Prisma.InputJsonValue, currentStep: string | null) {
    return this.prisma.workspaceOnboardingSession.update({
      where: { id },
      data: {
        answers,
        currentStep,
        blueprint: Prisma.JsonNull,
        ruleSetVersion: null,
        status: 'IN_PROGRESS',
      },
    });
  }

  updateStatus(id: string, status: WorkspaceOnboardingStatus) {
    return this.prisma.workspaceOnboardingSession.update({
      where: { id },
      data: { status },
    });
  }

  saveBlueprint(id: string, blueprint: Prisma.InputJsonValue, ruleSetVersion: string) {
    return this.prisma.workspaceOnboardingSession.update({
      where: { id },
      data: {
        blueprint,
        ruleSetVersion,
        status: 'BLUEPRINT_READY',
      },
    });
  }

  deleteOwned(id: string, userId: string) {
    return this.prisma.workspaceOnboardingSession.deleteMany({
      where: { id, userId },
    });
  }
}
