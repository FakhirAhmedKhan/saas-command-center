import type { INestApplication } from '@nestjs/common';

import request from 'supertest';

import { PrismaService } from 'src/database/prisma.service';

import { ApplicationCategory, ApplicationType, MobileFramework, MobilePlatform, WorkspaceRole } from 'src/generated/prisma/enums';

import { withBearer } from '../helpers/auth';

import { createTestApp } from '../helpers/create-test-app';

import { resetDatabase } from '../helpers/database';

import { registerWorkspaceTestUser } from '../helpers/workspace';

const API_PREFIX = '/api/v1';

const createPayload = {
  name: 'Karwa Passenger',
  platform: 'ANDROID',
  framework: 'ANDROID_NATIVE',
  packageId: 'com.karwa.app',
  minOsVersion: '26',
  targetOsVersion: '36',
  currentVersion: '6.14.0',
  currentBuildNumber: '815',
};

function mobileAppsUrl(workspaceId: string): string {
  return `${API_PREFIX}/workspaces/${workspaceId}/mobile-apps`;
}

function mobileAppUrl(workspaceId: string, mobileAppId: string): string {
  return `${mobileAppsUrl(workspaceId)}/${mobileAppId}`;
}

describe('Mobile Applications E2E', () => {
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

  it('allows an owner to create a mobile application', async () => {
    const owner = await registerWorkspaceTestUser(app, prisma);

    const response = await owner.agent.post(mobileAppsUrl(owner.workspaceId)).set(withBearer(owner.accessToken)).send(createPayload);

    expect(response.status).toBe(201);

    expect(response.body).toMatchObject({
      platform: 'ANDROID',
      framework: 'ANDROID_NATIVE',
      packageId: 'com.karwa.app',
      minOsVersion: '26',
      targetOsVersion: '36',
      currentVersion: '6.14.0',
      currentBuildNumber: '815',

      application: {
        workspaceId: owner.workspaceId,
        name: 'Karwa Passenger',
        type: 'MOBILE',
        archivedAt: null,
      },
    });

    const stored = await prisma.mobileApplication.findFirstOrThrow({
      where: {
        id: response.body.id,
      },

      include: {
        application: true,
      },
    });

    expect(stored.platform).toBe(MobilePlatform.ANDROID);

    expect(stored.framework).toBe(MobileFramework.ANDROID_NATIVE);

    expect(stored.application.type).toBe(ApplicationType.MOBILE);

    expect(stored.application.category).toBe(ApplicationCategory.MOBILE);

    expect(stored.application.workspaceId).toBe(owner.workspaceId);
  });

  it('allows an admin to create a mobile application', async () => {
    const admin = await registerWorkspaceTestUser(app, prisma);

    await prisma.workspaceMember.updateMany({
      where: {
        workspaceId: admin.workspaceId,
      },

      data: {
        role: WorkspaceRole.ADMIN,
      },
    });

    const response = await admin.agent
      .post(mobileAppsUrl(admin.workspaceId))
      .set(withBearer(admin.accessToken))
      .send({
        ...createPayload,
        name: 'Admin Mobile App',
        packageId: 'com.example.admin',
      });

    expect(response.status).toBe(201);

    expect(response.body.application.name).toBe('Admin Mobile App');
  });

  it('rejects unauthenticated mobile application creation', async () => {
    const owner = await registerWorkspaceTestUser(app, prisma);

    const response = await request(app.getHttpServer()).post(mobileAppsUrl(owner.workspaceId)).send(createPayload);

    expect(response.status).toBe(401);
  });

  it('rejects invalid mobile platform', async () => {
    const owner = await registerWorkspaceTestUser(app, prisma);

    const response = await owner.agent
      .post(mobileAppsUrl(owner.workspaceId))
      .set(withBearer(owner.accessToken))
      .send({
        ...createPayload,
        platform: 'WINDOWS_PHONE',
      });

    expect(response.status).toBe(400);
  });

  it('rejects invalid mobile framework', async () => {
    const owner = await registerWorkspaceTestUser(app, prisma);

    const response = await owner.agent
      .post(mobileAppsUrl(owner.workspaceId))
      .set(withBearer(owner.accessToken))
      .send({
        ...createPayload,
        framework: 'UNKNOWN_FRAMEWORK',
      });

    expect(response.status).toBe(400);
  });

  it('rejects missing required fields', async () => {
    const owner = await registerWorkspaceTestUser(app, prisma);

    const response = await owner.agent.post(mobileAppsUrl(owner.workspaceId)).set(withBearer(owner.accessToken)).send({
      packageId: 'com.invalid.app',
    });

    expect(response.status).toBe(400);
  });

  it('lists only active mobile applications from the current workspace', async () => {
    const workspaceA = await registerWorkspaceTestUser(app, prisma);

    const workspaceB = await registerWorkspaceTestUser(app, prisma);

    await workspaceA.agent
      .post(mobileAppsUrl(workspaceA.workspaceId))
      .set(withBearer(workspaceA.accessToken))
      .send({
        ...createPayload,
        name: 'Workspace A Mobile',
        packageId: 'com.example.workspacea',
      })
      .expect(201);

    await workspaceB.agent
      .post(mobileAppsUrl(workspaceB.workspaceId))
      .set(withBearer(workspaceB.accessToken))
      .send({
        ...createPayload,
        name: 'Workspace B Mobile',
        packageId: 'com.example.workspaceb',
      })
      .expect(201);

    const response = await workspaceA.agent.get(mobileAppsUrl(workspaceA.workspaceId)).set(withBearer(workspaceA.accessToken));

    expect(response.status).toBe(200);

    const serialized = JSON.stringify(response.body);

    expect(serialized).toContain('Workspace A Mobile');

    expect(serialized).not.toContain('Workspace B Mobile');

    expect(serialized).not.toContain('com.example.workspaceb');
  });

  it('returns mobile application details', async () => {
    const owner = await registerWorkspaceTestUser(app, prisma);

    const created = await owner.agent.post(mobileAppsUrl(owner.workspaceId)).set(withBearer(owner.accessToken)).send(createPayload);

    expect(created.status).toBe(201);

    const response = await owner.agent.get(mobileAppUrl(owner.workspaceId, created.body.id)).set(withBearer(owner.accessToken));

    expect(response.status).toBe(200);

    expect(response.body).toMatchObject({
      id: created.body.id,
      platform: 'ANDROID',
      framework: 'ANDROID_NATIVE',

      application: {
        workspaceId: owner.workspaceId,
        name: 'Karwa Passenger',
      },
    });
  });

  it('updates mobile application metadata', async () => {
    const owner = await registerWorkspaceTestUser(app, prisma);

    const created = await owner.agent.post(mobileAppsUrl(owner.workspaceId)).set(withBearer(owner.accessToken)).send(createPayload);

    expect(created.status).toBe(201);

    const response = await owner.agent.patch(mobileAppUrl(owner.workspaceId, created.body.id)).set(withBearer(owner.accessToken)).send({
      name: 'Karwa Passenger Updated',

      framework: 'FLUTTER',

      packageId: 'com.karwa.updated',

      currentVersion: '7.0.0',

      currentBuildNumber: '900',
    });

    expect(response.status).toBe(200);

    expect(response.body).toMatchObject({
      id: created.body.id,

      framework: 'FLUTTER',

      packageId: 'com.karwa.updated',

      currentVersion: '7.0.0',

      currentBuildNumber: '900',

      application: {
        name: 'Karwa Passenger Updated',
      },
    });

    const stored = await prisma.mobileApplication.findUniqueOrThrow({
      where: {
        id: created.body.id,
      },

      include: {
        application: true,
      },
    });

    expect(stored.framework).toBe(MobileFramework.FLUTTER);

    expect(stored.application.name).toBe('Karwa Passenger Updated');
  });

  it('archives a mobile application and removes it from active list', async () => {
    const owner = await registerWorkspaceTestUser(app, prisma);

    const created = await owner.agent.post(mobileAppsUrl(owner.workspaceId)).set(withBearer(owner.accessToken)).send(createPayload);

    expect(created.status).toBe(201);

    const archiveResponse = await owner.agent.delete(mobileAppUrl(owner.workspaceId, created.body.id)).set(withBearer(owner.accessToken));

    expect(archiveResponse.status).toBe(200);

    expect(archiveResponse.body.application.archivedAt).not.toBeNull();

    const listResponse = await owner.agent.get(mobileAppsUrl(owner.workspaceId)).set(withBearer(owner.accessToken));

    expect(listResponse.status).toBe(200);

    expect(JSON.stringify(listResponse.body)).not.toContain(created.body.id);

    const stored = await prisma.mobileApplication.findUniqueOrThrow({
      where: {
        id: created.body.id,
      },

      include: {
        application: true,
      },
    });

    expect(stored.application.archivedAt).not.toBeNull();
  });

  it('prevents one workspace from reading another workspace mobile application', async () => {
    const workspaceA = await registerWorkspaceTestUser(app, prisma);

    const workspaceB = await registerWorkspaceTestUser(app, prisma);

    const created = await workspaceA.agent.post(mobileAppsUrl(workspaceA.workspaceId)).set(withBearer(workspaceA.accessToken)).send(createPayload);

    expect(created.status).toBe(201);

    const response = await workspaceB.agent.get(mobileAppUrl(workspaceB.workspaceId, created.body.id)).set(withBearer(workspaceB.accessToken));

    expect(response.status).toBe(404);
  });

  it('prevents a non-member from using another workspace route', async () => {
    const workspaceA = await registerWorkspaceTestUser(app, prisma);

    const workspaceB = await registerWorkspaceTestUser(app, prisma);

    const response = await workspaceB.agent.get(mobileAppsUrl(workspaceA.workspaceId)).set(withBearer(workspaceB.accessToken));

    expect([403, 404]).toContain(response.status);
  });

  it('prevents viewer from modifying mobile applications', async () => {
    const viewer = await registerWorkspaceTestUser(app, prisma);

    const created = await viewer.agent.post(mobileAppsUrl(viewer.workspaceId)).set(withBearer(viewer.accessToken)).send(createPayload);

    expect(created.status).toBe(201);

    await prisma.workspaceMember.updateMany({
      where: {
        workspaceId: viewer.workspaceId,
      },

      data: {
        role: WorkspaceRole.VIEWER,
      },
    });

    const updateResponse = await viewer.agent.patch(mobileAppUrl(viewer.workspaceId, created.body.id)).set(withBearer(viewer.accessToken)).send({
      currentVersion: '99.0.0',
    });

    expect(updateResponse.status).toBe(403);

    const archiveResponse = await viewer.agent.delete(mobileAppUrl(viewer.workspaceId, created.body.id)).set(withBearer(viewer.accessToken));

    expect(archiveResponse.status).toBe(403);
  });
});
