import { WorkspaceAiCircuitBreakerService } from './workspace-ai-circuit-breaker.service';
import type { TypedConfigService } from '../../config/runtime-config';
import { Inject, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

interface ProviderResponse {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
}

@Injectable()
export class AiBlueprintProviderClient {
  constructor(
    @Inject(ConfigService)
    private readonly config: TypedConfigService,
    private readonly circuit: WorkspaceAiCircuitBreakerService,
  ) {}

  async generate(
    messages: Array<{
      role: 'system' | 'user';
      content: string;
    }>,
  ): Promise<unknown> {
    this.circuit.assertAvailable();

    const baseUrl = this.config.get('WORKSPACE_AI_BASE_URL', {
      infer: true,
    });
    const apiKey = this.config.get('WORKSPACE_AI_API_KEY', {
      infer: true,
    });
    const model = this.config.get('WORKSPACE_AI_MODEL', {
      infer: true,
    });

    if (!baseUrl || !apiKey || !model) {
      throw new ServiceUnavailableException('Workspace AI provider is not configured');
    }

    const attempts =
      this.config.get('WORKSPACE_ONBOARDING_AI_MAX_RETRIES', {
        infer: true,
      }) + 1;
    let lastError: unknown;

    for (let attempt = 0; attempt < attempts; attempt += 1) {
      const controller = new AbortController();
      const timeout = setTimeout(
        () => controller.abort(),
        this.config.get('WORKSPACE_ONBOARDING_AI_REQUEST_TIMEOUT_MS', {
          infer: true,
        }),
      );

      try {
        const response = await fetch(`${baseUrl.replace(/\/$/, '')}/chat/completions`, {
          method: 'POST',
          signal: controller.signal,
          headers: {
            authorization: `Bearer ${apiKey}`,
            'content-type': 'application/json',
          },
          body: JSON.stringify({
            model,
            temperature: 0,
            response_format: {
              type: 'json_object',
            },
            messages,
          }),
        });

        if (!response.ok) {
          throw new Error(`Provider returned ${response.status}`);
        }

        const payload = (await response.json()) as ProviderResponse;
        const content = payload.choices?.[0]?.message?.content;

        if (!content) {
          throw new Error('Provider returned no structured content');
        }

        const parsed = JSON.parse(content) as unknown;

        this.circuit.success();

        return parsed;
      } catch (error) {
        lastError = error;
        this.circuit.failure();

        if (attempt + 1 < attempts) {
          await new Promise((resolve) => setTimeout(resolve, 150 * 2 ** attempt));
        }
      } finally {
        clearTimeout(timeout);
      }
    }

    throw new ServiceUnavailableException(lastError instanceof Error ? lastError.message : 'AI provider failed');
  }
}
