import { expect, test } from '@playwright/test';

const workspaceId = '11111111-1111-4111-8111-111111111111';
const websiteId = '22222222-2222-4222-8222-222222222222';

test.describe('Phase 14 analytics processing', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/auth/refresh', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          accessToken: 'phase-14-token',
          user: {
            id: '33333333-3333-4333-8333-333333333333',
            email: 'admin@example.com',
          },
        }),
      });
    });

    await page.route('**/analytics/processing/status', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          canReprocess: true,
          pendingEvents: 42,
          unresolvedDeadLetters: 1,
          activeRun: null,
          latestRun: null,
          lastSuccessfulRun: {
            id: 'run-success',
            status: 'SUCCEEDED',
            trigger: 'SCHEDULED',
            rangeStart: '2026-08-01T00:00:00.000Z',
            rangeEnd: '2026-08-02T00:00:00.000Z',
            retryCount: 0,
            maxRetries: 3,
            processedEvents: 100,
            failedEvents: 0,
            errorMessage: null,
            startedAt: '2026-08-02T01:00:00.000Z',
            finishedAt: '2026-08-02T01:01:00.000Z',
            createdAt: '2026-08-02T01:00:00.000Z',
          },

          recentRuns: [],
        }),
      });
    });

    await page.route('**/analytics/processing/reprocess', async (route) => {
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'queued-run',
          status: 'QUEUED',
        }),
      });
    });
  });

  test('shows processing status', async ({ page }) => {
    await page.goto(`/workspaces/${workspaceId}/websites/${websiteId}/analytics/processing`);

    await expect(
      page.getByRole('heading', {
        name: 'Processing status',
      }),
    ).toBeVisible();

    await expect(
      page.getByText('42', {
        exact: true,
      }),
    ).toBeVisible();

    await expect(
      page.getByText('1', {
        exact: true,
      }),
    ).toBeVisible();

    await expect(
      page.getByRole('button', {
        name: 'Reprocess',
      }),
    ).toBeVisible();
  });

  test('hides management controls for viewers', async ({ page }) => {
    await page.route('**/analytics/processing/status', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          canReprocess: false,
          pendingEvents: 0,
          unresolvedDeadLetters: 0,
          activeRun: null,
          latestRun: null,
          lastSuccessfulRun: null,
          recentRuns: [],
        }),
      });
    });

    await page.goto(`/workspaces/${workspaceId}/websites/${websiteId}/analytics/processing`);

    await expect(
      page.getByRole('button', {
        name: 'Reprocess',
      }),
    ).toHaveCount(0);
  });

  test('shows a loading skeleton before status data arrives', async ({ page }) => {
    let resolveRoute: (() => void) | undefined;

    await page.route('**/analytics/processing/status', async (route) => {
      await new Promise<void>((resolve) => {
        resolveRoute = resolve;
      });

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          canReprocess: true,
          pendingEvents: 0,
          unresolvedDeadLetters: 0,
          activeRun: null,
          latestRun: null,
          lastSuccessfulRun: null,
          recentRuns: [],
        }),
      });
    });

    const navigation = page.goto(`/workspaces/${workspaceId}/websites/${websiteId}/analytics/processing`);

    await expect(page.getByLabel('Loading processing status')).toBeVisible();

    resolveRoute?.();

    await navigation;
  });

  test('shows an error state with a retry action when the status request fails', async ({ page }) => {
    await page.route('**/analytics/processing/status', async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({
          statusCode: 500,
          message: 'Internal server error',
        }),
      });
    });

    await page.goto(`/workspaces/${workspaceId}/websites/${websiteId}/analytics/processing`);

    await expect(page.getByText('Processing status unavailable')).toBeVisible();

    await expect(
      page.getByRole('button', {
        name: 'Try again',
      }),
    ).toBeVisible();
  });

  test('shows an empty state when no processing runs have been recorded', async ({ page }) => {
    await page.route('**/analytics/processing/status', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          canReprocess: true,
          pendingEvents: 0,
          unresolvedDeadLetters: 0,
          activeRun: null,
          latestRun: null,
          lastSuccessfulRun: null,
          recentRuns: [],
        }),
      });
    });

    await page.goto(`/workspaces/${workspaceId}/websites/${websiteId}/analytics/processing`);

    await expect(page.getByText('No processing runs have been recorded.')).toBeVisible();
  });

  test('queues manual reprocessing after the confirmation dialog is accepted', async ({ page }) => {
    page.once('dialog', (dialog) => {
      void dialog.accept();
    });

    await page.goto(`/workspaces/${workspaceId}/websites/${websiteId}/analytics/processing`);

    await page
      .getByRole('button', {
        name: 'Reprocess',
      })
      .click();

    await expect(page.getByText('Analytics reprocessing was queued.')).toBeVisible();
  });

  test('does not queue reprocessing when the confirmation dialog is dismissed', async ({ page }) => {
    let reprocessCalled = false;

    await page.route('**/analytics/processing/reprocess', async (route) => {
      reprocessCalled = true;

      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'queued-run',
          status: 'QUEUED',
        }),
      });
    });

    page.once('dialog', (dialog) => {
      void dialog.dismiss();
    });

    await page.goto(`/workspaces/${workspaceId}/websites/${websiteId}/analytics/processing`);

    await page
      .getByRole('button', {
        name: 'Reprocess',
      })
      .click();

    expect(reprocessCalled).toBe(false);
  });

  test('shows an inline alert when manual reprocessing fails', async ({ page }) => {
    await page.route('**/analytics/processing/reprocess', async (route) => {
      await route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({
          statusCode: 400,
          message: 'Reprocessing cannot exceed 31 days.',
        }),
      });
    });

    page.once('dialog', (dialog) => {
      void dialog.accept();
    });

    await page.goto(`/workspaces/${workspaceId}/websites/${websiteId}/analytics/processing`);

    await page
      .getByRole('button', {
        name: 'Reprocess',
      })
      .click();

    await expect(page.locator('[role="alert"]:not(#__next-route-announcer__)')).toHaveText('Reprocessing cannot exceed 31 days.');
  });

  test('shows a dead-lettered run with a Retry action and its error message', async ({ page }) => {
    await page.route('**/analytics/processing/status', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          canReprocess: true,
          pendingEvents: 0,
          unresolvedDeadLetters: 1,
          activeRun: null,
          latestRun: null,
          lastSuccessfulRun: null,
          recentRuns: [
            {
              id: 'run-dead-letter',
              status: 'DEAD_LETTERED',
              trigger: 'MANUAL',
              rangeStart: '2026-08-01T00:00:00.000Z',
              rangeEnd: '2026-08-02T00:00:00.000Z',
              retryCount: 3,
              maxRetries: 3,
              processedEvents: 0,
              failedEvents: 12,
              errorMessage: 'Method not implemented.',
              startedAt: '2026-08-02T01:00:00.000Z',
              finishedAt: '2026-08-02T01:01:00.000Z',
              createdAt: '2026-08-02T01:00:00.000Z',
            },
          ],
        }),
      });
    });

    await page.goto(`/workspaces/${workspaceId}/websites/${websiteId}/analytics/processing`);

    await expect(
      page.getByText('Method not implemented.', {
        exact: true,
      }),
    ).toBeVisible();

    await expect(
      page.getByRole('button', {
        name: 'Retry',
      }),
    ).toBeVisible();
  });

  test('retries a dead-lettered run after the confirmation dialog is accepted', async ({ page }) => {
    await page.route('**/analytics/processing/status', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          canReprocess: true,
          pendingEvents: 0,
          unresolvedDeadLetters: 1,
          activeRun: null,
          latestRun: null,
          lastSuccessfulRun: null,
          recentRuns: [
            {
              id: 'run-dead-letter',
              status: 'DEAD_LETTERED',
              trigger: 'MANUAL',
              rangeStart: '2026-08-01T00:00:00.000Z',
              rangeEnd: '2026-08-02T00:00:00.000Z',
              retryCount: 3,
              maxRetries: 3,
              processedEvents: 0,
              failedEvents: 12,
              errorMessage: 'Method not implemented.',
              startedAt: '2026-08-02T01:00:00.000Z',
              finishedAt: '2026-08-02T01:01:00.000Z',
              createdAt: '2026-08-02T01:00:00.000Z',
            },
          ],
        }),
      });
    });

    let retryCalled = false;

    await page.route('**/analytics/processing/runs/run-dead-letter/retry', async (route) => {
      retryCalled = true;

      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'retry-run',
          status: 'QUEUED',
        }),
      });
    });

    page.once('dialog', (dialog) => {
      void dialog.accept();
    });

    await page.goto(`/workspaces/${workspaceId}/websites/${websiteId}/analytics/processing`);

    await page
      .getByRole('button', {
        name: 'Retry',
      })
      .click();

    await expect(page.getByText('Failed processing run was queued for retry.')).toBeVisible();

    expect(retryCalled).toBe(true);
  });
});
