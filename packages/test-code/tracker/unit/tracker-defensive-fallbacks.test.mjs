import { createTrackerHarness } from '../test-support/tracker-harness.mjs';
import assert from 'node:assert/strict';
import test from 'node:test';

const WEBSITE_ID = '11111111-1111-4111-8111-111111111111';

test('uses crypto.getRandomValues when randomUUID is unavailable', async () => {
  const harness = await createTrackerHarness({
    randomUUIDAvailable: false,
  });

  assert.equal(harness.requests.length, 1);

  const event = harness.payloads()[0].events[0];

  assert.match(event.eventId, /^[0-9a-f]{32}$/);
  assert.match(event.visitorId, /^[0-9a-f]{32}$/);
  assert.match(event.sessionId, /^[0-9a-f]{32}$/);
});

test('falls back safely when secure crypto generation fails', async () => {
  const harness = await createTrackerHarness({
    randomUUIDAvailable: false,
    cryptoGetRandomValuesReject: true,
  });

  assert.equal(harness.requests.length, 1);

  const event = harness.payloads()[0].events[0];

  assert.equal(typeof event.eventId, 'string');
  assert.ok(event.eventId.length > 0);

  assert.equal(typeof event.visitorId, 'string');
  assert.ok(event.visitorId.length > 0);

  assert.equal(typeof event.sessionId, 'string');
  assert.ok(event.sessionId.length > 0);
});

test('survives storage read failures during initialization', async () => {
  const harness = await createTrackerHarness({
    storageThrowOnAccess: true,
  });

  assert.equal(typeof harness.api()?.track, 'function');
  assert.equal(typeof harness.api()?.pageview, 'function');

  assert.equal(harness.requests.length, 1);
  assert.equal(harness.payloads()[0].events[0].type, 'PAGE_VIEW');
});

test('ignores manual page views before required consent is granted', async () => {
  const harness = await createTrackerHarness({
    dataset: {
      requireConsent: 'true',
    },
  });

  assert.equal(harness.requests.length, 0);

  harness.api().pageview();
  await harness.api().flush();

  assert.equal(harness.requests.length, 0);
  assert.equal(harness.queuedEvents().length, 0);
});

test('periodic flush sends queued events at the configured interval', async () => {
  const harness = await createTrackerHarness({
    online: false,
    dataset: {
      flushInterval: '5000',
    },
  });

  assert.equal(harness.requests.length, 0);
  assert.equal(harness.queuedEvents().length, 1);

  await harness.runIntervalsByDelay(5000);

  assert.equal(harness.requests.length, 1);
  assert.equal(harness.payloads()[0].events[0].type, 'PAGE_VIEW');
  assert.equal(harness.queuedEvents().length, 0);
});

test('ignores a persisted queue when valid JSON is not an array', async () => {
  const harness = await createTrackerHarness({
    online: false,

    localStorage: {
      [`cc_queue_${WEBSITE_ID}`]: JSON.stringify({
        unexpected: 'object',
      }),
    },
  });
  const queue = harness.queuedEvents();

  assert.equal(queue.length, 1);
  assert.equal(queue[0].type, 'PAGE_VIEW');
});

test('continues tracking when browser time-zone resolution throws', async () => {
  const harness = await createTrackerHarness({
    timeZoneReject: true,
  });

  assert.equal(harness.requests.length, 1);

  const event = harness.payloads()[0].events[0];

  assert.equal(event.type, 'PAGE_VIEW');
  assert.equal(event.timeZone, undefined);
});
