import type { MobileTelemetryProviderAdapter, MobileTelemetryProviderContext } from '../mobile-telemetry-provider.interface';
import { ProviderHttpService } from '../provider-http.service';
import { BadRequestException, Injectable } from '@nestjs/common';
import { MobileTelemetryProvider } from 'src/generated/prisma/enums';

interface NerdGraphResponse {
  data?: {
    actor?: {
      account?: {
        nrql?: {
          results?: Array<Record<string, unknown>>;
        };
      };
    };
  };

  errors?: unknown[];
}

@Injectable()
export class NewRelicMobileTelemetryProvider implements MobileTelemetryProviderAdapter {
  readonly provider = MobileTelemetryProvider.NEW_RELIC;

  constructor(private readonly http: ProviderHttpService) {}

  validateConfig(config: Record<string, string>) {
    if (!config.apiKey) {
      throw new BadRequestException('Missing telemetry configuration: apiKey');
    }

    if (!/^\d+$/.test(config.accountId ?? '')) {
      throw new BadRequestException('New Relic accountId must be numeric.');
    }

    if (!/^\d+$/.test(config.appId ?? '')) {
      throw new BadRequestException('New Relic appId must be numeric.');
    }

    const region = config.region ?? 'US';

    if (!['US', 'EU', 'JP'].includes(region)) {
      throw new BadRequestException('New Relic region must be US, EU, or JP.');
    }
  }

  async getCrashes(context: MobileTelemetryProviderContext) {
    const { appId } = context.config;

    const crash = await this.nrql(
      context.config,

      `
SELECT count(*) AS crashCount,
       uniqueCount(sessionId) AS affectedUsers
FROM MobileCrash
WHERE appId = '${appId}'
SINCE 1 day ago
        `.trim(),
    );

    const rate = await this.nrql(
      context.config,

      `
SELECT percentage(
  uniqueCount(sessionId),
  WHERE category = 'Crash'
) AS crashRate
FROM MobileSession, MobileCrash
WHERE appId = '${appId}'
SINCE 1 day ago
        `.trim(),
    );

    const crashRate = this.number(rate[0]?.crashRate);

    return {
      crashCount: this.number(crash[0]?.crashCount) ?? 0,

      affectedUsers: this.number(crash[0]?.affectedUsers),

      crashFreeUsersRate: crashRate === null ? null : Math.max(0, 100 - crashRate),
    };
  }

  async getPerformance(context: MobileTelemetryProviderContext) {
    const appId = context.config.appId!;

    const sessions = await this.nrql(
      context.config,

      `
SELECT average(memUsageMb) AS memoryMb
FROM MobileSession
WHERE appId = '${appId}'
SINCE 1 day ago
        `.trim(),
    );

    const requests = await this.nrql(
      context.config,

      `
SELECT average(duration) AS networkLatencySeconds
FROM MobileRequest
WHERE appId = '${appId}'
SINCE 1 day ago
        `.trim(),
    );

    const networkSeconds = this.number(requests[0]?.networkLatencySeconds);

    return {
      /*
       * Do not map an unrelated New Relic metric to
       * startup time. Phase 12/13 can enrich startup
       * separately if your instrumentation reports it.
       */
      coldStartupMs: null,

      warmStartupMs: null,

      memoryMb: this.number(sessions[0]?.memoryMb),

      networkLatencyMs: networkSeconds === null ? null : networkSeconds * 1000,
    };
  }

  async getVersions(context: MobileTelemetryProviderContext) {
    const rows = await this.nrql(
      context.config,

      `
SELECT uniqueCount(uuid) AS activeUsers
FROM MobileSession
WHERE appId = '${context.config.appId}'
FACET appVersion, appBuild
SINCE 7 days ago
LIMIT MAX
        `.trim(),
    );

    return rows
      .map((row) => {
        const facet = row.facet;

        const values = Array.isArray(facet) ? facet : [facet];

        const version = typeof values[0] === 'string' ? values[0] : null;

        if (!version) {
          return null;
        }

        return {
          version,

          buildNumber: values[1] === undefined || values[1] === null ? null : String(values[1]),

          activeUsers: this.number(row.activeUsers),
        };
      })
      .filter(
        (
          row,
        ): row is {
          version: string;

          buildNumber: string | null;

          activeUsers: number | null;
        } => row !== null,
      );
  }

  private async nrql(
    config: Record<string, string>,

    nrql: string,
  ) {
    const accountId = Number(config.accountId);

    const endpoint = this.endpoint(config.region ?? 'US');

    const response = await this.http.json<NerdGraphResponse>(
      endpoint,

      {
        method: 'POST',

        headers: {
          'API-Key': config.apiKey!,
        },

        body: JSON.stringify({
          query: `
query MobileTelemetry($accountId: Int!, $nrql: Nrql!) {
  actor {
    account(id: $accountId) {
      nrql(query: $nrql) {
        results
      }
    }
  }
}
              `.trim(),

          variables: {
            accountId,
            nrql,
          },
        }),
      },
    );

    if (response.errors?.length) {
      throw new Error('New Relic query failed.');
    }

    return response.data?.actor?.account?.nrql?.results ?? [];
  }

  private endpoint(region: string) {
    if (region === 'EU') {
      return 'https://api.eu.newrelic.com/graphql';
    }

    if (region === 'JP') {
      return 'https://api.jp.newrelic.com/graphql';
    }

    return 'https://api.newrelic.com/graphql';
  }

  private number(value: unknown): number | null {
    const parsed = Number(value);

    return Number.isFinite(parsed) ? parsed : null;
  }
}
