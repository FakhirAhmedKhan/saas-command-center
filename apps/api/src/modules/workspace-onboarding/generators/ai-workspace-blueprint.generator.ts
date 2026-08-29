import type { TypedConfigService } from '../../../config/runtime-config';
import { AiBlueprintProviderClient } from '../ai-blueprint-provider.client';
import { TechnologyCompatibilityService } from '../technology-compatibility.service';
import type { WorkspaceBlueprintGenerator } from './workspace-blueprint-generator.interface';
import type { WorkspaceBlueprint, WorkspaceOnboardingAnswers } from '@command-center/shared-types';
import { completeWorkspaceOnboardingAnswersSchema, workspaceBlueprintSchema } from '@command-center/validation';
import { Inject, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

const systemInstruction = `
You generate a SaaS Command Center workspace blueprint.
Return one JSON object only. Do not include markdown or commentary.
Use only enum values present in the supplied catalog.
Never include credentials, tokens, secrets, executable commands, HTML, or hidden reasoning.
Every recommendation must include a stable ruleId beginning with ai-.
The output must use schemaVersion 1 and generator.provider "ai".
`;

@Injectable()
export class AiWorkspaceBlueprintGenerator implements WorkspaceBlueprintGenerator {
  constructor(
    private readonly client: AiBlueprintProviderClient,
    private readonly compatibility: TechnologyCompatibilityService,
    @Inject(ConfigService)
    private readonly config: TypedConfigService,
  ) {}

  async generate(input: WorkspaceOnboardingAnswers): Promise<WorkspaceBlueprint> {
    const answers = completeWorkspaceOnboardingAnswersSchema.parse(input);
    const raw = await this.client.generate([
      {
        role: 'system',
        content: systemInstruction,
      },
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
    const model = this.config.get('WORKSPACE_AI_MODEL', {
      infer: true,
    });

    if (!model) {
      throw new ServiceUnavailableException('Workspace AI model is not configured');
    }

    const candidate = workspaceBlueprintSchema.parse({
      ...(raw as Record<string, unknown>),
      schemaVersion: 1,
      generator: {
        provider: 'ai',
        version: model,
      },
    });

    for (const application of candidate.applications) {
      this.compatibility.assertApplication(application.type, application.platforms, application.stack);
    }

    return candidate;
  }
}
