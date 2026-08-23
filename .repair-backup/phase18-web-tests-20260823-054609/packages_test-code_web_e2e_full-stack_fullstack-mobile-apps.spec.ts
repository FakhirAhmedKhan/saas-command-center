import { loginThroughUi, uniqueValue } from './fixtures/helpers';

import { readFullStackState, type FullStackState } from './fixtures/state';

import { expect, test, type Page } from '@playwright/test';

let state: FullStackState;

let page: Page;

test.describe('Mobile application frontend', () => {
  test.beforeAll(() => {
    state = readFullStackState();
  });

  test.beforeEach(async ({ page: testPage }) => {
    page = testPage;

    await loginThroughUi(page, state.owner);
  });

  test('completes mobile CRUD through the real frontend', async () => {
    const name = uniqueValue('Phase 3 Android');

    const workspaceId = state.owner.workspaceId;

    await page.goto(`/workspaces/${workspaceId}/mobile-apps`);

    await expect(
      page.getByRole('heading', {
        name: 'Mobile Apps',
      }),
    ).toBeVisible();

    await page
      .getByRole('link', {
        name: 'Add Mobile App',
      })
      .first()
      .click();

    await page.getByLabel('Application name').fill(name);

    await page.getByLabel('Platform').selectOption('ANDROID');

    await page.getByLabel('Framework').selectOption('ANDROID_NATIVE');

    await page.getByLabel('Package ID').fill('com.commandcenter.phase3');

    await page.getByLabel('Minimum OS version').fill('26');

    await page.getByLabel('Target OS version').fill('36');

    await page.getByLabel('Current version').fill('1.0.0');

    await page.getByLabel('Current build number').fill('100');

    await page
      .getByRole('button', {
        name: 'Create Mobile App',
      })
      .click();

    await expect(page).toHaveURL(/\/mobile-apps\/[0-9a-f-]+$/);

    await expect(
      page.getByRole('heading', {
        name,
      }),
    ).toBeVisible();

    await expect(page.getByText('com.commandcenter.phase3')).toBeVisible();

    await page.getByLabel('Current version').fill('1.1.0');

    await page.getByLabel('Current build number').fill('110');

    await page
      .getByRole('button', {
        name: 'Save Changes',
      })
      .click();

    await expect(page.getByLabel('Current version')).toHaveValue('1.1.0');

    await page.reload();

    await expect(page.getByLabel('Current version')).toHaveValue('1.1.0');

    page.once('dialog', async (dialog) => {
      expect(dialog.message()).toContain(name);

      await dialog.accept();
    });

    await page
      .getByRole('button', {
        name: 'Archive',
      })
      .click();

    await expect(page).toHaveURL(`/workspaces/${workspaceId}/mobile-apps`);

    await expect(page.getByText(name)).toHaveCount(0);
  });
});
