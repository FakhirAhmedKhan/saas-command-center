import type { INestApplication } from '@nestjs/common';

import { WorkspaceRole } from 'src/generated/prisma/enums';

import { PrismaService } from 'src/database/prisma.service';

import { withBearer } from './helpers/auth';

import { createTestApp } from './helpers/create-test-app';

import { resetDatabase } from './helpers/database';

import {
  addWorkspaceMember,
  expectAccessDenied,
  expectBusinessRuleRejected,
  getWorkspaceMembership,
  readWorkspaceMembers,
  registerWorkspaceTestUser,
  removeWorkspaceMember,
  updateWorkspaceMemberRole,
  workspaceRoutes,
} from './helpers/workspace';

describe('Workspace Members E2E', () => {
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

  it('lists the workspace owner and added members', async () => {
    const owner = await registerWorkspaceTestUser(app, prisma, {
      workspaceName: 'Members List Workspace',
    });

    const developer = await registerWorkspaceTestUser(app, prisma);

    const addResponse = await addWorkspaceMember(owner, developer, WorkspaceRole.DEVELOPER);

    expect([200, 201]).toContain(addResponse.status);

    const listResponse = await owner.agent.get(workspaceRoutes.members(owner.workspaceId)).set(withBearer(owner.accessToken));

    expect(listResponse.status).toBe(200);

    const members = readWorkspaceMembers(listResponse);

    expect(members).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          userId: owner.userId,

          role: WorkspaceRole.OWNER,
        }),

        expect.objectContaining({
          userId: developer.userId,

          role: WorkspaceRole.DEVELOPER,
        }),
      ]),
    );
  });

  it('uses VIEWER as the default role when role is omitted', async () => {
    const owner = await registerWorkspaceTestUser(app, prisma);

    const member = await registerWorkspaceTestUser(app, prisma);

    const addResponse = await addWorkspaceMember(owner, member);

    expect([200, 201]).toContain(addResponse.status);

    const membership = await getWorkspaceMembership(prisma, owner.workspaceId, member.userId);

    expect(membership).not.toBeNull();

    expect(membership?.role).toBe(WorkspaceRole.VIEWER);
  });

  it('returns 404 when adding an unregistered email', async () => {
    const owner = await registerWorkspaceTestUser(app, prisma);

    const response = await owner.agent.post(workspaceRoutes.members(owner.workspaceId)).set(withBearer(owner.accessToken)).send({
      email: 'missing-user@example.test',

      role: WorkspaceRole.VIEWER,
    });

    expect(response.status).toBe(404);

    expect(JSON.stringify(response.body)).toContain('registered user');
  });

  it('rejects duplicate workspace membership', async () => {
    const owner = await registerWorkspaceTestUser(app, prisma);

    const member = await registerWorkspaceTestUser(app, prisma);

    const firstResponse = await addWorkspaceMember(owner, member, WorkspaceRole.DEVELOPER);

    expect([200, 201]).toContain(firstResponse.status);

    const duplicateResponse = await addWorkspaceMember(owner, member, WorkspaceRole.VIEWER);

    expectBusinessRuleRejected(duplicateResponse);

    const memberships = await prisma.workspaceMember.count({
      where: {
        workspaceId: owner.workspaceId,

        userId: member.userId,
      },
    });

    expect(memberships).toBe(1);
  });

  it('allows the owner to update a member role', async () => {
    const owner = await registerWorkspaceTestUser(app, prisma);

    const member = await registerWorkspaceTestUser(app, prisma);

    const addResponse = await addWorkspaceMember(owner, member, WorkspaceRole.VIEWER);

    expect([200, 201]).toContain(addResponse.status);

    const updateResponse = await updateWorkspaceMemberRole(owner, member.userId, WorkspaceRole.DEVELOPER);

    expect(updateResponse.status).toBe(200);

    const membership = await getWorkspaceMembership(prisma, owner.workspaceId, member.userId);

    expect(membership?.role).toBe(WorkspaceRole.DEVELOPER);
  });

  it('allows the owner to remove a member and immediately revokes access', async () => {
    const owner = await registerWorkspaceTestUser(app, prisma);

    const member = await registerWorkspaceTestUser(app, prisma);

    const addResponse = await addWorkspaceMember(owner, member, WorkspaceRole.DEVELOPER);

    expect([200, 201]).toContain(addResponse.status);

    const accessBeforeRemoval = await member.agent.get(workspaceRoutes.details(owner.workspaceId)).set(withBearer(member.accessToken));

    expect(accessBeforeRemoval.status).toBe(200);

    const removeResponse = await removeWorkspaceMember(owner, member.userId);

    expect(removeResponse.status).toBe(200);

    expect(removeResponse.body).toEqual({
      message: 'Workspace member removed',
    });

    const membership = await getWorkspaceMembership(prisma, owner.workspaceId, member.userId);

    expect(membership).toBeNull();

    const accessAfterRemoval = await member.agent.get(workspaceRoutes.details(owner.workspaceId)).set(withBearer(member.accessToken));

    expectAccessDenied(accessAfterRemoval);
  });

  it('rejects a foreign user ID when updating a workspace member', async () => {
    const alphaOwner = await registerWorkspaceTestUser(app, prisma, {
      workspaceName: 'Alpha Workspace',
    });

    const alphaMember = await registerWorkspaceTestUser(app, prisma);

    const betaOwner = await registerWorkspaceTestUser(app, prisma, {
      workspaceName: 'Beta Workspace',
    });

    const addResponse = await addWorkspaceMember(alphaOwner, alphaMember, WorkspaceRole.VIEWER);

    expect([200, 201]).toContain(addResponse.status);

    const foreignUpdateResponse = await updateWorkspaceMemberRole(alphaOwner, betaOwner.userId, WorkspaceRole.ADMIN);

    expectBusinessRuleRejected(foreignUpdateResponse);

    const originalMembership = await getWorkspaceMembership(prisma, alphaOwner.workspaceId, alphaMember.userId);

    expect(originalMembership?.role).toBe(WorkspaceRole.VIEWER);

    const foreignMembership = await getWorkspaceMembership(prisma, alphaOwner.workspaceId, betaOwner.userId);

    expect(foreignMembership).toBeNull();
  });

  it('rejects malformed member role values', async () => {
    const owner = await registerWorkspaceTestUser(app, prisma);

    const member = await registerWorkspaceTestUser(app, prisma);

    const response = await owner.agent.post(workspaceRoutes.members(owner.workspaceId)).set(withBearer(owner.accessToken)).send({
      email: member.input.email,

      role: 'SUPER_ADMIN',
    });

    expect(response.status).toBe(400);
  });
});
