/* eslint-disable @typescript-eslint/no-base-to-string */
import type { DesktopTelemetryProviderAdapter, DesktopTelemetryProviderContext } from './desktop-telemetry-provider.interface';
import type {
  DesktopArchitecture,
  DesktopPlatform,
  DesktopReleaseChannel,
  DesktopTelemetryPerformanceSample,
  DesktopTelemetryCrashSample,
  DesktopTelemetrySnapshot,
  DesktopTelemetryVersionSample,
} from '@command-center/shared-types';
import { BadGatewayException, Injectable } from '@nestjs/common';

const METRIC_TYPES = new Set([
  'CRASH_FREE_USERS_PERCENT',
  'CRASH_FREE_SESSIONS_PERCENT',
  'STARTUP_MS',
  'MEMORY_MB',
  'CPU_PERCENT',
  'HANG_RATE_PERCENT',
  'NETWORK_LATENCY_MS',
  'API_FAILURE_RATE_PERCENT',
  'VERSION_ADOPTION_PERCENT',
]);

const PLATFORMS = new Set(['WINDOWS', 'MACOS', 'LINUX', 'CROSS_PLATFORM']);

const ARCHITECTURES = new Set(['X64', 'ARM64', 'X86', 'UNIVERSAL']);

const CHANNELS = new Set(['DEV', 'ALPHA', 'BETA', 'STABLE', 'LTS']);

@Injectable()
export class NormalizedHttpDesktopTelemetryProvider implements DesktopTelemetryProviderAdapter {
  async getSnapshot(context: DesktopTelemetryProviderContext): Promise<DesktopTelemetrySnapshot> {
    const url = new URL(context.endpointUrl);

    if (process.env.NODE_ENV === 'test' && url.protocol === 'mock:') {
      return this.testSnapshot(url.hostname);
    }

    url.searchParams.set('externalProjectId', context.externalProjectId);
    url.searchParams.set('desktopAppId', context.desktopAppId);

    let response: Response;

    try {
      response = await fetch(url, {
        method: 'GET',
        headers: {
          accept: 'application/json',
          authorization: `Bearer ${context.secret}`,
          'x-saas-command-center-provider': context.provider,
        },
        signal: AbortSignal.timeout(12_000),
        redirect: 'error',
      });
    } catch {
      throw new BadGatewayException('Telemetry provider could not be reached.');
    }

    if (!response.ok) {
      throw new BadGatewayException(`Telemetry provider returned HTTP ${response.status}.`);
    }

    let raw: unknown;

    try {
      raw = await response.json();
    } catch {
      throw new BadGatewayException('Telemetry provider returned invalid JSON.');
    }

    return this.normalize(raw);
  }

  private normalize(raw: unknown): DesktopTelemetrySnapshot {
    if (!raw || typeof raw !== 'object') {
      throw new BadGatewayException('Telemetry provider payload must be an object.');
    }

    const value = raw as Record<string, unknown>;

    return {
      performance: this.performance(value.performance),
      crashes: this.crashes(value.crashes),
      versions: this.versions(value.versions),
    };
  }

  private performance(raw: unknown): DesktopTelemetryPerformanceSample[] {
    if (!Array.isArray(raw)) {
      return [];
    }

    return raw.flatMap((item, index) => {
      if (!item || typeof item !== 'object') {
        return [];
      }

      const value = item as Record<string, unknown>;
      const type = String(value.type ?? '');
      const metricValue = Number(value.value);
      const recordedAt = String(value.recordedAt ?? '');

      if (!METRIC_TYPES.has(type) || !Number.isFinite(metricValue) || Number.isNaN(Date.parse(recordedAt))) {
        return [];
      }

      return [
        {
          externalId: String(value.externalId ?? `metric-${index}`),
          type: type as DesktopTelemetryPerformanceSample['type'],
          value: metricValue,
          unit: String(value.unit ?? ''),
          recordedAt,
          version: this.optionalString(value.version),
          platform: this.platform(value.platform),
          architecture: this.architecture(value.architecture),
          channel: this.channel(value.channel),
        },
      ];
    });
  }

  private crashes(raw: unknown): DesktopTelemetryCrashSample[] {
    if (!Array.isArray(raw)) {
      return [];
    }

    return raw.flatMap((item, index) => {
      if (!item || typeof item !== 'object') {
        return [];
      }

      const value = item as Record<string, unknown>;
      const fingerprint = String(value.fingerprint ?? '').trim();
      const message = String(value.message ?? '').trim();
      const firstSeenAt = String(value.firstSeenAt ?? '');
      const lastSeenAt = String(value.lastSeenAt ?? '');
      const count = Math.max(0, Math.trunc(Number(value.count ?? 0)));
      const affectedUsers = Math.max(0, Math.trunc(Number(value.affectedUsers ?? 0)));

      if (!fingerprint || !message || Number.isNaN(Date.parse(firstSeenAt)) || Number.isNaN(Date.parse(lastSeenAt))) {
        return [];
      }

      return [
        {
          externalId: String(value.externalId ?? `crash-${index}`),
          fingerprint,
          message,
          count,
          affectedUsers,
          firstSeenAt,
          lastSeenAt,
          version: this.optionalString(value.version),
          platform: this.platform(value.platform),
          architecture: this.architecture(value.architecture),
          channel: this.channel(value.channel),
        },
      ];
    });
  }

  private versions(raw: unknown): DesktopTelemetryVersionSample[] {
    if (!Array.isArray(raw)) {
      return [];
    }

    return raw.flatMap((item) => {
      if (!item || typeof item !== 'object') {
        return [];
      }

      const value = item as Record<string, unknown>;
      const version = String(value.version ?? '').trim();

      if (!version) {
        return [];
      }

      return [
        {
          version,
          users: Math.max(0, Math.trunc(Number(value.users ?? 0))),
          sessions: Math.max(0, Math.trunc(Number(value.sessions ?? 0))),
        },
      ];
    });
  }

  private optionalString(value: unknown): string | null {
    const normalized = String(value ?? '').trim();
    return normalized || null;
  }

  private platform(value: unknown): DesktopPlatform | null {
    const normalized = String(value ?? '').toUpperCase();
    return PLATFORMS.has(normalized) ? (normalized as DesktopPlatform) : null;
  }

  private architecture(value: unknown): DesktopArchitecture | null {
    const normalized = String(value ?? '').toUpperCase();
    return ARCHITECTURES.has(normalized) ? (normalized as DesktopArchitecture) : null;
  }

  private channel(value: unknown): DesktopReleaseChannel | null {
    const normalized = String(value ?? '').toUpperCase();
    return CHANNELS.has(normalized) ? (normalized as DesktopReleaseChannel) : null;
  }

  private testSnapshot(mode: string): DesktopTelemetrySnapshot {
    if (mode === 'failure') {
      throw new BadGatewayException('Injected telemetry provider failure.');
    }

    return {
      performance: [
        {
          externalId: 'perf-startup-1',
          type: 'STARTUP_MS',
          value: 1800,
          unit: 'ms',
          recordedAt: '2026-08-23T00:00:00.000Z',
          version: '2.4.0',
          platform: 'WINDOWS',
          architecture: 'X64',
          channel: 'STABLE',
        },
        {
          externalId: 'perf-memory-1',
          type: 'MEMORY_MB',
          value: 242,
          unit: 'MB',
          recordedAt: '2026-08-23T00:00:00.000Z',
          version: '2.4.0',
          platform: 'WINDOWS',
          architecture: 'X64',
          channel: 'STABLE',
        },
        {
          externalId: 'perf-cpu-1',
          type: 'CPU_PERCENT',
          value: 4.8,
          unit: '%',
          recordedAt: '2026-08-23T00:00:00.000Z',
          version: '2.4.0',
          platform: 'WINDOWS',
          architecture: 'X64',
          channel: 'STABLE',
        },
        {
          externalId: 'perf-crashfree-1',
          type: 'CRASH_FREE_USERS_PERCENT',
          value: 99.7,
          unit: '%',
          recordedAt: '2026-08-23T00:00:00.000Z',
          version: '2.4.0',
          platform: 'WINDOWS',
          architecture: 'X64',
          channel: 'STABLE',
        },
      ],
      crashes: [
        {
          externalId: 'crash-renderer-1',
          fingerprint: 'renderer-crash',
          message: 'Renderer process exited unexpectedly',
          count: 12,
          affectedUsers: 8,
          firstSeenAt: '2026-08-22T20:00:00.000Z',
          lastSeenAt: '2026-08-23T00:00:00.000Z',
          version: '2.4.0',
          platform: 'WINDOWS',
          architecture: 'X64',
          channel: 'STABLE',
        },
      ],
      versions: [
        {
          version: '2.4.0',
          users: 120,
          sessions: 440,
        },
      ],
    };
  }
}
