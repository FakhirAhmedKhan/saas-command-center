import { expect, test } from '@playwright/test';

import { installMockApi, makeWorkspace, PRIMARY_WORKSPACE_ID, SECONDARY_WORKSPACE_ID } from './fixtures/mock-api';

test.describe('Batch 10 dashboard and workspace flows', () => {
  test('renders account identity, workspace cards, and roles', async ({ page }) => {
    await installMockApi(page);

    await page.goto('/dashboard');

    await expect(page.getByText('owner@example.com')).toBeVisible();
    await expect(
      page.getByRole('heading', {
        name: 'Your workspaces',
      }),
    ).toBeVisible();
    await expect(
      page.getByRole('heading', {
        name: 'Command Center Team',
      }),
    ).toBeVisible();
    await expect(
      page.getByRole('heading', {
        name: 'MadadAI Team',
      }),
    ).toBeVisible();
    await expect(
      page.getByText('OWNER', {
        exact: true,
      }),
    ).toBeVisible();
    await expect(
      page.getByText('DEVELOPER', {
        exact: true,
      }),
    ).toBeVisible();
  });

  test('renders the zero-workspace empty state', async ({ page }) => {
    await installMockApi(page, {
      workspaces: [],
    });

    await page.goto('/dashboard');

    await expect(
      page.getByRole('heading', {
        name: 'No workspace found',
      }),
    ).toBeVisible();
    await expect(page.getByLabel('Select workspace')).toHaveCount(0);
  });

  test('switches workspaces using the top-bar selector', async ({ page }) => {
    await installMockApi(page);

    await page.goto(`/workspaces/${PRIMARY_WORKSPACE_ID}`);

    await page.getByLabel('Select workspace').selectOption(SECONDARY_WORKSPACE_ID);

    await expect(page).toHaveURL(new RegExp(`/workspaces/${SECONDARY_WORKSPACE_ID}$`));
    await expect(
      page.getByRole('heading', {
        name: 'MadadAI Team',
      }),
    ).toBeVisible();
  });

  test('shows a generated slug preview while creating a workspace', async ({ page }) => {
    await installMockApi(page);

    await page.goto('/workspaces/new');
    await page.getByLabel('Workspace name').fill('My New SaaS Portfolio');

    await expect(page.getByText('Workspace URL identifier: my-new-saas-portfolio')).toBeVisible();
  });

  test('creates a workspace and opens its applications page', async ({ page }) => {
    const state = await installMockApi(page);

    await page.goto('/workspaces/new');
    await page.getByLabel('Workspace name').fill('Analytics Team');
    await page.getByLabel('Workspace slug').fill('analytics-team');
    await page
      .getByRole('button', {
        name: 'Create workspace',
      })
      .click();

    await expect(page).toHaveURL(/\/workspaces\/99999999-9999-4999-8999-999999999999\/applications$/);

    const request = state.requests.find((item) => item.method === 'POST' && item.path === '/workspaces');

    expect(request?.body).toEqual({
      name: 'Analytics Team',
      slug: 'analytics-team',
    });
  });

  test('shows workspace creation errors returned by the API', async ({ page }) => {
    await installMockApi(page, {
      failures: {
        'POST /workspaces': {
          status: 409,
          message: 'Workspace slug already exists',
        },
      },
    });

    await page.goto('/workspaces/new');
    await page.getByLabel('Workspace name').fill('Duplicate Team');
    await page.getByLabel('Workspace slug').fill('duplicate-team');
    await page
      .getByRole('button', {
        name: 'Create workspace',
      })
      .click();

    await expect(page.locator('[role="alert"]:not(#__next-route-announcer__)')).toContainText('Workspace slug already exists');
    await expect(page).toHaveURL(/\/workspaces\/new$/);
  });

  test('shows a workspace load error without leaking another workspace', async ({ page }) => {
    await installMockApi(page, {
      workspaces: [makeWorkspace()],
      failures: {
        [`GET /workspaces/${PRIMARY_WORKSPACE_ID}`]: {
          status: 403,
          message: 'Workspace access denied',
        },
      },
    });

    await page.goto(`/workspaces/${PRIMARY_WORKSPACE_ID}`);

    await expect(page.getByText('Workspace access denied')).toBeVisible();
    await expect(
      page.getByRole('heading', {
        name: 'Command Center Team',
      }),
    ).toHaveCount(0);
  });
});
