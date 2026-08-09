import type { INestApplication } from '@nestjs/common';

import type { Response, SuperAgentTest } from 'supertest';

import { WorkspaceRole } from 'src/generated/prisma/enums';

import { PrismaService } from 'src/database/prisma.service';

import { createAgent, createTestUser, registerUser, withBearer } from './auth';

import type { TestUserInput } from './contracts';

import { expectSuccessfulStatus, readAccessToken, readResponseArray } from './response';

export const workspaceRoutes = {
  root: '/api/v1/workspaces',

  details(workspaceId: string): string {
    return `/api/v1/workspaces/${workspaceId}`;
  },

  members(workspaceId: string): string {
    return `/api/v1/workspaces/${workspaceId}/members`;
  },

  member(workspaceId: string, userId: string): string {
    return `/api/v1/workspaces/${workspaceId}/members/${userId}`;
  },

  transferOwnership(workspaceId: string): string {
    return `/api/v1/workspaces/${workspaceId}/transfer-ownership`;
  },
} as const;

export interface WorkspaceTestUser {
  agent: SuperAgentTest;
  input: TestUserInput;
  accessToken: string;
  userId: string;
  workspaceId: string;
}

export interface NormalizedWorkspaceMember {
  userId: string | undefined;
  email: string | undefined;
  role: string | undefined;
}

export async function registerWorkspaceTestUser(
  app: INestApplication,
  prisma: PrismaService,
  overrides: Partial<TestUserInput> = {},
): Promise<WorkspaceTestUser> {
  const input = createTestUser(overrides);

  const agent = createAgent(app);

  const registrationResponse = await registerUser(agent, input);

  expectSuccessfulStatus(registrationResponse);

  const accessToken = readAccessToken(registrationResponse);

  const databaseUser = await prisma.user.findUnique({
    where: {
      email: input.email.trim().toLowerCase(),
    },

    select: {
      id: true,
    },
  });

  if (!databaseUser) {
    throw new Error(`Registered user ${input.email} was not found in the database`);
  }

  const ownerMembership = await prisma.workspaceMember.findFirst({
    where: {
      userId: databaseUser.id,

      role: WorkspaceRole.OWNER,
    },

    select: {
      workspaceId: true,
    },
  });

  if (!ownerMembership) {
    throw new Error(`Initial OWNER membership was not created for ${input.email}`);
  }

  return {
    agent,
    input,
    accessToken,
    userId: databaseUser.id,

    workspaceId: ownerMembership.workspaceId,
  };
}

export async function addWorkspaceMember(actor: WorkspaceTestUser, target: WorkspaceTestUser, role?: WorkspaceRole): Promise<Response> {
  const payload: {
    email: string;
    role?: WorkspaceRole;
  } = {
    email: target.input.email,
  };

  if (role) {
    payload.role = role;
  }

  return actor.agent.post(workspaceRoutes.members(actor.workspaceId)).set(withBearer(actor.accessToken)).send(payload);
}

export async function updateWorkspaceMemberRole(actor: WorkspaceTestUser, targetUserId: string, role: WorkspaceRole): Promise<Response> {
  return actor.agent.patch(workspaceRoutes.member(actor.workspaceId, targetUserId)).set(withBearer(actor.accessToken)).send({
    role,
  });
}

export async function removeWorkspaceMember(actor: WorkspaceTestUser, targetUserId: string): Promise<Response> {
  return actor.agent.delete(workspaceRoutes.member(actor.workspaceId, targetUserId)).set(withBearer(actor.accessToken));
}

export async function getWorkspaceMembership(prisma: PrismaService, workspaceId: string, userId: string) {
  return prisma.workspaceMember.findFirst({
    where: {
      workspaceId,
      userId,
    },

    select: {
      id: true,
      workspaceId: true,
      userId: true,
      role: true,
    },
  });
}

export function readWorkspaceMembers(response: Response): NormalizedWorkspaceMember[] {
  const rawMembers = readResponseArray<Record<string, unknown>>(response);

  return rawMembers.map((member): NormalizedWorkspaceMember => {
    const nestedUser = member.user && typeof member.user === 'object' ? (member.user as Record<string, unknown>) : undefined;

    const userId = typeof member.userId === 'string' ? member.userId : typeof nestedUser?.id === 'string' ? nestedUser.id : undefined;

    const email = typeof member.email === 'string' ? member.email : typeof nestedUser?.email === 'string' ? nestedUser.email : undefined;

    const role = typeof member.role === 'string' ? member.role : undefined;

    return {
      userId,
      email,
      role,
    };
  });
}

export function expectAccessDenied(response: Response): void {
  expect([403, 404]).toContain(response.status);
}

export function expectBusinessRuleRejected(response: Response): void {
  expect([400, 403, 404, 409]).toContain(response.status);
}
