import type { UpdateWorkspaceBlueprintInput, WorkspaceBlueprint, WorkspaceBlueprintValidationIssue, WorkspaceBlueprintValidationResult } from '@command-center/shared-types';
import { workspaceBlueprintSchema } from '@command-center/validation';
import { ConflictException, Injectable, UnprocessableEntityException } from '@nestjs/common';
import { TechnologyCompatibilityService } from './rules/technology-compatibility.service';
import { hashWorkspaceBlueprint } from './workspace-blueprint-hash';
import { WorkspaceOnboardingRepository } from './workspace-onboarding.repository';
import { WorkspaceOnboardingService } from './workspace-onboarding.service';

@Injectable()
export class WorkspaceBlueprintService {
  constructor(
    private readonly sessions: WorkspaceOnboardingService,
    private readonly repository: WorkspaceOnboardingRepository,
    private readonly compatibility: TechnologyCompatibilityService,
  ) {}

  validateBlueprint(blueprint: unknown, revision: number): WorkspaceBlueprintValidationResult {
    const parsed = workspaceBlueprintSchema.safeParse(blueprint);
    const issues: WorkspaceBlueprintValidationIssue[] = [];

    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        issues.push({
          path: issue.path.join('.'),
          code: issue.code,
          message: issue.message,
        });
      }

      return { valid: false, revision, hash: '', issues };
    }

    for (const application of parsed.data.applications) {
      try {
        this.compatibility.assertApplication(application.type, application.platforms, application.stack);
      } catch (error) {
        issues.push({
          path: `applications.${application.type}`,
          code: 'INCOMPATIBLE_STACK',
          message: error instanceof Error ? error.message : 'Invalid stack',
        });
      }
    }

    return {
      valid: issues.length === 0,
      revision,
      hash: issues.length === 0 ? hashWorkspaceBlueprint(parsed.data) : '',
      issues,
    };
  }

  async validateOwned(id: string, userId: string) {
    const session = await this.sessions.getOwned(id, userId);
    return this.validateBlueprint(session.blueprint, session.blueprintRevision);
  }

  async updateOwned(id: string, userId: string, input: UpdateWorkspaceBlueprintInput) {
    const session = await this.sessions.getOwned(id, userId);

    if (session.status !== 'BLUEPRINT_READY') {
      throw new ConflictException('Blueprint is not editable in this state');
    }

    if (session.blueprintRevision !== input.expectedRevision) {
      throw new ConflictException('Blueprint revision is stale');
    }

    const validation = this.validateBlueprint(input.blueprint, session.blueprintRevision + 1);

    if (!validation.valid) {
      throw new UnprocessableEntityException({
        message: 'Blueprint validation failed',
        issues: validation.issues,
      });
    }

    return this.repository.updateBlueprintRevision({
      id,
      expectedRevision: input.expectedRevision,
      blueprint: workspaceBlueprintSchema.parse(input.blueprint),
      blueprintHash: validation.hash,
    });
  }
}
