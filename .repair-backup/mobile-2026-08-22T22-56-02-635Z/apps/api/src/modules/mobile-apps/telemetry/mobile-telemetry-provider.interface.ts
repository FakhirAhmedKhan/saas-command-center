import type { MobileTelemetryProviderAdapter } from './mobile-telemetry-provider.interface';
import { CustomMobileTelemetryProvider } from './providers/custom-mobile-telemetry.provider';
import { DatadogMobileTelemetryProvider } from './providers/datadog-mobile-telemetry.provider';
import { FirebaseMobileTelemetryProvider } from './providers/firebase-mobile-telemetry.provider';
import { NewRelicMobileTelemetryProvider } from './providers/new-relic-mobile-telemetry.provider';
import { SentryMobileTelemetryProvider } from './providers/sentry-mobile-telemetry.provider';
import { Injectable, NotFoundException } from '@nestjs/common';
import { MobileTelemetryProvider } from 'src/generated/prisma/enums';

@Injectable()
export class MobileTelemetryProviderRegistry {
  private readonly providers: Map<MobileTelemetryProvider, MobileTelemetryProviderAdapter>;

  constructor(
    firebase: FirebaseMobileTelemetryProvider,

    sentry: SentryMobileTelemetryProvider,

    datadog: DatadogMobileTelemetryProvider,

    newRelic: NewRelicMobileTelemetryProvider,

    custom: CustomMobileTelemetryProvider,
  ) {
    this.providers = new Map([
      [MobileTelemetryProvider.FIREBASE, firebase],

      [MobileTelemetryProvider.SENTRY, sentry],

      [MobileTelemetryProvider.DATADOG, datadog],

      [MobileTelemetryProvider.NEW_RELIC, newRelic],

      [MobileTelemetryProvider.CUSTOM, custom],
    ]);
  }

  get(provider: MobileTelemetryProvider) {
    const result = this.providers.get(provider);

    if (!result) {
      throw new NotFoundException('Telemetry provider is unavailable.');
    }

    return result;
  }

  registerForTesting(
    provider: MobileTelemetryProvider,

    adapter: MobileTelemetryProviderAdapter,
  ) {
    if (process.env.NODE_ENV !== 'test') {
      throw new Error('Provider overrides are test-only.');
    }

    this.providers.set(provider, adapter);
  }
}
