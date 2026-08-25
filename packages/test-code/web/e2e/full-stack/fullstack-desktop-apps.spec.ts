import { loginThroughUi, uniqueValue } from './fixtures/helpers';
import { readFullStackState, type FullStackState } from './fixtures/state';
import { expect, test, type Page } from '@playwright/test';

let state: FullStackState;
let page: Page;

test.describe('Desktop application frontend', () => {
  test.beforeAll(() => {
    state = readFullStackState();
  });

  test.beforeEach(async ({ page: testPage }) => {
    page = testPage;

    await loginThroughUi(page, state.owner);
  });

  test('completes desktop CRUD through the real frontend', async () => {
    const name = uniqueValue('Phase 3 Electron', state.runId);
    const workspaceId = state.owner.workspaceId;
    const listUrl = `/workspaces/${workspaceId}` + '/desktop-apps';

    await page.goto(listUrl);

    await expect(
      page.getByRole('heading', {
        name: 'Desktop Apps',
      }),
    ).toBeVisible();

    await page
      .getByRole('link', {
        name: 'Add Desktop App',
      })
      .first()
      .click();

    await expect(
      page.getByRole('heading', {
        name: 'Add Desktop App',
      }),
    ).toBeVisible();

    await page.getByLabel('Application name').fill(name);

    await page.getByLabel('Platform').selectOption('CROSS_PLATFORM');

    await page.getByLabel('Framework').selectOption('ELECTRON');

    await page.getByLabel('Architecture').selectOption('X64');

    await page.getByLabel('Package name').fill('com.commandcenter.phase3.desktop');

    await page.getByLabel('Minimum OS version').fill('Windows 10');

    await page.getByLabel('Current version').fill('1.0.0');

    await page.getByLabel('Current build number').fill('100');

    await page.getByLabel('Update channel').fill('stable');

    await page
      .getByRole('button', {
        name: 'Create Desktop App',
      })
      .click();

    await expect(page).toHaveURL(/\/desktop-apps\/[0-9a-f-]+$/);

    await expect(
      page.getByRole('heading', {
        name,
      }),
    ).toBeVisible();

    await expect(page.getByRole('definition').filter({ hasText: 'com.commandcenter.phase3.desktop' }).nth(1)).toBeVisible();

    /*
     * Verify card appears in
     * the active desktop list.
     */
    await page.goto(listUrl);

    const card = page.locator('article').filter({
      hasText: name,
    });

    await expect(card).toBeVisible();

    await expect(card.getByText('Electron', { exact: true })).toBeVisible();

    await expect(card.getByText('Cross-platform')).toBeVisible();

    await expect(card.getByText('1.0.0')).toBeVisible();

    await expect(card.getByText('100')).toBeVisible();

    await card
      .getByRole('link', {
        name: 'Open',
      })
      .click();

    /*
     * Update metadata.
     */
    await page.getByLabel('Current version').fill('1.1.0');

    await page.getByLabel('Current build number').fill('110');

    await page.getByLabel('Update channel').fill('beta');

    await page
      .getByRole('button', {
        name: 'Save Changes',
      })
      .click();

    await expect(page.getByLabel('Current version')).toHaveValue('1.1.0');

    await expect(page.getByLabel('Current build number')).toHaveValue('110');

    /*
     * Deep refresh must preserve
     * backend state.
     */
    await page.reload();

    await expect(
      page.getByRole('heading', {
        name,
      }),
    ).toBeVisible();

    await expect(page.getByLabel('Current version')).toHaveValue('1.1.0');

    await expect(page.getByLabel('Current build number')).toHaveValue('110');

    await expect(page.getByLabel('Update channel')).toHaveValue('beta');

    /*
     * Archive using the real
     * confirmation dialog.
     */
    page.once('dialog', async (dialog) => {
      expect(dialog.message()).toContain(name);

      await dialog.accept();
    });

    await page
      .getByRole('button', {
        name: 'Archive',
      })
      .click();

    await expect(page).toHaveURL(listUrl);

    await expect(page.getByText(name)).toHaveCount(0);
  });

  test('renders the desktop empty state', async () => {
    const workspaceId = state.owner.workspaceId;

    await page.route(/\/api\/v1\/workspaces\/[^/]+\/desktop-apps(?:\?.*)?$/, async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,

          contentType: 'application/json',

          body: JSON.stringify([]),
        });

        return;
      }

      await route.continue();
    });

    await page.goto(`/workspaces/${workspaceId}/desktop-apps`);

    await expect(
      page.getByRole('heading', {
        name: 'No desktop applications yet',
      }),
    ).toBeVisible();

    await expect(
      page
        .getByRole('link', {
          name: 'Add Desktop App',
        })
        .first(),
    ).toBeVisible();
  });

  test('renders frontend API error state', async () => {
    const workspaceId = state.owner.workspaceId;

    await page.route(/\/api\/v1\/workspaces\/[^/]+\/desktop-apps(?:\?.*)?$/, async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 500,

          contentType: 'application/json',

          body: JSON.stringify({
            message: 'Injected desktop API failure',
          }),
        });

        return;
      }

      await route.continue();
    });

    await page.goto(`/workspaces/${workspaceId}/desktop-apps`);

    await expect(page.getByRole('alert')).toBeVisible();

    await expect(
      page.getByRole('heading', {
        name: 'Unable to load desktop apps',
      }),
    ).toBeVisible();

    await expect(
      page.getByRole('button', {
        name: 'Try again',
      }),
    ).toBeVisible();
  });

  test('desktop list remains usable on mobile viewport', async () => {
    const workspaceId = state.owner.workspaceId;

    await page.setViewportSize({
      width: 390,
      height: 844,
    });

    await page.route(/\/api\/v1\/workspaces\/[^/]+\/desktop-apps(?:\?.*)?$/, async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,

          contentType: 'application/json',

          body: JSON.stringify([]),
        });

        return;
      }

      await route.continue();
    });

    await page.goto(`/workspaces/${workspaceId}/desktop-apps`);

    await expect(
      page.getByRole('heading', {
        name: 'Desktop Apps',
      }),
    ).toBeVisible();

    await expect(
      page
        .getByRole('link', {
          name: 'Add Desktop App',
        })
        .first(),
    ).toBeVisible();

    await expect(
      page.getByRole('heading', {
        name: 'No desktop applications yet',
      }),
    ).toBeVisible();
  });
});
