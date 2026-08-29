import type { WorkspaceBlueprint, WorkspaceOnboardingAnswers } from '@command-center/shared-types';
import { completeWorkspaceOnboardingAnswersSchema, workspaceBlueprintSchema } from '@command-center/validation';
import { Injectable } from '@nestjs/common';
import type { WorkspaceBlueprintGenerator } from '../generators/workspace-blueprint-generator.interface';
import { TechnologyCompatibilityService } from '../rules/technology-compatibility.service';
import { AiBlueprintProviderClient } from './ai-blueprint-provider.client';

const systemInstruction = `
You generate a SaaS Command Center workspace blueprint.
Return one JSON object only. Do not include markdown or commentary.
Use only enum values present in the supplied catalog.
Never include credentials, tokens, secrets, executable commands, HTML, or hidden reasoning.
Every recommendation must contain a short explanation and a stable ruleId beginning with ai-.
The output must use schemaVersion 1 and generator.provider "ai".
`;

@Injectable()
export class AiWorkspaceBlueprintGenerator implements WorkspaceBlueprintGenerator {
  constructor(
    private readonly client: AiBlueprintProviderClient,
    private readonly compatibility: TechnologyCompatibilityService,
    private readonly config: TypedConfigService,
  ) {}

  async generate(input: WorkspaceOnboardingAnswers): Promise<WorkspaceBlueprint> {
    const answers = completeWorkspaceOnboardingAnswersSchema.parse(input);
    const raw = await this.client.generate([
      { role: 'system', content: systemInstruction },
      {
        role: 'user',
        content: JSON.stringify({
          answers,
          supported: {
            applicationTypes: ['WEB', 'MOBILE', 'DESKTOP'],
            platforms: ['WEB', 'ANDROID', 'IOS', 'WINDOWS', 'MACOS', 'LINUX'],
            technologies: ['NEXT_JS', 'TYPESCRIPT', 'KOTLIN', 'JETPACK_COMPOSE', 'SWIFT', 'SWIFTUI', 'REACT_NATIVE', 'FLUTTER', 'TAURI', 'ELECTRON', 'NEST_JS', 'POSTGRESQL', 'REDIS'],
          },
        }),
      },
    ]);

    const candidate = workspaceBlueprintSchema.parse({
      ...(raw as Record<string, unknown>),
      schemaVersion: 1,
      generator: {
        provider: 'ai',
        version: this.config.workspaceAi.model,
      },
    });

    for (const application of candidate.applications) {
      this.compatibility.assertApplication(application.type, application.platforms, application.stack);
    }

    return candidate;
  }
}
