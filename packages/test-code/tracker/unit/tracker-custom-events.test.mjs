import { createTrackerHarness } from '../test-support/tracker-harness.mjs';
import assert from 'node:assert/strict';
import test from 'node:test';

async function collectCustomEvent(harness, name, properties) {
  harness.api().track(name, properties);
  await harness.api().flush();

  return harness
    .payloads()
    .flatMap((payload) => payload.events)
    .find((event) => event.type === 'CUSTOM');
}

test('tracks a valid custom event', async () => {
  const harness = await createTrackerHarness();
  const event = await collectCustomEvent(harness, 'checkout_started', {
    plan: 'pro',
    seats: 5,
    trial: true,
  });

  assert.equal(event.eventName, 'checkout_started');
  assert.deepEqual(event.properties, {
    plan: 'pro',
    seats: 5,
    trial: true,
  });
});

test('trims a valid custom event name', async () => {
  const harness = await createTrackerHarness();
  const event = await collectCustomEvent(harness, '  invoice.paid  ');

  assert.equal(event.eventName, 'invoice.paid');
});

test('rejects empty and malformed custom event names', async () => {
  const harness = await createTrackerHarness();

  for (const name of ['', ' ', '1checkout', 'has spaces', '_private']) {
    harness.api().track(name);
  }

  await harness.api().flush();

  const customEvents = harness
    .payloads()
    .flatMap((payload) => payload.events)
    .filter((event) => event.type === 'CUSTOM');

  assert.equal(customEvents.length, 0);
});

test('truncates custom event names to 100 characters', async () => {
  const harness = await createTrackerHarness();
  const event = await collectCustomEvent(harness, `a${'b'.repeat(100)}`);

  assert.equal(event.eventName.length, 100);
  assert.equal(event.eventName, `a${'b'.repeat(99)}`);
});

test('removes properties with sensitive keys', async () => {
  const harness = await createTrackerHarness();
  const event = await collectCustomEvent(harness, 'profile_updated', {
    displayName: 'Ada',
    email: 'ada@example.com',
    password: 'secret',
    apiKey: 'abc',
    phoneNumber: '+9710000000',
    sessionToken: 'token',
  });

  assert.deepEqual(event.properties, {
    displayName: 'Ada',
  });
});

test('drops unsupported property values and non-finite numbers', async () => {
  const harness = await createTrackerHarness();
  const event = await collectCustomEvent(harness, 'property_test', {
    valid: 1,
    nan: Number.NaN,
    infinity: Number.POSITIVE_INFINITY,
    object: { nested: true },
    nothing: null,
    missing: undefined,
  });

  assert.deepEqual(event.properties, {
    valid: 1,
  });
});

test('truncates property keys and string values', async () => {
  const harness = await createTrackerHarness();
  const longKey = `custom_${'k'.repeat(80)}`;
  const event = await collectCustomEvent(harness, 'limits_test', {
    [longKey]: 'v'.repeat(250),
  });

  const entries = Object.entries(event.properties);
  assert.equal(entries.length, 1);
  assert.equal(entries[0][0].length, 64);
  assert.equal(entries[0][1].length, 200);
});

test('keeps at most 20 properties', async () => {
  const harness = await createTrackerHarness();
  const properties = Object.fromEntries(Array.from({ length: 30 }, (_, index) => [`field_${index}`, index]));

  const event = await collectCustomEvent(harness, 'property_limit', properties);

  assert.equal(Object.keys(event.properties).length, 20);
});

test('sanitizes arrays and keeps at most 20 supported values', async () => {
  const harness = await createTrackerHarness();
  const event = await collectCustomEvent(harness, 'array_test', {
    values: [...Array.from({ length: 25 }, (_, index) => index), { invalid: true }, Number.NaN],
  });

  assert.equal(event.properties.values.length, 20);
  assert.deepEqual(
    event.properties.values,
    Array.from({ length: 20 }, (_, index) => index),
  );
});

test('uses the same visitor and session IDs for page views and custom events', async () => {
  const harness = await createTrackerHarness();
  harness.api().track('button_clicked');
  await harness.api().flush();

  const events = harness.payloads().flatMap((payload) => payload.events);
  const pageView = events.find((event) => event.type === 'PAGE_VIEW');
  const custom = events.find((event) => event.type === 'CUSTOM');

  assert.equal(custom.visitorId, pageView.visitorId);
  assert.equal(custom.sessionId, pageView.sessionId);
});
