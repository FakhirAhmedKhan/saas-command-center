import type { WorkspaceBlueprint, WorkspaceOnboardingAnswers } from '@command-center/shared-types';
import { completeWorkspaceOnboardingAnswersSchema, workspaceBlueprintSchema } from '@command-center/validation';
import { Injectable } from '@nestjs/common';
import type { WorkspaceBlueprintGenerator } from './workspace-blueprint-generator.interface';
import { foundationRules } from '../rules/foundation.rules';
import { WorkspaceRuleEngine } from '../rules/rule-engine';

export const RULE_SET_VERSION = '1.0.0';

function slugify(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

@Injectable()
export class RuleBasedWorkspaceBlueprintGenerator implements WorkspaceBlueprintGenerator {
  constructor(private readonly ruleEngine: WorkspaceRuleEngine) {}

  async generate(input: WorkspaceOnboardingAnswers): Promise<WorkspaceBlueprint> {
    const answers = completeWorkspaceOnboardingAnswersSchema.parse(input);

    const initial: WorkspaceBlueprint = {
      schemaVersion: 1,
      generator: {
        provider: 'rules',
        version: RULE_SET_VERSION,
      },
      workspace: {
        name: answers.workspaceName!,
        slug: slugify(answers.workspaceName!),
        description: answers.productIdea!,
        productType: answers.productType!,
      },
      applications: [],
      services: {
        backend: [],
        database: [],
        cache: [],
        authentication: [],
      },
      features: answers.coreFeatures!,
      environments: answers.environments!,
      engineeringSystems: answers.qualityRequirements!,
      recommendations: [],
    };

    const generated = this.ruleEngine.apply(initial, { answers }, foundationRules);

    return workspaceBlueprintSchema.parse(generated);
  }
}
