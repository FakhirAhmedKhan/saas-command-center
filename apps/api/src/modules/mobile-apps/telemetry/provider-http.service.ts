import { BadGatewayException, Injectable, RequestTimeoutException } from '@nestjs/common';

@Injectable()
export class ProviderHttpService {
  async json<T>(
    url: string | URL,

    options: RequestInit = {},

    timeoutMs = 15000,
  ): Promise<T> {
    const controller = new AbortController();

    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        ...options,

        signal: controller.signal,

        headers: {
          accept: 'application/json',

          ...(options.body
            ? {
                'content-type': 'application/json',
              }
            : {}),

          ...options.headers,
        },
      });

      if (!response.ok) {
        /*
         * Never return provider response bodies here.
         * They may contain provider/internal details.
         */
        throw new BadGatewayException(`Telemetry provider returned HTTP ${response.status}.`);
      }

      return (await response.json()) as T;
    } catch (error) {
      if (error instanceof BadGatewayException) {
        throw error;
      }

      if (error instanceof Error && error.name === 'AbortError') {
        throw new RequestTimeoutException('Telemetry provider timed out.');
      }

      throw new BadGatewayException('Telemetry provider request failed.');
    } finally {
      clearTimeout(timer);
    }
  }
}
