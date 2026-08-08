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
});
