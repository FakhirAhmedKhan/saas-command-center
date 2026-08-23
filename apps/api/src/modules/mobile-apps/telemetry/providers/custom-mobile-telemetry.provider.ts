import { MobileProviderSecurityService } from '../../security/mobile-provider-security.service';
import type { MobileTelemetryProviderAdapter, MobileTelemetryProviderContext } from '../mobile-telemetry-provider.interface';
import { ProviderHttpService } from '../provider-http.service';
import type { NormalizedMobileCrashTelemetry, NormalizedMobilePerformanceTelemetry, NormalizedMobileTelemetryVersion } from '@command-center/shared-types';
import { BadRequestException, Injectable } from '@nestjs/common';
import { MobileTelemetryProvider } from 'src/generated/prisma/enums';

@Injectable()
export class CustomMobileTelemetryProvider implements MobileTelemetryProviderAdapter {
  readonly provider = MobileTelemetryProvider.CUSTOM;

  constructor(
    private readonly http: ProviderHttpService,

    private readonly security: MobileProviderSecurityService,
  ) {}

  validateConfig(config: Record<string, string>) {
    if (!config.baseUrl || !config.token) {
      throw new BadRequestException('Custom provider requires baseUrl and token.');
    }

    this.security.assertCustomBaseUrl(config.baseUrl);
  }

  async getCrashes(context: MobileTelemetryProviderContext) {
    return this.get<NormalizedMobileCrashTelemetry>(context, '/v1/mobile/crashes');
  }

  async getPerformance(context: MobileTelemetryProviderContext) {
    return this.get<NormalizedMobilePerformanceTelemetry>(context, '/v1/mobile/performance');
  }

  async getVersions(context: MobileTelemetryProviderContext) {
    return this.get<NormalizedMobileTelemetryVersion[]>(context, '/v1/mobile/versions');
  }

  private async get<T>(
    context: MobileTelemetryProviderContext,

    path: string,
  ): Promise<T> {
    const baseUrl = context.config.baseUrl;

    if (!baseUrl) {
      throw new Error('Custom telemetry baseUrl is required');
    }

    const base = this.security.assertCustomBaseUrl(baseUrl);

    const url = new URL(path, base);

    url.searchParams.set('projectId', context.externalProjectId);

    return this.http.json<T>(
      url,

      {
        headers: {
          authorization: `Bearer ${context.config.token}`,
        },
      },
    );
  }
}
