import type { INestApplication } from '@nestjs/common';

import { PrismaService } from 'src/database/prisma.service';

import { MobileBuildStatus, MobilePlatform, RepositoryProvider } from 'src/generated/prisma/enums';

import { withBearer } from '../helpers/auth';
import { createTestApp } from '../helpers/create-test-app';
import { resetDatabase } from '../helpers/database';
import { registerWorkspaceTestUser } from '../helpers/workspace';

const API = '/api/v1';

describe('Mobile Tests E2E', () => {
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

  async function fixture() {
    const owner = await registerWorkspaceTestUser(app, prisma);

    const mobile = await owner.agent.post(`${API}/workspaces/${owner.workspaceId}/mobile-apps`).set(withBearer(owner.accessToken)).send({
      name: 'Test App',

      platform: 'ANDROID',

      framework: 'ANDROID_NATIVE',
    });

    const installation = await prisma.repositoryInstallation.create({
      data: {
        workspaceId: owner.workspaceId,

        provider: RepositoryProvider.GITHUB,

        externalInstallationId: 'phase9-install',

        accountLogin: 'command-center',

        accountType: 'Organization',
      },
    });

    const repository = await prisma.repositoryConnection.create({
      data: {
        workspaceId: owner.workspaceId,

        installationId: installation.id,

        applicationId: mobile.body.applicationId,

        provider: RepositoryProvider.GITHUB,

        externalRepoId: 'phase9-repo',

        owner: 'command-center',

        name: 'mobile',

        fullName: 'command-center/mobile',

        defaultBranch: 'development',

        isPrivate: true,

        htmlUrl: 'https://github.com/command-center/mobile',

        archived: false,

        isAvailable: true,
      },
    });

    const build = await prisma.mobileBuild.create({
      data: {
        workspaceId: owner.workspaceId,

        mobileAppId: mobile.body.id,

        repositoryId: repository.id,

        workflowRunId: 'phase9-workflow',

        commitSha: 'a93f14258b51e9b424c4d7cb05f98751feef272d',

        branch: 'development',

        version: '6.14.0',

        buildNumber: '815',

        platform: MobilePlatform.ANDROID,

        status: MobileBuildStatus.SUCCESS,
      },
    });

    return {
      owner,
      mobile: mobile.body,
      build,
    };
  }

  it('stores test run counts', async () => {
    const data = await fixture();

    const response = await data.owner.agent
      .post(`${API}/workspaces/${data.owner.workspaceId}/mobile-apps/${data.mobile.id}/builds/${data.build.id}/tests/ingest`)
      .set(withBearer(data.owner.accessToken))
      .send({
        type: 'UNIT',

        status: 'PASSED',

        passed: 428,
        failed: 0,
        skipped: 4,

        durationMs: 42000,
      });

    expect(response.status).toBe(201);

    expect(response.body).toMatchObject({
      type: 'UNIT',
      passed: 428,
      failed: 0,
      skipped: 4,
    });
  });

  it('stores test failure details', async () => {
    const data = await fixture();

    const response = await data.owner.agent
      .post(`${API}/workspaces/${data.owner.workspaceId}/mobile-apps/${data.mobile.id}/builds/${data.build.id}/tests/ingest`)
      .set(withBearer(data.owner.accessToken))
      .send({
        type: 'UI',

        status: 'FAILED',

        passed: 34,
        failed: 2,
        skipped: 0,

        durationMs: 68000,

        failures: [
          {
            suite: 'BookingScreen',

            testName: 'shows booking confirmation',

            message: 'Expected confirmation but none found',

            file: 'BookingScreenTest.kt',
          },
        ],
      });

    expect(response.status).toBe(201);

    expect(response.body.failures).toHaveLength(1);
  });

  it('duplicate ingestion updates rather than duplicates', async () => {
    const data = await fixture();

    const url = `${API}/workspaces/${data.owner.workspaceId}` + `/mobile-apps/${data.mobile.id}` + `/builds/${data.build.id}` + '/tests/ingest';

    const payload = {
      type: 'UNIT',
      status: 'PASSED',
      passed: 100,
      failed: 0,
      skipped: 0,
    };

    await data.owner.agent.post(url).set(withBearer(data.owner.accessToken)).send(payload).expect(201);

    await data.owner.agent
      .post(url)
      .set(withBearer(data.owner.accessToken))
      .send({
        ...payload,
        passed: 105,
      })
      .expect(201);

    expect(await prisma.mobileTestRun.count()).toBe(1);

    expect((await prisma.mobileTestRun.findFirstOrThrow()).passed).toBe(105);
  });

  it('build detail aggregates test status', async () => {
    const data = await fixture();

    await data.owner.agent
      .post(`${API}/workspaces/${data.owner.workspaceId}/mobile-apps/${data.mobile.id}/builds/${data.build.id}/tests/ingest`)
      .set(withBearer(data.owner.accessToken))
      .send({
        type: 'UNIT',
        status: 'PASSED',
        passed: 428,
        failed: 0,
        skipped: 2,
      })
      .expect(201);

    await data.owner.agent
      .post(`${API}/workspaces/${data.owner.workspaceId}/mobile-apps/${data.mobile.id}/builds/${data.build.id}/tests/ingest`)
      .set(withBearer(data.owner.accessToken))
      .send({
        type: 'UI',
        status: 'FAILED',
        passed: 34,
        failed: 2,
        skipped: 0,
      })
      .expect(201);

    const response = await data.owner.agent
      .get(`${API}/workspaces/${data.owner.workspaceId}/mobile-apps/${data.mobile.id}/builds/${data.build.id}`)
      .set(withBearer(data.owner.accessToken));

    expect(response.body.testSummary).toMatchObject({
      totalRuns: 2,
      passed: 462,
      failed: 2,
      skipped: 2,
      hasFailures: true,
    });
  });

  it('cannot attach tests to another app build', async () => {
    const first = await fixture();

    const second = await registerWorkspaceTestUser(app, prisma);

    const response = await second.agent
      .post(`${API}/workspaces/${second.workspaceId}/mobile-apps/${first.mobile.id}/builds/${first.build.id}/tests/ingest`)
      .set(withBearer(second.accessToken))
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
