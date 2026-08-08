import assert from 'node:assert/strict';
import test from 'node:test';

import { createTrackerHarness } from '../test-support/tracker-harness.mjs';

test('includes the expected page-view fields', async () => {
  const harness = await createTrackerHarness({
    href: 'https://app.example.com/dashboard',
    title: 'Command Center',
  });

  const event = harness.payloads()[0].events[0];

  assert.equal(event.type, 'PAGE_VIEW');
  assert.equal(event.url, 'https://app.example.com/dashboard');
  assert.equal(event.title, 'Command Center');
  assert.equal(event.screenWidth, 1920);
  assert.equal(event.screenHeight, 1080);
  assert.equal(event.viewportWidth, 1440);
  assert.equal(event.viewportHeight, 900);
  assert.equal(event.language, 'en-US');
  assert.equal(event.timeZone, 'UTC');
  assert.match(event.eventId, /^[a-f0-9]{32}$/);
  assert.match(event.visitorId, /^[a-f0-9]{32}$/);
  assert.match(event.sessionId, /^[a-f0-9]{32}$/);
});

test('removes sensitive query parameters, URL credentials, and fragments', async () => {
  const harness = await createTrackerHarness({
    href: 'https://alice:secret@app.example.com/page?campaign=spring&token=abc&email=user%40example.com&z=9#a',
  });

  assert.equal(
    harness.payloads()[0].events[0].url,
    'https://app.example.com/page?campaign=spring&z=9',
  );
});

test('sorts non-sensitive query parameters for stable page identity', async () => {
  const harness = await createTrackerHarness({
    href: 'https://app.example.com/page?z=9&a=1&m=5',
  });

  assert.equal(harness.payloads()[0].events[0].url, 'https://app.example.com/page?a=1&m=5&z=9');
});

test('truncates the document title to 512 characters', async () => {
  const harness = await createTrackerHarness({ title: 'x'.repeat(700) });

  assert.equal(harness.payloads()[0].events[0].title.length, 512);
});

test('sanitizes the referrer URL', async () => {
  const harness = await createTrackerHarness({
    referrer: 'https://search.example.com/results?q=tracker&token=secret#top',
  });

  assert.equal(
    harness.payloads()[0].events[0].referrer,
    'https://search.example.com/results?q=tracker',
  );
});

test('deduplicates repeated manual page-view calls for the same URL', async () => {
  const harness = await createTrackerHarness();

  harness.api().pageview();
  harness.api().pageview();
  await harness.api().flush();

  const events = harness.payloads().flatMap((payload) => payload.events);
  assert.equal(events.filter((event) => event.type === 'PAGE_VIEW').length, 1);
});

test('tracks pushState navigation to a new URL', async () => {
  const harness = await createTrackerHarness();

  harness.history.pushState({}, '', '/reports?range=30d');
  await harness.api().flush();

  const pageViews = harness
    .payloads()
    .flatMap((payload) => payload.events)
    .filter((event) => event.type === 'PAGE_VIEW');

  assert.equal(pageViews.length, 2);
  assert.equal(pageViews[1].url, 'https://app.example.com/reports?range=30d');
});

test('tracks replaceState navigation to a new URL', async () => {
  const harness = await createTrackerHarness();

  harness.history.replaceState({}, '', '/settings');
  await harness.api().flush();

  const pageViews = harness
    .payloads()
    .flatMap((payload) => payload.events)
    .filter((event) => event.type === 'PAGE_VIEW');

  assert.equal(pageViews.at(-1).url, 'https://app.example.com/settings');
});

test('tracks popstate navigation after the location changes', async () => {
  const harness = await createTrackerHarness();

  harness.location.href = '/billing';
  await harness.dispatchWindow('popstate');
  await harness.api().flush();

  const pageViews = harness
    .payloads()
    .flatMap((payload) => payload.events)
    .filter((event) => event.type === 'PAGE_VIEW');

  assert.equal(pageViews.at(-1).url, 'https://app.example.com/billing');
});

test('does not create another page view for a hash-only change', async () => {
  const harness = await createTrackerHarness({
    href: 'https://app.example.com/docs#overview',
  });

  harness.location.href = 'https://app.example.com/docs#api';
  await harness.dispatchWindow('hashchange');
  await harness.api().flush();

  const pageViews = harness
    .payloads()
    .flatMap((payload) => payload.events)
    .filter((event) => event.type === 'PAGE_VIEW');

  assert.equal(pageViews.length, 1);
});
