import { expect, test } from '@playwright/test';

const workspaceId = '11111111-1111-4111-8111-111111111111';
const applicationId = '22222222-2222-4222-8222-222222222222';

test.describe('Phase 16 releases and deployments', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/auth/refresh', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          accessToken: 'phase-16-token',
          user: {
            id: '33333333-3333-4333-8333-333333333333',
            email: 'admin@example.com',
          },
        }),
      });
    });

    await page.route('**/deployments/options', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          canManage: true,
          environments: [
            {
              id: '44444444-4444-4444-8444-444444444444',
              name: 'Production',
            },
          ],

          openIncidents: [],
        }),
      });
    });

    await page.route('**/releases?*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          items: [
            {
              id: 'release-1',
              version: '1.3.0',
              name: 'Current release',
              notes: 'Stable release.',
              commitRef: 'abc123',
              repositoryUrl: null,
              status: 'SUCCESSFUL',
              scheduledAt: null,
              releasedAt: '2026-08-06T10:00:00.000Z',
              createdAt: '2026-08-06T09:00:00.000Z',
              updatedAt: '2026-08-06T10:00:00.000Z',
              createdBy: {
                id: 'user-1',
                name: 'Admin',
                email: 'admin@example.com',
              },
            },
          ],

          pagination: {
            page: 1,
            limit: 100,
            total: 1,
            totalPages: 1,
            hasPreviousPage: false,
            hasNextPage: false,
          },
        }),
      });
    });

    await page.route('**/deployments/current', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            environmentId: '44444444-4444-4444-8444-444444444444',
            environmentName: 'Production',
            deploymentId: 'deployment-1',
            releaseId: 'release-1',
            version: '1.3.0',
            status: 'SUCCESSFUL',
            deployedAt: '2026-08-06T10:00:00.000Z',
            liveUrl: 'https://example.com',
          },
        ]),
      });
    });

    await page.route('**/deployments?*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          items: [
            {
              id: 'deployment-0',
              releaseId: 'release-0',
              environmentId: '44444444-4444-4444-8444-444444444444',
              attempt: 1,
              status: 'SUCCESSFUL',
              commitRef: 'previous123',
              repositoryUrl: null,
              ciJobUrl: null,
              liveUrl: 'https://previous.example.com',
              deploymentNotes: null,
              failureReason: null,
              scheduledAt: null,
              startedAt: '2026-08-05T09:55:00.000Z',
              finishedAt: '2026-08-05T10:00:00.000Z',
              durationMs: 300000,
              statusChangedAt: '2026-08-05T10:00:00.000Z',
              createdAt: '2026-08-05T09:50:00.000Z',
              release: {
                id: 'release-0',
                version: '1.2.0',
                notes: 'Previous stable release.',
              },

              environment: {
                id: '44444444-4444-4444-8444-444444444444',
                name: 'Production',
              },

              deployedBy: null,
              healthIncident: null,
              rollbackTo: null,
              activities: [],
              allowedTransitions: [],
            },

            {
              id: 'deployment-1',
              releaseId: 'release-1',
              environmentId: '44444444-4444-4444-8444-444444444444',
              attempt: 1,
              status: 'SUCCESSFUL',
              commitRef: 'abc123',
              repositoryUrl: null,
              ciJobUrl: null,
              liveUrl: 'https://example.com',
              deploymentNotes: null,
              failureReason: null,
              scheduledAt: null,
              startedAt: '2026-08-06T09:55:00.000Z',
              finishedAt: '2026-08-06T10:00:00.000Z',
              durationMs: 300000,
              statusChangedAt: '2026-08-06T10:00:00.000Z',
              createdAt: '2026-08-06T09:50:00.000Z',
              release: {
                id: 'release-1',
                version: '1.3.0',
                notes: 'Stable release.',
              },

              environment: {
                id: '44444444-4444-4444-8444-444444444444',
                name: 'Production',
              },

              deployedBy: null,
              healthIncident: null,
              rollbackTo: null,
              activities: [],
              allowedTransitions: ['ROLLED_BACK'],
            },
          ],

          pagination: {
            page: 1,
            limit: 100,
            total: 2,
            totalPages: 1,
            hasPreviousPage: false,
            hasNextPage: false,
          },
        }),
      });
    });
  });

  test('shows current environment versions and deployment history', async ({ page }) => {
    await page.goto(`/workspaces/${workspaceId}/applications/${applicationId}/releases`);

    await expect(
      page.getByRole('heading', {
        name: 'Releases and deployments',
      }),
    ).toBeVisible();

    await expect(page.getByText('Production', { exact: true }).first()).toBeVisible();

    await expect(
      page
        .getByText('1.3.0', {
          exact: true,
        })
        .first(),
    ).toBeVisible();
  });

  test('opens the release creation form', async ({ page }) => {
    await page.goto(`/workspaces/${workspaceId}/applications/${applicationId}/releases`);

    await page
      .getByRole('button', {
        name: 'New release',
      })
      .click();

    await expect(
      page.getByRole('heading', {
        name: 'Create release',
      }),
    ).toBeVisible();

    await expect(page.getByLabel('Version')).toBeVisible();
  });

  test('hides write controls from viewers', async ({ page }) => {
    await page.route('**/deployments/options', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          canManage: false,
          environments: [],
          openIncidents: [],
        }),
      });
    });

    await page.goto(`/workspaces/${workspaceId}/applications/${applicationId}/releases`);

    await expect(
      page.getByRole('button', {
        name: 'New release',
      }),
    ).toHaveCount(0);
  });

  test('shows a loading skeleton before release data arrives', async ({ page }) => {
    let resolveRoute: (() => void) | undefined;

    await page.route('**/deployments/options', async (route) => {
      await new Promise<void>((resolve) => {
        resolveRoute = resolve;
      });

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          canManage: true,
          environments: [],
          openIncidents: [],
        }),
      });
    });

    const navigation = page.goto(`/workspaces/${workspaceId}/applications/${applicationId}/releases`);

    await expect(page.locator('.animate-pulse').first()).toBeVisible();

    resolveRoute?.();

    await navigation;
  });

  test('shows an error state with a retry action when release data fails to load', async ({ page }) => {
    await page.route('**/deployments/options', async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({
          statusCode: 500,
          message: 'Internal server error',
        }),
      });
    });

    await page.goto(`/workspaces/${workspaceId}/applications/${applicationId}/releases`);

    await expect(page.getByText('Release tracking unavailable')).toBeVisible();

    await expect(
      page.getByRole('button', {
        name: 'Try again',
      }),
    ).toBeVisible();
  });

  test('shows an empty state when no environments are configured', async ({ page }) => {
    await page.route('**/deployments/options', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          canManage: true,
          environments: [],
          openIncidents: [],
        }),
      });
    });

    await page.route('**/deployments/current', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      });
    });

    await page.goto(`/workspaces/${workspaceId}/applications/${applicationId}/releases`);

    await expect(page.getByText('No environments')).toBeVisible();

    await expect(page.getByText('Create an application environment before recording deployments.')).toBeVisible();
  });

  test('shows an empty state when no deployments exist', async ({ page }) => {
    await page.route('**/deployments?*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          items: [],
          pagination: {
            page: 1,
            limit: 100,
            total: 0,
            totalPages: 1,
            hasPreviousPage: false,
            hasNextPage: false,
          },
        }),
      });
    });

    await page.goto(`/workspaces/${workspaceId}/applications/${applicationId}/releases`);

    await expect(page.getByText('No deployments')).toBeVisible();

    await expect(page.getByText('Create a release and record its first deployment.')).toBeVisible();
  });

  test('transitions a deployment forward after the confirmation dialog is accepted', async ({ page }) => {
    let transitionCalled = false;

    await page.route('**/deployments/deployment-1/transition', async (route) => {
      transitionCalled = true;

      const requestBody = route.request().postDataJSON() as { status: string };

      expect(requestBody.status).toBe('ROLLED_BACK');

      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'deployment-1',
          status: 'ROLLED_BACK',
        }),
      });
    });

    page.on('dialog', (dialog) => {
      if (dialog.type() === 'prompt') {
        void dialog.accept('1');
        return;
      }

      if (dialog.type() === 'confirm') {
        void dialog.accept();
      }
    });

    await page.goto(`/workspaces/${workspaceId}/applications/${applicationId}/releases`);

    await page
      .getByRole('button', {
        name: 'Mark ROLLED BACK',
      })
      .click();

    expect(transitionCalled).toBe(true);
  });

  test('does not transition a deployment when the confirmation dialog is dismissed', async ({ page }) => {
    let transitionCalled = false;

    await page.route('**/deployments/deployment-1/transition', async (route) => {
      transitionCalled = true;

      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({}),
      });
    });

    page.on('dialog', (dialog) => {
      if (dialog.type() === 'prompt') {
        void dialog.accept('1');
        return;
      }

      if (dialog.type() === 'confirm') {
        void dialog.dismiss();
      }
    });

    await page.goto(`/workspaces/${workspaceId}/applications/${applicationId}/releases`);

    await page
      .getByRole('button', {
        name: 'Mark ROLLED BACK',
      })
      .click();

    expect(transitionCalled).toBe(false);
  });

  test('shows an inline alert when a deployment transition fails', async ({ page }) => {
    await page.route('**/deployments/deployment-1/transition', async (route) => {
      await route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({
          statusCode: 400,
          message: 'Rollback target must be a successful deployment.',
        }),
      });
    });

    page.on('dialog', (dialog) => {
      if (dialog.type() === 'prompt') {
        void dialog.accept('1');
        return;
      }

      if (dialog.type() === 'confirm') {
        void dialog.accept();
      }
    });

    await page.goto(`/workspaces/${workspaceId}/applications/${applicationId}/releases`);

    await page
      .getByRole('button', {
        name: 'Mark ROLLED BACK',
      })
      .click();

    await expect(page.getByText('Rollback target must be a successful deployment.', { exact: true })).toBeVisible();
  });

  test('filters deployments by status', async ({ page }) => {
    await page.goto(`/workspaces/${workspaceId}/applications/${applicationId}/releases`);

    await page.getByLabel('Status').selectOption('SUCCESSFUL');

    await expect(
      page
        .getByText('1.3.0', {
          exact: true,
        })
        .first(),
    ).toBeVisible();
  });

  test('opens an external live URL link for a deployed environment', async ({ page }) => {
    await page.goto(`/workspaces/${workspaceId}/applications/${applicationId}/releases`);

    const link = page.getByRole('link', {
      name: 'Open environment',
    });

    await expect(link).toBeVisible();
    await expect(link).toHaveAttribute('href', 'https://example.com');
    await expect(link).toHaveAttribute('target', '_blank');
  });
});
