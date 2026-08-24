import type { MobileTelemetryProviderAdapter, MobileTelemetryProviderContext } from '../mobile-telemetry-provider.interface';
import { ProviderHttpService } from '../provider-http.service';
import { BadRequestException, Injectable } from '@nestjs/common';
import { MobileTelemetryProvider } from 'src/generated/prisma/enums';

interface DatadogEvent {
  attributes?: {
    attributes?: Record<string, unknown>;
  };
}

interface DatadogSearchResponse {
  data?: DatadogEvent[];

  links?: {
    next?: string;
  };
}

@Injectable()
export class DatadogMobileTelemetryProvider implements MobileTelemetryProviderAdapter {
  readonly provider = MobileTelemetryProvider.DATADOG;

  constructor(private readonly http: ProviderHttpService) {}

  validateConfig(config: Record<string, string>) {
    for (const key of ['apiKey', 'appKey']) {
      if (!config[key]) {
        throw new BadRequestException(`Missing telemetry configuration: ${key}`);
      }
    }

    this.baseUrl(config.site ?? 'datadoghq.com');
  }

  async getCrashes(context: MobileTelemetryProviderContext) {
    const applicationId = context.externalProjectId;
    const [errors, sessions] = await Promise.all([
      this.search(
        context.config,

        `@type:error @application.id:${applicationId}`,
      ),

      this.search(
        context.config,

        `@type:session @application.id:${applicationId}`,
      ),
    ]);
    const affected = new Set<string>();

    for (const event of errors) {
      const value = this.firstString(event, ['session.id', 'usr.id', 'user.id']);

      if (value) {
        affected.add(value);
      }
    }

    const sessionsIds = new Set<string>();

    for (const event of sessions) {
      const value = this.firstString(event, ['session.id']);

      if (value) {
        sessionsIds.add(value);
      }
    }

    const crashFree = sessionsIds.size > 0 ? Math.max(0, (1 - affected.size / sessionsIds.size) * 100) : null;

    return {
      crashCount: errors.length,

      affectedUsers: affected.size || null,

      crashFreeUsersRate: crashFree,
    };
  }

  async getPerformance(context: MobileTelemetryProviderContext) {
    const applicationId = context.externalProjectId;
    const [views, resources] = await Promise.all([
      this.search(
        context.config,

        `@type:view @application.id:${applicationId}`,
      ),

      this.search(
        context.config,

        `@type:resource @application.id:${applicationId}`,
      ),
    ]);
    const scale = Number(context.config.durationScale ?? '1000000');
    const network = resources
      .map((event) => this.firstNumber(event, ['resource.duration', 'duration']))
      .filter((item): item is number => item !== null)
      .map((item) => item / scale);
    const coldPath = context.config.coldStartupAttribute;
    const warmPath = context.config.warmStartupAttribute;
    const memoryPath = context.config.memoryAttribute;

    return {
      coldStartupMs: coldPath ? this.average(views.map((event) => this.numberAt(event, coldPath)).filter((value): value is number => value !== null)) : null,

      warmStartupMs: warmPath ? this.average(views.map((event) => this.numberAt(event, warmPath)).filter((value): value is number => value !== null)) : null,

      memoryMb: memoryPath ? this.average(views.map((event) => this.numberAt(event, memoryPath)).filter((value): value is number => value !== null)) : null,

      networkLatencyMs: this.average(network),
    };
  }

  async getVersions(context: MobileTelemetryProviderContext) {
    const sessions = await this.search(
      context.config,

      `@type:session @application.id:${context.externalProjectId}`,
    );
    const grouped = new Map<
      string,
      {
        buildNumber: string | null;

        users: Set<string>;
      }
    >();

    for (const event of sessions) {
      const version = this.firstString(event, ['version', 'application.version', 'app.version']);

      if (!version) {
        continue;
      }

      const item = grouped.get(version) ?? {
        buildNumber: this.firstString(event, ['application.build', 'app.build']),

        users: new Set<string>(),
      };
      const user = this.firstString(event, ['usr.id', 'user.id', 'session.id']);

      if (user) {
        item.users.add(user);
      }

      grouped.set(version, item);
    }

    return [...grouped.entries()].map(([version, data]) => ({
      version,

      buildNumber: data.buildNumber,

      activeUsers: data.users.size || null,
    }));
  }

  private async search(
    config: Record<string, string>,

    query: string,
  ): Promise<DatadogEvent[]> {
    const base = this.baseUrl(config.site ?? 'datadoghq.com');
    let url = `${base}/api/v2/rum/events/search`;
    const results: DatadogEvent[] = [];

    for (let page = 0; page < 5; page += 1) {
      const response = await this.http.json<DatadogSearchResponse>(
        url,

        {
          method: 'POST',

          headers: {
            'DD-API-KEY': config.apiKey!,

            'DD-APPLICATION-KEY': config.appKey!,
          },

          body: JSON.stringify({
            filter: {
              from: 'now-24h',

              to: 'now',

              query,
            },

            page: {
              limit: 1000,
            },

            sort: '-timestamp',
          }),
        },
      );

      results.push(...(response.data ?? []));

      if (!response.links?.next) {
        break;
      }

      const next = new URL(response.links.next);

      if (next.origin !== new URL(base).origin) {
        throw new Error('Invalid Datadog pagination host.');
      }

      url = next.toString();
    }

    return results;
  }

  private baseUrl(site: string) {
    const allowed = new Set(['datadoghq.com', 'datadoghq.eu', 'us3.datadoghq.com', 'us5.datadoghq.com', 'ap1.datadoghq.com', 'ap2.datadoghq.com', 'uk1.datadoghq.com', 'ddog-gov.com', 'us2.ddog-gov.com']);

    if (!allowed.has(site)) {
      throw new BadRequestException('Unsupported Datadog site.');
    }

    return `https://api.${site}`;
  }

  private attributes(event: DatadogEvent) {
    return event.attributes?.attributes ?? {};
  }

  private numberAt(
    event: DatadogEvent,

    path: string,
  ): number | null {
    const value = this.getPath(this.attributes(event), path);
    const number = Number(value);

    return Number.isFinite(number) ? number : null;
  }

  private firstNumber(
    event: DatadogEvent,

    paths: string[],
  ) {
    for (const path of paths) {
      const value = this.numberAt(event, path);

      if (value !== null) {
        return value;
      }
    }

    return null;
  }

  private firstString(
    event: DatadogEvent,

    paths: string[],
  ) {
    for (const path of paths) {
      const value = this.getPath(this.attributes(event), path);

      if (typeof value === 'string' && value) {
        return value;
      }
    }

    return null;
  }

  private getPath(input: unknown, path: string): unknown {
    return path.split('.').reduce<unknown>((value, key) => {
      if (!value || typeof value !== 'object') {
        return undefined;
      }

      return (value as Record<string, unknown>)[key];
    }, input);
  }

  private average(values: number[]) {
    if (values.length === 0) {
      return null;
    }

    return values.reduce((total, value) => total + value, 0) / values.length;
  }
}
