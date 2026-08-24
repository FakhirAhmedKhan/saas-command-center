import type { DesktopAnalysisProvider, DesktopAnalysisProviderInput } from './desktop-analysis-provider.interface';
import { Injectable, ServiceUnavailableException } from '@nestjs/common';

@Injectable()
export class ConfiguredDesktopAnalysisProvider implements DesktopAnalysisProvider {
  async analyze(input: DesktopAnalysisProviderInput): Promise<string> {
    const endpoint = process.env.DESKTOP_AI_ANALYSIS_URL?.trim();
    const apiKey = process.env.DESKTOP_AI_ANALYSIS_API_KEY?.trim();
    const model = process.env.DESKTOP_AI_ANALYSIS_MODEL?.trim();

    if (!endpoint || !apiKey || !model) {
      throw new ServiceUnavailableException('Desktop AI analysis provider is not configured.');
    }

    const url = new URL(endpoint);

    if (url.protocol !== 'https:' && process.env.NODE_ENV !== 'test') {
      throw new ServiceUnavailableException('Desktop AI analysis endpoint must use HTTPS.');
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 20_000);

    try {
      const response = await fetch(url, {
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
        throw new ServiceUnavailableException('Desktop AI analysis provider failed.');
      }

      const data = (await response.json()) as { text?: unknown };

      if (typeof data.text !== 'string' || !data.text.trim()) {
        throw new ServiceUnavailableException('Desktop AI analysis provider returned an invalid response.');
      }

      return data.text.trim();
    } catch (error) {
      if (error instanceof ServiceUnavailableException) throw error;

      throw new ServiceUnavailableException('Desktop AI analysis provider failed.');
    } finally {
      clearTimeout(timer);
    }
  }
}
