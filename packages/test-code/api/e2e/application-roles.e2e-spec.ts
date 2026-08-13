import {
  addLink,
  addTechnology,
  applicationRoutes,
  archiveApplication,
  createApplication,
  inWorkspace,
  permanentlyDeleteApplication,
  restoreApplication,
  updateApplication,
} from '../helpers/application';
import { createTestApp } from '../helpers/create-test-app';
import { resetDatabase } from '../helpers/database';
import { addWorkspaceMember, expectAccessDenied, registerWorkspaceTestUser, type WorkspaceTestUser } from '../helpers/workspace';
import type { INestApplication } from '@nestjs/common';
import { PrismaService } from 'src/database/prisma.service';
import { WorkspaceRole } from 'src/generated/prisma/enums';
import request from 'supertest';

interface RoleMatrix {
  owner: WorkspaceTestUser;
  admin: WorkspaceTestUser;
  developer: WorkspaceTestUser;
  viewer: WorkspaceTestUser;
}

describe('Application Roles E2E', () => {
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

  async function createRoleMatrix(): Promise<RoleMatrix> {
    const owner = await registerWorkspaceTestUser(app, prisma);

    const rawAdmin = await registerWorkspaceTestUser(app, prisma);

    const rawDeveloper = await registerWorkspaceTestUser(app, prisma);

    const rawViewer = await registerWorkspaceTestUser(app, prisma);

    expect([200, 201]).toContain((await addWorkspaceMember(owner, rawAdmin, WorkspaceRole.ADMIN)).status);

    expect([200, 201]).toContain((await addWorkspaceMember(owner, rawDeveloper, WorkspaceRole.DEVELOPER)).status);

    expect([200, 201]).toContain((await addWorkspaceMember(owner, rawViewer, WorkspaceRole.VIEWER)).status);

    return {
      owner,

      admin: inWorkspace(rawAdmin, owner.workspaceId),

      developer: inWorkspace(rawDeveloper, owner.workspaceId),

      viewer: inWorkspace(rawViewer, owner.workspaceId),
    };
  }

  it('allows OWNER, ADMIN, and DEVELOPER to create and update', async () => {
    const matrix = await createRoleMatrix();

    for (const actor of [matrix.owner, matrix.admin, matrix.developer]) {
      const application = await createApplication(actor);

      const response = await updateApplication(actor, application.id, {
        shortDescription: `Updated by ${actor.userId}`,
      });

      expect(response.status).toBe(200);
    }
  });

  it('allows OWNER, ADMIN, and DEVELOPER to manage technologies and links', async () => {
    const matrix = await createRoleMatrix();

    for (const actor of [matrix.owner, matrix.admin, matrix.developer]) {
      const application = await createApplication(actor);

      expect([200, 201]).toContain((await addTechnology(actor, application.id)).status);

      expect([200, 201]).toContain((await addLink(actor, application.id)).status);
    }
  });

  it('allows VIEWER to read but prevents mutations', async () => {
    const matrix = await createRoleMatrix();

    const application = await createApplication(matrix.owner);

    const listResponse = await matrix.viewer.agent
      .get(applicationRoutes.root(matrix.viewer.workspaceId))
      .set('Authorization', `Bearer ${matrix.viewer.accessToken}`);

    expect(listResponse.status).toBe(200);

    const createResponse = await matrix.viewer.agent
      .post(applicationRoutes.root(matrix.viewer.workspaceId))
      .set('Authorization', `Bearer ${matrix.viewer.accessToken}`)
      .send({
        name: 'Viewer Forbidden App',
      });

    expect(createResponse.status).toBe(403);

    expect(
      (
        await updateApplication(matrix.viewer, application.id, {
          name: 'Viewer Update',
        })
      ).status,
    ).toBe(403);

    expect((await addTechnology(matrix.viewer, application.id)).status).toBe(403);

    expect((await addLink(matrix.viewer, application.id)).status).toBe(403);

    expect((await archiveApplication(matrix.viewer, application.id)).status).toBe(403);

    expect((await permanentlyDeleteApplication(matrix.viewer, application.id)).status).toBe(403);
  });

  it('prevents DEVELOPER from archive, restore, and delete', async () => {
    const matrix = await createRoleMatrix();

    const application = await createApplication(matrix.developer);

    expect((await archiveApplication(matrix.developer, application.id)).status).toBe(403);

    expect((await restoreApplication(matrix.developer, application.id)).status).toBe(403);

    expect((await permanentlyDeleteApplication(matrix.developer, application.id)).status).toBe(403);
  });

  it('allows ADMIN to archive and restore but not permanently delete', async () => {
    const matrix = await createRoleMatrix();

    const application = await createApplication(matrix.admin);

    expect((await archiveApplication(matrix.admin, application.id)).status).toBe(200);

    expect((await restoreApplication(matrix.admin, application.id)).status).toBe(200);

    expect((await permanentlyDeleteApplication(matrix.admin, application.id)).status).toBe(403);
  });

  it('allows OWNER to permanently delete archived application', async () => {
    const matrix = await createRoleMatrix();

    const application = await createApplication(matrix.owner);

    expect((await archiveApplication(matrix.owner, application.id)).status).toBe(200);

    expect((await permanentlyDeleteApplication(matrix.owner, application.id)).status).toBe(200);
  });

  it('prevents outsider and anonymous access', async () => {
    const matrix = await createRoleMatrix();

    const outsider = await registerWorkspaceTestUser(app, prisma);

    const outsiderResponse = await outsider.agent.get(applicationRoutes.root(matrix.owner.workspaceId)).set('Authorization', `Bearer ${outsider.accessToken}`);

    expectAccessDenied(outsiderResponse);

    const anonymousResponse = await request(app.getHttpServer()).get(applicationRoutes.root(matrix.owner.workspaceId));

    expect(anonymousResponse.status).toBe(401);
  });
});
