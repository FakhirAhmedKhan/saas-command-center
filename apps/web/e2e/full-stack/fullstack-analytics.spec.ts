import { expect, test, type BrowserContext, type Page } from '@playwright/test';

import { expectMetric, loginThroughUi, trackerIdentifier } from './fixtures/helpers';
import { readFullStackState, type FullStackState } from './fixtures/state';

let state: FullStackState;

test.describe.configure({
  mode: 'serial',
});

test.describe('Batch 11 real analytics pipeline', () => {
  let context: BrowserContext;
  let page: Page;

  let visitorId = '';
  let sessionId = '';

  test.beforeAll(async ({ browser }) => {
    state = readFullStackState();

    visitorId = trackerIdentifier('visitor');
    sessionId = trackerIdentifier('session');

    context = await browser.newContext();
    page = await context.newPage();

    await loginThroughUi(page, state.owner);
  });

  test.afterAll(async () => {
    await context.close();
  });

  test('accepts real tracker events through the public collect endpoint', async ({ request }) => {
    const timestamp = new Date().toISOString();

    const response = await request.post(`${state.apiUrl}/collect`, {
      headers: {
        Origin: state.trackingOrigin,
        'User-Agent': 'Batch11FullStack/1.0 Chrome',
        'Content-Type': 'text/plain',
      },
      data: JSON.stringify({
        websiteId: state.baselineWebsite.id,
        trackingKey: state.baselineWebsite.trackingKey,
        sdkVersion: '1.0.0-batch11',
        sentAt: timestamp,
        events: [
          {
            eventId: trackerIdentifier('page'),
            type: 'PAGE_VIEW',
            visitorId,
            sessionId,
            timestamp,
            url: `${state.trackingOrigin}/pricing`,
            title: 'Batch 11 Pricing',
            referrer: 'https://search.example.test/results',
            language: 'en-US',
            timeZone: 'Asia/Dubai',
            screenWidth: 1920,
            screenHeight: 1080,
            viewportWidth: 1440,
            viewportHeight: 900,
          },
          {
            eventId: trackerIdentifier('custom'),
            type: 'CUSTOM',
            visitorId,
            sessionId,
            timestamp,
            url: `${state.trackingOrigin}/pricing`,
            eventName: 'signup_completed',
            properties: {
              plan: 'pro',
              source: 'pricing_page',
            },
          },
          {
            eventId: trackerIdentifier('heartbeat'),
            type: 'HEARTBEAT',
            visitorId,
            sessionId,
            timestamp,
            url: `${state.trackingOrigin}/pricing`,
            durationMs: 15_000,
          },
        ],
      }),
    });

    expect(response.status()).toBe(202);

    const body = (await response.json()) as {
      accepted: number;
      duplicates: number;
    };

    expect(body.accepted).toBe(3);
    expect(body.duplicates).toBe(0);
  });

  test('shows the raw events through the real tracking status UI', async () => {
    await page.goto(`/workspaces/${state.owner.workspaceId}/websites/${state.baselineWebsite.id}/installation`);

    await page
      .getByRole('button', {
        name: 'Refresh',
      })
      .click();

    await expect(page.getByText('Receiving events')).toBeVisible();

    await expectMetric(page, 'Total events', 3);

    await expectMetric(page, 'Page views', 1);

    await expectMetric(page, 'Heartbeats', 1);

    await expectMetric(page, 'Custom events', 1);
  });

  test('processes the events and displays normalized analytics', async () => {
    await page.goto(`/workspaces/${state.owner.workspaceId}/websites/${state.baselineWebsite.id}/analytics-engine`);

    await expectMetric(page, 'Pending', 3);

    const processingResponse = page.waitForResponse(
      (response) => response.url().endsWith('/analytics-engine/process') && response.request().method() === 'POST',
    );

    await page
      .getByRole('button', {
        name: 'Process pending events',
      })
      .click();

    expect((await processingResponse).status()).toBe(201);

    await expectMetric(page, 'Pending', 0);

    await expectMetric(page, 'Visitors', 1);

    await expectMetric(page, 'Sessions', 1);

    await expectMetric(page, 'Page views', 1);

    await expect(
      page
        .getByText('/pricing', {
          exact: true,
        })
        .first(),
    ).toBeVisible();

    await expect(
      page.getByRole('heading', {
        name: 'Recent normalized sessions',
      }),
    ).toBeVisible();
  });
});
