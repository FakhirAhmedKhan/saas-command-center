import { WORKSPACE_BLUEPRINT_GENERATOR, type WorkspaceBlueprintGenerator } from './generators/workspace-blueprint-generator.interface';
import { QuestionFlowService } from './questions/question-flow.service';
import { WorkspaceOnboardingPayloadService } from './security/workspace-onboarding-payload.service';
import { hashWorkspaceBlueprint } from './workspace-blueprint-hash';
import { WorkspaceOnboardingRepository } from './workspace-onboarding.repository';
import type { TypedConfigService } from '../../config/runtime-config';
import type { WorkspaceOnboardingSession } from '../../generated/prisma/client';
import type { WorkspaceGeneratorProvider, WorkspaceOnboardingAnswers, WorkspaceOnboardingSessionResponse } from '@command-center/shared-types';
import { completeWorkspaceOnboardingAnswersSchema, workspaceBlueprintSchema, workspaceOnboardingAnswersSchema } from '@command-center/validation';
import { ConflictException, GoneException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class WorkspaceOnboardingService {
  constructor(
    private readonly repository: WorkspaceOnboardingRepository,
    private readonly questionFlow: QuestionFlowService,
    private readonly payload: WorkspaceOnboardingPayloadService,
    @Inject(WORKSPACE_BLUEPRINT_GENERATOR)
    private readonly generator: WorkspaceBlueprintGenerator,
    @Inject(ConfigService)
    private readonly config: TypedConfigService,
  ) {}

  async create(userId: string): Promise<WorkspaceOnboardingSessionResponse> {
    const ttlHours = this.config.get('WORKSPACE_ONBOARDING_SESSION_TTL_HOURS', {
      infer: true,
    });
    const expiresAt = new Date(Date.now() + ttlHours * 60 * 60 * 1_000);

    return this.toResponse(await this.repository.create(userId, expiresAt));
  }

  async getOwned(id: string, userId: string) {
    const session = await this.repository.findOwned(id, userId);

    if (!session) {
      throw new NotFoundException('Onboarding session not found');
    }

    const expirableStatuses = new Set(['IN_PROGRESS', 'BLUEPRINT_READY', 'FAILED']);

    if (expirableStatuses.has(session.status) && session.expiresAt.getTime() <= Date.now()) {
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

  async questions(id: string, userId: string) {
    const session = await this.getOwned(id, userId);
    const answers = workspaceOnboardingAnswersSchema.parse(session.answers);

    return this.questionFlow.flow(answers);
  }

  async updateAnswers(id: string, userId: string, patch: Partial<WorkspaceOnboardingAnswers>) {
    const session = await this.getOwned(id, userId);

    if (session.status === 'CREATING' || session.status === 'COMPLETED') {
      throw new ConflictException('Answers cannot be edited in this state');
    }

    const previous = workspaceOnboardingAnswersSchema.parse(session.answers);
    const merged = this.questionFlow.removeInvalidDependents(previous, patch);
    const answers = workspaceOnboardingAnswersSchema.parse(merged);

    this.payload.validateAnswers(
      answers,
      this.config.get('WORKSPACE_ONBOARDING_MAX_ANSWER_BYTES', {
        infer: true,
      }),
    );

    const nextQuestion = this.questionFlow.flow(answers).currentQuestion?.key ?? null;

    return this.toResponse(await this.repository.updateAnswers(id, answers, nextQuestion));
  }

  async generateBlueprint(id: string, userId: string) {
    const session = await this.getOwned(id, userId);

    if (session.status === 'CREATING' || session.status === 'COMPLETED') {
      throw new ConflictException('A blueprint cannot be generated in this state');
    }

    const answers = completeWorkspaceOnboardingAnswersSchema.parse(session.answers);
    const blueprint = await this.generator.generate(answers);

    this.payload.validateBlueprint(
      blueprint,
      this.config.get('WORKSPACE_ONBOARDING_MAX_BLUEPRINT_BYTES', {
        infer: true,
      }),
    );

    const parsed = workspaceBlueprintSchema.parse(blueprint);
    const blueprintHash = hashWorkspaceBlueprint(parsed);
    const updated = await this.repository.saveBlueprint({
      id,
      blueprint: parsed,
      blueprintHash,
      generatorProvider: parsed.generator.provider,
      generatorVersion: parsed.generator.version,
    });

    return this.toResponse(updated);
  }

  async delete(id: string, userId: string) {
    const session = await this.getOwned(id, userId);

    if (session.status === 'CREATING' || session.status === 'COMPLETED') {
      throw new ConflictException('This session can no longer be discarded');
    }

    await this.repository.deleteOwned(id, userId);
  }

  toResponse(session: WorkspaceOnboardingSession): WorkspaceOnboardingSessionResponse {
    const provider: WorkspaceGeneratorProvider = session.generatorProvider === 'ai' ? 'ai' : 'rules';

    return {
      id: session.id,
      status: session.status,
      currentStep: session.currentStep,
      answers: workspaceOnboardingAnswersSchema.parse(session.answers),
      blueprint: session.blueprint === null ? null : workspaceBlueprintSchema.parse(session.blueprint),
      blueprintRevision: session.blueprintRevision,
      blueprintHash: session.blueprintHash,
      schemaVersion: session.schemaVersion,
      ruleSetVersion: session.ruleSetVersion,
      generatorProvider: provider,
      workspaceId: session.workspaceId,
      expiresAt: session.expiresAt.toISOString(),
      createdAt: session.createdAt.toISOString(),
      updatedAt: session.updatedAt.toISOString(),
    };
  }
}
