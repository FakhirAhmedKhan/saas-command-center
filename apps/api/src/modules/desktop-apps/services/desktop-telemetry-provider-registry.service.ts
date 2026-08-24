import type { DesktopTelemetryProviderAdapter } from '../telemetry/desktop-telemetry-provider.interface';
import { NormalizedHttpDesktopTelemetryProvider } from '../telemetry/normalized-http-desktop-telemetry.provider';
import { Injectable } from '@nestjs/common';

@Injectable()
export class DesktopTelemetryProviderRegistryService {
  constructor(private readonly normalizedHttp: NormalizedHttpDesktopTelemetryProvider) {}

  get(): DesktopTelemetryProviderAdapter {
    // The core consumes one normalized adapter contract. Provider-specific
    // collectors/bridges normalize Sentry/Datadog/New Relic/OTel responses
    // before they reach this boundary, keeping vendor logic out of the core.
    return this.normalizedHttp;
  }
}
