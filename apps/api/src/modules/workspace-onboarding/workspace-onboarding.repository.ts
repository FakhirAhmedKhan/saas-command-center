import { PrismaService } from '../../database/prisma.service';
import { Prisma } from '../../generated/prisma/client';
import type { WorkspaceOnboardingStatus } from '../../generated/prisma/enums';
import type { WorkspaceBlueprint, WorkspaceGeneratorProvider, WorkspaceOnboardingAnswers } from '@command-center/shared-types';
import { Injectable } from '@nestjs/common';

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
      where: {
        id,
        userId,
      },
    });
  }

  updateAnswers(id: string, answers: WorkspaceOnboardingAnswers, currentStep: string | null) {
    return this.prisma.workspaceOnboardingSession.update({
      where: {
        id,
      },
      data: {
        answers: this.json(answers),
        currentStep,
        blueprint: Prisma.DbNull,
        blueprintHash: null,
        ruleSetVersion: null,
        status: 'IN_PROGRESS',
      },
    });
  }

  updateStatus(id: string, status: WorkspaceOnboardingStatus) {
    return this.prisma.workspaceOnboardingSession.update({
      where: {
        id,
      },
      data: {
        status,
      },
    });
  }

  saveBlueprint(input: { id: string; blueprint: WorkspaceBlueprint; blueprintHash: string; generatorProvider: WorkspaceGeneratorProvider; generatorVersion: string }) {
    return this.prisma.workspaceOnboardingSession.update({
      where: {
        id: input.id,
      },
      data: {
        blueprint: this.json(input.blueprint),
        blueprintHash: input.blueprintHash,
        blueprintRevision: {
          increment: 1,
        },
        schemaVersion: input.blueprint.schemaVersion,
        ruleSetVersion: input.generatorVersion,
        generatorProvider: input.generatorProvider,
        status: 'BLUEPRINT_READY',
      },
    });
  }

  async updateBlueprintRevision(input: { id: string; expectedRevision: number; blueprint: WorkspaceBlueprint; blueprintHash: string }) {
    const result = await this.prisma.workspaceOnboardingSession.updateMany({
      where: {
        id: input.id,
        status: 'BLUEPRINT_READY',
        blueprintRevision: input.expectedRevision,
      },
      data: {
        blueprint: this.json(input.blueprint),
        blueprintHash: input.blueprintHash,
        blueprintRevision: {
          increment: 1,
        },
      },
    });

    if (result.count !== 1) {
      return null;
    }

    return this.prisma.workspaceOnboardingSession.findUniqueOrThrow({
      where: {
        id: input.id,
      },
    });
  }

  deleteOwned(id: string, userId: string) {
    return this.prisma.workspaceOnboardingSession.deleteMany({
      where: {
        id,
        userId,
      },
    });
  }

  private json(value: unknown): Prisma.InputJsonValue {
    return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
  }
}
