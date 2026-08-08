import { expect, test } from '@playwright/test';

const workspaceId = '11111111-1111-4111-8111-111111111111';

const websiteId = '22222222-2222-4222-8222-222222222222';

test.describe('Phase 13 analytics reports', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/auth/refresh', async (route) => {
      await route.fulfill({
        status: 200,

        contentType: 'application/json',

        body: JSON.stringify({
          accessToken: 'phase-13-token',

          user: {
            id: '33333333-3333-4333-8333-333333333333',

            email: 'phase13@example.com',
          },
        }),
      });
    });

    await page.route('**/analytics/reports/pages*', async (route) => {
      await route.fulfill({
        status: 200,

        contentType: 'application/json',

        body: JSON.stringify({
          items: [
            {
              path: '/dashboard',

              title: 'Dashboard',

              views: 1200,

              visitors: 410,

              sessions: 520,

              entrances: 310,

              exits: 180,

              bounceRate: 24.5,

              averageDurationSeconds: 95,
            },
          ],

          pagination: {
            page: 1,

            limit: 25,

            total: 1,

            totalPages: 1,

            hasPreviousPage: false,

            hasNextPage: false,
          },

          range: {
            from: '2026-08-01',

            to: '2026-08-07',

            timeZone: 'Asia/Dubai',

            days: 7,
          },
        }),
      });
    });
  });

  test('shows the detailed page report', async ({ page }) => {
    await page.goto(`/workspaces/${workspaceId}/websites/${websiteId}/analytics/reports?tab=pages`);

    await expect(
      page.getByRole('heading', {
        name: 'Detailed analytics',
      }),
    ).toBeVisible();

    await expect(
      page.getByText('Dashboard', {
        exact: true,
      }),
    ).toBeVisible();

    await expect(
      page.getByText('1,200', {
        exact: true,
      }),
    ).toBeVisible();
  });

  test('keeps filters in the URL', async ({ page }) => {
    await page.goto(`/workspaces/${workspaceId}/websites/${websiteId}/analytics/reports?tab=pages`);

    await page.getByLabel('Date range').selectOption('30d');

    await expect(page).toHaveURL(/range=30d/);

    await page.getByLabel('Search').fill('dashboard');

    await expect(page).toHaveURL(/search=dashboard/);
  });

  test('supports deep links to technology reports', async ({ page }) => {
    await page.goto(
      `/workspaces/${workspaceId}/websites/${websiteId}/analytics/reports?tab=technology&dimension=browsers&range=7d`,
    );

    await expect(page.getByLabel('Technology')).toHaveValue('browsers');
  });
});
