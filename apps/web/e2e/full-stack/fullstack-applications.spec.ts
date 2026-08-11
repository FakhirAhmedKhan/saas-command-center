import { loginThroughUi, uniqueValue } from './fixtures/helpers';
import { readFullStackState, type FullStackState } from './fixtures/state';
import { expect, test, type BrowserContext, type Page } from '@playwright/test';

let state: FullStackState;

test.describe.configure({
  mode: 'serial',
});

test.describe('Batch 11 real application flows', () => {
  let context: BrowserContext;
  let page: Page;
  let applicationId = '';

  const applicationName = `Batch 11 Real App ${Date.now()}`;

  let applicationSlug = '';

  test.beforeAll(async ({ browser }) => {
    state = readFullStackState();

    applicationSlug = uniqueValue('batch11-real-app', state.runId);

    context = await browser.newContext();
    page = await context.newPage();

    await loginThroughUi(page, state.owner);
  });

  test.afterAll(async () => {
    await context.close();
  });

  test('creates an application through the real frontend', async () => {
    await page.goto(`/workspaces/${state.owner.workspaceId}/applications/new`);

    await page.getByLabel('Application name').fill(applicationName);

    await page.getByLabel('Slug').fill(applicationSlug);

    await page.getByLabel('Short description').fill('Created by Batch 11 full-stack E2E');

    await page.getByLabel('Status').selectOption('IN_DEVELOPMENT');

    await page.getByLabel('Priority').selectOption('HIGH');

    await page
      .getByRole('button', {
        name: 'Create application',
      })
      .click();

    await expect(page).toHaveURL(/\/applications\/[0-9a-f-]+$/);

    applicationId = page.url().split('/').at(-1) ?? '';

    await expect(
      page.getByRole('heading', {
        name: applicationName,
      }),
    ).toBeVisible();

    await expect(page.getByText('Created by Batch 11 full-stack E2E')).toBeVisible();
  });

  test('loads the created application from the real database', async () => {
    expect(applicationId).not.toBe('');

    await page.goto(`/workspaces/${state.owner.workspaceId}/applications/${applicationId}`);

    await expect(
      page.getByRole('heading', {
        name: applicationName,
      }),
    ).toBeVisible();

    await expect(
      page
        .getByText('In development', {
          exact: true,
        })
        .last(),
    ).toBeVisible();
  });

  test('returns a real conflict for a duplicate application slug', async () => {
    await page.goto(`/workspaces/${state.owner.workspaceId}/applications/new`);

    await page.getByLabel('Application name').fill('Batch 11 Duplicate App');

    await page.getByLabel('Slug').fill(applicationSlug);

    await page
      .getByRole('button', {
        name: 'Create application',
      })
      .click();

    await expect(page.locator('[role="alert"]:not(#__next-route-announcer__)')).toContainText(/slug|already|use/i);
  });
});
