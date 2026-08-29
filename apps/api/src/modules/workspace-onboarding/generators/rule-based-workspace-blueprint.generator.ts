import type { WorkspaceBlueprintGenerator } from './workspace-blueprint-generator.interface';
import { applicationTechnologyRules } from '../rules/application-technology.rules';
import { engineeringSystemRules } from '../rules/engineering-system.rules';
import { foundationRules } from '../rules/foundation.rules';
import { WorkspaceRuleEngine } from '../rules/rule-engine';
import type { WorkspaceBlueprint, WorkspaceBlueprintRepository, WorkspaceOnboardingAnswers } from '@command-center/shared-types';
import { completeWorkspaceOnboardingAnswersSchema, workspaceBlueprintSchema } from '@command-center/validation';
import { Injectable } from '@nestjs/common';

export const RULE_SET_VERSION = '2.0.0';

function slugify(value: string): string {
  const slug = value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);

  return slug.length >= 2 ? slug : 'workspace';
}

@Injectable()
export class RuleBasedWorkspaceBlueprintGenerator implements WorkspaceBlueprintGenerator {
  constructor(private readonly ruleEngine: WorkspaceRuleEngine) {}

  generate(input: WorkspaceOnboardingAnswers): Promise<WorkspaceBlueprint> {
    const answers = completeWorkspaceOnboardingAnswersSchema.parse(input);
    const repositories: WorkspaceBlueprintRepository[] = answers.applicationTypes!.flatMap<WorkspaceBlueprintRepository>((applicationType) => {
      if (answers.repositories === 'CONNECT_NOW') {
        return [];
      }

      if (answers.repositories === 'CONNECT_LATER') {
        return [
          {
            applicationType,
            strategy: 'CONNECT_LATER',
            placeholderName: `${answers.workspaceName} ${applicationType} repository`,
          },
        ];
      }

      return [
        {
          applicationType,
          strategy: 'NONE',
        },
      ];
    });
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
      repositories,
      engineeringConfigurations: [],
    };
    const generated = this.ruleEngine.apply(
      initial,
      {
        answers,
      },
      [...applicationTechnologyRules, ...foundationRules, ...engineeringSystemRules],
    );

    if (answers.repositories === 'CONNECT_NOW') {
      generated.recommendations.push({
        id: 'repository-selection-required:1',
        ruleId: 'repository-selection-required',
        title: 'Select verified repositories',
        explanation: 'Repository access must be verified before confirmation.',
      });
    }

    return Promise.resolve(workspaceBlueprintSchema.parse(generated));
  }
}
