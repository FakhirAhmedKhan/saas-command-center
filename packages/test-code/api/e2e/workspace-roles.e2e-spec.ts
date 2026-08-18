import { withBearer } from '../helpers/auth';
import { createTestApp } from '../helpers/create-test-app';
import { resetDatabase } from '../helpers/database';
import {
  addWorkspaceMember,
  expectAccessDenied,
  expectBusinessRuleRejected,
  getWorkspaceMembership,
  registerWorkspaceTestUser,
  removeWorkspaceMember,
  updateWorkspaceMemberRole,
  workspaceRoutes,
} from '../helpers/workspace';
import type { INestApplication } from '@nestjs/common';
import { PrismaService } from 'src/database/prisma.service';
import { WorkspaceRole } from 'src/generated/prisma/enums';

describe('Workspace Roles and Ownership E2E', () => {
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

  it('allows OWNER and ADMIN to update a workspace', async () => {
    const owner = await registerWorkspaceTestUser(app, prisma, {
      workspaceName: 'Role Update Workspace',
    });

    const admin = await registerWorkspaceTestUser(app, prisma);

    const addAdminResponse = await addWorkspaceMember(owner, admin, WorkspaceRole.ADMIN);

    expect([200, 201]).toContain(addAdminResponse.status);

    const ownerUpdateResponse = await owner.agent.patch(workspaceRoutes.details(owner.workspaceId)).set(withBearer(owner.accessToken)).send({
      name: 'Owner Updated Workspace',
    });

    expect(ownerUpdateResponse.status).toBe(200);

    const adminUpdateResponse = await admin.agent.patch(workspaceRoutes.details(owner.workspaceId)).set(withBearer(admin.accessToken)).send({
      name: 'Admin Updated Workspace',
    });

    expect(adminUpdateResponse.status).toBe(200);

    const workspace = await prisma.workspace.findUnique({
      where: {
        id: owner.workspaceId,
      },

      select: {
        name: true,
      },
    });

    expect(workspace?.name).toBe('Admin Updated Workspace');
  });

  it('prevents DEVELOPER and VIEWER from updating a workspace', async () => {
    const owner = await registerWorkspaceTestUser(app, prisma);

    const developer = await registerWorkspaceTestUser(app, prisma);

    const viewer = await registerWorkspaceTestUser(app, prisma);

    expect([200, 201]).toContain((await addWorkspaceMember(owner, developer, WorkspaceRole.DEVELOPER)).status);

    expect([200, 201]).toContain((await addWorkspaceMember(owner, viewer, WorkspaceRole.VIEWER)).status);

    const developerResponse = await developer.agent.patch(workspaceRoutes.details(owner.workspaceId)).set(withBearer(developer.accessToken)).send({
      name: 'Developer Unauthorized Name',
    });

    expect(developerResponse.status).toBe(403);

    const viewerResponse = await viewer.agent.patch(workspaceRoutes.details(owner.workspaceId)).set(withBearer(viewer.accessToken)).send({
      name: 'Viewer Unauthorized Name',
    });

    expect(viewerResponse.status).toBe(403);
  });

  it('prevents DEVELOPER and VIEWER from adding members', async () => {
    const owner = await registerWorkspaceTestUser(app, prisma);

    const developer = await registerWorkspaceTestUser(app, prisma);

    const viewer = await registerWorkspaceTestUser(app, prisma);

    const target = await registerWorkspaceTestUser(app, prisma);

    expect([200, 201]).toContain((await addWorkspaceMember(owner, developer, WorkspaceRole.DEVELOPER)).status);

    expect([200, 201]).toContain((await addWorkspaceMember(owner, viewer, WorkspaceRole.VIEWER)).status);

    const developerResponse = await developer.agent.post(workspaceRoutes.members(owner.workspaceId)).set(withBearer(developer.accessToken)).send({
      email: target.input.email,

      role: WorkspaceRole.VIEWER,
    });

    expect(developerResponse.status).toBe(403);

    const viewerResponse = await viewer.agent.post(workspaceRoutes.members(owner.workspaceId)).set(withBearer(viewer.accessToken)).send({
      email: target.input.email,

      role: WorkspaceRole.VIEWER,
    });

    expect(viewerResponse.status).toBe(403);

    const membership = await getWorkspaceMembership(prisma, owner.workspaceId, target.userId);

    expect(membership).toBeNull();
  });

  it('allows ADMIN to manage non-owner members but not create another OWNER', async () => {
    const owner = await registerWorkspaceTestUser(app, prisma);

    const admin = await registerWorkspaceTestUser(app, prisma);

    const target = await registerWorkspaceTestUser(app, prisma);

    expect([200, 201]).toContain((await addWorkspaceMember(owner, admin, WorkspaceRole.ADMIN)).status);

    const adminAddResponse = await admin.agent.post(workspaceRoutes.members(owner.workspaceId)).set(withBearer(admin.accessToken)).send({
      email: target.input.email,

      role: WorkspaceRole.DEVELOPER,
    });

    expect([200, 201]).toContain(adminAddResponse.status);

    const targetMembership = await getWorkspaceMembership(prisma, owner.workspaceId, target.userId);

    expect(targetMembership?.role).toBe(WorkspaceRole.DEVELOPER);

    const promoteToOwnerResponse = await admin.agent.patch(workspaceRoutes.member(owner.workspaceId, target.userId)).set(withBearer(admin.accessToken)).send({
      role: WorkspaceRole.OWNER,
    });

    expectBusinessRuleRejected(promoteToOwnerResponse);

    const membershipAfterAttempt = await getWorkspaceMembership(prisma, owner.workspaceId, target.userId);

    expect(membershipAfterAttempt?.role).not.toBe(WorkspaceRole.OWNER);
  });

  it('prevents ADMIN from changing or removing the workspace OWNER', async () => {
    const owner = await registerWorkspaceTestUser(app, prisma);

    const admin = await registerWorkspaceTestUser(app, prisma);

    expect([200, 201]).toContain((await addWorkspaceMember(owner, admin, WorkspaceRole.ADMIN)).status);

    const updateOwnerResponse = await admin.agent.patch(workspaceRoutes.member(owner.workspaceId, owner.userId)).set(withBearer(admin.accessToken)).send({
      role: WorkspaceRole.VIEWER,
    });

    expectBusinessRuleRejected(updateOwnerResponse);

    const removeOwnerResponse = await admin.agent.delete(workspaceRoutes.member(owner.workspaceId, owner.userId)).set(withBearer(admin.accessToken));

    expectBusinessRuleRejected(removeOwnerResponse);

    const ownerMembership = await getWorkspaceMembership(prisma, owner.workspaceId, owner.userId);

    expect(ownerMembership?.role).toBe(WorkspaceRole.OWNER);
  });

  it('allows OWNER to transfer ownership to an existing member', async () => {
    const owner = await registerWorkspaceTestUser(app, prisma);

    const successor = await registerWorkspaceTestUser(app, prisma);

    expect([200, 201]).toContain((await addWorkspaceMember(owner, successor, WorkspaceRole.ADMIN)).status);

    const transferResponse = await owner.agent.post(workspaceRoutes.transferOwnership(owner.workspaceId)).set(withBearer(owner.accessToken)).send({
      newOwnerUserId: successor.userId,
    });

    expect([200, 201]).toContain(transferResponse.status);

    const workspace = await prisma.workspace.findUnique({
      where: {
        id: owner.workspaceId,
      },

      select: {
        ownerId: true,
      },
    });

    expect(workspace?.ownerId).toBe(successor.userId);

    const successorMembership = await getWorkspaceMembership(prisma, owner.workspaceId, successor.userId);

    expect(successorMembership?.role).toBe(WorkspaceRole.OWNER);

    const previousOwnerMembership = await getWorkspaceMembership(prisma, owner.workspaceId, owner.userId);

    expect(previousOwnerMembership).not.toBeNull();

    expect(previousOwnerMembership?.role).not.toBe(WorkspaceRole.OWNER);

    const successorUpdateResponse = await successor.agent.patch(workspaceRoutes.details(owner.workspaceId)).set(withBearer(successor.accessToken)).send({
      name: 'Transferred Workspace',
    });

    expect(successorUpdateResponse.status).toBe(200);
  });

  it('prevents ADMIN from transferring workspace ownership', async () => {
    const owner = await registerWorkspaceTestUser(app, prisma);

    const admin = await registerWorkspaceTestUser(app, prisma);

    expect([200, 201]).toContain((await addWorkspaceMember(owner, admin, WorkspaceRole.ADMIN)).status);

    const response = await admin.agent.post(workspaceRoutes.transferOwnership(owner.workspaceId)).set(withBearer(admin.accessToken)).send({
      newOwnerUserId: admin.userId,
    });

    expect(response.status).toBe(403);

    const workspace = await prisma.workspace.findUnique({
      where: {
        id: owner.workspaceId,
      },

      select: {
        ownerId: true,
      },
    });

    expect(workspace?.ownerId).toBe(owner.userId);
  });

  it('rejects ownership transfer to a user who is not a workspace member', async () => {
    const owner = await registerWorkspaceTestUser(app, prisma);

    const outsider = await registerWorkspaceTestUser(app, prisma);

    const response = await owner.agent.post(workspaceRoutes.transferOwnership(owner.workspaceId)).set(withBearer(owner.accessToken)).send({
      newOwnerUserId: outsider.userId,
    });

    expectBusinessRuleRejected(response);

    const workspace = await prisma.workspace.findUnique({
      where: {
        id: owner.workspaceId,
      },

      select: {
        ownerId: true,
      },
    });

    expect(workspace?.ownerId).toBe(owner.userId);
  });

  it('prevents the only OWNER from being demoted or removed', async () => {
    const owner = await registerWorkspaceTestUser(app, prisma);

    const demotionResponse = await updateWorkspaceMemberRole(owner, owner.userId, WorkspaceRole.ADMIN);

    expectBusinessRuleRejected(demotionResponse);

    const removalResponse = await removeWorkspaceMember(owner, owner.userId);

    expectBusinessRuleRejected(removalResponse);

    const workspace = await prisma.workspace.findUnique({
      where: {
        id: owner.workspaceId,
      },

      select: {
        ownerId: true,
      },
    });

    expect(workspace?.ownerId).toBe(owner.userId);

    const membership = await getWorkspaceMembership(prisma, owner.workspaceId, owner.userId);

    expect(membership?.role).toBe(WorkspaceRole.OWNER);
  });

  it('prevents members from managing a foreign workspace', async () => {
    const alphaOwner = await registerWorkspaceTestUser(app, prisma, {
      workspaceName: 'Alpha Role Workspace',
    });

    const betaOwner = await registerWorkspaceTestUser(app, prisma, {
      workspaceName: 'Beta Role Workspace',
    });

    const response = await betaOwner.agent.get(workspaceRoutes.members(alphaOwner.workspaceId)).set(withBearer(betaOwner.accessToken));

    expectAccessDenied(response);
  });

  it('creates exactly one OWNER membership matching workspace.ownerId on workspace creation (DB-03)', async () => {
    const owner = await registerWorkspaceTestUser(app, prisma);

    const workspace = await prisma.workspace.findUnique({
      where: {
        id: owner.workspaceId,
      },

      select: {
        ownerId: true,
      },
    });

    expect(workspace?.ownerId).toBe(owner.userId);

    const memberships = await prisma.workspaceMember.findMany({
      where: {
        workspaceId: owner.workspaceId,
        role: WorkspaceRole.OWNER,
      },
    });

    expect(memberships).toHaveLength(1);

    expect(memberships[0]?.userId).toBe(owner.userId);
  });

  it('keeps ownership transfer isolated to the target workspace (DB-03)', async () => {
    const alphaOwner = await registerWorkspaceTestUser(app, prisma, {
      workspaceName: 'Alpha Isolation Workspace',
    });

    const alphaSuccessor = await registerWorkspaceTestUser(app, prisma);

    const betaOwner = await registerWorkspaceTestUser(app, prisma, {
      workspaceName: 'Beta Isolation Workspace',
    });

    expect([200, 201]).toContain((await addWorkspaceMember(alphaOwner, alphaSuccessor, WorkspaceRole.ADMIN)).status);

    const transferResponse = await alphaOwner.agent
      .post(workspaceRoutes.transferOwnership(alphaOwner.workspaceId))
      .set(withBearer(alphaOwner.accessToken))
      .send({
        newOwnerUserId: alphaSuccessor.userId,
      });

    expect([200, 201]).toContain(transferResponse.status);

    const betaWorkspace = await prisma.workspace.findUnique({
      where: {
        id: betaOwner.workspaceId,
      },

      select: {
        ownerId: true,
      },
    });

    expect(betaWorkspace?.ownerId).toBe(betaOwner.userId);

    const betaOwnerMembership = await getWorkspaceMembership(prisma, betaOwner.workspaceId, betaOwner.userId);

    expect(betaOwnerMembership?.role).toBe(WorkspaceRole.OWNER);

    const alphaMembershipInBeta = await getWorkspaceMembership(prisma, betaOwner.workspaceId, alphaSuccessor.userId);

    expect(alphaMembershipInBeta).toBeNull();
  });
});
