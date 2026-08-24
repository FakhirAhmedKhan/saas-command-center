import { createTestApp } from '../helpers/create-test-app';
import { resetDatabase } from '../helpers/database';
import { createLinkedDesktopFixture, ingestSuccessfulBuild } from './helpers/desktop-test-fixtures';
import type { INestApplication } from '@nestjs/common';
import { PrismaService } from 'src/database/prisma.service';

describe('Desktop Build Artifacts E2E', () => {
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

  function path(workspaceId: string, desktopAppId: string, buildId: string) {
    return `/api/v1/workspaces/${workspaceId}/desktop-apps/${desktopAppId}/builds/${buildId}/artifacts`;
  }

  it('stores multiple artifact types for a build', async () => {
    const fixture = await createLinkedDesktopFixture(app, prisma);
    const build = await ingestSuccessfulBuild(fixture.owner, fixture.desktopApp.id, fixture.repository.id);
    const endpoint = path(fixture.owner.workspaceId, fixture.desktopApp.id, build.id);

    await fixture.owner.agent
      .post(endpoint)
      .set('Authorization', `Bearer ${fixture.owner.accessToken}`)
      .send({
        providerArtifactId: 'msi-1',
        platform: 'WINDOWS',
        architecture: 'X64',
        type: 'MSI',
        fileName: 'CommandCenter-1.0.0-x64.msi',
        sizeBytes: 1000000,
        checksum: 'sha256:abc',
        externalUrl: 'https://github.com/example/actions/artifacts/1',
      })
      .expect(201);

    await fixture.owner.agent
      .post(endpoint)
      .set('Authorization', `Bearer ${fixture.owner.accessToken}`)
      .send({
        providerArtifactId: 'zip-1',
        platform: 'WINDOWS',
        architecture: 'X64',
        type: 'ZIP',
        fileName: 'CommandCenter-portable.zip',
        sizeBytes: 2000000,
      })
      .expect(201);

    const response = await fixture.owner.agent.get(endpoint).set('Authorization', `Bearer ${fixture.owner.accessToken}`);

    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(2);
    expect(response.body.map((artifact: { type: string }) => artifact.type)).toEqual(expect.arrayContaining(['MSI', 'ZIP']));
  });

  it('is idempotent for duplicate provider artifact ID', async () => {
    const fixture = await createLinkedDesktopFixture(app, prisma);
    const build = await ingestSuccessfulBuild(fixture.owner, fixture.desktopApp.id, fixture.repository.id);
    const endpoint = path(fixture.owner.workspaceId, fixture.desktopApp.id, build.id);
    const payload = {
      providerArtifactId: 'duplicate-1',
      platform: 'WINDOWS',
      architecture: 'X64',
      type: 'EXE',
      fileName: 'old.exe',
    };

    await fixture.owner.agent.post(endpoint).set('Authorization', `Bearer ${fixture.owner.accessToken}`).send(payload).expect(201);

    await fixture.owner.agent
      .post(endpoint)
      .set('Authorization', `Bearer ${fixture.owner.accessToken}`)
      .send({
        ...payload,
        fileName: 'new.exe',
      })
      .expect(201);

    expect(
      await prisma.desktopBuildArtifact.count({
        where: {
          buildId: build.id,
          providerArtifactId: 'duplicate-1',
        },
      }),
    ).toBe(1);

    expect(
      (
        await prisma.desktopBuildArtifact.findFirstOrThrow({
          where: {
            buildId: build.id,
            providerArtifactId: 'duplicate-1',
          },
        })
      ).fileName,
    ).toBe('new.exe');
  });

  it('rejects artifact matrix metadata that does not match the build', async () => {
    const fixture = await createLinkedDesktopFixture(app, prisma);
    const build = await ingestSuccessfulBuild(fixture.owner, fixture.desktopApp.id, fixture.repository.id);
    const response = await fixture.owner.agent
      .post(path(fixture.owner.workspaceId, fixture.desktopApp.id, build.id))
      .set('Authorization', `Bearer ${fixture.owner.accessToken}`)
      .send({
        providerArtifactId: 'bad-matrix',
        platform: 'MACOS',
        architecture: 'ARM64',
        type: 'DMG',
        fileName: 'wrong.dmg',
      });

    expect(response.status).toBe(400);
  });

  it('returns 404 for an unknown build', async () => {
    const fixture = await createLinkedDesktopFixture(app, prisma);
    const { randomUUID } = await import('node:crypto');
    const response = await fixture.owner.agent
      .post(path(fixture.owner.workspaceId, fixture.desktopApp.id, randomUUID()))
      .set('Authorization', `Bearer ${fixture.owner.accessToken}`)
      .send({
        providerArtifactId: 'missing',
        platform: 'WINDOWS',
        architecture: 'X64',
        type: 'MSI',
        fileName: 'missing.msi',
      });

    expect(response.status).toBe(404);
  });

  it('allows artifact metadata without a remote URL', async () => {
    const fixture = await createLinkedDesktopFixture(app, prisma);
    const build = await ingestSuccessfulBuild(fixture.owner, fixture.desktopApp.id, fixture.repository.id);
    const response = await fixture.owner.agent
      .post(path(fixture.owner.workspaceId, fixture.desktopApp.id, build.id))
      .set('Authorization', `Bearer ${fixture.owner.accessToken}`)
      .send({
        providerArtifactId: 'expired-provider-artifact',
        platform: 'WINDOWS',
        architecture: 'X64',
        type: 'MSI',
        fileName: 'metadata-only.msi',
        externalUrl: null,
      });

    expect(response.status).toBe(201);
    expect(response.body.externalUrl).toBeNull();
  });
});
