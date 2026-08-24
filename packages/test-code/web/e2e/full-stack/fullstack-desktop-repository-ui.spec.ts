import { authorizedApiRequest, loginThroughUi, uniqueValue } from './fixtures/helpers';
import { readFullStackState, type FullStackState } from './fixtures/state';
import { expect, test, type APIRequestContext } from '@playwright/test';

let state: FullStackState;

test.describe.configure({
  mode: 'serial',
});

async function createDesktopApplication(request: APIRequestContext) {
  const response = await authorizedApiRequest(request, state, state.owner.accessToken, `/workspaces/${state.owner.workspaceId}/desktop-apps`, {
    method: 'POST',

    data: {
      name: uniqueValue('Phase 4 Desktop', state.runId),

      platform: 'CROSS_PLATFORM',

      framework: 'ELECTRON',

      architecture: 'X64',

      packageName: `com.commandcenter.phase4.${Date.now()}`,
    },
  });

  expect(response.status()).toBe(201);

  return (await response.json()) as {
    id: string;
    applicationId: string;
    application: {
      name: string;
    };
  };
}

test.describe('Desktop repository frontend', () => {
  test.beforeAll(() => {
    state = readFullStackState();
  });

  test('connects changes persists and unlinks repository through UI', async ({ page, request }) => {
    await loginThroughUi(page, state.owner);

    const desktopApp = await createDesktopApplication(request);

    const repositoryA = {
      id: '11111111-1111-4111-8111-111111111111',

      workspaceId: state.owner.workspaceId,

      installationId: '33333333-3333-4333-8333-333333333333',

      applicationId: null as string | null,

      provider: 'GITHUB',

      externalRepoId: '4001',

      owner: 'command-center',

      name: 'desktop-electron',

      fullName: 'command-center/desktop-electron',

      defaultBranch: 'main',

      isPrivate: false,

      htmlUrl: 'https://github.com/command-center/desktop-electron',

      archived: false,

      isAvailable: true,

      lastSyncedAt: null,

      createdAt: '2026-08-23T00:00:00.000Z',

      updatedAt: '2026-08-23T00:00:00.000Z',

      application: null,

      installation: {
        id: '33333333-3333-4333-8333-333333333333',

        externalInstallationId: '9001',

        accountLogin: 'command-center',

        accountType: 'Organization',

        connectedAt: '2026-08-23T00:00:00.000Z',

        lastSyncedAt: null,
      },
    };

    const repositoryB = {
      ...repositoryA,

      id: '22222222-2222-4222-8222-222222222222',

      externalRepoId: '4002',

      name: 'desktop-tauri',

      fullName: 'command-center/desktop-tauri',

      defaultBranch: 'development',

      htmlUrl: 'https://github.com/command-center/desktop-tauri',
    };

    let linkedRepository: typeof repositoryA | typeof repositoryB | null = null;

    const repositoriesPath = `/api/v1/workspaces/${state.owner.workspaceId}/repositories`;

    const desktopRepositoryPath = `/api/v1/workspaces/${state.owner.workspaceId}` + `/desktop-apps/${desktopApp.id}` + '/repository';

    await page.route(`**${repositoriesPath}`, async (route) => {
      if (route.request().method() !== 'GET') {
        await route.continue();

        return;
      }

      await route.fulfill({
        status: 200,

        contentType: 'application/json',

        body: JSON.stringify({
          installations: [],

          repositories: [repositoryA, repositoryB],
        }),
      });
    });

    await page.route(`**${desktopRepositoryPath}`, async (route) => {
      const method = route.request().method();

      if (method === 'GET') {
        await route.fulfill({
          status: 200,

          contentType: 'application/json',

          body: JSON.stringify(linkedRepository),
        });

        return;
      }

      if (method === 'POST') {
        const body = route.request().postDataJSON() as {
          repositoryId: string;
        };

        const selected = [repositoryA, repositoryB].find((repository) => repository.id === body.repositoryId);

        if (!selected) {
          await route.fulfill({
            status: 404,

            contentType: 'application/json',

            body: JSON.stringify({
              message: 'Repository not found.',
            }),
          });

          return;
        }

        linkedRepository = {
          ...selected,

          applicationId: desktopApp.applicationId,
        };

        await route.fulfill({
          status: 201,

          contentType: 'application/json',

          body: JSON.stringify(linkedRepository),
        });

        return;
      }

      if (method === 'DELETE') {
        linkedRepository = null;

        await route.fulfill({
          status: 200,

          contentType: 'application/json',

          body: JSON.stringify({
            success: true,
          }),
        });

        return;
      }

      await route.continue();
    });

    await page.goto(`/workspaces/${state.owner.workspaceId}` + `/desktop-apps/${desktopApp.id}`);

    await expect(
      page.getByRole('heading', {
        name: desktopApp.application.name,
      }),
    ).toBeVisible();

    await expect(page.getByText('Not connected')).toBeVisible();

    /*
     * Connect repository A.
     */
    await page.getByLabel('Desktop repository').selectOption(repositoryA.id);

    await page
      .getByRole('button', {
        name: 'Connect Repository',
      })
      .click();

    await expect(
      page.getByText(repositoryA.fullName, {
        exact: true,
      }),
    ).toBeVisible();

    await expect(
      page.getByText('main', {
        exact: true,
      }),
    ).toBeVisible();

    /*
     * Reload and ensure the UI asks
     * the repository endpoint again.
     */
    await page.reload();

    await expect(
      page.getByText(repositoryA.fullName, {
        exact: true,
      }),
    ).toBeVisible();

    /*
     * Change to repository B.
     */
    await page.getByLabel('Desktop repository').selectOption(repositoryB.id);

    await page
      .getByRole('button', {
        name: 'Change Repository',
      })
      .click();

    await expect(
      page.getByText(repositoryB.fullName, {
        exact: true,
      }),
    ).toBeVisible();

    await expect(
      page.getByText('development', {
        exact: true,
      }),
    ).toBeVisible();

    /*
     * Unlink.
     */
    await page
      .getByRole('button', {
        name: 'Unlink',
      })
      .click();

    await expect(page.getByText('Not connected')).toBeVisible();
  });
});
