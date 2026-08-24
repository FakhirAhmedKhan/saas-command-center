import { createTestApp } from '../helpers/create-test-app';
import { resetDatabase } from '../helpers/database';
import { createLinkedDesktopFixture, ingestSuccessfulBuild } from './helpers/desktop-test-fixtures';
import type { INestApplication } from '@nestjs/common';
import { PrismaService } from 'src/database/prisma.service';

describe('Desktop Tests E2E', () => {
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

  function buildTestsPath(workspaceId: string, desktopAppId: string, buildId: string) {
    return `/api/v1/workspaces/${workspaceId}/desktop-apps/${desktopAppId}/builds/${buildId}/tests`;
  }

  it('stores counts and failure details', async () => {
    const fixture = await createLinkedDesktopFixture(app, prisma);
    const build = await ingestSuccessfulBuild(fixture.owner, fixture.desktopApp.id, fixture.repository.id);
    const response = await fixture.owner.agent
      .post(buildTestsPath(fixture.owner.workspaceId, fixture.desktopApp.id, build.id))
      .set('Authorization', `Bearer ${fixture.owner.accessToken}`)
      .send({
        type: 'E2E',
        status: 'FAILED',
        passed: 18,
        failed: 1,
        skipped: 2,
        durationMs: 55000,
        failures: [
          {
            suite: 'Installer',
            testName: 'installs cleanly',
            message: 'Installer exited with code 1603',
            file: 'tests/installer.spec.ts',
            line: 42,
          },
        ],
      });

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({
      type: 'E2E',
      status: 'FAILED',
      passed: 18,
      failed: 1,
      skipped: 2,
      total: 21,
    });

    expect(response.body.failures).toHaveLength(1);
    expect(response.body.failures[0].testName).toBe('installs cleanly');
  });

  it('re-ingestion replaces duplicate run/failures instead of duplicating them', async () => {
    const fixture = await createLinkedDesktopFixture(app, prisma);
    const build = await ingestSuccessfulBuild(fixture.owner, fixture.desktopApp.id, fixture.repository.id);
    const endpoint = buildTestsPath(fixture.owner.workspaceId, fixture.desktopApp.id, build.id);

    await fixture.owner.agent
      .post(endpoint)
      .set('Authorization', `Bearer ${fixture.owner.accessToken}`)
      .send({
        type: 'UNIT',
        status: 'FAILED',
        passed: 10,
        failed: 1,
        skipped: 0,
        failures: [
          {
            testName: 'old failure',
          },
        ],
      })
      .expect(201);

    await fixture.owner.agent
      .post(endpoint)
      .set('Authorization', `Bearer ${fixture.owner.accessToken}`)
      .send({
        type: 'UNIT',
        status: 'PASSED',
        passed: 11,
        failed: 0,
        skipped: 0,
        failures: [],
      })
      .expect(201);

    expect(
      await prisma.desktopTestRun.count({
        where: {
          buildId: build.id,
          type: 'UNIT',
        },
      }),
    ).toBe(1);

    const run = await prisma.desktopTestRun.findFirstOrThrow({
      where: {
        buildId: build.id,
        type: 'UNIT',
      },
    });

    expect(run.status).toBe('PASSED');

    expect(
      await prisma.desktopTestFailure.count({
        where: {
          testRunId: run.id,
        },
      }),
    ).toBe(0);
  });

  it('returns aggregate app test summary', async () => {
    const fixture = await createLinkedDesktopFixture(app, prisma);
    const build = await ingestSuccessfulBuild(fixture.owner, fixture.desktopApp.id, fixture.repository.id);
    const endpoint = buildTestsPath(fixture.owner.workspaceId, fixture.desktopApp.id, build.id);

    await fixture.owner.agent
      .post(endpoint)
      .set('Authorization', `Bearer ${fixture.owner.accessToken}`)
      .send({
        type: 'UNIT',
        status: 'PASSED',
        passed: 20,
        failed: 0,
        skipped: 1,
      })
      .expect(201);

    await fixture.owner.agent
      .post(endpoint)
      .set('Authorization', `Bearer ${fixture.owner.accessToken}`)
      .send({
        type: 'E2E',
        status: 'FAILED',
        passed: 4,
        failed: 2,
        skipped: 0,
      })
      .expect(201);

    const response = await fixture.owner.agent.get(`/api/v1/workspaces/${fixture.owner.workspaceId}/desktop-apps/${fixture.desktopApp.id}/tests/summary`).set('Authorization', `Bearer ${fixture.owner.accessToken}`);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      totalRuns: 2,
      passedRuns: 1,
      failedRuns: 1,
      passedTests: 24,
      failedTests: 2,
      skippedTests: 1,
    });
  });

  it('cannot attach tests to a build from another desktop app', async () => {
    const fixtureA = await createLinkedDesktopFixture(app, prisma);
    const fixtureB = await createLinkedDesktopFixture(app, prisma);
    const buildA = await ingestSuccessfulBuild(fixtureA.owner, fixtureA.desktopApp.id, fixtureA.repository.id);
    const response = await fixtureB.owner.agent
      .post(buildTestsPath(fixtureB.owner.workspaceId, fixtureB.desktopApp.id, buildA.id))
      .set('Authorization', `Bearer ${fixtureB.owner.accessToken}`)
      .send({
        type: 'UNIT',
        status: 'PASSED',
        passed: 1,
        failed: 0,
        skipped: 0,
      });

    expect([403, 404]).toContain(response.status);
  });
});
