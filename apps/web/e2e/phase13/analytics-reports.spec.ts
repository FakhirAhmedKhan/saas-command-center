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

  test('shows a loading skeleton before data arrives', async ({ page }) => {
    let resolveRoute: (() => void) | undefined;

    await page.route('**/analytics/reports/pages*', async (route) => {
      await new Promise<void>((resolve) => {
        resolveRoute = resolve;
      });

      await route.fulfill({
        status: 200,

        contentType: 'application/json',

        body: JSON.stringify({
          items: [],

          pagination: {
            page: 1,
            limit: 25,
            total: 0,
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

    const navigation = page.goto(
      `/workspaces/${workspaceId}/websites/${websiteId}/analytics/reports?tab=pages`,
    );

    await expect(page.locator('.animate-pulse').first()).toBeVisible();

    resolveRoute?.();

    await navigation;
  });

  test('shows an empty state when no report rows match the filters', async ({ page }) => {
    await page.route('**/analytics/reports/pages*', async (route) => {
      await route.fulfill({
        status: 200,

        contentType: 'application/json',

        body: JSON.stringify({
          items: [],

          pagination: {
            page: 1,
            limit: 25,
            total: 0,
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

    await page.goto(`/workspaces/${workspaceId}/websites/${websiteId}/analytics/reports?tab=pages`);

    await expect(page.getByText('No report data')).toBeVisible();

    await expect(
      page.getByText('No matching analytics data was found for the selected filters and date range.'),
    ).toBeVisible();
  });

  test('shows an error state with a retry action when the report request fails', async ({ page }) => {
    await page.route('**/analytics/reports/pages*', async (route) => {
      await route.fulfill({
        status: 500,

        contentType: 'application/json',

        body: JSON.stringify({
          statusCode: 500,

          message: 'Internal server error',
        }),
      });
    });

    await page.goto(`/workspaces/${workspaceId}/websites/${websiteId}/analytics/reports?tab=pages`);

    await expect(page.getByText('Unable to load analytics report')).toBeVisible();

    await expect(
      page.getByRole('button', {
        name: 'Retry',
      }),
    ).toBeVisible();
  });

  test('paginates through report pages using Previous/Next controls', async ({ page }) => {
    await page.route('**/analytics/reports/pages*', async (route) => {
      const url = new URL(route.request().url());

      const requestedPage = url.searchParams.get('page') ?? '1';

      await route.fulfill({
        status: 200,

        contentType: 'application/json',

        body: JSON.stringify({
          items: [
            {
              path: requestedPage === '2' ? '/blog' : '/dashboard',

              title: requestedPage === '2' ? 'Blog' : 'Dashboard',

              views: requestedPage === '2' ? 300 : 1200,

              visitors: 100,
              sessions: 120,
              entrances: 90,
              exits: 60,
              bounceRate: 20,
              averageDurationSeconds: 45,
            },
          ],

          pagination: {
            page: Number(requestedPage),
            limit: 25,
            total: 2,
            totalPages: 2,
            hasPreviousPage: requestedPage === '2',
            hasNextPage: requestedPage !== '2',
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

    await page.goto(`/workspaces/${workspaceId}/websites/${websiteId}/analytics/reports?tab=pages`);

    await expect(page.getByText('Page 1 of 2')).toBeVisible();

    await expect(
      page.getByRole('button', {
        name: 'Previous',
      }),
    ).toBeDisabled();

    await page
      .getByRole('button', {
        name: 'Next',
      })
      .click();

    await expect(page.getByText('Page 2 of 2')).toBeVisible();

    await expect(
      page.getByText('Blog', {
        exact: true,
      }),
    ).toBeVisible();

    await expect(
      page.getByRole('button', {
        name: 'Next',
      }),
    ).toBeDisabled();
  });

  test('exports the current report as CSV', async ({ page }) => {
    await page.route('**/analytics/reports/exports/pages*', async (route) => {
      await route.fulfill({
        status: 200,

        contentType: 'text/csv; charset=utf-8',

        headers: {
          'content-disposition': 'attachment; filename="pages_2026-08-01_2026-08-07.csv"',
        },

        body: 'Path,Title,Views\r\n/dashboard,Dashboard,1200\r\n',
      });
    });

    await page.goto(`/workspaces/${workspaceId}/websites/${websiteId}/analytics/reports?tab=pages`);

    const downloadPromise = page.waitForEvent('download');

    await page
      .getByRole('button', {
        name: 'Export CSV',
      })
      .click();

    const download = await downloadPromise;

    expect(download.suggestedFilename()).toContain('.csv');
  });

  test('shows an inline error when the CSV export request fails', async ({ page }) => {
    await page.route('**/analytics/reports/exports/pages*', async (route) => {
      await route.fulfill({
        status: 400,

        contentType: 'application/json',

        body: JSON.stringify({
          statusCode: 400,

          message: 'CSV exports cannot exceed 90 days',
        }),
      });
    });

    await page.goto(`/workspaces/${workspaceId}/websites/${websiteId}/analytics/reports?tab=pages`);

    await page
      .getByRole('button', {
        name: 'Export CSV',
      })
      .click();

    await expect(page.getByText('CSV exports cannot exceed 90 days')).toBeVisible();
  });
});
