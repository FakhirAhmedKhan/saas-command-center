import type { INestApplication } from '@nestjs/common';
import { PrismaService } from 'src/database/prisma.service';
import { createTestApp } from '../helpers/create-test-app';
import { resetDatabase } from '../helpers/database';
import { registerWorkspaceTestUser } from '../helpers/workspace';
import {
  API,
  createDesktopApp,
} from './helpers/desktop-test-fixtures';

function base(workspaceId: string, desktopAppId: string) {
  return `${API}/workspaces/${workspaceId}/desktop-apps/${desktopAppId}`;
}

describe('Desktop Performance and Crashes E2E', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeEach(async () => {
    process.env.DESKTOP_TELEMETRY_ENCRYPTION_KEY = Buffer.alloc(32, 9).toString(
      'base64',
    );
    app = await createTestApp();
    prisma = app.get(PrismaService);
  });

  afterEach(async () => {
    await resetDatabase(prisma);
    await app.close();
    delete process.env.DESKTOP_TELEMETRY_ENCRYPTION_KEY;
  });

  async function fixture() {
    const owner = await registerWorkspaceTestUser(app, prisma);
    const desktopApp = await createDesktopApp(owner);

    const integration = await owner.agent
      .post(`${base(owner.workspaceId, desktopApp.id)}/telemetry`)
      .set('Authorization', `Bearer ${owner.accessToken}`)
      .send({
        provider: 'CUSTOM',
        externalProjectId: 'runtime-test',
        endpointUrl: 'mock://success/snapshot',
        secret: 'runtime-provider-secret',
      })
      .expect(201);

    return { owner, desktopApp, integrationId: integration.body.id as string };
  }

  it('syncs provider metrics and crash groups', async () => {
    const value = await fixture();

    const response = await value.owner.agent
      .post(
        `${base(value.owner.workspaceId, value.desktopApp.id)}/telemetry/${value.integrationId}/sync`,
      )
      .set('Authorization', `Bearer ${value.owner.accessToken}`);

    expect(response.status).toBe(201);
    expect(response.body.performanceInserted).toBe(4);
    expect(response.body.crashesUpserted).toBe(1);

    expect(
      await prisma.desktopMetric.count({
        where: { desktopAppId: value.desktopApp.id },
      }),
    ).toBe(4);

    expect(
      await prisma.desktopCrash.count({
        where: { desktopAppId: value.desktopApp.id },
      }),
    ).toBe(1);
  });

  it('is idempotent when the same provider snapshot is synced twice', async () => {
    const value = await fixture();
    const path = `${base(value.owner.workspaceId, value.desktopApp.id)}/telemetry/${value.integrationId}/sync`;

    await value.owner.agent
      .post(path)
      .set('Authorization', `Bearer ${value.owner.accessToken}`)
      .expect(201);

    const second = await value.owner.agent
      .post(path)
      .set('Authorization', `Bearer ${value.owner.accessToken}`)
      .expect(201);

    expect(second.body.performanceInserted).toBe(0);
    expect(second.body.performanceUpdated).toBe(4);

    expect(
      await prisma.desktopMetric.count({
        where: { telemetryIntegrationId: value.integrationId },
      }),
    ).toBe(4);
    expect(
      await prisma.desktopCrash.count({
        where: { telemetryIntegrationId: value.integrationId },
      }),
    ).toBe(1);
  });

  it('returns normalized performance summary', async () => {
    const value = await fixture();

    await value.owner.agent
      .post(
        `${base(value.owner.workspaceId, value.desktopApp.id)}/telemetry/${value.integrationId}/sync`,
      )
      .set('Authorization', `Bearer ${value.owner.accessToken}`)
      .expect(201);

    const response = await value.owner.agent
      .get(`${base(value.owner.workspaceId, value.desktopApp.id)}/performance`)
      .set('Authorization', `Bearer ${value.owner.accessToken}`)
      .expect(200);

    expect(response.body.summary).toMatchObject({
      crashFreeUsersPercent: 99.7,
      startupMs: 1800,
      memoryMb: 242,
      cpuPercent: 4.8,
      sampleCount: 4,
    });
  });

  it('filters performance and crashes by version/platform', async () => {
    const value = await fixture();

    await value.owner.agent
      .post(
        `${base(value.owner.workspaceId, value.desktopApp.id)}/telemetry/${value.integrationId}/sync`,
      )
      .set('Authorization', `Bearer ${value.owner.accessToken}`)
      .expect(201);

    const performance = await value.owner.agent
      .get(
        `${base(value.owner.workspaceId, value.desktopApp.id)}/performance?version=2.4.0&platform=WINDOWS&architecture=X64`,
      )
      .set('Authorization', `Bearer ${value.owner.accessToken}`)
      .expect(200);

    expect(performance.body.summary.sampleCount).toBe(4);

    const empty = await value.owner.agent
      .get(
        `${base(value.owner.workspaceId, value.desktopApp.id)}/performance?version=9.9.9`,
      )
      .set('Authorization', `Bearer ${value.owner.accessToken}`)
      .expect(200);

    expect(empty.body.summary.sampleCount).toBe(0);

    const crashes = await value.owner.agent
      .get(
        `${base(value.owner.workspaceId, value.desktopApp.id)}/crashes?version=2.4.0&platform=WINDOWS`,
      )
      .set('Authorization', `Bearer ${value.owner.accessToken}`)
      .expect(200);

    expect(crashes.body).toHaveLength(1);
    expect(crashes.body[0]).toMatchObject({
      fingerprint: 'renderer-crash',
      count: 12,
      affectedUsers: 8,
    });
  });

  it('keeps runtime data isolated between workspaces', async () => {
    const value = await fixture();
    const attacker = await registerWorkspaceTestUser(app, prisma);

    await value.owner.agent
      .post(
        `${base(value.owner.workspaceId, value.desktopApp.id)}/telemetry/${value.integrationId}/sync`,
      )
      .set('Authorization', `Bearer ${value.owner.accessToken}`)
      .expect(201);

    const response = await attacker.agent
      .get(`${base(value.owner.workspaceId, value.desktopApp.id)}/performance`)
      .set('Authorization', `Bearer ${attacker.accessToken}`);

    expect(response.status).toBe(403);
  });
});