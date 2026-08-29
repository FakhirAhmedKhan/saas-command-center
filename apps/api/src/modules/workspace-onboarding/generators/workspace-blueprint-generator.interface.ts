import type { WorkspaceBlueprint, WorkspaceOnboardingAnswers } from '@command-center/shared-types';

export const WORKSPACE_BLUEPRINT_GENERATOR = Symbol('WORKSPACE_BLUEPRINT_GENERATOR');

export interface WorkspaceBlueprintGenerator {
  generate(input: WorkspaceOnboardingAnswers): Promise<WorkspaceBlueprint>;
}
