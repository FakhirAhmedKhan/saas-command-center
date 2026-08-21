import { expect, test } from '@playwright/test';

const workspaceId = '11111111-1111-4111-8111-111111111111';

test.describe('Phase 15 monitoring', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/auth/refresh', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          accessToken: 'phase-15-token',
          user: {
            id: '33333333-3333-4333-8333-333333333333',
            email: 'admin@example.com',
          },
        }),
      });
    });

    await page.route('**/monitoring/summary', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          canManage: true,
          total: 3,
          healthy: 1,
          degraded: 1,
          down: 1,
          unknown: 0,
          disabled: 0,
          activeIncidents: 1,
        }),
      });
    });

    await page.route('**/monitoring/targets', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: '44444444-4444-4444-8444-444444444444',
            type: 'APPLICATION',
            name: 'Demo API',
            subtitle: null,
          },
        ]),
      });
    });

    await page.route('**/monitoring/checks', async (route) => {
      if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 'new-check',
          }),
        });

        return;
      }

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: '55555555-5555-4555-8555-555555555555',
            targetType: 'APPLICATION',
            targetId: '44444444-4444-4444-8444-444444444444',
            targetName: 'Demo API',
            applicationId: '44444444-4444-4444-8444-444444444444',
            websiteId: null,
            name: 'Production API',
            url: 'https://example.com/health',
            intervalSeconds: 300,
            timeoutMs: 10000,
            expectedStatusMin: 200,
            expectedStatusMax: 399,
            degradedAfterMs: 1500,
            failureThreshold: 3,
            enabled: true,
            latestStatus: 'HEALTHY',
            lastStatusCode: 200,
            lastResponseTimeMs: 120,
            lastFailureReason: null,
            consecutiveFailures: 0,
            lastCheckedAt: '2026-08-07T01:00:00.000Z',
            lastSuccessfulAt: '2026-08-07T01:00:00.000Z',
            nextRunAt: '2026-08-07T01:05:00.000Z',
            createdAt: '2026-08-01T00:00:00.000Z',
            updatedAt: '2026-08-07T01:00:00.000Z',
          },
        ]),
      });
    });

    await page.route('**/monitoring/incidents', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 'incident-1',
            healthCheckId: 'check-2',
            healthCheckName: 'Website',
            targetName: 'Public Website',
            status: 'OPEN',
            summary: 'Website returned HTTP 500.',
            failureCount: 3,
            firstFailureAt: '2026-08-07T00:00:00.000Z',
            lastFailureAt: '2026-08-07T00:10:00.000Z',
            startedAt: '2026-08-07T00:10:00.000Z',
            resolvedAt: null,
          },
        ]),
      });
    });
  });

  test('shows monitoring summary and health checks', async ({ page }) => {
    await page.goto(`/workspaces/${workspaceId}/monitoring`);

    await expect(
      page.getByRole('heading', {
        name: 'Monitoring',
      }),
    ).toBeVisible();

    await expect(
      page.getByText('Production API', {
        exact: true,
      }),
    ).toBeVisible();

    const checkCard = page.locator('article').filter({
      hasText: 'Production API',
    });

    await expect(
      checkCard.getByText('Healthy', {
        exact: true,
      }),
    ).toBeVisible();

    await expect(page.getByText('Website returned HTTP 500.')).toBeVisible();
  });

  test('opens the health-check configuration form', async ({ page }) => {
    await page.goto(`/workspaces/${workspaceId}/monitoring`);

    await page
      .getByRole('button', {
        name: 'Add health check',
      })
      .click();

    await expect(
      page.getByRole('heading', {
        name: 'Add health check',
      }),
    ).toBeVisible();

    await expect(page.getByLabel('Health URL')).toBeVisible();
  });

  test('hides management controls from viewers', async ({ page }) => {
    await page.route('**/monitoring/summary', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          canManage: false,
          total: 1,
          healthy: 1,
          degraded: 0,
          down: 0,
          unknown: 0,
          disabled: 0,
          activeIncidents: 0,
        }),
      });
    });

    await page.goto(`/workspaces/${workspaceId}/monitoring`);

    await expect(
      page.getByRole('button', {
        name: 'Add health check',
      }),
    ).toHaveCount(0);

    await expect(
      page.getByRole('button', {
        name: 'Edit',
      }),
    ).toHaveCount(0);
  });

  test('shows a loading skeleton before monitoring data arrives', async ({ page }) => {
    let resolveRoute: (() => void) | undefined;

    await page.route('**/monitoring/summary', async (route) => {
      await new Promise<void>((resolve) => {
        resolveRoute = resolve;
      });

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          canManage: true,
          total: 0,
          healthy: 0,
          degraded: 0,
          down: 0,
          unknown: 0,
          disabled: 0,
          activeIncidents: 0,
        }),
      });
    });

    const navigation = page.goto(`/workspaces/${workspaceId}/monitoring`);

    await expect(page.locator('.animate-pulse').first()).toBeVisible();

    resolveRoute?.();

    await navigation;
  });

  test('shows an error state with a retry action when monitoring data fails to load', async ({ page }) => {
    await page.route('**/monitoring/summary', async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({
          statusCode: 500,
          message: 'Internal server error',
        }),
      });
    });

    await page.goto(`/workspaces/${workspaceId}/monitoring`);

    await expect(page.getByText('Monitoring unavailable')).toBeVisible();

    await expect(
      page.getByRole('button', {
        name: 'Try again',
      }),
    ).toBeVisible();
  });

  test('shows an empty state when no health checks are configured', async ({ page }) => {
    await page.route('**/monitoring/checks', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      });
    });

    await page.goto(`/workspaces/${workspaceId}/monitoring`);

    await expect(page.getByText('Monitoring is not configured')).toBeVisible();

    await expect(page.getByText('Add a health check to begin tracking application or website availability.')).toBeVisible();
  });

  test('shows an empty state for the incident timeline when there are no incidents', async ({ page }) => {
    await page.route('**/monitoring/incidents', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      });
    });

    await page.goto(`/workspaces/${workspaceId}/monitoring`);

    await expect(page.getByText('No monitoring incidents have been recorded.')).toBeVisible();
  });

  test('runs a health check immediately via "Run now"', async ({ page }) => {
    let runCalled = false;

    await page.route('**/monitoring/checks/55555555-5555-4555-8555-555555555555/run', async (route) => {
      runCalled = true;

      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          healthCheckId: '55555555-5555-4555-8555-555555555555',
          status: 'HEALTHY',
          statusCode: 200,
          responseTimeMs: 120,
          failureReason: null,
          consecutiveFailures: 0,
          nextRunAt: '2026-08-07T01:10:00.000Z',
        }),
      });
    });

    await page.goto(`/workspaces/${workspaceId}/monitoring`);

    await page
      .getByRole('button', {
        name: 'Run now',
      })
      .click();

    expect(runCalled).toBe(true);
  });

  test('toggles a health check via "Disable", then shows an inline alert on failure', async ({ page }) => {
    await page.route('**/monitoring/checks/55555555-5555-4555-8555-555555555555', async (route) => {
      if (route.request().method() === 'PATCH') {
        await route.fulfill({
          status: 400,
          contentType: 'application/json',
          body: JSON.stringify({
            statusCode: 400,
            message: 'Unable to disable this health check right now.',
          }),
        });

        return;
      }

      await route.fallback();
    });

    await page.goto(`/workspaces/${workspaceId}/monitoring`);

    await page
      .getByRole('button', {
        name: 'Disable',
      })
      .click();

    await expect(page.locator('[role="alert"]:not(#__next-route-announcer__)')).toHaveText('Unable to disable this health check right now.');
  });

  test('opens the health-check history view', async ({ page }) => {
    await page.route('**/monitoring/checks/55555555-5555-4555-8555-555555555555/history', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 'history-1',
            status: 'HEALTHY',
            statusCode: 200,
            responseTimeMs: 118,
            failureReason: null,
            checkedAt: '2026-08-07T01:00:00.000Z',
          },
        ]),
      });
    });

    await page.goto(`/workspaces/${workspaceId}/monitoring`);

    await page
      .getByRole('button', {
        name: 'History',
      })
      .click();

    await expect(
      page.getByRole('heading', {
        name: 'Production API history',
      }),
    ).toBeVisible();

    await expect(
      page.getByText('118ms', {
        exact: true,
      }),
    ).toBeVisible();
  });
});
