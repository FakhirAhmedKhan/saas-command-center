import { expect, test } from '@playwright/test';

import {
  APPLICATION_ID,
  installMockApi,
  makeApplication,
  PRIMARY_WORKSPACE_ID,
} from './fixtures/mock-api';

test.describe('Batch 10 application flows', () => {
  test('lists active applications with status, priority, and technology', async ({ page }) => {
    await installMockApi(page);

    await page.goto(`/workspaces/${PRIMARY_WORKSPACE_ID}/applications`);

    await expect(
      page.getByRole('heading', {
        name: 'Applications',
      }),
    ).toBeVisible();
    await expect(
      page.getByRole('heading', {
        name: 'PriceScout AI',
      }),
    ).toBeVisible();
    await expect(
      page
        .locator('span')
        .filter({
          hasText: /^In development$/,
        })
        .first(),
    ).toBeVisible();
    await expect(page.getByText('High priority')).toBeVisible();
    await expect(page.getByText('Next.js')).toBeVisible();
  });

  test('shows the active empty state', async ({ page }) => {
    await installMockApi(page, {
      applications: [],
    });

    await page.goto(`/workspaces/${PRIMARY_WORKSPACE_ID}/applications`);

    await expect(
      page.getByRole('heading', {
        name: 'No applications yet',
      }),
    ).toBeVisible();
    await expect(
      page.getByRole('link', {
        name: 'Create application',
      }),
    ).toBeVisible();
  });

  test('applies application search and status filters to the API request', async ({ page }) => {
    const state = await installMockApi(page);

    await page.goto(`/workspaces/${PRIMARY_WORKSPACE_ID}/applications`);

    await page.getByLabel('Search applications').fill('PriceScout');
    await page.getByLabel('Status').selectOption('IN_DEVELOPMENT');
    await page
      .getByRole('button', {
        name: 'Apply filters',
      })
      .click();

    await expect(
      page.getByRole('heading', {
        name: 'PriceScout AI',
      }),
    ).toBeVisible();

    const latestListRequest = state.requests
      .filter(
        (request) =>
          request.method === 'GET' &&
          request.path === `/workspaces/${PRIMARY_WORKSPACE_ID}/applications`,
      )
      .at(-1);

    expect(latestListRequest?.search).toContain('search=PriceScout');
    expect(latestListRequest?.search).toContain('status=IN_DEVELOPMENT');
  });

  test('creates an application with normalized form values', async ({ page }) => {
    const state = await installMockApi(page);

    await page.goto(`/workspaces/${PRIMARY_WORKSPACE_ID}/applications/new`);
    await page.getByLabel('Application name').fill('  MadadAI Portal  ');
    await page.getByLabel('Slug').fill('madadai-portal');
    await page.getByLabel('Short description').fill('  Emergency response portal  ');
    await page.getByLabel('Long description').fill('  Full incident workflow.  ');
    await page.getByLabel('Category').selectOption('AI');
    await page.getByLabel('Status').selectOption('PLANNING');
    await page.getByLabel('Priority').selectOption('CRITICAL');
    await page.getByLabel('Start date').fill('2026-08-01');
    await page
      .getByRole('button', {
        name: 'Create application',
      })
      .click();

    await expect(page).toHaveURL(/\/applications\/77777777-7777-4777-8777-777777777777$/);
    await expect(
      page.getByRole('heading', {
        name: 'MadadAI Portal',
      }),
    ).toBeVisible();

    const createRequest = state.requests.find(
      (request) =>
        request.method === 'POST' &&
        request.path === `/workspaces/${PRIMARY_WORKSPACE_ID}/applications`,
    );

    expect(createRequest?.body).toMatchObject({
      name: 'MadadAI Portal',
      slug: 'madadai-portal',
      shortDescription: 'Emergency response portal',
      longDescription: 'Full incident workflow.',
      category: 'AI',
      status: 'PLANNING',
      priority: 'CRITICAL',
    });
  });

  test('shows the custom short-name validation message', async ({ page }) => {
    await installMockApi(page);

    await page.goto(`/workspaces/${PRIMARY_WORKSPACE_ID}/applications/new`);
    await page.getByLabel('Application name').fill('A');

    await page.locator('form').evaluate((form) => {
      (form as HTMLFormElement).noValidate = true;
    });

    await page
      .getByRole('button', {
        name: 'Create application',
      })
      .click();

    await expect(page.locator('[role="alert"]:not(#__next-route-announcer__)')).toContainText(
      'Application name must contain at least two characters.',
    );
  });

  test('shows an API error on application creation', async ({ page }) => {
    await installMockApi(page, {
      failures: {
        [`POST /workspaces/${PRIMARY_WORKSPACE_ID}/applications`]: {
          status: 409,
          message: 'Application slug already exists',
        },
      },
    });

    await page.goto(`/workspaces/${PRIMARY_WORKSPACE_ID}/applications/new`);
    await page.getByLabel('Application name').fill('Duplicate Application');
    await page.getByLabel('Slug').fill('pricescout-ai');
    await page
      .getByRole('button', {
        name: 'Create application',
      })
      .click();

    await expect(page.locator('[role="alert"]:not(#__next-route-announcer__)')).toContainText(
      'Application slug already exists',
    );
  });

  test('opens an application detail page', async ({ page }) => {
    await installMockApi(page, {
      applications: [
        makeApplication({
          id: APPLICATION_ID,
        }),
      ],
    });

    await page.goto(`/workspaces/${PRIMARY_WORKSPACE_ID}/applications/${APPLICATION_ID}`);

    await expect(
      page.getByRole('heading', {
        name: 'PriceScout AI',
      }),
    ).toBeVisible();
    await expect(
      page.getByRole('link', {
        name: 'Development',
      }),
    ).toBeVisible();
    await expect(
      page.getByRole('link', {
        name: 'Connect website',
      }),
    ).toBeVisible();
  });

  test('renders a safe application load error', async ({ page }) => {
    await installMockApi(page, {
      failures: {
        [`GET /workspaces/${PRIMARY_WORKSPACE_ID}/applications/${APPLICATION_ID}`]: {
          status: 404,
          message: 'Application not found',
        },
      },
    });

    await page.goto(`/workspaces/${PRIMARY_WORKSPACE_ID}/applications/${APPLICATION_ID}`);

    await expect(
      page.getByRole('heading', {
        name: 'Unable to load application',
      }),
    ).toBeVisible();
    await expect(page.getByText('Application not found')).toBeVisible();
  });
});
