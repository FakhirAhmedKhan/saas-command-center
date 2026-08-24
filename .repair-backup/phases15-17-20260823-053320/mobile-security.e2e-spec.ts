import type { INestApplication } from '@nestjs/common';

import request from 'supertest';

import { PrismaService } from 'src/database/prisma.service';

import { RepositoryProvider, WorkspaceRole } from 'src/generated/prisma/enums';

import { withBearer } from '../helpers/auth';

import { createTestApp } from '../helpers/create-test-app';

import { resetDatabase } from '../helpers/database';

import { addWorkspaceMember, registerWorkspaceTestUser } from '../helpers/workspace';

const API = '/api/v1';

describe('Mobile Security E2E', () => {
  let app: INestApplication;

  let prisma: PrismaService;

  beforeEach(async () => {
    process.env.MOBILE_TELEMETRY_ENCRYPTION_KEY = Buffer.alloc(32, 9).toString('base64');

    process.env.CUSTOM_TELEMETRY_ALLOWED_HOSTS = 'telemetry.example.com';

    app = await createTestApp();

    prisma = app.get(PrismaService);

    await resetDatabase(prisma);
  });

  afterEach(async () => {
    await app.close();
  });

  async function createMobile(
    actor: Awaited<ReturnType<typeof registerWorkspaceTestUser>>,

    name: string,
  ) {
    const response = await actor.agent.post(`${API}/workspaces/${actor.workspaceId}/mobile-apps`).set(withBearer(actor.accessToken)).send({
      name,

      platform: 'ANDROID',

      framework: 'ANDROID_NATIVE',
    });

    expect(response.status).toBe(201);

    return response.body;
  }

  async function createRepository(
    workspaceId: string,

    applicationId: string,
  ) {
    const installation = await prisma.repositoryInstallation.create({
      data: {
        workspaceId,

        provider: RepositoryProvider.GITHUB,

        externalInstallationId: `sec-install-${Math.random()}`,

        accountLogin: 'security',

        accountType: 'Organization',
      },
    });

    return prisma.repositoryConnection.create({
      data: {
        workspaceId,

        installationId: installation.id,

        applicationId,

        provider: RepositoryProvider.GITHUB,

        externalRepoId: `sec-repo-${Math.random()}`,

        owner: 'security',

        name: 'mobile',

        fullName: 'security/mobile',

        defaultBranch: 'main',

        isPrivate: true,

        htmlUrl: 'https://github.com/security/mobile',

        archived: false,

        isAvailable: true,
      },
    });
  }

  it('returns role-aware permissions', async () => {
    const owner = await registerWorkspaceTestUser(app, prisma);

    const response = await owner.agent.get(`${API}/workspaces/${owner.workspaceId}/mobile-security/permissions`).set(withBearer(owner.accessToken)).expect(200);

    expect(response.body).toMatchObject({
      role: 'OWNER',

      canRead: true,

      canWrite: true,

      canAdmin: true,

      canManageSecrets: true,
    });
  });

  it('viewer gets read-only permissions', async () => {
    const owner = await registerWorkspaceTestUser(app, prisma);

    const viewer = await registerWorkspaceTestUser(app, prisma);

    await addWorkspaceMember(owner, viewer, WorkspaceRole.VIEWER);

    const response = await viewer.agent.get(`${API}/workspaces/${owner.workspaceId}/mobile-security/permissions`).set(withBearer(viewer.accessToken)).expect(200);

    expect(response.body).toMatchObject({
      role: 'VIEWER',

      canRead: true,

      canWrite: false,

      canAdmin: false,

      canManageSecrets: false,
    });
  });

  it('workspace A cannot read workspace B mobile app', async () => {
    const a = await registerWorkspaceTestUser(app, prisma);

    const b = await registerWorkspaceTestUser(app, prisma);

    const mobileB = await createMobile(b, 'Workspace B Mobile');

    const response = await a.agent.get(`${API}/workspaces/${b.workspaceId}/mobile-apps/${mobileB.id}`).set(withBearer(a.accessToken));

    expect([403, 404]).toContain(response.status);
  });

  it('workspace A repository cannot link to workspace B app', async () => {
    const a = await registerWorkspaceTestUser(app, prisma);

    const b = await registerWorkspaceTestUser(app, prisma);

    const mobileA = await createMobile(a, 'A');

    const mobileB = await createMobile(b, 'B');

    const repositoryB = await createRepository(b.workspaceId, mobileB.applicationId);

    const response = await a.agent.post(`${API}/workspaces/${a.workspaceId}/mobile-apps/${mobileA.id}/repository`).set(withBearer(a.accessToken)).send({
      repositoryId: repositoryB.id,
    });

    expect([404, 409]).toContain(response.status);
  });

  it('build from workspace A cannot create workspace B release', async () => {
    const a = await registerWorkspaceTestUser(app, prisma);

    const b = await registerWorkspaceTestUser(app, prisma);

    const mobileA = await createMobile(a, 'A Build');

    const mobileB = await createMobile(b, 'B Release');

    const repositoryA = await createRepository(a.workspaceId, mobileA.applicationId);

    const buildA = await prisma.mobileBuild.create({
      data: {
        workspaceId: a.workspaceId,

        mobileAppId: mobileA.id,

        repositoryId: repositoryA.id,

        workflowRunId: 'security-build',

        source: 'GITHUB_ACTIONS',

        commitSha: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',

        branch: 'main',

        version: '1.0.0',

        buildNumber: '1',

        platform: 'ANDROID',

        status: 'SUCCESS',
      },
    });

    const response = await b.agent.post(`${API}/workspaces/${b.workspaceId}/mobile-apps/${mobileB.id}/releases`).set(withBearer(b.accessToken)).send({
      buildId: buildA.id,

      environment: 'PRODUCTION',
    });

    expect(response.status).toBe(404);
  });

  it('workspace A cannot query workspace B performance', async () => {
    const a = await registerWorkspaceTestUser(app, prisma);

    const b = await registerWorkspaceTestUser(app, prisma);

    const mobileB = await createMobile(b, 'B Performance');

    const response = await a.agent.get(`${API}/workspaces/${b.workspaceId}/mobile-apps/${mobileB.id}/performance/summary`).set(withBearer(a.accessToken));

    expect([403, 404]).toContain(response.status);
  });

  it('viewer cannot modify mobile app', async () => {
    const owner = await registerWorkspaceTestUser(app, prisma);

    const viewer = await registerWorkspaceTestUser(app, prisma);

    await addWorkspaceMember(owner, viewer, WorkspaceRole.VIEWER);

    const mobile = await createMobile(owner, 'Viewer Test');

    await viewer.agent
      .patch(`${API}/workspaces/${owner.workspaceId}/mobile-apps/${mobile.id}`)
      .set(withBearer(viewer.accessToken))
      .send({
        name: 'Forbidden',
      })
      .expect(403);
  });

  it('viewer cannot create alert rule', async () => {
    const owner = await registerWorkspaceTestUser(app, prisma);

    const viewer = await registerWorkspaceTestUser(app, prisma);

    await addWorkspaceMember(owner, viewer, WorkspaceRole.VIEWER);

    const mobile = await createMobile(owner, 'Alert Security');

    await viewer.agent
      .post(`${API}/workspaces/${owner.workspaceId}/mobile-apps/${mobile.id}/alerts/rules`)
      .set(withBearer(viewer.accessToken))
      .send({
        name: 'Crash Rule',

        type: 'CRASH_RATE',

        threshold: 2,
      })
      .expect(403);
  });

  it('unauthenticated request returns 401', async () => {
    const owner = await registerWorkspaceTestUser(app, prisma);

    const mobile = await createMobile(owner, 'Anonymous Test');

    await request(app.getHttpServer()).get(`${API}/workspaces/${owner.workspaceId}/mobile-apps/${mobile.id}/performance/summary`).expect(401);
  });

  it('telemetry secret is encrypted and never returned', async () => {
    const owner = await registerWorkspaceTestUser(app, prisma);

    const mobile = await createMobile(owner, 'Secret Test');

    const response = await owner.agent
      .post(`${API}/workspaces/${owner.workspaceId}/mobile-apps/${mobile.id}/telemetry/connect`)
      .set(withBearer(owner.accessToken))
      .send({
        provider: 'SENTRY',

        externalProjectId: 'mobile-project',

        config: {
          authToken: 'DO_NOT_LEAK',

          organizationSlug: 'command-center',

          projectSlug: 'mobile',
        },
      });

    expect(response.status).toBe(201);

    const json = JSON.stringify(response.body);

    expect(json).not.toContain('DO_NOT_LEAK');

    expect(json).not.toContain('encryptedConfig');

    const stored = await prisma.mobileTelemetryIntegration.findUniqueOrThrow({
      where: {
        mobileAppId: mobile.id,
      },
    });

    expect(stored.encryptedConfig).not.toContain('DO_NOT_LEAK');
  });

  it('rejects custom provider SSRF host', async () => {
    const owner = await registerWorkspaceTestUser(app, prisma);

    const mobile = await createMobile(owner, 'SSRF');

    await owner.agent
      .post(`${API}/workspaces/${owner.workspaceId}/mobile-apps/${mobile.id}/telemetry/connect`)
      .set(withBearer(owner.accessToken))
      .send({
        provider: 'CUSTOM',

        externalProjectId: 'custom-project',

        config: {
          baseUrl: 'https://127.0.0.1:4000',

          token: 'secret',
        },
      })
      .expect(400);
  });

  it('rejects oversized provider config', async () => {
    const owner = await registerWorkspaceTestUser(app, prisma);

    const mobile = await createMobile(owner, 'Large Config');

    await owner.agent
      .post(`${API}/workspaces/${owner.workspaceId}/mobile-apps/${mobile.id}/telemetry/connect`)
      .set(withBearer(owner.accessToken))
      .send({
        provider: 'SENTRY',

        externalProjectId: 'mobile',

        config: {
          authToken: 'x'.repeat(20000),

          organizationSlug: 'org',

          projectSlug: 'mobile',
        },
      })
      .expect(400);
  });

  it('duplicate build delivery remains idempotent', async () => {
    const owner = await registerWorkspaceTestUser(app, prisma);

    const mobile = await createMobile(owner, 'Replay');

    const repository = await createRepository(owner.workspaceId, mobile.applicationId);

    const payload = {
      repositoryId: repository.id,

      workflowRunId: 'same-workflow',

      commitSha: 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',

      branch: 'main',

      platform: 'ANDROID',

      status: 'SUCCESS',
    };

    const url = `${API}/workspaces/${owner.workspaceId}` + `/mobile-apps/${mobile.id}` + '/builds/ingest/github';

    await owner.agent.post(url).set(withBearer(owner.accessToken)).send(payload).expect(201);

    await owner.agent.post(url).set(withBearer(owner.accessToken)).send(payload).expect(201);

    expect(
      await prisma.mobileBuild.count({
        where: {
          repositoryId: repository.id,

          workflowRunId: 'same-workflow',
        },
      }),
    ).toBe(1);
  });

  it('forged GitHub webhook signature is rejected', async () => {
    const response = await request(app.getHttpServer())
      .post(`${API}/repositories/github/webhook`)
      .set('x-github-delivery', 'forged-mobile-security')
      .set('x-github-event', 'workflow_run')
      .set('x-hub-signature-256', 'sha256=invalid')
      .set('content-type', 'application/json')
      .send({
        action: 'completed',
      });

    expect([400, 401, 403]).toContain(response.status);
  });
});
