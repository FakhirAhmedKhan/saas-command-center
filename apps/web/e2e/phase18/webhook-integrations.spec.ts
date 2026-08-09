import { expect, test } from '@playwright/test';

const workspaceId = '11111111-1111-4111-8111-111111111111';

test.describe('Phase 18 webhook integrations', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/auth/refresh', async (route) => {
      await route.fulfill({
        status: 200,

        contentType: 'application/json',

        body: JSON.stringify({
          accessToken: 'phase-18-token',

          user: {
            id: '33333333-3333-4333-8333-333333333333',

            email: 'admin@example.com',
          },
        }),
      });
    });

    await page.route('**/integrations/webhooks', async (route) => {
      if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 201,

          contentType: 'application/json',

          body: JSON.stringify({
            endpoint: {
              id: 'webhook-1',

              workspaceId,

              name: 'Production automation',

              url: 'https://automation.example.com/webhook',

              eventTypes: ['DEPLOYMENT_FAILED'],

              payloadVersion: '2026-08-01',

              timeoutMs: 10000,

              maxAttempts: 5,

              enabled: true,

              secretConfigured: true,

              lastDeliveryAt: null,

              lastSuccessAt: null,

              lastFailureAt: null,

              createdAt: '2026-08-07T00:00:00.000Z',

              updatedAt: '2026-08-07T00:00:00.000Z',

              deliveryCount: 0,

              latestDelivery: null,
            },

            secret: 'one-time-webhook-secret',
          }),
        });

        return;
      }

      await route.fulfill({
        status: 200,

        contentType: 'application/json',

        body: JSON.stringify({
          canManage: true,

          eventCatalog: [
            {
              type: 'DEPLOYMENT_FAILED',

              label: 'Deployment failed',

              description: 'A deployment enters the Failed state.',
            },

            {
              type: 'HEALTH_INCIDENT_OPENED',

              label: 'Health incident opened',

              description: 'Monitoring opens a new incident.',
            },
          ],

          items: [],
        }),
      });
    });
  });

  test('creates a webhook and shows its secret once', async ({ page }) => {
    await page.goto(`/workspaces/${workspaceId}/settings/integrations`);

    await page
      .getByRole('button', {
        name: 'Create webhook',
      })
      .click();

    await page.getByLabel('Name').fill('Production automation');

    await page.getByLabel('Endpoint URL').fill('https://automation.example.com/webhook');

    await page
      .getByText('Deployment failed', {
        exact: true,
      })
      .click();

    await page
      .getByRole('button', {
        name: 'Create webhook',
      })
      .click();

    await expect(page.getByText('Save this signing secret')).toBeVisible();

    await expect(page.locator('input[value="one-time-webhook-secret"]')).toBeVisible();
  });

  test('hides webhook management controls from viewers', async ({ page }) => {
    await page.route('**/integrations/webhooks', async (route) => {
      await route.fulfill({
        status: 200,

        contentType: 'application/json',

        body: JSON.stringify({
          canManage: false,

          eventCatalog: [],

          items: [],
        }),
      });
    });

    await page.goto(`/workspaces/${workspaceId}/settings/integrations`);

    await expect(
      page.getByRole('button', {
        name: 'Create webhook',
      }),
    ).toHaveCount(0);
  });

  test('shows a loading skeleton before webhook data arrives', async ({ page }) => {
    let resolveRoute: (() => void) | undefined;

    await page.route('**/integrations/webhooks', async (route) => {
      if (route.request().method() === 'POST') {
        await route.fallback();

        return;
      }

      await new Promise<void>((resolve) => {
        resolveRoute = resolve;
      });

      await route.fulfill({
        status: 200,

        contentType: 'application/json',

        body: JSON.stringify({
          canManage: true,

          eventCatalog: [],

          items: [],
        }),
      });
    });

    const navigation = page.goto(`/workspaces/${workspaceId}/settings/integrations`);

    await expect(page.locator('.animate-pulse').first()).toBeVisible();

    resolveRoute?.();

    await navigation;
  });

  test('shows an error state with a retry action when webhook data fails to load', async ({
    page,
  }) => {
    await page.route('**/integrations/webhooks', async (route) => {
      if (route.request().method() === 'POST') {
        await route.fallback();

        return;
      }

      await route.fulfill({
        status: 500,

        contentType: 'application/json',

        body: JSON.stringify({
          statusCode: 500,

          message: 'Internal server error',
        }),
      });
    });

    await page.goto(`/workspaces/${workspaceId}/settings/integrations`);

    await expect(page.getByText('Integrations unavailable')).toBeVisible();

    await expect(
      page.getByRole('button', {
        name: 'Retry',
      }),
    ).toBeVisible();
  });

  test('shows an empty state when no webhooks are configured', async ({ page }) => {
    await page.route('**/integrations/webhooks', async (route) => {
      if (route.request().method() === 'POST') {
        await route.fallback();

        return;
      }

      await route.fulfill({
        status: 200,

        contentType: 'application/json',

        body: JSON.stringify({
          canManage: true,

          eventCatalog: [],

          items: [],
        }),
      });
    });

    await page.goto(`/workspaces/${workspaceId}/settings/integrations`);

    await expect(page.getByText('No integrations configured')).toBeVisible();

    await expect(
      page.getByText(
        'Create a webhook to deliver selected Command Center events to another system.',
      ),
    ).toBeVisible();
  });

  test('shows an inline alert when webhook creation fails', async ({ page }) => {
    await page.route('**/integrations/webhooks', async (route) => {
      if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 400,

          contentType: 'application/json',

          body: JSON.stringify({
            statusCode: 400,

            message: 'Private or internal webhook destinations are not allowed.',
          }),
        });

        return;
      }

      await route.fulfill({
        status: 200,

        contentType: 'application/json',

        body: JSON.stringify({
          canManage: true,

          eventCatalog: [
            {
              type: 'DEPLOYMENT_FAILED',

              label: 'Deployment failed',

              description: 'A deployment enters the Failed state.',
            },
          ],

          items: [],
        }),
      });
    });

    await page.goto(`/workspaces/${workspaceId}/settings/integrations`);

    await page
      .getByRole('button', {
        name: 'Create webhook',
      })
      .click();

    await page.getByLabel('Name').fill('Internal target');

    await page.getByLabel('Endpoint URL').fill('http://127.0.0.1:4000/internal');

    await page
      .getByText('Deployment failed', {
        exact: true,
      })
      .click();

    await page
      .getByRole('button', {
        name: 'Create webhook',
      })
      .click();

    await expect(
      page.getByText('Private or internal webhook destinations are not allowed.'),
    ).toBeVisible();
  });

  test('rotates a webhook secret after the confirmation dialog is accepted', async ({ page }) => {
    await page.route('**/integrations/webhooks', async (route) => {
      if (route.request().method() === 'POST') {
        await route.fallback();

        return;
      }

      await route.fulfill({
        status: 200,

        contentType: 'application/json',

        body: JSON.stringify({
          canManage: true,

          eventCatalog: [],

          items: [
            {
              id: 'webhook-1',

              workspaceId,

              name: 'Production automation',

              url: 'https://automation.example.com/webhook',

              eventTypes: ['DEPLOYMENT_FAILED'],

              payloadVersion: '2026-08-01',

              timeoutMs: 10000,

              maxAttempts: 5,

              enabled: true,

              secretConfigured: true,

              lastDeliveryAt: null,

              lastSuccessAt: null,

              lastFailureAt: null,

              createdAt: '2026-08-07T00:00:00.000Z',

              updatedAt: '2026-08-07T00:00:00.000Z',

              deliveryCount: 0,

              latestDelivery: null,
            },
          ],
        }),
      });
    });

    let rotateCalled = false;

    await page.route('**/integrations/webhooks/webhook-1/rotate-secret', async (route) => {
      rotateCalled = true;

      await route.fulfill({
        status: 201,

        contentType: 'application/json',

        body: JSON.stringify({
          secret: 'rotated-webhook-secret',
        }),
      });
    });

    page.once('dialog', (dialog) => {
      void dialog.accept();
    });

    await page.goto(`/workspaces/${workspaceId}/settings/integrations`);

    await page
      .getByRole('button', {
        name: 'Rotate secret',
      })
      .click();

    expect(rotateCalled).toBe(true);

    await expect(page.locator('input[value="rotated-webhook-secret"]')).toBeVisible();
  });

  test('does not rotate a webhook secret when the confirmation dialog is dismissed', async ({
    page,
  }) => {
    await page.route('**/integrations/webhooks', async (route) => {
      if (route.request().method() === 'POST') {
        await route.fallback();

        return;
      }

      await route.fulfill({
        status: 200,

        contentType: 'application/json',

        body: JSON.stringify({
          canManage: true,

          eventCatalog: [],

          items: [
            {
              id: 'webhook-1',

              workspaceId,

              name: 'Production automation',

              url: 'https://automation.example.com/webhook',

              eventTypes: ['DEPLOYMENT_FAILED'],

              payloadVersion: '2026-08-01',

              timeoutMs: 10000,

              maxAttempts: 5,

              enabled: true,

              secretConfigured: true,

              lastDeliveryAt: null,

              lastSuccessAt: null,

              lastFailureAt: null,

              createdAt: '2026-08-07T00:00:00.000Z',

              updatedAt: '2026-08-07T00:00:00.000Z',

              deliveryCount: 0,

              latestDelivery: null,
            },
          ],
        }),
      });
    });

    let rotateCalled = false;

    await page.route('**/integrations/webhooks/webhook-1/rotate-secret', async (route) => {
      rotateCalled = true;

      await route.fulfill({
        status: 201,

        contentType: 'application/json',

        body: JSON.stringify({
          secret: 'rotated-webhook-secret',
        }),
      });
    });

    page.once('dialog', (dialog) => {
      void dialog.dismiss();
    });

    await page.goto(`/workspaces/${workspaceId}/settings/integrations`);

    await page
      .getByRole('button', {
        name: 'Rotate secret',
      })
      .click();

    expect(rotateCalled).toBe(false);
  });

  test('disables a webhook after the confirmation dialog is accepted', async ({ page }) => {
    await page.route('**/integrations/webhooks', async (route) => {
      if (route.request().method() === 'POST') {
        await route.fallback();

        return;
      }

      await route.fulfill({
        status: 200,

        contentType: 'application/json',

        body: JSON.stringify({
          canManage: true,

          eventCatalog: [],

          items: [
            {
              id: 'webhook-1',

              workspaceId,

              name: 'Production automation',

              url: 'https://automation.example.com/webhook',

              eventTypes: ['DEPLOYMENT_FAILED'],

              payloadVersion: '2026-08-01',

              timeoutMs: 10000,

              maxAttempts: 5,

              enabled: true,

              secretConfigured: true,

              lastDeliveryAt: null,

              lastSuccessAt: null,

              lastFailureAt: null,

              createdAt: '2026-08-07T00:00:00.000Z',

              updatedAt: '2026-08-07T00:00:00.000Z',

              deliveryCount: 0,

              latestDelivery: null,
            },
          ],
        }),
      });
    });

    let disableCalled = false;

    await page.route('**/integrations/webhooks/webhook-1/disable', async (route) => {
      disableCalled = true;

      await route.fulfill({
        status: 201,

        contentType: 'application/json',

        body: JSON.stringify({
          id: 'webhook-1',

          enabled: false,
        }),
      });
    });

    page.once('dialog', (dialog) => {
      void dialog.accept();
    });

    await page.goto(`/workspaces/${workspaceId}/settings/integrations`);

    await page
      .getByRole('button', {
        name: 'Disable',
      })
      .click();

    expect(disableCalled).toBe(true);
  });

  test('sends a manual test delivery', async ({ page }) => {
    await page.route('**/integrations/webhooks', async (route) => {
      if (route.request().method() === 'POST') {
        await route.fallback();

        return;
      }

      await route.fulfill({
        status: 200,

        contentType: 'application/json',

        body: JSON.stringify({
          canManage: true,

          eventCatalog: [],

          items: [
            {
              id: 'webhook-1',

              workspaceId,

              name: 'Production automation',

              url: 'https://automation.example.com/webhook',

              eventTypes: ['DEPLOYMENT_FAILED'],

              payloadVersion: '2026-08-01',

              timeoutMs: 10000,

              maxAttempts: 5,

              enabled: true,

              secretConfigured: true,

              lastDeliveryAt: null,

              lastSuccessAt: null,

              lastFailureAt: null,

              createdAt: '2026-08-07T00:00:00.000Z',

              updatedAt: '2026-08-07T00:00:00.000Z',

              deliveryCount: 0,

              latestDelivery: null,
            },
          ],
        }),
      });
    });

    let testDeliveryCalled = false;

    await page.route('**/integrations/webhooks/webhook-1/test', async (route) => {
      testDeliveryCalled = true;

      await route.fulfill({
        status: 201,

        contentType: 'application/json',

        body: JSON.stringify({
          deliveryId: 'delivery-1',

          status: 'PENDING',
        }),
      });
    });

    await page.route('**/integrations/webhooks/webhook-1/deliveries*', async (route) => {
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
          },
        }),
      });
    });

    await page.goto(`/workspaces/${workspaceId}/settings/integrations`);

    await page
      .getByRole('button', {
        name: 'Send test',
      })
      .click();

    expect(testDeliveryCalled).toBe(true);
  });

  test('opens the delivery-log viewer and shows an empty state with no deliveries', async ({
    page,
  }) => {
    await page.route('**/integrations/webhooks', async (route) => {
      if (route.request().method() === 'POST') {
        await route.fallback();

        return;
      }

      await route.fulfill({
        status: 200,

        contentType: 'application/json',

        body: JSON.stringify({
          canManage: true,

          eventCatalog: [],

          items: [
            {
              id: 'webhook-1',

              workspaceId,

              name: 'Production automation',

              url: 'https://automation.example.com/webhook',

              eventTypes: ['DEPLOYMENT_FAILED'],

              payloadVersion: '2026-08-01',

              timeoutMs: 10000,

              maxAttempts: 5,

              enabled: true,

              secretConfigured: true,

              lastDeliveryAt: null,

              lastSuccessAt: null,

              lastFailureAt: null,

              createdAt: '2026-08-07T00:00:00.000Z',

              updatedAt: '2026-08-07T00:00:00.000Z',

              deliveryCount: 0,

              latestDelivery: null,
            },
          ],
        }),
      });
    });

    await page.route('**/integrations/webhooks/webhook-1/deliveries*', async (route) => {
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
          },
        }),
      });
    });

    await page.goto(`/workspaces/${workspaceId}/settings/integrations`);

    await page
      .getByRole('button', {
        name: 'Delivery logs',
      })
      .click();

    await expect(
      page.getByRole('heading', {
        name: 'Production automation deliveries',
      }),
    ).toBeVisible();

    await expect(page.getByText('No webhook deliveries have been recorded.')).toBeVisible();

    await expect(
      page.getByText('Request bodies and signing secrets are not included in these logs.'),
    ).toBeVisible();
  });

  test('the delivery-log viewer never renders a secret or ciphertext value', async ({ page }) => {
    await page.route('**/integrations/webhooks', async (route) => {
      if (route.request().method() === 'POST') {
        await route.fallback();

        return;
      }

      await route.fulfill({
        status: 200,

        contentType: 'application/json',

        body: JSON.stringify({
          canManage: true,

          eventCatalog: [],

          items: [
            {
              id: 'webhook-1',

              workspaceId,

              name: 'Production automation',

              url: 'https://automation.example.com/webhook',

              eventTypes: ['DEPLOYMENT_FAILED'],

              payloadVersion: '2026-08-01',

              timeoutMs: 10000,

              maxAttempts: 5,

              enabled: true,

              secretConfigured: true,

              lastDeliveryAt: null,

              lastSuccessAt: null,

              lastFailureAt: null,

              createdAt: '2026-08-07T00:00:00.000Z',

              updatedAt: '2026-08-07T00:00:00.000Z',

              deliveryCount: 1,

              latestDelivery: null,
            },
          ],
        }),
      });
    });

    await page.route('**/integrations/webhooks/webhook-1/deliveries*', async (route) => {
      await route.fulfill({
        status: 200,

        contentType: 'application/json',

        body: JSON.stringify({
          items: [
            {
              id: 'delivery-1',

              status: 'DEAD_LETTERED',

              attemptCount: 5,

              maxAttempts: 5,

              nextAttemptAt: '2026-08-07T01:00:00.000Z',

              responseStatus: 503,

              responseDurationMs: 342,

              failureCode: 'HTTP_5XX',

              failureReason: 'Service Unavailable',

              deliveredAt: null,

              createdAt: '2026-08-07T00:00:00.000Z',

              event: {
                id: 'event-1',

                type: 'DEPLOYMENT_FAILED',

                payloadVersion: '2026-08-01',

                resourceType: 'DEPLOYMENT',

                resourceId: 'deployment-1',

                occurredAt: '2026-08-07T00:00:00.000Z',
              },

              attempts: [],
            },
          ],

          pagination: {
            page: 1,
            limit: 25,
            total: 1,
            totalPages: 1,
          },
        }),
      });
    });

    await page.goto(`/workspaces/${workspaceId}/settings/integrations`);

    await page
      .getByRole('button', {
        name: 'Delivery logs',
      })
      .click();

    await expect(page.getByText('DEAD_LETTERED')).toBeVisible();

    const pageContent = await page.content();

    expect(pageContent).not.toMatch(/secretCiphertext|secretIv|secretAuthTag/i);
  });
});
