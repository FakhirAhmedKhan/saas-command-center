import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { WorkspaceAiCircuitBreakerService } from './workspace-ai-circuit-breaker.service';

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
    private readonly config: TypedConfigService,
    private readonly circuit: WorkspaceAiCircuitBreakerService,
  ) {}

  async generate(messages: Array<{ role: 'system' | 'user'; content: string }>): Promise<unknown> {
    this.circuit.assertAvailable();
    const ai = this.config.workspaceAi;
    const attempts = this.config.workspaceOnboarding.aiMaxRetries + 1;
    let lastError: unknown;

    for (let attempt = 0; attempt < attempts; attempt += 1) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), this.config.workspaceOnboarding.aiRequestTimeoutMs);

      try {
        const response = await fetch(`${ai.baseUrl.replace(/\/$/, '')}/chat/completions`, {
          method: 'POST',
          signal: controller.signal,
          headers: {
            authorization: `Bearer ${ai.apiKey}`,
            'content-type': 'application/json',
          },
          body: JSON.stringify({
            model: ai.model,
            temperature: 0,
            response_format: { type: 'json_object' },
            messages,
          }),
        });

        if (!response.ok) {
          throw new Error(`Provider returned ${response.status}`);
        }

        const payload = (await response.json()) as ProviderResponse;
        const content = payload.choices?.[0]?.message?.content;

        if (!content) throw new Error('Provider returned no structured content');

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
