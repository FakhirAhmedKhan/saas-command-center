import assert from 'node:assert/strict';
import test from 'node:test';
import { createTrackerHarness, readBeaconPayload } from '../test-support/tracker-harness.mjs';

test('records heartbeat duration while the document is visible', async () => {
  const harness = await createTrackerHarness({
    online: false,
    dataset: { heartbeatInterval: '15000' },
  });

  harness.advanceTime(15000);
  await harness.runIntervalsByDelay(15000);

  const heartbeat = harness.queuedEvents().find((event) => event.type === 'HEARTBEAT');

  assert.equal(heartbeat.durationMs, 15000);
});

test('caps heartbeat duration at five minutes', async () => {
  const harness = await createTrackerHarness({
    online: false,
    dataset: { heartbeatInterval: '15000' },
  });

  harness.advanceTime(900000);
  await harness.runIntervalsByDelay(15000);

  const heartbeat = harness.queuedEvents().find((event) => event.type === 'HEARTBEAT');

  assert.equal(heartbeat.durationMs, 300000);
});

test('does not record interval heartbeats while the page is hidden', async () => {
  const harness = await createTrackerHarness({
    online: false,
    visibilityState: 'hidden',
    dataset: { heartbeatInterval: '15000' },
  });

  harness.advanceTime(15000);
  await harness.runIntervalsByDelay(15000);

  assert.equal(
    harness.queuedEvents().some((event) => event.type === 'HEARTBEAT'),
    false,
  );
});

test('flushes queued data when visibility changes to hidden', async () => {
  const harness = await createTrackerHarness({ online: false });
  harness.api().track('visibility_flush');
  harness.setVisibility('hidden');

  await harness.dispatchDocument('visibilitychange');

  assert.equal(harness.beacons.length, 1);
  const payload = await readBeaconPayload(harness.beacons[0]);
  assert.equal(
    payload.events.some((event) => event.eventName === 'visibility_flush'),
    true,
  );
});

test('resets heartbeat timing when the document becomes visible again', async () => {
  const harness = await createTrackerHarness({
    online: false,
    visibilityState: 'hidden',
    dataset: { heartbeatInterval: '15000' },
  });

  harness.advanceTime(120000);
  harness.setVisibility('visible');
  await harness.dispatchDocument('visibilitychange');

  harness.advanceTime(15000);
  await harness.runIntervalsByDelay(15000);

  const heartbeat = harness.queuedEvents().find((event) => event.type === 'HEARTBEAT');

  assert.equal(heartbeat.durationMs, 15000);
});

test('denying consent stops tracking and clears queued events', async () => {
  const harness = await createTrackerHarness({
    online: false,
    dataset: { requireConsent: 'true' },
    localStorage: {
      'cc_consent_11111111-1111-4111-8111-111111111111': 'grant',
    },
  });

  harness.api().track('before_denial');
  assert.ok(harness.queuedEvents().length > 0);

  harness.api().consent('deny');
  harness.api().track('after_denial');

  assert.equal(harness.queuedEvents().length, 0);
});

test('Do Not Track remains enforced even after consent is granted', async () => {
  const harness = await createTrackerHarness({
    doNotTrack: '1',
    dataset: { requireConsent: 'true' },
  });

  harness.api().consent('grant');
  harness.api().track('must_not_send');
  await harness.api().flush();

  assert.equal(harness.requests.length, 0);
});

test('storage failures do not break the host page', async () => {
  const harness = await createTrackerHarness({ online: false });
  harness.storage.setThrowOnAccess(true);

  assert.doesNotThrow(() => {
    harness.api().track('storage_failure');
    harness.api().consent('deny');
  });
});

test('ignores malformed persisted queues', async () => {
  const websiteId = '11111111-1111-4111-8111-111111111111';
  const harness = await createTrackerHarness({
    online: false,
    localStorage: {
      [`cc_queue_${websiteId}`]: '{invalid-json',
    },
  });

  assert.equal(harness.queuedEvents().length, 1);
  assert.equal(harness.queuedEvents()[0].type, 'PAGE_VIEW');
});
