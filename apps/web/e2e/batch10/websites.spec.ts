import { expect, test } from '@playwright/test';

import {
  APPLICATION_ID,
  installMockApi,
  PRIMARY_WORKSPACE_ID,
  WEBSITE_ID,
} from './fixtures/mock-api';

test.describe('Batch 10 website and tracker setup flows', () => {
  test('lists websites with connection and tracking information', async ({ page }) => {
    await installMockApi(page);

    await page.goto(`/workspaces/${PRIMARY_WORKSPACE_ID}/websites`);

    await expect(
      page.getByRole('heading', {
        name: 'Websites',
      }),
    ).toBeVisible();
    await expect(
      page.getByRole('heading', {
        name: 'Command Center Web',
      }),
    ).toBeVisible();
    await expect(page.getByText('command-center.example.com')).toBeVisible();
    await expect(
      page
        .locator('span')
        .filter({
          hasText: /^Enabled$/,
        })
        .first(),
    ).toBeVisible();
    await expect(page.getByText('PriceScout AI')).toBeVisible();
  });

  test('shows the empty website state', async ({ page }) => {
    await installMockApi(page, {
      websites: [],
    });

    await page.goto(`/workspaces/${PRIMARY_WORKSPACE_ID}/websites`);

    await expect(
      page.getByRole('heading', {
        name: 'No websites connected',
      }),
    ).toBeVisible();
    await expect(
      page.getByRole('link', {
        name: 'Create website',
      }),
    ).toBeVisible();
  });

  test('applies website search and state filters', async ({ page }) => {
    const state = await installMockApi(page);

    await page.goto(`/workspaces/${PRIMARY_WORKSPACE_ID}/websites`);

    await page.getByPlaceholder('Search websites...').fill('command-center');
    await page.locator('select').nth(1).selectOption('enabled');
    await page
      .getByRole('button', {
        name: 'Apply',
      })
      .click();

    const request = state.requests
      .filter(
        (item) =>
          item.method === 'GET' && item.path === `/workspaces/${PRIMARY_WORKSPACE_ID}/websites`,
      )
      .at(-1);

    expect(request?.search).toContain('search=command-center');
    expect(request?.search).toContain('enabled=true');
  });

  test('creates a connected website and preserves its one-time tracking key', async ({ page }) => {
    const state = await installMockApi(page);

    await page.goto(
      `/workspaces/${PRIMARY_WORKSPACE_ID}/websites/new?applicationId=${APPLICATION_ID}`,
    );

    await page.getByLabel('Website name').fill('  MadadAI Web  ');
    await page.getByLabel('Domain').fill('madadai.example.com');
    await page.getByLabel('Reporting time zone').fill('Asia/Dubai');
    await page
      .getByLabel('Allowed origins')
      .fill('https://madadai.example.com\nhttps://madadai.example.com\nhttp://localhost:3000');
    await page
      .getByRole('button', {
        name: 'Create website',
      })
      .click();

    await expect(page).toHaveURL(/\/websites\/88888888-8888-4888-8888-888888888888\/installation$/);
    await expect(
      page.getByRole('heading', {
        name: 'Tracker installation',
      }),
    ).toBeVisible();
    await expect(page.getByText(state.trackingKey).first()).toBeVisible();

    const request = state.requests.find(
      (item) =>
        item.method === 'POST' && item.path === `/workspaces/${PRIMARY_WORKSPACE_ID}/websites`,
    );

    expect(request?.body).toEqual({
      name: 'MadadAI Web',
      domain: 'madadai.example.com',
      timeZone: 'Asia/Dubai',
      enabled: true,
      applicationId: APPLICATION_ID,
      allowedOrigins: ['https://madadai.example.com', 'http://localhost:3000'],
    });
  });

  test('renders a complete tracker installation snippet', async ({ page }) => {
    const state = await installMockApi(page);

    await page.addInitScript(
      ({ websiteId, trackingKey }) => {
        sessionStorage.setItem(`command-center:website-key:${websiteId}`, trackingKey);
      },
      {
        websiteId: WEBSITE_ID,
        trackingKey: state.trackingKey,
      },
    );

    await page.goto(`/workspaces/${PRIMARY_WORKSPACE_ID}/websites/${WEBSITE_ID}/installation`);

    const installationCode = page.locator('pre code').first();

    await expect(page.getByText(state.trackingKey).first()).toBeVisible();
    await expect(installationCode).toContainText(`data-website-id="${WEBSITE_ID}"`);
    await expect(installationCode).toContainText(`data-tracking-key="${state.trackingKey}"`);
    await expect(installationCode).toContainText('data-respect-dnt="true"');
  });

  test('shows tracker connection metrics', async ({ page }) => {
    await installMockApi(page);

    await page.goto(`/workspaces/${PRIMARY_WORKSPACE_ID}/websites/${WEBSITE_ID}/installation`);

    await expect(
      page.getByRole('heading', {
        name: 'Tracker connection',
      }),
    ).toBeVisible();
    await expect(page.getByText('Receiving events')).toBeVisible();
    await expect(
      page.getByText('14', {
        exact: true,
      }),
    ).toBeVisible();
    await expect(
      page.getByRole('link', {
        name: 'View raw events',
      }),
    ).toBeVisible();
  });

  test('shows the missing-key warning on a later installation visit', async ({ page }) => {
    await installMockApi(page);

    await page.goto(`/workspaces/${PRIMARY_WORKSPACE_ID}/websites/${WEBSITE_ID}/installation`);

    await expect(
      page.getByText('The complete key is shown only after website creation or key rotation.'),
    ).toBeVisible();
    await expect(
      page.getByRole('link', {
        name: 'Website Settings',
      }),
    ).toBeVisible();
  });

  test('shows website creation API errors without navigating', async ({ page }) => {
    await installMockApi(page, {
      failures: {
        [`POST /workspaces/${PRIMARY_WORKSPACE_ID}/websites`]: {
          status: 409,
          message: 'Website domain already exists',
        },
      },
    });

    await page.goto(`/workspaces/${PRIMARY_WORKSPACE_ID}/websites/new`);
    await page.getByLabel('Website name').fill('Duplicate Website');
    await page.getByLabel('Domain').fill('command-center.example.com');
    await page
      .getByRole('button', {
        name: 'Create website',
      })
      .click();

    await expect(page.locator('[role="alert"]:not(#__next-route-announcer__)')).toContainText(
      'Website domain already exists',
    );
    await expect(page).toHaveURL(new RegExp(`/workspaces/${PRIMARY_WORKSPACE_ID}/websites/new$`));
  });
});
