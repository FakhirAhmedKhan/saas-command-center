import { createTrackerHarness, readBeaconPayload } from '../test-support/tracker-harness.mjs';
import assert from 'node:assert/strict';
import test from 'node:test';

test('uses the configured endpoint and browser-safe request options', async () => {
  const endpoint = 'https://collector.example.com/custom-collect';
  const harness = await createTrackerHarness({ endpoint });
  const request = harness.requests[0];

  assert.equal(request.url, endpoint);
  assert.equal(request.init.method, 'POST');
  assert.equal(request.init.mode, 'no-cors');
  assert.equal(request.init.keepalive, true);
  assert.equal(request.init.headers['Content-Type'], 'text/plain;charset=UTF-8');
});

test('preserves queued events after a network failure', async () => {
  const harness = await createTrackerHarness({ fetchReject: true });

  assert.equal(harness.requests.length, 1);
  assert.equal(harness.queuedEvents().length, 1);
  assert.equal(harness.queuedEvents()[0].type, 'PAGE_VIEW');
});

test('removes queued events after a successful retry', async () => {
  const harness = await createTrackerHarness({ fetchReject: true });
  harness.setFetchReject(false);

  await harness.api().flush();

  assert.equal(harness.requests.length, 2);
  assert.equal(harness.queuedEvents().length, 0);
});

test('retries persisted events when the browser comes online', async () => {
  const harness = await createTrackerHarness({
    online: false,
    fetchReject: false,
  });

  assert.equal(harness.requests.length, 0);
  assert.equal(harness.queuedEvents().length, 1);

  harness.setOnline(true);
  await harness.dispatchWindow('online');

  assert.equal(harness.requests.length, 1);
  assert.equal(harness.queuedEvents().length, 0);
});

test('sends no more than 25 events in one batch', async () => {
  const websiteId = '11111111-1111-4111-8111-111111111111';
  const initialEvents = Array.from({ length: 30 }, (_, index) => ({
    eventId: `event-${index}`,
    type: 'CUSTOM',
    visitorId: 'visitor-1',
    sessionId: 'session-1',
    timestamp: '2026-08-07T00:00:00.000Z',
    url: 'https://app.example.com/',
    eventName: `event_${index}`,
  }));

  const harness = await createTrackerHarness({
    localStorage: {
      [`cc_queue_${websiteId}`]: JSON.stringify(initialEvents),
    },
  });

  assert.equal(harness.payloads()[0].events.length, 25);
  assert.equal(harness.queuedEvents().length, 6);

  await harness.api().flush();

  assert.equal(harness.payloads()[1].events.length, 6);
  assert.equal(harness.queuedEvents().length, 0);
});

test('caps the persisted queue at 100 events and drops the oldest entries', async () => {
  const harness = await createTrackerHarness({
    online: false,
    fetchReject: true,
  });

  for (let index = 0; index < 110; index += 1) {
    harness.api().track(`event_${index}`);
  }
  await harness.settle();

  const queue = harness.queuedEvents();
  assert.equal(queue.length, 100);
  assert.equal(
    queue.some((event) => event.eventName === 'event_0'),
    false,
  );
  assert.equal(queue.at(-1).eventName, 'event_109');
});

test('uses sendBeacon and clears the queue during pagehide', async () => {
  const harness = await createTrackerHarness({ online: false });
  harness.api().track('page_closing');

  await harness.dispatchWindow('pagehide');

  assert.equal(harness.beacons.length, 1);
  const payload = await readBeaconPayload(harness.beacons[0]);
  assert.equal(
    payload.events.some((event) => event.eventName === 'page_closing'),
    true,
  );
  assert.equal(harness.queuedEvents().length, 0);
});

test('keeps the queue when sendBeacon rejects the payload', async () => {
  const harness = await createTrackerHarness({
    online: false,
    sendBeaconResult: false,
  });
  harness.api().track('page_closing');

  await harness.dispatchWindow('pagehide');

  assert.equal(harness.beacons.length, 1);
  assert.ok(harness.queuedEvents().length >= 2);
});

test('prevents overlapping flush requests', async () => {
  const harness = await createTrackerHarness({ online: false });
  harness.api().track('flush_test');
  harness.blockNextFetch();

  const first = harness.api().flush();
  const second = harness.api().flush();
  await harness.settle();

  assert.equal(harness.requests.length, 1);

  harness.releaseFetch();
  await first;
  await second;
  assert.equal(harness.requests.length, 1);
});
