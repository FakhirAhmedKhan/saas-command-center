import { withBearer } from '../helpers/auth';
import { createTestApp } from '../helpers/create-test-app';
import { resetDatabase } from '../helpers/database';
import { addWorkspaceMember, expectAccessDenied, registerWorkspaceTestUser } from '../helpers/workspace';
import type { INestApplication } from '@nestjs/common';
import { PrismaService } from 'src/database/prisma.service';
import { WorkspaceRole } from 'src/generated/prisma/enums';
import request from 'supertest';

const API = '/api/v1';

function desktopAppsUrl(workspaceId: string): string {
  return `${API}/workspaces/${workspaceId}/desktop-apps`;
}

function desktopAppUrl(workspaceId: string, desktopAppId: string): string {
  return `${API}/workspaces/${workspaceId}` + `/desktop-apps/${desktopAppId}`;
}

const createPayload = {
  name: 'Command Center Desktop',

  platform: 'CROSS_PLATFORM',

  framework: 'ELECTRON',

  architecture: 'X64',

  packageName: 'com.commandcenter.desktop',

  currentVersion: '2.4.0',

  currentBuildNumber: '184',

  minimumOsVersion: 'Windows 10',

  updateChannel: 'stable',
};

describe('Desktop Applications E2E', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeEach(async () => {
    app = await createTestApp();

    prisma = app.get(PrismaService);

    await resetDatabase(prisma);
  });

  afterEach(async () => {
    await app.close();
  });

  it('allows an owner to create a desktop application', async () => {
    const owner = await registerWorkspaceTestUser(app, prisma);
    const response = await owner.agent.post(desktopAppsUrl(owner.workspaceId)).set(withBearer(owner.accessToken)).send(createPayload);

    expect(response.status).toBe(201);

    expect(response.body).toMatchObject({
      platform: 'CROSS_PLATFORM',

      framework: 'ELECTRON',

      architecture: 'X64',

      packageName: 'com.commandcenter.desktop',

      currentVersion: '2.4.0',

      currentBuildNumber: '184',

      minimumOsVersion: 'Windows 10',

      updateChannel: 'stable',

      application: {
        workspaceId: owner.workspaceId,

        name: 'Command Center Desktop',

        type: 'DESKTOP',

        archivedAt: null,
      },
    });

    expect(response.body.id).toEqual(expect.any(String));

    expect(response.body.applicationId).toEqual(expect.any(String));
  });

  it('persists parent SaasApplication as DESKTOP', async () => {
    const owner = await registerWorkspaceTestUser(app, prisma);
    const response = await owner.agent.post(desktopAppsUrl(owner.workspaceId)).set(withBearer(owner.accessToken)).send(createPayload).expect(201);
    const stored = await prisma.saasApplication.findUniqueOrThrow({
      where: {
        id: response.body.applicationId,
      },
    });

    expect(stored.type).toBe('DESKTOP');

    expect(stored.workspaceId).toBe(owner.workspaceId);

    expect(stored.archivedAt).toBeNull();
  });

  it('allows an admin to create a desktop application', async () => {
    const owner = await registerWorkspaceTestUser(app, prisma);
    const admin = await registerWorkspaceTestUser(app, prisma);
    const membership = await addWorkspaceMember(owner, admin, WorkspaceRole.ADMIN);

    expect([200, 201]).toContain(membership.status);

    const response = await admin.agent
      .post(desktopAppsUrl(owner.workspaceId))
      .set(withBearer(admin.accessToken))
      .send({
        ...createPayload,

        name: 'Admin Desktop App',

        packageName: 'com.commandcenter.admin',
      });

    expect(response.status).toBe(201);

    expect(response.body.application.name).toBe('Admin Desktop App');

    expect(response.body.application.workspaceId).toBe(owner.workspaceId);
  });

  it('rejects unauthenticated desktop application creation', async () => {
    const owner = await registerWorkspaceTestUser(app, prisma);

    await request(app.getHttpServer()).post(desktopAppsUrl(owner.workspaceId)).send(createPayload).expect(401);
  });

  it('rejects invalid desktop platform', async () => {
    const owner = await registerWorkspaceTestUser(app, prisma);

    await owner.agent
      .post(desktopAppsUrl(owner.workspaceId))
      .set(withBearer(owner.accessToken))
      .send({
        ...createPayload,

        platform: 'ANDROID',
      })
      .expect(400);
  });

  it('rejects invalid desktop framework', async () => {
    const owner = await registerWorkspaceTestUser(app, prisma);

    await owner.agent
      .post(desktopAppsUrl(owner.workspaceId))
      .set(withBearer(owner.accessToken))
      .send({
        ...createPayload,

        framework: 'FLUTTER',
      })
      .expect(400);
  });

  it('rejects invalid desktop architecture', async () => {
    const owner = await registerWorkspaceTestUser(app, prisma);

    await owner.agent
      .post(desktopAppsUrl(owner.workspaceId))
      .set(withBearer(owner.accessToken))
      .send({
        ...createPayload,

        architecture: 'POWERPC',
      })
      .expect(400);
  });

  it('rejects missing required fields', async () => {
    const owner = await registerWorkspaceTestUser(app, prisma);

    await owner.agent
      .post(desktopAppsUrl(owner.workspaceId))
      .set(withBearer(owner.accessToken))
      .send({
        name: 'Incomplete Desktop',
      })
      .expect(400);
  });

  it('lists only active desktop applications from the current workspace', async () => {
    const workspaceA = await registerWorkspaceTestUser(app, prisma);
    const workspaceB = await registerWorkspaceTestUser(app, prisma);
    const active = await workspaceA.agent
      .post(desktopAppsUrl(workspaceA.workspaceId))
      .set(withBearer(workspaceA.accessToken))
      .send({
        ...createPayload,

        name: 'Active Desktop App',

        packageName: 'com.example.active',
      })
      .expect(201);
    const archived = await workspaceA.agent
      .post(desktopAppsUrl(workspaceA.workspaceId))
      .set(withBearer(workspaceA.accessToken))
      .send({
        ...createPayload,

        name: 'Archived Desktop App',

        packageName: 'com.example.archived',
      })
      .expect(201);

    await workspaceA.agent.delete(desktopAppUrl(workspaceA.workspaceId, archived.body.id)).set(withBearer(workspaceA.accessToken)).expect(200);

    await workspaceB.agent
      .post(desktopAppsUrl(workspaceB.workspaceId))
      .set(withBearer(workspaceB.accessToken))
      .send({
        ...createPayload,

        name: 'Workspace B Desktop',

        packageName: 'com.example.workspaceb',
      })
      .expect(201);

    const response = await workspaceA.agent.get(desktopAppsUrl(workspaceA.workspaceId)).set(withBearer(workspaceA.accessToken)).expect(200);

    expect(Array.isArray(response.body)).toBe(true);

    expect(response.body).toHaveLength(1);

    expect(response.body[0].id).toBe(active.body.id);

    expect(response.body[0].application.name).toBe('Active Desktop App');
  });

  it('returns desktop application details', async () => {
    const owner = await registerWorkspaceTestUser(app, prisma);
    const created = await owner.agent.post(desktopAppsUrl(owner.workspaceId)).set(withBearer(owner.accessToken)).send(createPayload).expect(201);
    const response = await owner.agent.get(desktopAppUrl(owner.workspaceId, created.body.id)).set(withBearer(owner.accessToken)).expect(200);

    expect(response.body).toMatchObject({
      id: created.body.id,

      applicationId: created.body.applicationId,

      platform: 'CROSS_PLATFORM',

      framework: 'ELECTRON',

      architecture: 'X64',

      packageName: 'com.commandcenter.desktop',

      application: {
        workspaceId: owner.workspaceId,

        name: 'Command Center Desktop',

        type: 'DESKTOP',
      },
    });
  });

  it('returns 404 for unknown desktop application', async () => {
    const owner = await registerWorkspaceTestUser(app, prisma);

    await owner.agent.get(desktopAppUrl(owner.workspaceId, '11111111-1111-4111-8111-111111111111')).set(withBearer(owner.accessToken)).expect(404);
  });

  it('updates desktop application metadata', async () => {
    const owner = await registerWorkspaceTestUser(app, prisma);
    const created = await owner.agent.post(desktopAppsUrl(owner.workspaceId)).set(withBearer(owner.accessToken)).send(createPayload).expect(201);
    const response = await owner.agent
      .patch(desktopAppUrl(owner.workspaceId, created.body.id))
      .set(withBearer(owner.accessToken))
      .send({
        name: 'Command Center Desktop Pro',

        currentVersion: '2.5.0',

        currentBuildNumber: '200',

        architecture: 'ARM64',

        updateChannel: 'beta',
      })
      .expect(200);

    expect(response.body).toMatchObject({
      id: created.body.id,

      architecture: 'ARM64',

      currentVersion: '2.5.0',

      currentBuildNumber: '200',

      updateChannel: 'beta',

      application: {
        name: 'Command Center Desktop Pro',
      },
    });

    const reloaded = await owner.agent.get(desktopAppUrl(owner.workspaceId, created.body.id)).set(withBearer(owner.accessToken)).expect(200);

    expect(reloaded.body.currentVersion).toBe('2.5.0');

    expect(reloaded.body.currentBuildNumber).toBe('200');

    expect(reloaded.body.architecture).toBe('ARM64');
  });

  it('allows optional metadata to be cleared', async () => {
    const owner = await registerWorkspaceTestUser(app, prisma);
    const created = await owner.agent.post(desktopAppsUrl(owner.workspaceId)).set(withBearer(owner.accessToken)).send(createPayload).expect(201);
    const response = await owner.agent
      .patch(desktopAppUrl(owner.workspaceId, created.body.id))
      .set(withBearer(owner.accessToken))
      .send({
        packageName: null,

        currentVersion: null,

        currentBuildNumber: null,

        minimumOsVersion: null,

        updateChannel: null,
      })
      .expect(200);

    expect(response.body).toMatchObject({
      packageName: null,

      currentVersion: null,

      currentBuildNumber: null,

      minimumOsVersion: null,

      updateChannel: null,
    });
  });

  it('archives desktop application and removes it from active list', async () => {
    const owner = await registerWorkspaceTestUser(app, prisma);
    const created = await owner.agent.post(desktopAppsUrl(owner.workspaceId)).set(withBearer(owner.accessToken)).send(createPayload).expect(201);
    const archiveResponse = await owner.agent.delete(desktopAppUrl(owner.workspaceId, created.body.id)).set(withBearer(owner.accessToken)).expect(200);

    expect(archiveResponse.body.application.archivedAt).not.toBeNull();

    const listResponse = await owner.agent.get(desktopAppsUrl(owner.workspaceId)).set(withBearer(owner.accessToken)).expect(200);

    expect(listResponse.body.some((item: { id: string }) => item.id === created.body.id)).toBe(false);

    const databaseApplication = await prisma.saasApplication.findUniqueOrThrow({
      where: {
        id: created.body.applicationId,
      },
    });

    expect(databaseApplication.archivedAt).not.toBeNull();

    expect(
      await prisma.desktopApplication.count({
        where: {
          id: created.body.id,
        },
      }),
    ).toBe(1);
  });

  it('does not destructively delete desktop metadata when archived', async () => {
    const owner = await registerWorkspaceTestUser(app, prisma);
    const created = await owner.agent.post(desktopAppsUrl(owner.workspaceId)).set(withBearer(owner.accessToken)).send(createPayload).expect(201);

    await owner.agent.delete(desktopAppUrl(owner.workspaceId, created.body.id)).set(withBearer(owner.accessToken)).expect(200);

    const stored = await prisma.desktopApplication.findUnique({
      where: {
        id: created.body.id,
      },
    });

    expect(stored).not.toBeNull();
  });

  it('prevents one workspace from reading another workspace desktop application', async () => {
    const workspaceA = await registerWorkspaceTestUser(app, prisma);
    const workspaceB = await registerWorkspaceTestUser(app, prisma);
    const desktopB = await workspaceB.agent
      .post(desktopAppsUrl(workspaceB.workspaceId))
      .set(withBearer(workspaceB.accessToken))
      .send({
        ...createPayload,

        name: 'Workspace B Private Desktop',
      })
      .expect(201);
    const response = await workspaceA.agent.get(desktopAppUrl(workspaceA.workspaceId, desktopB.body.id)).set(withBearer(workspaceA.accessToken));

    expect(response.status).toBe(404);
  });

  it('prevents a non-member from using another workspace route', async () => {
    const workspaceA = await registerWorkspaceTestUser(app, prisma);
    const workspaceB = await registerWorkspaceTestUser(app, prisma);
    const response = await workspaceB.agent.get(desktopAppsUrl(workspaceA.workspaceId)).set(withBearer(workspaceB.accessToken));

    expectAccessDenied(response);
  });

  it('allows a viewer to read desktop applications', async () => {
    const owner = await registerWorkspaceTestUser(app, prisma);
    const viewer = await registerWorkspaceTestUser(app, prisma);
    const membership = await addWorkspaceMember(owner, viewer, WorkspaceRole.VIEWER);

    expect([200, 201]).toContain(membership.status);

    await owner.agent.post(desktopAppsUrl(owner.workspaceId)).set(withBearer(owner.accessToken)).send(createPayload).expect(201);

    const response = await viewer.agent.get(desktopAppsUrl(owner.workspaceId)).set(withBearer(viewer.accessToken)).expect(200);

    expect(response.body).toHaveLength(1);
  });

  it('prevents viewer from creating desktop applications', async () => {
    const owner = await registerWorkspaceTestUser(app, prisma);
    const viewer = await registerWorkspaceTestUser(app, prisma);
    const membership = await addWorkspaceMember(owner, viewer, WorkspaceRole.VIEWER);

    expect([200, 201]).toContain(membership.status);

    const response = await viewer.agent.post(desktopAppsUrl(owner.workspaceId)).set(withBearer(viewer.accessToken)).send(createPayload);

    expectAccessDenied(response);
  });

  it('prevents viewer from updating desktop applications', async () => {
    const owner = await registerWorkspaceTestUser(app, prisma);
    const viewer = await registerWorkspaceTestUser(app, prisma);

    await addWorkspaceMember(owner, viewer, WorkspaceRole.VIEWER);

    const created = await owner.agent.post(desktopAppsUrl(owner.workspaceId)).set(withBearer(owner.accessToken)).send(createPayload).expect(201);
    const response = await viewer.agent.patch(desktopAppUrl(owner.workspaceId, created.body.id)).set(withBearer(viewer.accessToken)).send({
      currentVersion: '999.0.0',
    });

    expectAccessDenied(response);
  });

  it('prevents viewer from archiving desktop applications', async () => {
    const owner = await registerWorkspaceTestUser(app, prisma);
    const viewer = await registerWorkspaceTestUser(app, prisma);

    await addWorkspaceMember(owner, viewer, WorkspaceRole.VIEWER);

    const created = await owner.agent.post(desktopAppsUrl(owner.workspaceId)).set(withBearer(owner.accessToken)).send(createPayload).expect(201);
    const response = await viewer.agent.delete(desktopAppUrl(owner.workspaceId, created.body.id)).set(withBearer(viewer.accessToken));

    expectAccessDenied(response);
  });

  it('prevents updating an archived desktop application', async () => {
    const owner = await registerWorkspaceTestUser(app, prisma);
    const created = await owner.agent.post(desktopAppsUrl(owner.workspaceId)).set(withBearer(owner.accessToken)).send(createPayload).expect(201);

    await owner.agent.delete(desktopAppUrl(owner.workspaceId, created.body.id)).set(withBearer(owner.accessToken)).expect(200);

    const response = await owner.agent.patch(desktopAppUrl(owner.workspaceId, created.body.id)).set(withBearer(owner.accessToken)).send({
      currentVersion: '3.0.0',
    });

    expect(response.status).toBe(409);
  });
});
