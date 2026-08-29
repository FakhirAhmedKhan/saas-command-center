import type { WorkspaceOnboardingAnswers, WorkspaceOnboardingSessionResponse } from '@command-center/shared-types';
import { workspaceOnboardingAnswersSchema } from '@command-center/validation';
import { GoneException, Injectable, NotFoundException } from '@nestjs/common';
import { WorkspaceOnboardingRepository } from './workspace-onboarding.repository';

const SESSION_TTL_HOURS = 168;

@Injectable()
export class WorkspaceOnboardingService {
  constructor(private readonly repository: WorkspaceOnboardingRepository) {}

  async create(userId: string): Promise<WorkspaceOnboardingSessionResponse> {
    const expiresAt = new Date(Date.now() + SESSION_TTL_HOURS * 60 * 60 * 1000);

    return this.toResponse(await this.repository.create(userId, expiresAt));
  }

  async getOwned(id: string, userId: string) {
    const session = await this.repository.findOwned(id, userId);

    if (!session) {
      throw new NotFoundException('Onboarding session not found');
    }

    if (session.expiresAt.getTime() <= Date.now()) {
      if (session.status !== 'EXPIRED') {
        await this.repository.updateStatus(id, 'EXPIRED');
      }

      throw new GoneException('Onboarding session has expired');
    }

    return session;
  }

  async get(id: string, userId: string) {
    return this.toResponse(await this.getOwned(id, userId));
  }

  async updateAnswers(id: string, userId: string, patch: Partial<WorkspaceOnboardingAnswers>) {
    const session = await this.getOwned(id, userId);
    const previous = workspaceOnboardingAnswersSchema.parse(session.answers);
    const answers = workspaceOnboardingAnswersSchema.parse({
      ...previous,
      ...patch,
    });

    const updated = await this.repository.updateAnswers(id, answers, Object.keys(patch).at(-1) ?? session.currentStep);

    return this.toResponse(updated);
  }

  async delete(id: string, userId: string) {
    await this.getOwned(id, userId);
    await this.repository.deleteOwned(id, userId);
  }
  async generateBlueprint(id: string, userId: string) {
    const session = await this.getOwned(id, userId);
    const answers = workspaceOnboardingAnswersSchema.parse(session.answers);
    const blueprint = await this.generator.generate(answers);
    const updated = await this.repository.saveBlueprint(id, blueprint, blueprint.generator.version);

    return this.toResponse(updated);
  }
  toResponse(session: {
    id: string;
    status: string;
    currentStep: string | null;
    answers: unknown;
    blueprint: unknown;
    schemaVersion: number;
    ruleSetVersion: string | null;
    generatorProvider: string;
    workspaceId: string | null;
    expiresAt: Date;
    createdAt: Date;
    updatedAt: Date;
  }): WorkspaceOnboardingSessionResponse {
    return {
      id: session.id,
      status: session.status as WorkspaceOnboardingSessionResponse['status'],
      currentStep: session.currentStep,
      answers: workspaceOnboardingAnswersSchema.parse(session.answers),
      blueprint: session.blueprint as WorkspaceOnboardingSessionResponse['blueprint'],
      schemaVersion: session.schemaVersion,
      ruleSetVersion: session.ruleSetVersion,
      generatorProvider: 'rules',
      workspaceId: session.workspaceId,
      expiresAt: session.expiresAt.toISOString(),
      createdAt: session.createdAt.toISOString(),
      updatedAt: session.updatedAt.toISOString(),
    };
  }
}
