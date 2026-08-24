import type { MobileTelemetryProviderAdapter, MobileTelemetryProviderContext } from '../mobile-telemetry-provider.interface';
import { ProviderHttpService } from '../provider-http.service';
import { BadRequestException, Injectable } from '@nestjs/common';
import { GoogleAuth } from 'google-auth-library';
import { MobileTelemetryProvider } from 'src/generated/prisma/enums';

interface CloudLogEntry {
  jsonPayload?: Record<string, unknown>;
}

interface ListLogEntriesResponse {
  entries?: CloudLogEntry[];

  nextPageToken?: string;
}

@Injectable()
export class FirebaseMobileTelemetryProvider implements MobileTelemetryProviderAdapter {
  readonly provider = MobileTelemetryProvider.FIREBASE;

  constructor(private readonly http: ProviderHttpService) {}

  validateConfig(config: Record<string, string>) {
    if (!config.appId) {
      throw new BadRequestException('Firebase appId is required.');
    }

    if (config.serviceAccountJson) {
      try {
        JSON.parse(config.serviceAccountJson);
      } catch {
        throw new BadRequestException('Firebase serviceAccountJson is invalid JSON.');
      }
    }
  }

  async getCrashes(context: MobileTelemetryProviderContext) {
    const [crashes, sessions] = await Promise.all([
      this.entries(
        context,

        `
logName="projects/${context.externalProjectId}/logs/firebasecrashlytics.googleapis.com%2Fevents"
jsonPayload.name:"/apps/${context.config.appId}/"
jsonPayload.issue.errorType="FATAL"
          `.trim(),
      ),

      this.entries(
        context,

        `
logName="projects/${context.externalProjectId}/logs/firebasecrashlytics.googleapis.com%2Fsession_events"
jsonPayload.name:"/apps/${context.config.appId}/"
          `.trim(),
      ),
    ]);
    const crashSessions = new Set<string>();

    for (const entry of crashes) {
      const id = this.stringAt(entry.jsonPayload, 'sessionId');

      if (id) {
        crashSessions.add(id);
      }
    }

    const allSessions = new Set<string>();

    for (const entry of sessions) {
      const id = this.stringAt(entry.jsonPayload, 'sessionId');

      if (id) {
        allSessions.add(id);
      }
    }

    return {
      crashCount: crashes.length,

      affectedUsers: crashSessions.size || null,

      crashFreeUsersRate: allSessions.size > 0 ? Math.max(0, (1 - crashSessions.size / allSessions.size) * 100) : null,
    };
  }

  async getPerformance(_context: MobileTelemetryProviderContext) {
    void _context;
    await Promise.resolve();
    /*
     * Firebase Performance Monitoring's public
     * documentation does not expose a general
     * read API equivalent to Datadog RUM or
     * New Relic NRQL.
     *
     * Never fabricate values.
     */
    return {
      coldStartupMs: null,

      warmStartupMs: null,

      memoryMb: null,

      networkLatencyMs: null,
    };
  }

  async getVersions(context: MobileTelemetryProviderContext) {
    const entries = await this.entries(
      context,

      `
logName="projects/${context.externalProjectId}/logs/firebasecrashlytics.googleapis.com%2Fevents"
jsonPayload.name:"/apps/${context.config.appId}/"
        `.trim(),
    );
    const versions = new Map<
      string,
      {
        build: string | null;

        sessions: Set<string>;
      }
    >();

    for (const entry of entries) {
      const payload = entry.jsonPayload;
      const version = this.stringAt(payload, 'version.displayVersion');

      if (!version) {
        continue;
      }

      const current = versions.get(version) ?? {
        build: this.stringAt(payload, 'version.buildVersion'),

        sessions: new Set<string>(),
      };
      const session = this.stringAt(payload, 'sessionId');

      if (session) {
        current.sessions.add(session);
      }

      versions.set(version, current);
    }

    return [...versions.entries()].map(([version, data]) => ({
      version,

      buildNumber: data.build,

      activeUsers: null,
    }));
  }

  private async entries(
    context: MobileTelemetryProviderContext,

    baseFilter: string,
  ) {
    const token = await this.token(context.config);
    const after = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const filter = `${baseFilter}\ntimestamp>="${after}"`;
    const result: CloudLogEntry[] = [];
    let pageToken: string | undefined;

    for (let page = 0; page < 5; page += 1) {
      const response = await this.http.json<ListLogEntriesResponse>(
        'https://logging.googleapis.com/v2/entries:list',

        {
          method: 'POST',

          headers: {
            authorization: `Bearer ${token}`,
          },

          body: JSON.stringify({
            resourceNames: [`projects/${context.externalProjectId}`],

            filter,

            orderBy: 'timestamp desc',

            pageSize: 1000,

            ...(pageToken
              ? {
                  pageToken,
                }
              : {}),
          }),
        },
      );

      result.push(...(response.entries ?? []));

      pageToken = response.nextPageToken;

      if (!pageToken) {
        break;
      }
    }

    return result;
  }

  private async token(config: Record<string, string>) {
    let credentials: Record<string, unknown> | undefined;

    if (config.serviceAccountJson) {
      credentials = JSON.parse(config.serviceAccountJson) as Record<string, unknown>;
    }

    const auth = new GoogleAuth({
      ...(credentials
        ? {
            credentials,
          }
        : {}),

      scopes: ['https://www.googleapis.com/auth/logging.read'],
    });
    const client = await auth.getClient();
    const token = await client.getAccessToken();

    if (!token.token) {
      throw new Error('Unable to obtain Google access token.');
    }

    return token.token;
  }

  private stringAt(
    input: Record<string, unknown> | undefined,

    path: string,
  ): string | null {
    let value: unknown = input;

    for (const key of path.split('.')) {
      if (!value || typeof value !== 'object') {
        return null;
      }

      value = (value as Record<string, unknown>)[key];
    }

    return typeof value === 'string' ? value : value === undefined || value === null ? null : typeof value === 'string' ? value : (JSON.stringify(value) ?? '[unserializable]');
  }
}
