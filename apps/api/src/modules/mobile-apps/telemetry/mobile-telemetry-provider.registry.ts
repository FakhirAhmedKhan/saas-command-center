import type { MobileTelemetryProviderAdapter } from './mobile-telemetry-provider.interface';
import { CustomMobileTelemetryProvider } from './providers/custom-mobile-telemetry.provider';
import { DatadogMobileTelemetryProvider } from './providers/datadog-mobile-telemetry.provider';
import { FirebaseMobileTelemetryProvider } from './providers/firebase-mobile-telemetry.provider';
import { NewRelicMobileTelemetryProvider } from './providers/new-relic-mobile-telemetry.provider';
import { SentryMobileTelemetryProvider } from './providers/sentry-mobile-telemetry.provider';
import { Injectable } from '@nestjs/common';
import { MobileTelemetryProvider } from 'src/generated/prisma/enums';

@Injectable()
export class MobileTelemetryProviderRegistry {
  private readonly providers: Map<MobileTelemetryProvider, MobileTelemetryProviderAdapter>;

  constructor(firebase: FirebaseMobileTelemetryProvider, sentry: SentryMobileTelemetryProvider, datadog: DatadogMobileTelemetryProvider, newRelic: NewRelicMobileTelemetryProvider, custom: CustomMobileTelemetryProvider) {
    this.providers = new Map<MobileTelemetryProvider, MobileTelemetryProviderAdapter>([
      [MobileTelemetryProvider.FIREBASE, firebase],
      [MobileTelemetryProvider.SENTRY, sentry],
      [MobileTelemetryProvider.DATADOG, datadog],
      [MobileTelemetryProvider.NEW_RELIC, newRelic],
      [MobileTelemetryProvider.CUSTOM, custom],
    ]);
  }

  get(provider: MobileTelemetryProvider): MobileTelemetryProviderAdapter {
    const adapter = this.providers.get(provider);

    if (!adapter) {
      throw new Error(`Unsupported mobile telemetry provider: ${provider}`);
    }

    return adapter;
  }

  registerForTesting(provider: MobileTelemetryProvider, adapter: MobileTelemetryProviderAdapter): void {
    if (process.env.NODE_ENV !== 'test') {
      throw new Error('registerForTesting is only available in test mode');
    }

    this.providers.set(provider, adapter);
  }
}
