import type { INestApplication } from '@nestjs/common';
import { PrismaService } from 'src/database/prisma.service';
import { createTestApp } from '../helpers/create-test-app';
import { resetDatabase } from '../helpers/database';
import {
  addWorkspaceMember,
  registerWorkspaceTestUser,
} from '../helpers/workspace';
import { WorkspaceRole } from 'src/generated/prisma/enums';
import {
  API,
  createDesktopApp,
} from './helpers/desktop-test-fixtures';

function telemetryPath(workspaceId: string, desktopAppId: string) {
  return `${API}/workspaces/${workspaceId}/desktop-apps/${desktopAppId}/telemetry`;
}

describe('Desktop Telemetry E2E', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeEach(async () => {
    process.env.DESKTOP_TELEMETRY_ENCRYPTION_KEY = Buffer.alloc(32, 7).toString(
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

  it('connects provider and never returns the secret', async () => {
    const owner = await registerWorkspaceTestUser(app, prisma);
    const desktopApp = await createDesktopApp(owner);

    const response = await owner.agent
      .post(telemetryPath(owner.workspaceId, desktopApp.id))
      .set('Authorization', `Bearer ${owner.accessToken}`)
      .send({
        provider: 'SENTRY',
        externalProjectId: 'command-center/desktop',
        endpointUrl: 'mock://success/snapshot',
        secret: 'super-secret-provider-token',
      });

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({
      provider: 'SENTRY',
      status: 'CONNECTED',
      externalProjectId: 'command-center/desktop',
      hasSecret: true,
    });

    expect(JSON.stringify(response.body)).not.toContain(
      'super-secret-provider-token',
    );
    expect(response.body.secretCiphertext).toBeUndefined();

    const stored = await prisma.desktopTelemetryIntegration.findUniqueOrThrow({
      where: { id: response.body.id },
    });

    expect(stored.secretCiphertext).not.toBe('super-secret-provider-token');
    expect(stored.secretCiphertext.length).toBeGreaterThan(20);
  });

  it('previews normalized provider output', async () => {
    const owner = await registerWorkspaceTestUser(app, prisma);
    const desktopApp = await createDesktopApp(owner);

    const connected = await owner.agent
      .post(telemetryPath(owner.workspaceId, desktopApp.id))
      .set('Authorization', `Bearer ${owner.accessToken}`)
      .send({
        provider: 'CUSTOM',
        externalProjectId: 'desktop-runtime',
        endpointUrl: 'mock://success/snapshot',
        secret: 'preview-secret',
      })
      .expect(201);

    const response = await owner.agent
      .post(
        `${telemetryPath(owner.workspaceId, desktopApp.id)}/${connected.body.id}/preview`,
      )
      .set('Authorization', `Bearer ${owner.accessToken}`);

    expect(response.status).toBe(201);
    expect(response.body.performance).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: 'STARTUP_MS', value: 1800 }),
      ]),
    );
    expect(response.body.crashes[0]).toMatchObject({
      fingerprint: 'renderer-crash',
      version: '2.4.0',
    });
  });

  it('records provider failure without breaking the desktop app', async () => {
    const owner = await registerWorkspaceTestUser(app, prisma);
    const desktopApp = await createDesktopApp(owner);

    const connected = await owner.agent
      .post(telemetryPath(owner.workspaceId, desktopApp.id))
      .set('Authorization', `Bearer ${owner.accessToken}`)
      .send({
        provider: 'CUSTOM',
        externalProjectId: 'failing-provider',
        endpointUrl: 'mock://failure/snapshot',
        secret: 'failure-secret',
      })
      .expect(201);

    const response = await owner.agent
      .post(
        `${telemetryPath(owner.workspaceId, desktopApp.id)}/${connected.body.id}/preview`,
      )
      .set('Authorization', `Bearer ${owner.accessToken}`);

    expect(response.status).toBe(502);

    const integration =
      await prisma.desktopTelemetryIntegration.findUniqueOrThrow({
        where: { id: connected.body.id },
      });

    expect(integration.status).toBe('ERROR');
    expect(integration.lastError).toContain('Injected telemetry provider failure');

    const desktop = await prisma.desktopApplication.findUnique({
      where: { id: desktopApp.id },
    });
    expect(desktop).not.toBeNull();
  });

  it('disconnects and removes stored secret material', async () => {
    const owner = await registerWorkspaceTestUser(app, prisma);
    const desktopApp = await createDesktopApp(owner);

    const connected = await owner.agent
      .post(telemetryPath(owner.workspaceId, desktopApp.id))
      .set('Authorization', `Bearer ${owner.accessToken}`)
      .send({
        provider: 'SENTRY',
        externalProjectId: 'desktop',
        endpointUrl: 'mock://success/snapshot',
        secret: 'disconnect-secret',
      })
      .expect(201);

    await owner.agent
      .delete(
        `${telemetryPath(owner.workspaceId, desktopApp.id)}/${connected.body.id}`,
      )
      .set('Authorization', `Bearer ${owner.accessToken}`)
      .expect(200);

    const stored = await prisma.desktopTelemetryIntegration.findUniqueOrThrow({
      where: { id: connected.body.id },
    });

    expect(stored.status).toBe('DISCONNECTED');
    expect(stored.secretCiphertext).toBe('');
  });

  it('rejects unsafe localhost endpoint outside test mock protocol', async () => {
    const owner = await registerWorkspaceTestUser(app, prisma);
    const desktopApp = await createDesktopApp(owner);

    const response = await owner.agent
      .post(telemetryPath(owner.workspaceId, desktopApp.id))
      .set('Authorization', `Bearer ${owner.accessToken}`)
      .send({
        provider: 'CUSTOM',
        externalProjectId: 'desktop',
        endpointUrl: 'http://127.0.0.1:4000/snapshot',
        secret: 'unsafe-secret',
      });

    expect(response.status).toBe(400);
  });

  it('viewer can read integrations but cannot configure them', async () => {
    const owner = await registerWorkspaceTestUser(app, prisma);
    const viewer = await registerWorkspaceTestUser(app, prisma);
    const desktopApp = await createDesktopApp(owner);

    await addWorkspaceMember(owner, viewer, WorkspaceRole.VIEWER);

    await viewer.agent
      .get(telemetryPath(owner.workspaceId, desktopApp.id))
      .set('Authorization', `Bearer ${viewer.accessToken}`)
      .expect(200);

    const response = await viewer.agent
      .post(telemetryPath(owner.workspaceId, desktopApp.id))
      .set('Authorization', `Bearer ${viewer.accessToken}`)
      .send({
        provider: 'CUSTOM',
        externalProjectId: 'desktop',
        endpointUrl: 'mock://success/snapshot',
        secret: 'viewer-secret',
      });

    expect(response.status).toBe(403);
  });

  it('rejects cross-workspace telemetry access', async () => {
    const workspaceA = await registerWorkspaceTestUser(app, prisma);
    const workspaceB = await registerWorkspaceTestUser(app, prisma);
    const desktopApp = await createDesktopApp(workspaceA);

    const response = await workspaceB.agent
      .get(telemetryPath(workspaceA.workspaceId, desktopApp.id))
      .set('Authorization', `Bearer ${workspaceB.accessToken}`);

    expect(response.status).toBe(403);
  });
});