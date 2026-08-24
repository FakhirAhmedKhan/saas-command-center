import type { MobileTelemetryProviderAdapter, MobileTelemetryProviderContext } from '../mobile-telemetry-provider.interface';
import { ProviderHttpService } from '../provider-http.service';
import { BadRequestException, Injectable } from '@nestjs/common';
import { MobileTelemetryProvider } from 'src/generated/prisma/enums';

interface SentryExploreResponse {
  data: Array<Record<string, unknown>>;
}

@Injectable()
export class SentryMobileTelemetryProvider implements MobileTelemetryProviderAdapter {
  readonly provider = MobileTelemetryProvider.SENTRY;

  constructor(private readonly http: ProviderHttpService) {}

  validateConfig(config: Record<string, string>): void {
    this.required(config, 'authToken');

    this.slug(config.organizationSlug, 'organizationSlug');

    this.slug(config.projectSlug, 'projectSlug');
  }

  async getCrashes(context: MobileTelemetryProviderContext) {
    const config = context.config;
    const result = await this.explore(
      config,

      'errors',

      ['count()'],

      'error.unhandled:true',
    );
    const crashCount = this.number(result.data[0]?.['count()']) ?? 0;

    return {
      crashCount,

      affectedUsers: null,

      /*
       * Sentry's generic errors query does not give
       * us a reliable cross-SDK crash-free-user
       * denominator here.
       */
      crashFreeUsersRate: null,
    };
  }

  async getPerformance(_context: MobileTelemetryProviderContext) {
    void _context;
    await Promise.resolve();
    /*
     * Performance/span semantics depend on
     * the project's Sentry instrumentation.
     *
     * Do not fake mobile startup/memory metrics.
     */
    return {
      coldStartupMs: null,

      warmStartupMs: null,

      memoryMb: null,

      networkLatencyMs: null,
    };
  }

  async getVersions(context: MobileTelemetryProviderContext) {
    const result = await this.explore(
      context.config,

      'errors',

      ['release', 'count()'],

      '',
    );

    return result.data
      .map((row) => {
        const version = typeof row.release === 'string' ? row.release : null;

        if (!version) {
          return null;
        }

        return {
          version,

          buildNumber: null,

          activeUsers: null,
        };
      })
      .filter(
        (
          item,
        ): item is {
          version: string;

          buildNumber: null;

          activeUsers: null;
        } => item !== null,
      );
  }

  private async explore(
    config: Record<string, string>,

    dataset: string,

    fields: string[],

    query: string,
  ): Promise<SentryExploreResponse> {
    const url = new URL(`https://sentry.io/api/0/organizations/${encodeURIComponent(config.organizationSlug!)}/events/`);

    url.searchParams.set('dataset', dataset);

    url.searchParams.set('statsPeriod', '24h');

    url.searchParams.set('project', config.projectSlug!);

    url.searchParams.set('per_page', '100');

    if (query) {
      url.searchParams.set('query', query);
    }

    for (const field of fields) {
      url.searchParams.append('field', field);
    }

    return this.http.json<SentryExploreResponse>(
      url,

      {
        headers: {
          authorization: `Bearer ${config.authToken}`,
        },
      },
    );
  }

  private required(
    config: Record<string, string>,

    key: string,
  ) {
    if (!config[key]?.trim()) {
      throw new BadRequestException(`Missing telemetry configuration: ${key}`);
    }
  }

  private slug(
    value: string | undefined,

    key: string,
  ) {
    if (!value || !/^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/.test(value)) {
      throw new BadRequestException(`Invalid Sentry ${key}.`);
    }
  }

  private number(value: unknown): number | null {
    const parsed = Number(value);

    return Number.isFinite(parsed) ? parsed : null;
  }
}
