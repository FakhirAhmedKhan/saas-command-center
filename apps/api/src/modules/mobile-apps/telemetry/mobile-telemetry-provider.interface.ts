import type { NormalizedMobileCrashTelemetry, NormalizedMobilePerformanceTelemetry, NormalizedMobileTelemetryVersion } from '@command-center/shared-types';
import type { MobilePlatform, MobileTelemetryProvider } from 'src/generated/prisma/enums';

export interface MobileTelemetryProviderContext {
  externalProjectId: string;
  config: Record<string, string>;
  from?: string | Date;
  to?: string | Date;
  version?: string;
  buildNumber?: string;
  platform?: MobilePlatform;
}

export interface MobileTelemetryProviderAdapter {
  readonly provider: MobileTelemetryProvider;

  validateConfig(config: Record<string, string>): void;

  getCrashes(context: MobileTelemetryProviderContext): Promise<NormalizedMobileCrashTelemetry>;

  getPerformance(context: MobileTelemetryProviderContext): Promise<NormalizedMobilePerformanceTelemetry>;

  getVersions(context: MobileTelemetryProviderContext): Promise<NormalizedMobileTelemetryVersion[]>;
}
