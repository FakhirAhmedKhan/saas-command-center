import type { INestApplication } from '@nestjs/common';

import { PrismaService } from 'src/database/prisma.service';
import { MobileTelemetryProvider } from 'src/generated/prisma/enums';

import type { MobileTelemetryProviderAdapter, MobileTelemetryProviderContext } from 'src/modules/mobile-apps/telemetry/mobile-telemetry-provider.interface';

import { MobileTelemetryProviderRegistry } from 'src/modules/mobile-apps/telemetry/mobile-telemetry-provider.registry';

import { withBearer } from '../helpers/auth';
import { createTestApp } from '../helpers/create-test-app';
import { resetDatabase } from '../helpers/database';
import { registerWorkspaceTestUser } from '../helpers/workspace';

const API = '/api/v1';

process.env.MOBILE_TELEMETRY_ENCRYPTION_KEY = Buffer.alloc(32, 7).toString('base64');

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

describe('Mobile Telemetry E2E', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let fake: FakeTelemetryProvider;

  let sequence = 0;

  beforeEach(async () => {
    process.env.MOBILE_TELEMETRY_ENCRYPTION_KEY = Buffer.alloc(32, 7).toString('base64');

    app = await createTestApp();

    prisma = app.get(PrismaService);

    await resetDatabase(prisma);

    fake = new FakeTelemetryProvider();

    const registry = app.get(MobileTelemetryProviderRegistry);

    registry.registerForTesting(MobileTelemetryProvider.SENTRY, fake);
  });

  afterEach(async () => {
    await app.close();
  });

  async function fixture() {
    sequence += 1;

    const owner = await registerWorkspaceTestUser(app, prisma);

    const response = await owner.agent
      .post(`${API}/workspaces/${owner.workspaceId}/mobile-apps`)
      .set(withBearer(owner.accessToken))
      .send({
        name: `Telemetry App ${sequence}`,

        platform: 'ANDROID',

        framework: 'ANDROID_NATIVE',

        packageId: `com.commandcenter.telemetry${sequence}`,
      })
      .expect(201);

    return {
      owner,
      mobile: response.body,
    };
  }

  async function connect(data: Awaited<ReturnType<typeof fixture>>) {
    return data.owner.agent
      .post(`${API}/workspaces/${data.owner.workspaceId}/mobile-apps/${data.mobile.id}/telemetry/connect`)
      .set(withBearer(data.owner.accessToken))
      .send({
        provider: 'SENTRY',

        externalProjectId: 'command-center-mobile',

        config: {
          authToken: 'phase11-super-secret-token',
        },
      });
  }

  it('returns null when no telemetry integration exists', async () => {
    const data = await fixture();

    const response = await data.owner.agent.get(`${API}/workspaces/${data.owner.workspaceId}/mobile-apps/${data.mobile.id}/telemetry`).set(withBearer(data.owner.accessToken)).expect(200);

    expect(response.body).toBeNull();
  });

  it('connects provider and never returns credentials', async () => {
    const data = await fixture();

    const response = await connect(data);

    expect(response.status).toBe(201);

    expect(response.body).toMatchObject({
      workspaceId: data.owner.workspaceId,

      mobileAppId: data.mobile.id,

      provider: 'SENTRY',

      status: 'CONNECTED',

      externalProjectId: 'command-center-mobile',
    });

    const serialized = JSON.stringify(response.body);

    expect(serialized).not.toContain('phase11-super-secret-token');

    expect(serialized).not.toContain('encryptedConfig');

    const stored = await prisma.mobileTelemetryIntegration.findFirstOrThrow({
      where: {
        mobileAppId: data.mobile.id,
      },
    });

    expect(stored.encryptedConfig).toBeTruthy();

    expect(stored.encryptedConfig).not.toContain('phase11-super-secret-token');
  });

  it('syncs telemetry through registered provider', async () => {
    const data = await fixture();

    await connect(data).expect(201);

    const response = await data.owner.agent.post(`${API}/workspaces/${data.owner.workspaceId}/mobile-apps/${data.mobile.id}/telemetry/sync`).set(withBearer(data.owner.accessToken)).expect(201);

    expect(response.body.provider).toBe('SENTRY');

    expect(response.body.crashes).toMatchObject({
      crashCount: 17,
      affectedUsers: 12,
      crashFreeUsersRate: 99.92,
    });

    expect(response.body.performance).toMatchObject({
      coldStartupMs: 1400,

      warmStartupMs: 620,

      memoryMb: 184,

      networkLatencyMs: 230,
    });

    expect(response.body.versions).toEqual([
      expect.objectContaining({
        version: '6.14.0',

        buildNumber: '815',

        activeUsers: 12500,
      }),
    ]);

    expect(response.body.collectedAt).toEqual(expect.any(String));

    expect(fake.attempts).toBe(1);

    const stored = await prisma.mobileTelemetryIntegration.findFirstOrThrow({
      where: {
        mobileAppId: data.mobile.id,
      },
    });

    expect(stored.status).toBe('CONNECTED');

    expect(stored.lastSyncedAt).not.toBeNull();
  });

  it('retries transient provider failures', async () => {
    const data = await fixture();

    await connect(data).expect(201);

    fake.failCount = 2;

    const response = await data.owner.agent.post(`${API}/workspaces/${data.owner.workspaceId}/mobile-apps/${data.mobile.id}/telemetry/sync`).set(withBearer(data.owner.accessToken)).expect(201);

    expect(response.body.crashes.crashCount).toBe(17);

    expect(fake.attempts).toBe(3);
  });

  it('marks integration ERROR when provider repeatedly fails', async () => {
    const data = await fixture();

    await connect(data).expect(201);

    fake.failCount = 3;

    await data.owner.agent.post(`${API}/workspaces/${data.owner.workspaceId}/mobile-apps/${data.mobile.id}/telemetry/sync`).set(withBearer(data.owner.accessToken)).expect(502);

    expect(fake.attempts).toBe(3);

    const stored = await prisma.mobileTelemetryIntegration.findFirstOrThrow({
      where: {
        mobileAppId: data.mobile.id,
      },
    });

    expect(stored.status).toBe('ERROR');
  });

  it('disconnect removes stored credentials and prevents sync', async () => {
    const data = await fixture();

    await connect(data).expect(201);

    const response = await data.owner.agent.delete(`${API}/workspaces/${data.owner.workspaceId}/mobile-apps/${data.mobile.id}/telemetry`).set(withBearer(data.owner.accessToken)).expect(200);

    expect(response.body.status).toBe('DISCONNECTED');

    const stored = await prisma.mobileTelemetryIntegration.findFirstOrThrow({
      where: {
        mobileAppId: data.mobile.id,
      },
    });

    expect(stored.encryptedConfig).toBeNull();

    expect(stored.lastSyncedAt).toBeNull();

    await data.owner.agent.post(`${API}/workspaces/${data.owner.workspaceId}/mobile-apps/${data.mobile.id}/telemetry/sync`).set(withBearer(data.owner.accessToken)).expect(400);
  });

  it('prevents archived app from connecting telemetry', async () => {
    const data = await fixture();

    await prisma.saasApplication.update({
      where: {
        id: data.mobile.applicationId,
      },

      data: {
        archivedAt: new Date(),
      },
    });

    await connect(data).expect(400);

    expect(await prisma.mobileTelemetryIntegration.count()).toBe(0);
  });

  it('cannot resolve another workspace mobile app through current workspace', async () => {
    const first = await fixture();

    const second = await fixture();

    await first.owner.agent.get(`${API}/workspaces/${first.owner.workspaceId}/mobile-apps/${second.mobile.id}/telemetry`).set(withBearer(first.owner.accessToken)).expect(404);
  });
});
