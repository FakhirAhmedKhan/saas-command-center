import { expect, test } from '@playwright/test';

const workspaceId = '11111111-1111-4111-8111-111111111111';

test.describe('Phase 17 team operations', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/auth/refresh', async (route) => {
      await route.fulfill({
        status: 200,

        contentType: 'application/json',

        body: JSON.stringify({
          accessToken: 'phase-17-token',

          user: {
            id: '33333333-3333-4333-8333-333333333333',

            email: 'admin@example.com',
          },
        }),
      });
    });

    await page.route('**/workspaces/*/invitations', async (route) => {
      if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 201,

          contentType: 'application/json',

          body: JSON.stringify({
            invitation: {
              id: 'invitation-1',

              workspaceId,

              email: 'developer@example.com',

              role: 'DEVELOPER',

              status: 'PENDING',

              deliveryStatus: 'NOT_REQUESTED',

              deliveryError: null,

              expiresAt: '2026-08-10T00:00:00.000Z',

              acceptedAt: null,

              declinedAt: null,

              revokedAt: null,

              lastSentAt: '2026-08-07T00:00:00.000Z',

              sendCount: 1,

              createdAt: '2026-08-07T00:00:00.000Z',

              invitedBy: {
                id: 'user-1',

                name: 'Admin',

                email: 'admin@example.com',
              },

              acceptedBy: null,
            },

            invitationUrl: 'http://localhost:3000/invitations/test-token',
          }),
        });

        return;
      }

      await route.fulfill({
        status: 200,

        contentType: 'application/json',

        body: JSON.stringify([]),
      });
    });

    await page.route('**/notifications?*', async (route) => {
      await route.fulfill({
        status: 200,

        contentType: 'application/json',

        body: JSON.stringify({
          items: [
            {
              id: 'notification-1',

              workspaceId,

              applicationId: null,

              type: 'HEALTH_INCIDENT_OPENED',

              priority: 'CRITICAL',

              title: 'Health incident opened',

              message: 'Production API is down.',

              resourceType: 'HEALTH_INCIDENT',

              resourceId: 'incident-1',

              actionUrl: `/workspaces/${workspaceId}/monitoring`,

              readAt: null,

              expiresAt: null,

              createdAt: '2026-08-07T00:00:00.000Z',
            },
          ],

          pagination: {
            page: 1,
            limit: 20,
            total: 1,
            totalPages: 1,
          },
        }),
      });
    });
  });

  test('creates an invitation and shows the one-time link', async ({ page }) => {
    await page.goto(`/workspaces/${workspaceId}/settings/members`);

    await page.getByLabel('Email').fill('developer@example.com');

    await page.getByLabel('Role').selectOption('DEVELOPER');

    await page
      .getByRole('button', {
        name: 'Send invitation',
      })
      .click();

    await expect(page.getByText('Invitation created')).toBeVisible();

    await expect(page.locator('input[value*="invitations/test-token"]')).toBeVisible();
  });

  test('shows unread operational notifications', async ({ page }) => {
    await page.goto('/notifications');

    await expect(page.getByText('Health incident opened')).toBeVisible();

    await expect(page.getByText('Production API is down.')).toBeVisible();
  });

  test('shows a loading skeleton before invitations arrive', async ({ page }) => {
    let resolveRoute: (() => void) | undefined;

    await page.route('**/workspaces/*/invitations', async (route) => {
      if (route.request().method() !== 'GET') {
        await route.fallback();

        return;
      }

      await new Promise<void>((resolve) => {
        resolveRoute = resolve;
      });

      await route.fulfill({
        status: 200,

        contentType: 'application/json',

        body: JSON.stringify([]),
      });
    });

    const navigation = page.goto(`/workspaces/${workspaceId}/settings/members`);

    await expect(page.locator('.animate-pulse').first()).toBeVisible();

    resolveRoute?.();

    await navigation;
  });

  test('shows an empty state when no invitations have been created', async ({ page }) => {
    await page.route('**/workspaces/*/invitations', async (route) => {
      if (route.request().method() !== 'GET') {
        await route.fallback();

        return;
      }

      await route.fulfill({
        status: 200,

        contentType: 'application/json',

        body: JSON.stringify([]),
      });
    });

    await page.goto(`/workspaces/${workspaceId}/settings/members`);

    await expect(page.getByText('No workspace invitations have been created.')).toBeVisible();
  });

  test('shows an inline error when creating an invitation fails', async ({ page }) => {
    await page.route('**/workspaces/*/invitations', async (route) => {
      if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 409,

          contentType: 'application/json',

          body: JSON.stringify({
            statusCode: 409,

            message: 'This user is already a workspace member.',
          }),
        });

        return;
      }

      await route.fulfill({
        status: 200,

        contentType: 'application/json',

        body: JSON.stringify([]),
      });
    });

    await page.goto(`/workspaces/${workspaceId}/settings/members`);

    await page.getByLabel('Email').fill('existing-member@example.com');

    await page
      .getByRole('button', {
        name: 'Send invitation',
      })
      .click();

    await expect(page.getByText('This user is already a workspace member.')).toBeVisible();
  });

  test('resends a pending invitation and shows the refreshed one-time link', async ({ page }) => {
    await page.route('**/workspaces/*/invitations', async (route) => {
      if (route.request().method() !== 'GET') {
        await route.fallback();

        return;
      }

      await route.fulfill({
        status: 200,

        contentType: 'application/json',

        body: JSON.stringify([
          {
            id: 'invitation-1',

            workspaceId,

            email: 'developer@example.com',

            role: 'DEVELOPER',

            status: 'PENDING',

            deliveryStatus: 'SENT',

            deliveryError: null,

            expiresAt: '2026-08-10T00:00:00.000Z',

            acceptedAt: null,

            declinedAt: null,

            revokedAt: null,

            lastSentAt: '2026-08-07T00:00:00.000Z',

            sendCount: 1,

            createdAt: '2026-08-07T00:00:00.000Z',

            invitedBy: {
              id: 'user-1',

              name: 'Admin',

              email: 'admin@example.com',
            },

            acceptedBy: null,
          },
        ]),
      });
    });

    let resendCalled = false;

    await page.route('**/workspaces/*/invitations/invitation-1/resend', async (route) => {
      resendCalled = true;

      await route.fulfill({
        status: 201,

        contentType: 'application/json',

        body: JSON.stringify({
          invitation: {
            id: 'invitation-1',

            workspaceId,

            email: 'developer@example.com',

            role: 'DEVELOPER',

            status: 'PENDING',

            deliveryStatus: 'SENT',

            deliveryError: null,

            expiresAt: '2026-08-11T00:00:00.000Z',

            acceptedAt: null,

            declinedAt: null,

            revokedAt: null,

            lastSentAt: '2026-08-08T00:00:00.000Z',

            sendCount: 2,

            createdAt: '2026-08-07T00:00:00.000Z',

            invitedBy: {
              id: 'user-1',

              name: 'Admin',

              email: 'admin@example.com',
            },

            acceptedBy: null,
          },

          invitationUrl: 'http://localhost:3000/invitations/refreshed-token',
        }),
      });
    });

    await page.goto(`/workspaces/${workspaceId}/settings/members`);

    await page
      .getByRole('button', {
        name: 'Resend',
      })
      .click();

    expect(resendCalled).toBe(true);

    await expect(page.locator('input[value*="invitations/refreshed-token"]')).toBeVisible();
  });

  test('revokes a pending invitation after the confirmation dialog is accepted', async ({ page }) => {
    await page.route('**/workspaces/*/invitations', async (route) => {
      if (route.request().method() !== 'GET') {
        await route.fallback();

        return;
      }

      await route.fulfill({
        status: 200,

        contentType: 'application/json',

        body: JSON.stringify([
          {
            id: 'invitation-1',

            workspaceId,

            email: 'developer@example.com',

            role: 'DEVELOPER',

            status: 'PENDING',

            deliveryStatus: 'SENT',

            deliveryError: null,

            expiresAt: '2026-08-10T00:00:00.000Z',

            acceptedAt: null,

            declinedAt: null,

            revokedAt: null,

            lastSentAt: '2026-08-07T00:00:00.000Z',

            sendCount: 1,

            createdAt: '2026-08-07T00:00:00.000Z',

            invitedBy: {
              id: 'user-1',

              name: 'Admin',

              email: 'admin@example.com',
            },

            acceptedBy: null,
          },
        ]),
      });
    });

    let revokeCalled = false;

    await page.route('**/workspaces/*/invitations/invitation-1/revoke', async (route) => {
      revokeCalled = true;

      await route.fulfill({
        status: 201,

        contentType: 'application/json',

        body: JSON.stringify({
          success: true,
        }),
      });
    });

    page.once('dialog', (dialog) => {
      void dialog.accept();
    });

    await page.goto(`/workspaces/${workspaceId}/settings/members`);

    await page
      .getByRole('button', {
        name: 'Revoke',
      })
      .click();

    expect(revokeCalled).toBe(true);
  });

  test('does not revoke an invitation when the confirmation dialog is dismissed', async ({ page }) => {
    await page.route('**/workspaces/*/invitations', async (route) => {
      if (route.request().method() !== 'GET') {
        await route.fallback();

        return;
      }

      await route.fulfill({
        status: 200,

        contentType: 'application/json',

        body: JSON.stringify([
          {
            id: 'invitation-1',

            workspaceId,

            email: 'developer@example.com',

            role: 'DEVELOPER',

            status: 'PENDING',

            deliveryStatus: 'SENT',

            deliveryError: null,

            expiresAt: '2026-08-10T00:00:00.000Z',

            acceptedAt: null,

            declinedAt: null,

            revokedAt: null,

            lastSentAt: '2026-08-07T00:00:00.000Z',

            sendCount: 1,

            createdAt: '2026-08-07T00:00:00.000Z',

            invitedBy: {
              id: 'user-1',

              name: 'Admin',

              email: 'admin@example.com',
            },

            acceptedBy: null,
          },
        ]),
      });
    });

    let revokeCalled = false;

    await page.route('**/workspaces/*/invitations/invitation-1/revoke', async (route) => {
      revokeCalled = true;

      await route.fulfill({
        status: 201,

        contentType: 'application/json',

        body: JSON.stringify({
          success: true,
        }),
      });
    });

    page.once('dialog', (dialog) => {
      void dialog.dismiss();
    });

    await page.goto(`/workspaces/${workspaceId}/settings/members`);

    await page
      .getByRole('button', {
        name: 'Revoke',
      })
      .click();

    expect(revokeCalled).toBe(false);
  });

  test('shows an empty state on the notifications page when there are no notifications', async ({ page }) => {
    await page.route('**/notifications?*', async (route) => {
      await route.fulfill({
        status: 200,

        contentType: 'application/json',

        body: JSON.stringify({
          items: [],

          nextCursor: null,
        }),
      });
    });

    await page.goto('/notifications');

    await expect(page.getByText('No notifications')).toBeVisible();

    await expect(page.getByText('You are up to date.')).toBeVisible();
  });

  test('marks all notifications as read via "Mark all read"', async ({ page }) => {
    let markAllCalled = false;

    await page.route('**/notifications/mark-all-read', async (route) => {
      markAllCalled = true;

      await route.fulfill({
        status: 201,

        contentType: 'application/json',

        body: JSON.stringify({
          updated: 1,
        }),
      });
    });

    await page.goto('/notifications');

    await page
      .getByRole('button', {
        name: 'Mark all read',
      })
      .click();

    expect(markAllCalled).toBe(true);
  });

  test('re-fetches with unreadOnly when the "Unread only" checkbox is toggled', async ({ page }) => {
    let lastUnreadOnlyParam: string | null = null;

    await page.route('**/notifications?*', async (route) => {
      const url = new URL(route.request().url());

      lastUnreadOnlyParam = url.searchParams.get('unreadOnly');

      await route.fulfill({
        status: 200,

        contentType: 'application/json',

        body: JSON.stringify({
          items: [],

          nextCursor: null,
        }),
      });
    });

    await page.goto('/notifications');

    expect(lastUnreadOnlyParam).not.toBe('true');

    await page
      .getByRole('button', {
        name: 'Unread',
        exact: true,
      })
      .click();

    await expect.poll(() => lastUnreadOnlyParam).toBe('true');
  });

  test('shows the unread count badge on the notification bell', async ({ page }) => {
    await page.route('**/notifications/unread-count', async (route) => {
      await route.fulfill({
        status: 200,

        contentType: 'application/json',

        body: JSON.stringify({
          count: 4,
        }),
      });
    });

    await page.goto(`/workspaces/${workspaceId}`);

    await expect(page.getByLabel('Notifications, 4 unread')).toBeVisible();

    await expect(page.getByText('4', { exact: true })).toBeVisible();
  });

  test('caps the notification bell badge display at "99+"', async ({ page }) => {
    await page.route('**/notifications/unread-count', async (route) => {
      await route.fulfill({
        status: 200,

        contentType: 'application/json',

        body: JSON.stringify({
          count: 150,
        }),
      });
    });

    await page.goto(`/workspaces/${workspaceId}`);

    await expect(page.getByLabel('Notifications, 150 unread')).toBeVisible();

    await expect(page.getByText('99+', { exact: true })).toBeVisible();
  });
});
