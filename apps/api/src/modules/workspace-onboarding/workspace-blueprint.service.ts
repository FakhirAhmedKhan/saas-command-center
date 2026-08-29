import { WorkspaceOnboardingPayloadService } from './security/workspace-onboarding-payload.service';
import { TechnologyCompatibilityService } from './technology-compatibility.service';
import { hashWorkspaceBlueprint } from './workspace-blueprint-hash';
import { WorkspaceOnboardingRepository } from './workspace-onboarding.repository';
import { WorkspaceOnboardingService } from './workspace-onboarding.service';
import type { TypedConfigService } from '../../config/runtime-config';
import type { UpdateWorkspaceBlueprintInput, WorkspaceBlueprintValidationIssue, WorkspaceBlueprintValidationResult } from '@command-center/shared-types';
import { workspaceBlueprintSchema } from '@command-center/validation';
import { ConflictException, Inject, Injectable, UnprocessableEntityException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class WorkspaceBlueprintService {
  constructor(
    private readonly sessions: WorkspaceOnboardingService,
    private readonly repository: WorkspaceOnboardingRepository,
    private readonly compatibility: TechnologyCompatibilityService,
    private readonly payload: WorkspaceOnboardingPayloadService,
    @Inject(ConfigService)
    private readonly config: TypedConfigService,
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

      return {
        valid: false,
        revision,
        hash: '',
        issues,
      };
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

    this.payload.validateBlueprint(
      input.blueprint,
      this.config.get('WORKSPACE_ONBOARDING_MAX_BLUEPRINT_BYTES', {
        infer: true,
      }),
    );

    const nextRevision = session.blueprintRevision + 1;
    const validation = this.validateBlueprint(input.blueprint, nextRevision);

    if (!validation.valid) {
      throw new UnprocessableEntityException({
        message: 'Blueprint validation failed',
        issues: validation.issues,
      });
    }

    const updated = await this.repository.updateBlueprintRevision({
      id,
      expectedRevision: input.expectedRevision,
      blueprint: workspaceBlueprintSchema.parse(input.blueprint),
      blueprintHash: validation.hash,
    });

    if (!updated) {
      throw new ConflictException('Blueprint revision is stale');
    }

    return this.sessions.toResponse(updated);
  }
}
