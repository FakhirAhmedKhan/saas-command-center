import { loginThroughUi, uniqueValue } from './fixtures/helpers';
import { readFullStackState, type FullStackState } from './fixtures/state';
import { expect, test, type BrowserContext, type Page } from '@playwright/test';

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

    await page
      .getByRole('button', {
        name: /Create Manually/,
      })
      .click();

    await page.getByLabel('Workspace name').fill('Batch 11 Product Workspace');

    await page.getByLabel('Workspace URL').fill(slug);

    await page
      .getByRole('button', {
        name: 'Create workspace',
      })
      .click();

    await expect(page).toHaveURL(/\/workspaces\/[0-9a-f-]+\/applications$/);

    const match = page.url().match(/\/workspaces\/([^/]+)\/applications$/);

    createdWorkspaceId = match?.[1] ?? '';

    expect(createdWorkspaceId).not.toBe('');

    // Workspace creation performs a full navigation. Wait until the
    // authenticated application shell is restored before the next serial test.
    await expect(
      page.getByRole('button', {
        name: 'Sign out',
      }),
    ).toBeVisible({
      timeout: 15_000,
    });

    await expect(
      page.getByRole('button', {
        name: 'Select workspace',
      }),
    ).toContainText('Batch 11 Product Workspace');
  });

  test('updates workspace settings through the real UI and API', async () => {
    expect(createdWorkspaceId).not.toBe('');

    await page.goto(`/workspaces/${createdWorkspaceId}/settings`);

    const nameInput = page.getByLabel('Workspace name');

    await expect(nameInput).toBeVisible();

    const updatedName = `Updated Batch 11 Workspace ${state.runId}`;

    await nameInput.fill(updatedName);

    await page
      .getByRole('button', {
        name: 'Save changes',
      })
      .click();

    await expect(page.getByRole('status')).toHaveText('Workspace updated successfully.');

    await expect(nameInput).toHaveValue(updatedName);
  });

  test('generates a unique slug when the requested workspace slug is already in use', async () => {
    await page.goto('/workspaces/new');

    await page
      .getByRole('button', {
        name: /Create Manually/,
      })
      .click();

    await page.getByLabel('Workspace name').fill('Duplicate Batch 11 Workspace');

    await page.getByLabel('Workspace URL').fill(slug);

    await page
      .getByRole('button', {
        name: 'Create workspace',
      })
      .click();

    await expect(page).toHaveURL(/\/workspaces\/[0-9a-f-]+\/applications$/);

    const match = page.url().match(/\/workspaces\/([^/]+)\/applications$/);
    const duplicateWorkspaceId = match?.[1] ?? '';

    expect(duplicateWorkspaceId).not.toBe('');

    await expect(
      page.getByRole('button', {
        name: 'Select workspace',
      }),
    ).toContainText('Duplicate Batch 11 Workspace');

    await page.goto(`/workspaces/${duplicateWorkspaceId}/settings`);

    await expect(page.getByLabel('Workspace slug')).toHaveValue(`${slug}-2`);
  });
});
