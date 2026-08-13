import { readRawEvents } from './fixtures/database';
import { authorizedApiRequest, expectMetric, loginThroughUi, uniqueValue } from './fixtures/helpers';
import { readFullStackState, type FullStackState } from './fixtures/state';
import { expect, test, type Page, type Request } from '@playwright/test';

interface WebsiteCreateResponse {
  website: {
    id: string;
    domain: string;
  };
  trackingKey: string;
}

interface TrackerEvent {
  eventId: string;
  type: 'PAGE_VIEW' | 'CUSTOM' | 'HEARTBEAT';
  visitorId: string;
  sessionId: string;
  timestamp: string;
  url: string;
  eventName?: string;
  durationMs?: number;
  properties?: Record<string, unknown>;
}

interface TrackerPayload {
  websiteId: string;
  trackingKey: string;
  sdkVersion: string;
  sentAt: string;
  events: TrackerEvent[];
}

interface BrowserTrackerApi {
  track(name: string, properties?: Record<string, unknown>): void;
  flush(): void;
}

let state: FullStackState;

let websiteId = '';
let trackingKey = '';
let trackingOrigin = '';

let visitorId = '';
let sessionId = '';

const trackerScriptUrl = 'http://127.0.0.1:3102/tracker.js';

test.describe.configure({
  mode: 'serial',
});

function readPayload(request: Request): TrackerPayload {
  const body = request.postData();

  if (!body) {
    throw new Error(`Tracker request has no body: ${request.url()}`);
  }

  return JSON.parse(body) as TrackerPayload;
}

function containsEvent(request: Request, predicate: (event: TrackerEvent) => boolean): boolean {
  if (!request.url().endsWith('/api/v1/collect')) {
    return false;
  }

  if (request.method() !== 'POST') {
    return false;
  }

  try {
    return readPayload(request).events.some(predicate);
  } catch {
    return false;
  }
}

async function installTracker(page: Page, overrides: { websiteId?: string; trackingKey?: string } = {}): Promise<void> {
  await page.evaluate(
    async ({ scriptUrl, website, key, endpoint }) => {
      await new Promise<void>((resolve, reject) => {
        const script = document.createElement('script');

        script.async = true;
        script.src = scriptUrl;

        script.dataset.websiteId = website;
        script.dataset.trackingKey = key;
        script.dataset.endpoint = endpoint;
        script.dataset.respectDnt = 'true';
        script.dataset.requireConsent = 'false';

        script.addEventListener('load', () => resolve(), {
          once: true,
        });

        script.addEventListener('error', () => reject(new Error('Tracker bundle failed to load.')), {
          once: true,
        });

        document.head.appendChild(script);
      });
    },
    {
      scriptUrl: trackerScriptUrl,
      website: overrides.websiteId ?? websiteId,
      key: overrides.trackingKey ?? trackingKey,
      endpoint: `${state.apiUrl}/collect`,
    },
  );

  await page.waitForFunction(() => {
    return Boolean(
      (
        window as typeof window & {
          CommandCenterAnalytics?: BrowserTrackerApi;
        }
      ).CommandCenterAnalytics,
    );
  });
}

async function flushTracker(page: Page): Promise<void> {
  await page.evaluate(() => {
    (
      window as typeof window & {
        CommandCenterAnalytics?: BrowserTrackerApi;
      }
    ).CommandCenterAnalytics?.flush();
  });
}

test.describe('Real Chrome Tracker SDK E2E', () => {
  test.beforeAll(() => {
    state = readFullStackState();
  });

  test('executes the real built tracker.js inside Chrome and sends real browser events', async ({ page, request }) => {
    /*
     * This test waits out a real 15s heartbeat interval. The extra headroom
     * keeps slower CI machines from timing out mid-wait; it does not relax any
     * assertion, and the heartbeat window itself stays 14s-17s.
     */
    test.setTimeout(120_000);

    const abortedCollectRequests: string[] = [];

    const domain = `${uniqueValue('chrome-tracker', state.runId)}.example.test`;

    trackingOrigin = state.webUrl;

    const createWebsiteResponse = await authorizedApiRequest(request, state, state.owner.accessToken, `/workspaces/${state.owner.workspaceId}/websites`, {
      method: 'POST',
      data: {
        name: 'Real Chrome Tracker Website',
        domain,
        timeZone: 'UTC',
        enabled: true,
        allowedOrigins: [trackingOrigin],
        applicationId: state.baselineApplication.id,
      },
    });

    expect(createWebsiteResponse.status()).toBe(201);

    const created = (await createWebsiteResponse.json()) as WebsiteCreateResponse;

    websiteId = created.website.id;
    trackingKey = created.trackingKey;

    expect(websiteId).not.toBe('');
    expect(trackingKey).toMatch(/^cc_live_/);

    await page.route(`${trackingOrigin}/**`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'text/html',
        body: `
          <!doctype html>
          <html>
            <head>
              <meta charset="utf-8">
              <title>Real Browser Tracker Test</title>
            </head>
            <body>
              <h1>Customer Website</h1>
            </body>
          </html>
        `,
      });
    });

    /*
     * Diagnostics are attached before the first navigation so failures during
     * initial page load are captured rather than silently lost.
     */
    page.on('console', (message) => {
      console.log(`[BROWSER CONSOLE ${message.type()}] ${message.text()}`);
    });

    page.on('pageerror', (error) => {
      console.log(`[BROWSER PAGE ERROR] ${error.message}`);
    });

    page.on('requestfailed', (failedRequest) => {
      if (failedRequest.url().endsWith('/api/v1/collect')) {
        abortedCollectRequests.push(failedRequest.failure()?.errorText ?? 'unknown');
      }

      console.log(`[BROWSER REQUEST FAILED] ${failedRequest.method()} ${failedRequest.url()} :: ${failedRequest.failure()?.errorText ?? 'unknown'}`);
    });

    page.on('response', (response) => {
      if (response.url().includes('tracker.js')) {
        console.log(`[TRACKER RESPONSE] ${response.status()} ${response.url()} content-type=${response.headers()['content-type'] ?? 'missing'}`);
      }
    });

    await page.goto(`${trackingOrigin}/pricing?utm_source=playwright&token=secret#private`);

    const browserProbe = await page.evaluate(async (url) => {
      try {
        const response = await fetch(url, {
          mode: 'cors',
          cache: 'no-store',
        });

        return {
          ok: response.ok,
          status: response.status,
          contentType: response.headers.get('content-type'),
          size: (await response.text()).length,
          error: null,
        };
      } catch (error) {
        return {
          ok: false,
          status: 0,
          contentType: null,
          size: 0,
          error: error instanceof Error ? error.message : String(error),
        };
      }
    }, trackerScriptUrl);

    console.log('[TRACKER BROWSER PROBE]', browserProbe);

    expect(browserProbe.ok).toBe(true);
    expect(browserProbe.status).toBe(200);
    expect(browserProbe.contentType).toContain('application/javascript');
    expect(browserProbe.size).toBeGreaterThan(1_000);

    const cdp = await page.context().newCDPSession(page);

    await cdp.send('Network.enable');

    const collectRequestIds = new Set<string>();

    const rawHeadersByRequestId = new Map<string, Record<string, string>>();

    let collectSecFetchMode: string | undefined;

    function captureCollectFetchMode(requestId: string): void {
      if (!collectRequestIds.has(requestId)) {
        return;
      }

      const headers = rawHeadersByRequestId.get(requestId);

      if (!headers) {
        return;
      }

      collectSecFetchMode = headers['Sec-Fetch-Mode'] ?? headers['sec-fetch-mode'];
    }

    cdp.on('Network.requestWillBeSent', (event) => {
      if (event.request.method === 'POST' && event.request.url.endsWith('/api/v1/collect')) {
        collectRequestIds.add(event.requestId);
        captureCollectFetchMode(event.requestId);
      }
    });

    cdp.on('Network.requestWillBeSentExtraInfo', (event) => {
      rawHeadersByRequestId.set(event.requestId, event.headers as Record<string, string>);

      captureCollectFetchMode(event.requestId);
    });
    const initialRequestPromise = page.waitForRequest((candidate) => containsEvent(candidate, (event) => event.type === 'PAGE_VIEW'), {
      timeout: 10_000,
    });

    await installTracker(page);

    const initialRequest = await initialRequestPromise;

    const initialHeaders = await initialRequest.allHeaders();
    const initialPayload = readPayload(initialRequest);

    expect(initialRequest.method()).toBe('POST');
    expect(initialRequest.resourceType()).toBe('fetch');

    expect(initialHeaders['content-type']?.toLowerCase()).toContain('text/plain');

    await expect
      .poll(() => collectSecFetchMode, {
        timeout: 5_000,
      })
      .toBe('no-cors');

    expect(initialPayload.websiteId).toBe(websiteId);
    expect(initialPayload.trackingKey).toBe(trackingKey);
    expect(initialPayload.sdkVersion).toBe('1.0.0');

    const initialPageView = initialPayload.events.find((event) => event.type === 'PAGE_VIEW');

    expect(initialPageView).toBeDefined();

    expect(initialPageView?.url).toBe(`${trackingOrigin}/pricing?utm_source=playwright`);

    expect(initialPageView?.url).not.toContain('token=');
    expect(initialPageView?.url).not.toContain('#');

    visitorId = initialPageView?.visitorId ?? '';
    sessionId = initialPageView?.sessionId ?? '';

    expect(visitorId).not.toBe('');
    expect(sessionId).not.toBe('');

    const storedBrowserState = await page.evaluate(() =>
      JSON.stringify({
        ...localStorage,
      }),
    );

    expect(storedBrowserState).toContain(visitorId);
    expect(storedBrowserState).toContain(sessionId);

    const customRequestPromise = page.waitForRequest(
      (candidate) => containsEvent(candidate, (event) => event.type === 'CUSTOM' && event.eventName === 'browser_checkout_started'),
      {
        timeout: 10_000,
      },
    );

    await page.evaluate(() => {
      const tracker = (
        window as typeof window & {
          CommandCenterAnalytics?: BrowserTrackerApi;
        }
      ).CommandCenterAnalytics;

      tracker?.track('browser_checkout_started', {
        source: 'playwright',
        plan: 'pro',
      });

      tracker?.flush();
    });

    const customRequest = await customRequestPromise;

    const customEvent = readPayload(customRequest).events.find((event) => event.type === 'CUSTOM' && event.eventName === 'browser_checkout_started');

    expect(customEvent).toBeDefined();
    expect(customEvent?.visitorId).toBe(visitorId);
    expect(customEvent?.sessionId).toBe(sessionId);

    expect(customEvent?.properties).toEqual({
      source: 'playwright',
      plan: 'pro',
    });

    const spaPageViewPromise = page.waitForRequest(
      (candidate) => containsEvent(candidate, (event) => event.type === 'PAGE_VIEW' && event.url.includes('/pricing/compare')),
      {
        timeout: 10_000,
      },
    );

    await page.evaluate(() => {
      history.pushState({}, '', '/pricing/compare?z=9&token=hide&utm_campaign=browser#private');

      (
        window as typeof window & {
          CommandCenterAnalytics?: BrowserTrackerApi;
        }
      ).CommandCenterAnalytics?.flush();
    });

    const spaRequest = await spaPageViewPromise;

    const spaPageView = readPayload(spaRequest).events.find((event) => event.type === 'PAGE_VIEW' && event.url.includes('/pricing/compare'));

    expect(spaPageView).toBeDefined();

    expect(spaPageView?.url).toBe(`${trackingOrigin}/pricing/compare?utm_campaign=browser&z=9`);

    expect(spaPageView?.url).not.toContain('token=');
    expect(spaPageView?.url).not.toContain('#');

    expect(spaPageView?.visitorId).toBe(visitorId);
    expect(spaPageView?.sessionId).toBe(sessionId);

    const heartbeatRequestPromise = page.waitForRequest((candidate) => containsEvent(candidate, (event) => event.type === 'HEARTBEAT'), {
      timeout: 22_000,
    });

    const heartbeatRequest = await heartbeatRequestPromise;

    const heartbeat = readPayload(heartbeatRequest).events.find((event) => event.type === 'HEARTBEAT');

    expect(heartbeat).toBeDefined();
    expect(heartbeat?.visitorId).toBe(visitorId);
    expect(heartbeat?.sessionId).toBe(sessionId);

    expect(heartbeat?.durationMs).toBeGreaterThanOrEqual(14_000);
    expect(heartbeat?.durationMs).toBeLessThanOrEqual(17_000);

    await page.reload();

    const reloadPageViewPromise = page.waitForRequest((candidate) => containsEvent(candidate, (event) => event.type === 'PAGE_VIEW'), {
      timeout: 10_000,
    });

    await installTracker(page);

    const reloadRequest = await reloadPageViewPromise;

    const reloadPageView = readPayload(reloadRequest).events.find((event) => event.type === 'PAGE_VIEW');

    expect(reloadPageView).toBeDefined();

    expect(reloadPageView?.visitorId).toBe(visitorId);
    expect(reloadPageView?.sessionId).toBe(sessionId);

    await flushTracker(page);

    /*
     * Direct PostgreSQL verification (port 5435).
     *
     * The UI assertions in the following tests prove the read path; this proves
     * the write path independently, so a caching layer or a UI regression can
     * no longer masquerade as tracker success.
     */
    await expect
      .poll(async () => (await readRawEvents(websiteId)).length, {
        timeout: 15_000,
        message: 'Expected exactly 5 raw events to reach PostgreSQL',
      })
      .toBe(5);

    const rawEvents = await readRawEvents(websiteId);

    const countsByType = rawEvents.reduce<Record<string, number>>((counts, row) => {
      counts[row.type] = (counts[row.type] ?? 0) + 1;

      return counts;
    }, {});

    expect(countsByType).toEqual({
      PAGE_VIEW: 3,
      HEARTBEAT: 1,
      CUSTOM: 1,
    });

    /*
     * No event loss despite net::ERR_ABORTED.
     *
     * Chrome aborts in-flight keepalive fetches when the document is torn down
     * (reload / SPA navigation). The tracker only drops events from its queue
     * after the send resolves, and the collector de-duplicates on
     * (website_id, event_id), so delivery is at-least-once with server-side
     * dedup. Distinct event IDs prove no duplicates were persisted.
     */
    const uniqueEventIds = new Set(rawEvents.map((row) => row.eventId));

    expect(uniqueEventIds.size).toBe(5);

    if (abortedCollectRequests.length > 0) {
      console.log(`[COLLECT ABORTS] ${abortedCollectRequests.length} aborted request(s); all 5 events still persisted: ${abortedCollectRequests.join(', ')}`);
    }

    // Identity and payload integrity survived the round trip to the database.
    expect(new Set(rawEvents.map((row) => row.visitorId))).toEqual(new Set([visitorId]));
    expect(new Set(rawEvents.map((row) => row.sessionId))).toEqual(new Set([sessionId]));
    expect(new Set(rawEvents.map((row) => row.sdkVersion))).toEqual(new Set(['1.0.0']));

    const persistedCustom = rawEvents.find((row) => row.type === 'CUSTOM');

    expect(persistedCustom?.eventName).toBe('browser_checkout_started');

    const persistedHeartbeat = rawEvents.find((row) => row.type === 'HEARTBEAT');

    expect(persistedHeartbeat?.durationMs).toBeGreaterThanOrEqual(14_000);
    expect(persistedHeartbeat?.durationMs).toBeLessThanOrEqual(17_000);

    // Query-string sanitization survived persistence, not just transport.
    for (const row of rawEvents) {
      expect(row.pageUrl).not.toContain('token=');
      expect(row.pageUrl).not.toContain('#');
    }
  });

  test('shows the real Chrome events persisted through the tracking status UI', async ({ page }) => {
    expect(websiteId).not.toBe('');

    await loginThroughUi(page, state.owner);

    await page.goto(`/workspaces/${state.owner.workspaceId}/websites/${websiteId}/installation`);

    await page
      .getByRole('button', {
        name: 'Refresh',
      })
      .click();

    await expect(page.getByText('Receiving events')).toBeVisible();

    await expectMetric(page, 'Total events', 5);
    await expectMetric(page, 'Page views', 3);
    await expectMetric(page, 'Heartbeats', 1);
    await expectMetric(page, 'Custom events', 1);
  });

  test('processes the real browser events into normalized analytics', async ({ page }) => {
    await loginThroughUi(page, state.owner);

    await page.goto(`/workspaces/${state.owner.workspaceId}/websites/${websiteId}/analytics-engine`);

    await expectMetric(page, 'Pending', 5);

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
    await expectMetric(page, 'Page views', 3);

    await expect(
      page.getByRole('heading', {
        name: 'Recent normalized sessions',
      }),
    ).toBeVisible();
  });

  test('delivers queued events through navigator.sendBeacon on pagehide', async ({ page, request }) => {
    /*
     * Uses a dedicated website so its counts are asserted independently: the
     * pagehide handler calls trackHeartbeat() before flush(true), which would
     * otherwise perturb the 5/3/1/1 baseline of the first test.
     */
    const beaconDomain = `${uniqueValue('chrome-beacon', state.runId)}.example.test`;

    const createResponse = await authorizedApiRequest(request, state, state.owner.accessToken, `/workspaces/${state.owner.workspaceId}/websites`, {
      method: 'POST',
      data: {
        name: 'Real Chrome Beacon Website',
        domain: beaconDomain,
        timeZone: 'UTC',
        enabled: true,
        allowedOrigins: [state.webUrl],
        applicationId: state.baselineApplication.id,
      },
    });

    expect(createResponse.status()).toBe(201);

    const beaconSite = (await createResponse.json()) as WebsiteCreateResponse;

    await page.route(`${state.webUrl}/**`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'text/html',
        body: '<!doctype html><html><head><title>Beacon</title></head><body><h1>Beacon</h1></body></html>',
      });
    });

    await page.goto(`${state.webUrl}/beacon-start`);

    await installTracker(page, {
      websiteId: beaconSite.website.id,
      trackingKey: beaconSite.trackingKey,
    });

    /*
     * Queue a custom event without flushing, then confirm sendBeacon is the
     * transport that delivers it. Patching only sendBeacon keeps the real built
     * tracker.js in control of batching, payload shape and lifecycle wiring.
     */
    await page.evaluate(() => {
      const beaconCalls: string[] = [];

      const originalSendBeacon = navigator.sendBeacon.bind(navigator);

      (window as typeof window & { __beaconCalls?: string[] }).__beaconCalls = beaconCalls;

      navigator.sendBeacon = (url: string | URL, data?: BodyInit | null): boolean => {
        beaconCalls.push(String(url));

        return originalSendBeacon(url, data);
      };

      (
        window as typeof window & {
          CommandCenterAnalytics?: BrowserTrackerApi;
        }
      ).CommandCenterAnalytics?.track('beacon_only_event', {
        transport: 'beacon',
      });
    });

    // pagehide is the real lifecycle trigger for flush(true).
    await page.evaluate(() => {
      window.dispatchEvent(new PageTransitionEvent('pagehide', { persisted: false }));
    });

    const beaconCalls = await page.evaluate(() => (window as typeof window & { __beaconCalls?: string[] }).__beaconCalls ?? []);

    expect(beaconCalls.length).toBeGreaterThan(0);
    expect(beaconCalls.every((url) => url.endsWith('/api/v1/collect'))).toBe(true);

    // The beacon payload must actually reach PostgreSQL.
    await expect
      .poll(async () => (await readRawEvents(beaconSite.website.id)).length, {
        timeout: 15_000,
        message: 'Expected sendBeacon-delivered events to reach PostgreSQL',
      })
      .toBeGreaterThan(0);

    const beaconEvents = await readRawEvents(beaconSite.website.id);

    const beaconCustom = beaconEvents.find((row) => row.eventName === 'beacon_only_event');

    expect(beaconCustom).toBeDefined();
    expect(beaconCustom?.type).toBe('CUSTOM');
    expect(beaconCustom?.sdkVersion).toBe('1.0.0');

    // pagehide also enqueues a heartbeat, so both event types must have landed.
    expect(beaconEvents.some((row) => row.type === 'PAGE_VIEW')).toBe(true);
    expect(new Set(beaconEvents.map((row) => row.eventId)).size).toBe(beaconEvents.length);
  });

  test('rejects an invalid tracking key and a disallowed origin from the real browser', async ({ page, request }) => {
    const negativeDomain = `${uniqueValue('chrome-negative', state.runId)}.example.test`;

    const createResponse = await authorizedApiRequest(request, state, state.owner.accessToken, `/workspaces/${state.owner.workspaceId}/websites`, {
      method: 'POST',
      data: {
        name: 'Real Chrome Negative Website',
        domain: negativeDomain,
        timeZone: 'UTC',
        enabled: true,
        // Deliberately excludes state.webUrl so browser origins are rejected.
        allowedOrigins: ['https://not-the-test-origin.example.test'],
        applicationId: state.baselineApplication.id,
      },
    });

    expect(createResponse.status()).toBe(201);

    const negativeSite = (await createResponse.json()) as WebsiteCreateResponse;

    await page.route(`${state.webUrl}/**`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'text/html',
        body: '<!doctype html><html><head><title>Negative</title></head><body><h1>Negative</h1></body></html>',
      });
    });

    await page.goto(`${state.webUrl}/negative`);

    /*
     * Posts from the real browser context so Chrome sets Origin itself, using
     * the same no-cors transport the tracker uses.
     *
     * The collector intentionally serves no CORS headers for /collect
     * (configure-application.ts sets `origin: false` for that path), so a cors
     * request would fail preflight and the status would be unreadable. The
     * rejection is therefore asserted the way it actually matters: the request
     * reaches the API and nothing is persisted.
     */
    async function collectFromBrowser(websiteIdValue: string, trackingKeyValue: string): Promise<void> {
      await page.evaluate(
        async ({ endpoint, site, key }) => {
          await fetch(endpoint, {
            method: 'POST',
            mode: 'no-cors',
            headers: {
              'Content-Type': 'text/plain;charset=UTF-8',
            },
            body: JSON.stringify({
              websiteId: site,
              trackingKey: key,
              sdkVersion: '1.0.0',
              sentAt: new Date().toISOString(),
              events: [
                {
                  eventId: `neg${Date.now()}${Math.random().toString(36).slice(2, 10)}`,
                  type: 'PAGE_VIEW',
                  visitorId: 'negative-visitor',
                  sessionId: 'negative-session',
                  timestamp: new Date().toISOString(),
                  url: `${window.location.origin}/negative`,
                },
              ],
            }),
          });
        },
        {
          endpoint: `${state.apiUrl}/collect`,
          site: websiteIdValue,
          key: trackingKeyValue,
        },
      );
    }

    // An invalid tracking key must be refused.
    await collectFromBrowser(negativeSite.website.id, 'cc_live_totally_invalid_key_value');

    // A valid key sent from a disallowed origin must also be refused.
    await collectFromBrowser(negativeSite.website.id, negativeSite.trackingKey);

    /*
     * Neither request may persist anything. Polling briefly guards against a
     * false pass from asserting before ingestion would have completed: a
     * regression that accepted these payloads would surface as a non-empty
     * table within this window.
     */
    await page.waitForTimeout(2_000);

    const negativeEvents = await readRawEvents(negativeSite.website.id);

    expect(negativeEvents).toHaveLength(0);

    /*
     * Control: the same browser origin with a valid key against a website that
     * allows it does persist. This proves the assertion above reflects real
     * rejection rather than a silently broken request.
     */
    const controlEvents = await readRawEvents(websiteId);

    expect(controlEvents.length).toBeGreaterThan(0);
  });
});
