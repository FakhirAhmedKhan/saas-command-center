import type { INestApplication } from '@nestjs/common';
import { PrismaService } from 'src/database/prisma.service';
import { createTestApp } from '../helpers/create-test-app';
import { resetDatabase } from '../helpers/database';
import { registerWorkspaceTestUser } from '../helpers/workspace';
import { buildPath, createLinkedDesktopFixture, createRepository } from './helpers/desktop-test-fixtures';

describe('Desktop Builds E2E', () => {
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

  function payload(repositoryId: string, overrides: Record<string, unknown> = {}) {
    return {
      repositoryId,
      workflowRunId: '901',
      commitSha: 'a93f14258b51e9b424c4d7cb05f98751feef272d',
      branch: 'main',
      version: '2.0.0',
      buildNumber: '200',
      platform: 'WINDOWS',
      architecture: 'X64',
      status: 'QUEUED',
      startedAt: '2026-08-23T01:00:00.000Z',
      ...overrides,
    };
  }

  it('tracks queued -> building -> success idempotently', async () => {
    const fixture = await createLinkedDesktopFixture(app, prisma);
    const path = `${buildPath(fixture.owner.workspaceId, fixture.desktopApp.id)}/ingest/github`;

    const queued = await fixture.owner.agent.post(path).set('Authorization', `Bearer ${fixture.owner.accessToken}`).send(payload(fixture.repository.id));

    expect(queued.status).toBe(201);
    expect(queued.body.build.status).toBe('QUEUED');

    const building = await fixture.owner.agent
      .post(path)
      .set('Authorization', `Bearer ${fixture.owner.accessToken}`)
      .send(
        payload(fixture.repository.id, {
          status: 'BUILDING',
        }),
      );

    expect(building.status).toBe(201);
    expect(building.body.build.id).toBe(queued.body.build.id);
    expect(building.body.build.status).toBe('BUILDING');

    const success = await fixture.owner.agent
      .post(path)
      .set('Authorization', `Bearer ${fixture.owner.accessToken}`)
      .send(
        payload(fixture.repository.id, {
          status: 'SUCCESS',
          completedAt: '2026-08-23T01:05:00.000Z',
        }),
      );

    expect(success.body.build.id).toBe(queued.body.build.id);
    expect(success.body.build.status).toBe('SUCCESS');
    expect(success.body.build.durationMs).toBe(300000);

    expect(
      await prisma.desktopBuild.count({
        where: {
          repositoryId: fixture.repository.id,
          workflowRunId: '901',
        },
      }),
    ).toBe(1);
  });

  it('tracks failed build', async () => {
    const fixture = await createLinkedDesktopFixture(app, prisma);

    const response = await fixture.owner.agent
      .post(`${buildPath(fixture.owner.workspaceId, fixture.desktopApp.id)}/ingest/github`)
      .set('Authorization', `Bearer ${fixture.owner.accessToken}`)
      .send(
        payload(fixture.repository.id, {
          workflowRunId: 'failed-1',
          conclusion: 'failure',
          status: undefined,
          completedAt: '2026-08-23T01:02:00.000Z',
        }),
      );

    expect(response.status).toBe(201);
    expect(response.body.build.status).toBe('FAILED');
  });

  it('keeps matrix builds separate by platform and architecture', async () => {
    const fixture = await createLinkedDesktopFixture(app, prisma);
    const path = `${buildPath(fixture.owner.workspaceId, fixture.desktopApp.id)}/ingest/github`;

    await fixture.owner.agent
      .post(path)
      .set('Authorization', `Bearer ${fixture.owner.accessToken}`)
      .send(
        payload(fixture.repository.id, {
          workflowRunId: 'matrix-1',
          platform: 'WINDOWS',
          architecture: 'X64',
        }),
      )
      .expect(201);

    await fixture.owner.agent
      .post(path)
      .set('Authorization', `Bearer ${fixture.owner.accessToken}`)
      .send(
        payload(fixture.repository.id, {
          workflowRunId: 'matrix-1',
          platform: 'MACOS',
          architecture: 'ARM64',
        }),
      )
      .expect(201);

    expect(
      await prisma.desktopBuild.count({
        where: {
          workflowRunId: 'matrix-1',
        },
      }),
    ).toBe(2);
  });

  it('ignores an unrelated repository', async () => {
    const fixture = await createLinkedDesktopFixture(app, prisma);

    const unrelated = await createRepository(prisma, fixture.owner.workspaceId, null);

    const response = await fixture.owner.agent
      .post(`${buildPath(fixture.owner.workspaceId, fixture.desktopApp.id)}/ingest/github`)
      .set('Authorization', `Bearer ${fixture.owner.accessToken}`)
      .send(payload(unrelated.id));

    expect(response.status).toBe(201);
    expect(response.body).toEqual({
      ignored: true,
      reason: expect.any(String),
      build: null,
    });
  });

  it('filters builds by platform, architecture and status', async () => {
    const fixture = await createLinkedDesktopFixture(app, prisma);
    const ingest = `${buildPath(fixture.owner.workspaceId, fixture.desktopApp.id)}/ingest/github`;

    await fixture.owner.agent
      .post(ingest)
      .set('Authorization', `Bearer ${fixture.owner.accessToken}`)
      .send(
        payload(fixture.repository.id, {
          workflowRunId: 'filter-1',
          platform: 'WINDOWS',
          architecture: 'X64',
          status: 'SUCCESS',
        }),
      )
      .expect(201);

    await fixture.owner.agent
      .post(ingest)
      .set('Authorization', `Bearer ${fixture.owner.accessToken}`)
      .send(
        payload(fixture.repository.id, {
          workflowRunId: 'filter-2',
          platform: 'MACOS',
          architecture: 'ARM64',
          status: 'FAILED',
        }),
      )
      .expect(201);

    const response = await fixture.owner.agent
      .get(buildPath(fixture.owner.workspaceId, fixture.desktopApp.id))
      .query({
        platform: 'MACOS',
        architecture: 'ARM64',
        status: 'FAILED',
      })
      .set('Authorization', `Bearer ${fixture.owner.accessToken}`);

    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(1);
    expect(response.body[0]).toMatchObject({
      workflowRunId: 'filter-2',
      platform: 'MACOS',
      architecture: 'ARM64',
      status: 'FAILED',
    });
  });

  it('rejects cross-workspace build reads', async () => {
    const fixture = await createLinkedDesktopFixture(app, prisma);
    const outsider = await registerWorkspaceTestUser(app, prisma);

    const response = await outsider.agent
      .get(buildPath(fixture.owner.workspaceId, fixture.desktopApp.id))
      .set('Authorization', `Bearer ${outsider.accessToken}`);

    expect(response.status).toBe(403);
  });
});
F;
