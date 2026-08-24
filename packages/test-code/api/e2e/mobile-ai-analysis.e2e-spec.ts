import { withBearer } from '../helpers/auth';
import { createTestApp } from '../helpers/create-test-app';
import { resetDatabase } from '../helpers/database';
import { registerWorkspaceTestUser } from '../helpers/workspace';
import type { INestApplication } from '@nestjs/common';
import { PrismaService } from 'src/database/prisma.service';
import { RepositoryProvider } from 'src/generated/prisma/enums';
import type { MobileAnalysisProvider, MobileAnalysisProviderInput } from 'src/modules/mobile-apps/analysis/mobile-analysis-provider.interface';
import { MobileAnalysisService } from 'src/modules/mobile-apps/services/mobile-analysis.service';

const API = '/api/v1';

class FakeMobileAiProvider implements MobileAnalysisProvider {
  inputs: MobileAnalysisProviderInput[] = [];

  fail = false;

  async analyze(input: MobileAnalysisProviderInput) {
    this.inputs.push(input);

    if (this.fail) {
      throw new Error('fake AI failed');
    }

    return 'Build failure correlates with two failed UI tests. ' + 'The available evidence does not prove causation.';
  }
}

describe('Mobile AI Analysis E2E', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let fake: FakeMobileAiProvider;
  let owner: Awaited<ReturnType<typeof registerWorkspaceTestUser>>;
  let workspaceId: string;
  let mobileAppId: string;
  let applicationId: string;
  let buildId: string;
  let sequence = 0;

  beforeEach(async () => {
    app = await createTestApp();

    prisma = app.get(PrismaService);

    await resetDatabase(prisma);

    sequence += 1;

    owner = await registerWorkspaceTestUser(app, prisma);

    workspaceId = owner.workspaceId;

    const mobile = await owner.agent
      .post(`${API}/workspaces/${workspaceId}/mobile-apps`)
      .set(withBearer(owner.accessToken))
      .send({
        name: `AI Analysis App ${sequence}`,

        platform: 'ANDROID',

        framework: 'ANDROID_NATIVE',

        packageId: `com.commandcenter.ai${sequence}`,
      })
      .expect(201);

    mobileAppId = mobile.body.id;

    applicationId = mobile.body.applicationId;

    const installation = await prisma.repositoryInstallation.create({
      data: {
        workspaceId,

        provider: RepositoryProvider.GITHUB,

        externalInstallationId: `ai-install-${sequence}`,

        accountLogin: 'mobile-ai',

        accountType: 'Organization',
      },
    });
    const repository = await prisma.repositoryConnection.create({
      data: {
        workspaceId,

        installationId: installation.id,

        applicationId,

        provider: RepositoryProvider.GITHUB,

        externalRepoId: `ai-repo-${sequence}`,

        owner: 'mobile-ai',

        name: 'application',

        fullName: 'mobile-ai/application',

        defaultBranch: 'main',

        isPrivate: true,

        htmlUrl: 'https://github.com/mobile-ai/application',

        archived: false,

        isAvailable: true,
      },
    });
    const build = await prisma.mobileBuild.create({
      data: {
        workspaceId,
        mobileAppId,

        repositoryId: repository.id,

        workflowRunId: `ai-build-${sequence}`,

        source: 'GITHUB_ACTIONS',

        commitSha: 'cccccccccccccccccccccccccccccccccccccccc',

        branch: 'main',

        version: '2.0.0',

        buildNumber: '200',

        platform: 'ANDROID',

        status: 'FAILED',
      },
    });

    buildId = build.id;

    const testRun = await prisma.mobileTestRun.create({
      data: {
        buildId: build.id,

        type: 'UI',

        status: 'FAILED',

        passed: 8,

        failed: 2,

        skipped: 0,

        total: 10,
      },
    });

    await prisma.mobileTestFailure.create({
      data: {
        testRunId: testRun.id,

        suite: 'Checkout UI',

        testName: 'opens checkout',

        message: 'UI test failed',

        file: 'CheckoutTest.kt',

        line: 42,
      },
    });

    fake = new FakeMobileAiProvider();

    app.get(MobileAnalysisService).setProviderForTesting(fake);
  });

  afterEach(async () => {
    await app.close();
  });

  it('build analysis receives build/test context', async () => {
    const response = await owner.agent
      .post(`${API}/workspaces/${workspaceId}/mobile-apps/${mobileAppId}/analysis`)
      .set(withBearer(owner.accessToken))
      .send({
        action: 'BUILD_FAILURE',

        buildId,
      })
      .expect(201);

    expect(response.body.evidence.some((item: { type: string }) => item.type === 'BUILD')).toBe(true);

    expect(response.body.evidence.some((item: { type: string }) => item.type === 'TEST')).toBe(true);

    expect(fake.inputs[0]!.prompt).toContain(buildId);

    expect(fake.inputs[0]!.prompt).toContain('failed');
  });

  it('telemetry credentials are excluded from AI prompt', async () => {
    await prisma.mobileTelemetryIntegration.create({
      data: {
        workspaceId,
        mobileAppId,

        provider: 'SENTRY',

        status: 'CONNECTED',

        externalProjectId: 'mobile',

        encryptedConfig: 'THIS_MUST_NEVER_ENTER_AI_CONTEXT',
      },
    });

    await owner.agent
      .post(`${API}/workspaces/${workspaceId}/mobile-apps/${mobileAppId}/analysis`)
      .set(withBearer(owner.accessToken))
      .send({
        action: 'RELEASE_HEALTH',
      })
      .expect(201);

    expect(fake.inputs[0]!.prompt).not.toContain('THIS_MUST_NEVER_ENTER_AI_CONTEXT');

    expect(fake.inputs[0]!.prompt).not.toContain('encryptedConfig');
  });

  it('provider failure returns safe error', async () => {
    fake.fail = true;

    const response = await owner.agent.post(`${API}/workspaces/${workspaceId}/mobile-apps/${mobileAppId}/analysis`).set(withBearer(owner.accessToken)).send({
      action: 'RELEASE_HEALTH',
    });

    expect(response.status).toBe(502);

    expect(JSON.stringify(response.body)).not.toContain('fake AI failed');
  });
});
