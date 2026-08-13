import { createTrackerHarness } from '../../tracker/test-support/tracker-harness.mjs';

const [websiteId, trackingKey, origin] = process.argv.slice(2);

if (!websiteId || !trackingKey || !origin) {
  throw new Error('websiteId, trackingKey, and origin are required');
}

const harness = await createTrackerHarness({
  websiteId,
  trackingKey,
  endpoint: 'https://collector.example.test/api/v1/collect',
  href: `${origin}/bundle-integration?z=9&utm_source=bundle&a=1#private`,
  title: 'Actual Tracker Bundle',
  /*
   * Keep the simulated browser clock close to real wall-clock time,
   * but slightly behind it so advancing 15 seconds for the heartbeat
   * never produces a future event relative to the API server.
   */
  now: Date.now() - 30_000,
});

harness.api().track('checkout_started', {
  plan: 'pro',
  source: 'actual-bundle',
});

/*
 * The real Tracker heartbeat computes duration from Date.now().
 * Move its fake browser clock forward before running the actual
 * configured 15-second heartbeat interval.
 */
harness.advanceTime(15_000);

await harness.runIntervalsByDelay(15_000);

await harness.api().flush();

const requests = harness.requests.map((entry) => ({
  url: entry.url,
  method: entry.init.method,
  mode: entry.init.mode,
  keepalive: entry.init.keepalive,
  headers: entry.init.headers,
  body: String(entry.init.body),
}));

process.stdout.write(JSON.stringify(requests));
