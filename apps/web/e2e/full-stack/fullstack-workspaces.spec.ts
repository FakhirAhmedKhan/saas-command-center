import { expect, test, type BrowserContext, type Page } from '@playwright/test';
import { loginThroughUi, uniqueValue } from './fixtures/helpers';
import { readFullStackState, type FullStackState } from './fixtures/state';

let state: FullStackState;

test.describe.configure({
  mode: 'serial',
});

test.describe('Batch 11 real workspace flows', () => {
  let context: BrowserContext;
  let page: Page;
  let createdWorkspaceId = '';
  let slug = '';

  test.beforeAll(async ({ browser }) => {
    state = readFullStackState();

    slug = uniqueValue('batch11-workspace', state.runId);

    context = await browser.newContext();
    page = await context.newPage();

    await loginThroughUi(page, state.owner);
  });

  test.afterAll(async () => {
    await context.close();
  });

  test('loads the owner workspace from the real database', async () => {
    await page.goto('/dashboard');

    await expect(
      page.getByRole('heading', {
        name: new RegExp('Batch 11 Owner Workspace'),
      }),
    ).toBeVisible();

    await expect(
      page.getByText('OWNER', {
        exact: true,
      }),
    ).toBeVisible();
  });

  test('creates another workspace through the real UI and API', async () => {
    await page.goto('/workspaces/new');

    await page.getByLabel('Workspace name').fill('Batch 11 Product Workspace');

    await page.getByLabel('Workspace slug').fill(slug);

    await page
      .getByRole('button', {
        name: 'Create workspace',
      })
      .click();

    await expect(page).toHaveURL(/\/workspaces\/[0-9a-f-]+\/applications$/);

    const match = page.url().match(/\/workspaces\/([^/]+)\/applications$/);

    createdWorkspaceId = match?.[1] ?? '';

    expect(createdWorkspaceId).not.toBe('');
  });

  test('shows a real conflict for a duplicate workspace slug', async () => {
    await page.goto('/workspaces/new');

    await page.getByLabel('Workspace name').fill('Duplicate Batch 11 Workspace');

    await page.getByLabel('Workspace slug').fill(slug);

    await page
      .getByRole('button', {
        name: 'Create workspace',
      })
      .click();

    await expect(page.locator('[role="alert"]:not(#__next-route-announcer__)')).toContainText(/slug|already|use/i);

    await expect(page).toHaveURL(/\/workspaces\/new$/);
  });
});
