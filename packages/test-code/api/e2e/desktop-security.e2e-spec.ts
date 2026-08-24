import { createTestApp } from '../helpers/create-test-app';
import { resetDatabase } from '../helpers/database';
import { registerWorkspaceTestUser } from '../helpers/workspace';
import { API, createDesktopApp } from './helpers/desktop-test-fixtures';
import type { INestApplication } from '@nestjs/common';
import { PrismaService } from 'src/database/prisma.service';
import request from 'supertest';

function desktopBase(workspaceId: string, desktopAppId: string) {
  return `${API}/workspaces/${workspaceId}/desktop-apps/${desktopAppId}`;
}

describe('Desktop Phase 17 Security E2E', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeEach(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
  });

  afterEach(async () => {
    await resetDatabase(prisma);
    await app.close();
  });

  it('requires authentication for every desktop read surface', async () => {
    const owner = await registerWorkspaceTestUser(app, prisma);
    const desktop = await createDesktopApp(owner);
    const base = desktopBase(owner.workspaceId, desktop.id);
    const paths = [
      base,
      `${base}/overview`,
      `${base}/builds`,
      `${base}/tests`,
      `${base}/releases`,
      `${base}/performance`,
      `${base}/crashes`,
      `${base}/dependencies`,
      `${base}/security`,
      `${base}/alerts/rules`,
      `${base}/alerts/incidents`,
      `${base}/permissions`,
    ];

    for (const path of paths) {
      const response = await request(app.getHttpServer()).get(path);
      expect(response.status).toBe(401);
    }
  });

  it('does not allow workspace A to read desktop resources in workspace B', async () => {
    const workspaceA = await registerWorkspaceTestUser(app, prisma);
    const workspaceB = await registerWorkspaceTestUser(app, prisma);
    const desktopB = await createDesktopApp(workspaceB);
    const base = desktopBase(workspaceB.workspaceId, desktopB.id);
    const paths = [
      base,
      `${base}/overview`,
      `${base}/builds`,
      `${base}/tests`,
      `${base}/releases`,
      `${base}/performance`,
      `${base}/crashes`,
      `${base}/dependencies`,
      `${base}/security`,
      `${base}/alerts/rules`,
      `${base}/alerts/incidents`,
      `${base}/permissions`,
    ];

    for (const path of paths) {
      const response = await workspaceA.agent.get(path).set('Authorization', `Bearer ${workspaceA.accessToken}`);

      expect([403, 404]).toContain(response.status);
    }
  });

  it('gives viewer read capabilities but no write/manage/AI/secret capability', async () => {
    const owner = await registerWorkspaceTestUser(app, prisma);
    const viewer = await registerWorkspaceTestUser(app, prisma);
    const desktop = await createDesktopApp(owner);

    await prisma.workspaceMember.create({
      data: {
        workspaceId: owner.workspaceId,
        userId: viewer.userId,
        role: 'VIEWER',
      },
    });

    const permissions = await viewer.agent
      .get(`${desktopBase(owner.workspaceId, desktop.id)}/permissions`)
      .set('Authorization', `Bearer ${viewer.accessToken}`)
      .expect(200);

    expect(permissions.body).toEqual({
      role: 'VIEWER',
      canRead: true,
      canWrite: false,
      canManage: false,
      canAnalyze: false,
      canConfigureSecrets: false,
    });

    await viewer.agent
      .post(`${desktopBase(owner.workspaceId, desktop.id)}/alerts/rules`)
      .set('Authorization', `Bearer ${viewer.accessToken}`)
      .send({
        name: 'Viewer should fail',
        type: 'BUILD_FAILED',
      })
      .expect(403);

    await viewer.agent
      .post(`${desktopBase(owner.workspaceId, desktop.id)}/analysis`)
      .set('Authorization', `Bearer ${viewer.accessToken}`)
      .send({ action: 'CUSTOM', question: 'No write access' })
      .expect(403);
  });

  it('does not expose encrypted telemetry secrets in permissions or alert responses', async () => {
    const owner = await registerWorkspaceTestUser(app, prisma);
    const desktop = await createDesktopApp(owner);
    const secret = 'TOP_SECRET_DESKTOP_TELEMETRY_CIPHERTEXT';

    await prisma.desktopTelemetryIntegration.create({
      data: {
        workspaceId: owner.workspaceId,
        desktopAppId: desktop.id,
        provider: 'CUSTOM',
        status: 'CONNECTED',
        externalProjectId: `desktop-test-${desktop.id}`,
        secretCiphertext: secret,
        endpointUrl: 'https://telemetry.example.test',
        configuredAt: new Date(),
      },
    });

    const permissions = await owner.agent
      .get(`${desktopBase(owner.workspaceId, desktop.id)}/permissions`)
      .set('Authorization', `Bearer ${owner.accessToken}`)
      .expect(200);
    const alerts = await owner.agent
      .get(`${desktopBase(owner.workspaceId, desktop.id)}/alerts/incidents`)
      .set('Authorization', `Bearer ${owner.accessToken}`)
      .expect(200);

    expect(JSON.stringify(permissions.body)).not.toContain(secret);
    expect(JSON.stringify(alerts.body)).not.toContain(secret);
  });

  it('rejects a forged GitHub webhook signature', async () => {
    const response = await request(app.getHttpServer())
      .post(`${API}/repositories/github/webhook`)
      .set('content-type', 'application/json')
      .set('x-github-delivery', `desktop-security-${Date.now()}`)
      .set('x-github-event', 'push')
      .set('x-hub-signature-256', 'sha256=definitely-invalid')
      .send(Buffer.from(JSON.stringify({ installation: { id: 1 } })));

    expect(response.status).toBe(401);
  });
});
