import type { INestApplication } from '@nestjs/common';
import { PrismaService } from 'src/database/prisma.service';
import { RepositoryProvider } from 'src/generated/prisma/enums';
import { registerWorkspaceTestUser } from '../../helpers/workspace';

export const API = '/api/v1';

export type WorkspaceIdentity = Awaited<ReturnType<typeof registerWorkspaceTestUser>>;

let sequence = 0;

export async function createDesktopApp(owner: WorkspaceIdentity, overrides: Record<string, unknown> = {}) {
  sequence += 1;

  const response = await owner.agent
    .post(`${API}/workspaces/${owner.workspaceId}/desktop-apps`)
    .set('Authorization', `Bearer ${owner.accessToken}`)
    .send({
      name: `Desktop Fixture ${Date.now()}-${sequence}`,
      platform: 'CROSS_PLATFORM',
      framework: 'ELECTRON',
      architecture: 'X64',
      packageName: `com.commandcenter.desktop.${Date.now()}.${sequence}`,
      currentVersion: '1.0.0',
      currentBuildNumber: '100',
      ...overrides,
    });

  expect(response.status).toBe(201);

  return response.body as {
    id: string;
    applicationId: string;
    platform: string;
    framework: string;
    architecture: string;
    application: {
      id: string;
      workspaceId: string;
      name: string;
    };
  };
}

export async function createRepository(prisma: PrismaService, workspaceId: string, applicationId: string | null = null) {
  sequence += 1;

  const installation = await prisma.repositoryInstallation.create({
    data: {
      workspaceId,
      provider: RepositoryProvider.GITHUB,
      externalInstallationId: String(10_000_000 + sequence),
      accountLogin: 'command-center',
      accountType: 'Organization',
    },
  });

  const name = `desktop-repository-${Date.now()}-${sequence}`;

  return prisma.repositoryConnection.create({
    data: {
      workspaceId,
      installationId: installation.id,
      applicationId,
      provider: RepositoryProvider.GITHUB,
      externalRepoId: String(20_000_000 + sequence),
      owner: 'command-center',
      name,
      fullName: `command-center/${name}`,
      defaultBranch: 'main',
      isPrivate: false,
      htmlUrl: `https://github.com/command-center/${name}`,
      archived: false,
      isAvailable: true,
    },
    include: {
      installation: true,
    },
  });
}

export async function createLinkedDesktopFixture(app: INestApplication, prisma: PrismaService) {
  const owner = await registerWorkspaceTestUser(app, prisma);
  const desktopApp = await createDesktopApp(owner);
  const repository = await createRepository(prisma, owner.workspaceId, desktopApp.applicationId);

  return {
    owner,
    desktopApp,
    repository,
  };
}

export function buildPath(workspaceId: string, desktopAppId: string): string {
  return `${API}/workspaces/${workspaceId}/desktop-apps/${desktopAppId}/builds`;
}

export function overviewPath(workspaceId: string, desktopAppId: string): string {
  return `${API}/workspaces/${workspaceId}/desktop-apps/${desktopAppId}/overview`;
}

export function detectPath(workspaceId: string, desktopAppId: string): string {
  return `${API}/workspaces/${workspaceId}/desktop-apps/${desktopAppId}/detect`;
}

export async function ingestSuccessfulBuild(owner: WorkspaceIdentity, desktopAppId: string, repositoryId: string, suffix = `${Date.now()}-${++sequence}`) {
  const response = await owner.agent
    .post(`${buildPath(owner.workspaceId, desktopAppId)}/ingest/github`)
    .set('Authorization', `Bearer ${owner.accessToken}`)
    .send({
      repositoryId,
      workflowRunId: `run-${suffix}`,
      commitSha: 'a93f14258b51e9b424c4d7cb05f98751feef272d',
      branch: 'main',
      version: '1.0.0',
      buildNumber: '100',
      platform: 'WINDOWS',
      architecture: 'X64',
      status: 'SUCCESS',
      startedAt: '2026-08-23T01:00:00.000Z',
      completedAt: '2026-08-23T01:05:00.000Z',
      durationMs: 300000,
    });

  expect(response.status).toBe(201);
  expect(response.body.ignored).toBe(false);

  return response.body.build as {
    id: string;
    repositoryId: string;
    workflowRunId: string;
    status: string;
  };
}
