import { expect, test } from '@playwright/test';

const workspaceId = '11111111-1111-4111-8111-111111111111';

const websiteId = '22222222-2222-4222-8222-222222222222';

const analyticsResponse = {
  website: {
    id: websiteId,

    name: 'Demo Website',

    domain: 'demo.example.com',

    timeZone: 'Asia/Dubai',

    lastEventAt: '2026-08-07T01:00:00.000Z',
  },

  range: {
    preset: '7d',

    from: '2026-08-01',

    to: '2026-08-07',

    previousFrom: '2026-07-25',

    previousTo: '2026-07-31',

    granularity: 'day',

    days: 7,
  },

  metrics: {
    visitors: {
      value: 320,
      previousValue: 250,
      changePercent: 28,
    },

    sessions: {
      value: 420,
      previousValue: 350,
      changePercent: 20,
    },

    pageViews: {
      value: 1200,
      previousValue: 1000,
      changePercent: 20,
    },

    bounceRate: {
      value: 32.4,
      previousValue: 38.1,
      changePercent: -15,
    },

    averageDurationSeconds: {
      value: 140,
      previousValue: 120,
      changePercent: 16.7,
    },
  },

  trend: [
    {
      bucketStart: '2026-07-31T20:00:00.000Z',

      visitors: 40,

      sessions: 50,

      pageViews: 150,
    },

    {
      bucketStart: '2026-08-01T20:00:00.000Z',

      visitors: 48,

      sessions: 60,

      pageViews: 190,
    },
  ],

  topPages: [
    {
      key: '/',
      label: 'Home',
      value: 600,
      percentage: 50,
    },
  ],

  topSources: [
    {
      key: 'Google',
      label: 'Google',
      value: 210,
      percentage: 50,
    },
  ],

  topCountries: [
    {
      key: 'AE',
      label: 'AE',
      value: 300,
      percentage: 71.4,
    },
  ],

  topDevices: [
    {
      key: 'MOBILE',
      label: 'Mobile',
      value: 280,
      percentage: 66.7,
    },
  ],

  topBrowsers: [
    {
      key: 'Chrome',
      label: 'Chrome',
      value: 310,
      percentage: 73.8,
    },
  ],

  topOperatingSystems: [
    {
      key: 'Android',
      label: 'Android',
      value: 230,
      percentage: 54.8,
    },
  ],

  empty: false,
};

test.describe('Phase 12 analytics overview', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/auth/refresh', async (route) => {
      await route.fulfill({
        status: 200,

        contentType: 'application/json',

        body: JSON.stringify({
          accessToken: 'test-access-token',

          user: {
            id: '33333333-3333-4333-8333-333333333333',

            email: 'phase12@example.com',
          },
        }),
      });
    });

    await page.route('**/workspaces/*/websites/*/analytics/overview*', async (route) => {
      await route.fulfill({
        status: 200,

        contentType: 'application/json',

        body: JSON.stringify(analyticsResponse),
      });
    });
  });

  test('shows KPI cards and analytics breakdowns', async ({ page }) => {
    await page.goto(`/workspaces/${workspaceId}/websites/${websiteId}/analytics`);

    await expect(
      page.getByRole('heading', {
        name: 'Demo Website',
      }),
    ).toBeVisible();

    await expect(
      page.getByText('320', {
        exact: true,
      }),
    ).toBeVisible();

    await expect(
      page.getByText('1,200', {
        exact: true,
      }),
    ).toBeVisible();

    await expect(
      page.getByRole('heading', {
        name: 'Top pages',
      }),
    ).toBeVisible();

    await expect(
      page.getByText('Google', {
        exact: true,
      }),
    ).toBeVisible();
  });

  test('keeps the date preset in the URL', async ({ page }) => {
    await page.goto(`/workspaces/${workspaceId}/websites/${websiteId}/analytics`);

    await page.getByLabel('Date range').selectOption('30d');

    await expect(page).toHaveURL(/range=30d/);
  });
});
