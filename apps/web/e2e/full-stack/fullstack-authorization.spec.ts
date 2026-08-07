import {
  expect,
  test,
  type BrowserContext,
  type Page,
} from '@playwright/test';

import {
  authorizedApiRequest,
  loginThroughUi,
  uniqueValue,
} from './fixtures/helpers';
import {
  readFullStackState,
  type FullStackState,
} from './fixtures/state';

let state: FullStackState;

test.describe.configure({
  mode: 'serial',
});

test.describe('Batch 11 real authorization and isolation', () => {
  let context: BrowserContext;
  let page: Page;

  test.beforeAll(async ({
    browser,
  }) => {
    state =
      readFullStackState();

    context =
      await browser.newContext();
    page =
      await context.newPage();

    await loginThroughUi(
      page,
      state.viewer,
    );
  });

  test.afterAll(async () => {
    await context.close();
  });

  test('loads the shared workspace but hides owner-only creation actions', async () => {
    await page.goto(
      `/workspaces/${state.owner.workspaceId}/applications`,
    );

    await expect(
      page.getByText(
        state.baselineApplication.name,
      ),
    ).toBeVisible();

    await expect(
      page.getByRole('link', {
        name: 'New application',
      }),
    ).toHaveCount(0);

    await page.goto(
      `/workspaces/${state.owner.workspaceId}/websites`,
    );

    await expect(
      page.getByRole('link', {
        name: 'New website',
      }),
    ).toHaveCount(0);
  });

  test('rejects a viewer application write at the real API boundary', async ({
    request,
  }) => {
    const response =
      await authorizedApiRequest(
        request,
        state,
        state.viewer.accessToken,
        `/workspaces/${state.owner.workspaceId}/applications`,
        {
          method: 'POST',
          data: {
            name:
              'Viewer Must Not Create',
            slug:
              uniqueValue(
                'viewer-forbidden',
                state.runId,
              ),
          },
        },
      );

    expect(response.status()).toBe(403);
  });

  test('prevents cross-workspace reads for a non-member owner', async ({
    request,
  }) => {
    const response =
      await authorizedApiRequest(
        request,
        state,
        state.owner.accessToken,
        `/workspaces/${state.admin.workspaceId}/applications`,
      );

    expect(response.status()).toBe(403);
  });
});
