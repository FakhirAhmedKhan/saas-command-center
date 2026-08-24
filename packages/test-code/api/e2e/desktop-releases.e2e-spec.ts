import type { INestApplication } from '@nestjs/common';
import { PrismaService } from 'src/database/prisma.service';
import { createTestApp } from '../helpers/create-test-app';
import { resetDatabase } from '../helpers/database';
import { registerWorkspaceTestUser } from '../helpers/workspace';
import { buildPath, createLinkedDesktopFixture, ingestSuccessfulBuild } from './helpers/desktop-test-fixtures';

const API = '/api/v1';

describe('Desktop Releases E2E', () => {
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

  async function createSuccessfulFixture() {
    const fixture = await createLinkedDesktopFixture(app, prisma);
    const build = await ingestSuccessfulBuild(fixture.owner, fixture.desktopApp.id, fixture.repository.id);

    const artifactResponse = await fixture.owner.agent
      .post(`${buildPath(fixture.owner.workspaceId, fixture.desktopApp.id)}/${build.id}/artifacts`)
      .set('Authorization', `Bearer ${fixture.owner.accessToken}`)
      .send({
        providerArtifactId: `phase11-artifact-${Date.now()}`,
        platform: 'WINDOWS',
        architecture: 'X64',
        type: 'MSI',
        fileName: 'command-center-1.0.0-x64.msi',
        sizeBytes: 88_000_000,
        checksum: 'sha256:phase11',
        externalUrl: 'https://example.test/artifacts/command-center-1.0.0-x64.msi',
      });

    expect(artifactResponse.status).toBe(201);

    return {
      ...fixture,
      build,
      artifact: artifactResponse.body as {
        id: string;
        fileName: string;
      },
    };
  }

  function releasePath(workspaceId: string, desktopAppId: string) {
    return `${API}/workspaces/${workspaceId}` + `/desktop-apps/${desktopAppId}/releases`;
  }

  function createRelease(fixture: Awaited<ReturnType<typeof createSuccessfulFixture>>, overrides: Record<string, unknown> = {}) {
    return fixture.owner.agent
      .post(releasePath(fixture.owner.workspaceId, fixture.desktopApp.id))
      .set('Authorization', `Bearer ${fixture.owner.accessToken}`)
      .send({
        buildId: fixture.build.id,
        channel: 'STABLE',
        ...overrides,
      });
  }

  it('rejects anonymous release access', async () => {
    const fixture = await createSuccessfulFixture();

    await fixture.owner.agent.get(releasePath(fixture.owner.workspaceId, fixture.desktopApp.id)).expect(401);
  });

  it('creates a release from a successful build and inherits target metadata', async () => {
    const fixture = await createSuccessfulFixture();

    const response = await createRelease(fixture, {
      releaseNotes: 'Stable desktop release',
    });

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({
      workspaceId: fixture.owner.workspaceId,
      desktopAppId: fixture.desktopApp.id,
      buildId: fixture.build.id,
      version: '1.0.0',
      buildNumber: '100',
      channel: 'STABLE',
      platform: 'WINDOWS',
      architecture: 'X64',
      status: 'DRAFT',
      releaseNotes: 'Stable desktop release',
      releasedAt: null,
    });
  });

  it('returns source build and artifact traceability', async () => {
    const fixture = await createSuccessfulFixture();

    const response = await createRelease(fixture);

    expect(response.status).toBe(201);
    expect(response.body.build).toMatchObject({
      id: fixture.build.id,
      workflowRunId: fixture.build.workflowRunId,
    });
    expect(response.body.build.artifacts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: fixture.artifact.id,
          fileName: fixture.artifact.fileName,
          sizeBytes: 88_000_000,
        }),
      ]),
    );
  });

  it('rejects a failed build', async () => {
    const fixture = await createLinkedDesktopFixture(app, prisma);

    const failedBuildResponse = await fixture.owner.agent
      .post(`${buildPath(fixture.owner.workspaceId, fixture.desktopApp.id)}/ingest/github`)
      .set('Authorization', `Bearer ${fixture.owner.accessToken}`)
      .send({
        repositoryId: fixture.repository.id,
        workflowRunId: `phase11-failed-${Date.now()}`,
        commitSha: 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
        branch: 'main',
        version: '1.0.1',
        buildNumber: '101',
        platform: 'WINDOWS',
        architecture: 'X64',
        status: 'FAILED',
        startedAt: '2026-08-23T01:00:00.000Z',
        completedAt: '2026-08-23T01:02:00.000Z',
      });

    expect(failedBuildResponse.status).toBe(201);

    await fixture.owner.agent
      .post(releasePath(fixture.owner.workspaceId, fixture.desktopApp.id))
      .set('Authorization', `Bearer ${fixture.owner.accessToken}`)
      .send({
        buildId: failedBuildResponse.body.build.id,
        channel: 'BETA',
      })
      .expect(400);
  });

  it('rejects a nonexistent build', async () => {
    const fixture = await createSuccessfulFixture();

    await fixture.owner.agent
      .post(releasePath(fixture.owner.workspaceId, fixture.desktopApp.id))
      .set('Authorization', `Bearer ${fixture.owner.accessToken}`)
      .send({
        buildId: '11111111-1111-4111-8111-111111111111',
        channel: 'BETA',
      })
      .expect(404);
  });

  it('persists explicit version, build number, and update channel', async () => {
    const fixture = await createSuccessfulFixture();

    const response = await createRelease(fixture, {
      channel: 'BETA',
      version: '2.5.0-beta.2',
      buildNumber: '190',
    });

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({
      version: '2.5.0-beta.2',
      buildNumber: '190',
      channel: 'BETA',
    });
  });

  it('rejects an invalid update channel', async () => {
    const fixture = await createSuccessfulFixture();

    await createRelease(fixture, {
      channel: 'PRODUCTION',
    }).expect(400);
  });

  it('allows the same build in different channels and rejects duplicate build/channel', async () => {
    const fixture = await createSuccessfulFixture();

    await createRelease(fixture, {
      channel: 'BETA',
    }).expect(201);

    await createRelease(fixture, {
      channel: 'BETA',
    }).expect(409);

    await createRelease(fixture, {
      channel: 'STABLE',
    }).expect(201);
  });

  it('transitions DRAFT -> READY -> PUBLISHED -> ROLLED_BACK', async () => {
    const fixture = await createSuccessfulFixture();
    const created = await createRelease(fixture);

    expect(created.status).toBe(201);

    const path = `${releasePath(fixture.owner.workspaceId, fixture.desktopApp.id)}/${created.body.id}/status`;

    await fixture.owner.agent.patch(path).set('Authorization', `Bearer ${fixture.owner.accessToken}`).send({ status: 'READY' }).expect(200);

    const published = await fixture.owner.agent
      .patch(path)
      .set('Authorization', `Bearer ${fixture.owner.accessToken}`)
      .send({ status: 'PUBLISHED' })
      .expect(200);

    expect(published.body.status).toBe('PUBLISHED');
    expect(published.body.releasedAt).not.toBeNull();

    const rolledBack = await fixture.owner.agent
      .patch(path)
      .set('Authorization', `Bearer ${fixture.owner.accessToken}`)
      .send({ status: 'ROLLED_BACK' })
      .expect(200);

    expect(rolledBack.body.status).toBe('ROLLED_BACK');
    expect(rolledBack.body.releasedAt).toBe(published.body.releasedAt);
  });

  it('rejects invalid lifecycle transitions', async () => {
    const fixture = await createSuccessfulFixture();
    const created = await createRelease(fixture);

    expect(created.status).toBe(201);

    await fixture.owner.agent
      .patch(`${releasePath(fixture.owner.workspaceId, fixture.desktopApp.id)}/${created.body.id}/status`)
      .set('Authorization', `Bearer ${fixture.owner.accessToken}`)
      .send({ status: 'PUBLISHED' })
      .expect(400);
  });

  it('keeps repeated same-status updates idempotent', async () => {
    const fixture = await createSuccessfulFixture();
    const created = await createRelease(fixture);

    expect(created.status).toBe(201);

    const response = await fixture.owner.agent
      .patch(`${releasePath(fixture.owner.workspaceId, fixture.desktopApp.id)}/${created.body.id}/status`)
      .set('Authorization', `Bearer ${fixture.owner.accessToken}`)
      .send({ status: 'DRAFT' })
      .expect(200);

    expect(response.body.status).toBe('DRAFT');
  });

  it('rejects a build belonging to another workspace', async () => {
    const first = await createSuccessfulFixture();
    const second = await createSuccessfulFixture();

    await first.owner.agent
      .post(releasePath(first.owner.workspaceId, first.desktopApp.id))
      .set('Authorization', `Bearer ${first.owner.accessToken}`)
      .send({
        buildId: second.build.id,
        channel: 'STABLE',
      })
      .expect(404);
  });

  it('rejects a user from another workspace', async () => {
    const fixture = await createSuccessfulFixture();
    const outsider = await registerWorkspaceTestUser(app, prisma);

    await outsider.agent.get(releasePath(fixture.owner.workspaceId, fixture.desktopApp.id)).set('Authorization', `Bearer ${outsider.accessToken}`).expect(403);
  });

  it('rejects cross-workspace release lookup', async () => {
    const first = await createSuccessfulFixture();
    const second = await createSuccessfulFixture();
    const created = await createRelease(second);

    expect(created.status).toBe(201);

    await first.owner.agent
      .get(`${releasePath(first.owner.workspaceId, first.desktopApp.id)}/${created.body.id}`)
      .set('Authorization', `Bearer ${first.owner.accessToken}`)
      .expect(404);
  });

  it('orders release history newest first', async () => {
    const fixture = await createSuccessfulFixture();

    const first = await createRelease(fixture, {
      channel: 'BETA',
    });
    const second = await createRelease(fixture, {
      channel: 'STABLE',
    });

    expect(first.status).toBe(201);
    expect(second.status).toBe(201);

    await prisma.desktopRelease.update({
      where: { id: first.body.id },
      data: {
        createdAt: new Date('2026-08-23T01:00:00.000Z'),
      },
    });

    await prisma.desktopRelease.update({
      where: { id: second.body.id },
      data: {
        createdAt: new Date('2026-08-23T02:00:00.000Z'),
      },
    });

    const list = await fixture.owner.agent
      .get(releasePath(fixture.owner.workspaceId, fixture.desktopApp.id))
      .set('Authorization', `Bearer ${fixture.owner.accessToken}`)
      .expect(200);

    expect(list.body.map((item: { id: string }) => item.id)).toEqual([second.body.id, first.body.id]);
  });

  it('filters release history by channel/status/platform/architecture', async () => {
    const fixture = await createSuccessfulFixture();

    await createRelease(fixture, {
      channel: 'BETA',
    }).expect(201);
    await createRelease(fixture, {
      channel: 'STABLE',
    }).expect(201);

    const response = await fixture.owner.agent
      .get(releasePath(fixture.owner.workspaceId, fixture.desktopApp.id))
      .query({
        channel: 'STABLE',
        status: 'DRAFT',
        platform: 'WINDOWS',
        architecture: 'X64',
      })
      .set('Authorization', `Bearer ${fixture.owner.accessToken}`)
      .expect(200);

    expect(response.body).toHaveLength(1);
    expect(response.body[0]).toMatchObject({
      channel: 'STABLE',
      status: 'DRAFT',
      platform: 'WINDOWS',
      architecture: 'X64',
    });
  });

  it('rejects release creation for an archived desktop application', async () => {
    const fixture = await createSuccessfulFixture();

    const archiveResponse = await fixture.owner.agent
      .delete(`${API}/workspaces/${fixture.owner.workspaceId}` + `/desktop-apps/${fixture.desktopApp.id}`)
      .set('Authorization', `Bearer ${fixture.owner.accessToken}`);

    expect([200, 204]).toContain(archiveResponse.status);

    await createRelease(fixture).expect(400);
  });
});
