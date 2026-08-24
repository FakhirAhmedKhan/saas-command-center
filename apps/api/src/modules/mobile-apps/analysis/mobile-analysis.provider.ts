import type { MobileAnalysisProvider, MobileAnalysisProviderInput } from './mobile-analysis-provider.interface';
import { Injectable, ServiceUnavailableException } from '@nestjs/common';

@Injectable()
export class ConfiguredMobileAnalysisProvider implements MobileAnalysisProvider {
  async analyze(input: MobileAnalysisProviderInput): Promise<string> {
    const endpoint = process.env.MOBILE_AI_ANALYSIS_URL;
    const apiKey = process.env.MOBILE_AI_ANALYSIS_API_KEY;
    const model = process.env.MOBILE_AI_ANALYSIS_MODEL;

    if (!endpoint || !apiKey || !model) {
      throw new ServiceUnavailableException('Mobile AI analysis provider is not configured.');
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 20_000);

    try {
      const response = await fetch(endpoint, {
        method: 'POST',

        signal: controller.signal,

        headers: {
          'content-type': 'application/json',

          authorization: `Bearer ${apiKey}`,
        },

        body: JSON.stringify({
          model,

          system: input.system,

          prompt: input.prompt,
        }),
      });

      if (!response.ok) {
        throw new ServiceUnavailableException('Mobile AI analysis provider failed.');
      }

      const data = (await response.json()) as {
        text?: unknown;
      };

      if (typeof data.text !== 'string' || !data.text.trim()) {
        throw new ServiceUnavailableException('Mobile AI analysis provider returned an invalid response.');
      }

      return data.text.trim();
    } finally {
      clearTimeout(timer);
    }
  }
}
