process.env.MOBILE_TELEMETRY_ENCRYPTION_KEY = Buffer.alloc(32, 7).toString('base64');
import type { MobileTelemetryProviderAdapter, MobileTelemetryProviderContext } from 'src/modules/mobile-apps/telemetry/mobile-telemetry-provider.interface';

import { MobileTelemetryProvider } from 'src/generated/prisma/enums';

class FakeTelemetryProvider implements MobileTelemetryProviderAdapter {
  readonly provider = MobileTelemetryProvider.SENTRY;

  attempts = 0;

  failCount = 0;

  validateConfig(config: Record<string, string>) {
    if (!config.authToken) {
      throw new Error('authToken required');
    }
  }

  async getCrashes(_context: MobileTelemetryProviderContext) {
    this.maybeFail();

    return {
      crashCount: 17,
      affectedUsers: 12,
      crashFreeUsersRate: 99.92,
    };
  }

  async getPerformance(_context: MobileTelemetryProviderContext) {
    return {
      coldStartupMs: 1400,

      warmStartupMs: 620,

      memoryMb: 184,

      networkLatencyMs: 230,
    };
  }

  async getVersions(_context: MobileTelemetryProviderContext) {
    return [
      {
        version: '6.14.0',

        buildNumber: '815',

        activeUsers: 12500,
      },
    ];
  }

  private maybeFail() {
    this.attempts += 1;

    if (this.attempts <= this.failCount) {
      throw new Error('Fake provider failure');
    }
  }
}
