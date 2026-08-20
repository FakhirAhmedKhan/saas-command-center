import { createTrackerHarness } from '../test-support/tracker-harness.mjs';
import assert from 'node:assert/strict';
import test from 'node:test';

test('initializes with valid script configuration and exposes the public API', async () => {
  const harness = await createTrackerHarness();

  assert.equal(typeof harness.api()?.track, 'function');
  assert.equal(typeof harness.api()?.pageview, 'function');
  assert.equal(typeof harness.api()?.flush, 'function');
  assert.equal(typeof harness.api()?.consent, 'function');
  assert.equal(harness.window.__COMMAND_CENTER_TRACKER__, true);
});

test('sends an initial page view for an online visitor', async () => {
  const harness = await createTrackerHarness();

  assert.equal(harness.requests.length, 1);
  assert.equal(harness.payloads()[0].events.length, 1);
  assert.equal(harness.payloads()[0].events[0].type, 'PAGE_VIEW');
});

test('does not initialize when the current script is unavailable', async () => {
  const harness = await createTrackerHarness({ currentScript: false });

  assert.equal(harness.api(), undefined);
  assert.equal(harness.requests.length, 0);
});

test('does not initialize when websiteId is missing', async () => {
  const harness = await createTrackerHarness({ dataset: { websiteId: '' } });

  assert.equal(harness.api(), undefined);
  assert.equal(harness.requests.length, 0);
});

test('does not initialize when trackingKey is missing', async () => {
  const harness = await createTrackerHarness({ dataset: { trackingKey: '' } });

  assert.equal(harness.api(), undefined);
  assert.equal(harness.requests.length, 0);
});

test('does not initialize when endpoint is missing', async () => {
  const harness = await createTrackerHarness({ dataset: { endpoint: '' } });

  assert.equal(harness.api(), undefined);
  assert.equal(harness.requests.length, 0);
});

test('prevents duplicate initialization when the bundle executes twice', async () => {
  const harness = await createTrackerHarness();
  const originalApi = harness.api();

  harness.executeBundle();
  await harness.settle();

  assert.equal(harness.api(), originalApi);
  assert.equal(harness.requests.length, 1);
});

test('respects Do Not Track by default', async () => {
  const harness = await createTrackerHarness({ doNotTrack: '1' });

  harness.api().track('checkout_started');
  await harness.api().flush();

  assert.equal(harness.requests.length, 0);
});

test('can explicitly disable Do Not Track enforcement', async () => {
  const harness = await createTrackerHarness({
    doNotTrack: '1',
    dataset: { respectDnt: 'false' },
  });

  assert.equal(harness.requests.length, 1);
  assert.equal(harness.payloads()[0].events[0].type, 'PAGE_VIEW');
});

test('requires consent when configured and starts after consent is granted', async () => {
  const harness = await createTrackerHarness({
    dataset: { requireConsent: 'true' },
  });

  assert.equal(harness.requests.length, 0);

  harness.api().consent('grant');
  await harness.settle();

  assert.equal(harness.requests.length, 1);
  assert.equal(harness.payloads()[0].events[0].type, 'PAGE_VIEW');
});
