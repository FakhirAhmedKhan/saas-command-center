import type { INestApplication } from '@nestjs/common';

import { PrismaService } from 'src/database/prisma.service';

import { RepositoryProvider } from 'src/generated/prisma/enums';

import { GithubCodeService } from 'src/modules/repositories/services/github-code.service';

import { withBearer } from '../helpers/auth';

import { createTestApp } from '../helpers/create-test-app';

import { resetDatabase } from '../helpers/database';

import { registerWorkspaceTestUser } from '../helpers/workspace';

const API = '/api/v1';

describe('Mobile Project Detection E2E', () => {
  let app: INestApplication;

  let prisma: PrismaService;

  let githubCode: GithubCodeService;

  beforeEach(async () => {
    app = await createTestApp();

    prisma = app.get(PrismaService);

    githubCode = app.get(GithubCodeService);

    await resetDatabase(prisma);
  });

  afterEach(async () => {
    jest.restoreAllMocks();

    await app.close();
  });

  async function createFixture() {
    const owner = await registerWorkspaceTestUser(app, prisma);

    const mobileResponse = await owner.agent.post(`${API}/workspaces/${owner.workspaceId}/mobile-apps`).set(withBearer(owner.accessToken)).send({
      name: 'Android Detection',

      platform: 'ANDROID',

      framework: 'ANDROID_NATIVE',
    });

    expect(mobileResponse.status).toBe(201);

    const installation = await prisma.repositoryInstallation.create({
      data: {
        workspaceId: owner.workspaceId,

        provider: RepositoryProvider.GITHUB,

        externalInstallationId: '990001',

        accountLogin: 'command-center',

        accountType: 'Organization',
      },
    });

    const repository = await prisma.repositoryConnection.create({
      data: {
        workspaceId: owner.workspaceId,

        installationId: installation.id,

        applicationId: mobileResponse.body.applicationId,

        provider: RepositoryProvider.GITHUB,

        externalRepoId: '880001',

        owner: 'command-center',

        name: 'android-app',

        fullName: 'command-center/android-app',

        defaultBranch: 'main',

        isPrivate: true,

        htmlUrl: 'https://github.com/command-center/android-app',

        archived: false,

        isAvailable: true,
      },
    });

    return {
      owner,

      mobile: mobileResponse.body,

      repository,
    };
  }

  it('detects Android metadata from linked repository', async () => {
    const fixture = await createFixture();

    jest.spyOn(githubCode, 'getTree').mockResolvedValue({
      sha: 'tree-sha',

      truncated: false,

      entries: [
        {
          path: 'settings.gradle.kts',

          type: 'file',

          sha: '1',

          size: 20,
        },

        {
          path: 'app/build.gradle.kts',

          type: 'file',

          sha: '2',

          size: 300,
        },

        {
          path: 'app/src/main/AndroidManifest.xml',

          type: 'file',

          sha: '3',

          size: 100,
        },
      ],
    } as never);

    jest.spyOn(githubCode, 'getFile').mockImplementation(async (_installationId, _owner, _repository, path) => {
      const contents: Record<string, string> = {
        'settings.gradle.kts': 'rootProject.name = "Karwa"',

        'app/build.gradle.kts': `
                  android {
                    namespace = "com.karwa.passenger"

                    defaultConfig {
                      applicationId = "com.karwa.passenger"
                      minSdk = 26
                      targetSdk = 36
                      versionCode = 815
                      versionName = "6.14.0"
                    }
                  }
                `,

        'app/src/main/AndroidManifest.xml': '<manifest package="com.karwa.passenger" />',
      };

      const content = contents[path];

      if (!content) {
        return null;
      }

      return {
        name: path.split('/').at(-1) ?? path,

        path,

        sha: 'sha',

        size: content.length,

        encoding: 'base64',

        content: Buffer.from(content).toString('base64'),
      };
    });

    const response = await fixture.owner.agent
      .post(`${API}/workspaces/${fixture.owner.workspaceId}` + `/mobile-apps/${fixture.mobile.id}/detect`)
      .set(withBearer(fixture.owner.accessToken));

    expect(response.status).toBe(201);

    expect(response.body.mobileDetected).toBe(true);

    expect(response.body.primaryProject).toMatchObject({
      platform: 'ANDROID',

      framework: 'ANDROID_NATIVE',

      packageId: 'com.karwa.passenger',

      minOsVersion: '26',

      targetOsVersion: '36',

      currentVersion: '6.14.0',

      currentBuildNumber: '815',
    });
  });

  it('rejects detection when no repository is linked', async () => {
    const owner = await registerWorkspaceTestUser(app, prisma);

    const mobile = await owner.agent.post(`${API}/workspaces/${owner.workspaceId}/mobile-apps`).set(withBearer(owner.accessToken)).send({
      name: 'No Repository',

      platform: 'ANDROID',

      framework: 'ANDROID_NATIVE',
    });

    const response = await owner.agent.post(`${API}/workspaces/${owner.workspaceId}/mobile-apps/${mobile.body.id}/detect`).set(withBearer(owner.accessToken));

    expect(response.status).toBe(400);
  });

  it('does not crash when metadata file exceeds limit', async () => {
    const fixture = await createFixture();

    jest.spyOn(githubCode, 'getTree').mockResolvedValue({
      sha: 'tree',

      truncated: false,

      entries: [
        {
          path: 'settings.gradle.kts',

          type: 'file',

          sha: '1',

          size: 500_000,
        },
      ],
    } as never);

    const fileSpy = jest.spyOn(githubCode, 'getFile');

    const response = await fixture.owner.agent
      .post(`${API}/workspaces/${fixture.owner.workspaceId}/mobile-apps/${fixture.mobile.id}/detect`)
      .set(withBearer(fixture.owner.accessToken));

    expect(response.status).toBe(201);

    expect(fileSpy).not.toHaveBeenCalled();

    expect(response.body.warnings.length).toBeGreaterThan(0);
  });

  it('protects detection by workspace', async () => {
    const fixture = await createFixture();

    const anotherWorkspace = await registerWorkspaceTestUser(app, prisma);

    const response = await anotherWorkspace.agent
      .post(`${API}/workspaces/${fixture.owner.workspaceId}/mobile-apps/${fixture.mobile.id}/detect`)
      .set(withBearer(anotherWorkspace.accessToken));

    expect([403, 404]).toContain(response.status);
  });
});
