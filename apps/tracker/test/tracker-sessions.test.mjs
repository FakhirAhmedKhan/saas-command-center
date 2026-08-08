import assert from 'node:assert/strict';
import test from 'node:test';

import { createTrackerHarness } from '../test-support/tracker-harness.mjs';

test('persists the visitor ID across tracker reloads for the same website', async () => {
  const first = await createTrackerHarness({ online: false });
  const snapshot = first.storage.snapshot();
  const firstVisitor = snapshot['cc_visitor_11111111-1111-4111-8111-111111111111'];

  const second = await createTrackerHarness({
    online: false,
    localStorage: snapshot,
  });

  const secondVisitor = second.storage.getItem('cc_visitor_11111111-1111-4111-8111-111111111111');

  assert.equal(secondVisitor, firstVisitor);
});

test('reuses an active session before the configured timeout', async () => {
  const first = await createTrackerHarness({ online: false });
  const firstSession = first.storedSession();
  const snapshot = first.storage.snapshot();

  const second = await createTrackerHarness({
    online: false,
    localStorage: snapshot,
    now: Date.parse('2026-08-07T00:10:00.000Z'),
  });

  assert.equal(second.storedSession().id, firstSession.id);
});

test('creates a new session after the configured timeout', async () => {
  const first = await createTrackerHarness({ online: false });
  const firstSession = first.storedSession();
  const snapshot = first.storage.snapshot();

  const second = await createTrackerHarness({
    online: false,
    localStorage: snapshot,
    now: Date.parse('2026-08-07T00:31:00.000Z'),
  });

  assert.notEqual(second.storedSession().id, firstSession.id);
});

test('honors a custom session timeout', async () => {
  const first = await createTrackerHarness({
    online: false,
    dataset: { sessionTimeout: '1000' },
  });
  const firstSession = first.storedSession();
  const snapshot = first.storage.snapshot();

  const second = await createTrackerHarness({
    online: false,
    dataset: { sessionTimeout: '1000' },
    localStorage: snapshot,
    now: Date.parse('2026-08-07T00:00:01.000Z'),
  });

  assert.notEqual(second.storedSession().id, firstSession.id);
});

test('uses separate visitor and session storage per website', async () => {
  const first = await createTrackerHarness({
    online: false,
    websiteId: '11111111-1111-4111-8111-111111111111',
  });

  const second = await createTrackerHarness({
    online: false,
    websiteId: '22222222-2222-4222-8222-222222222222',
    localStorage: first.storage.snapshot(),
  });

  assert.ok(second.storage.getItem('cc_visitor_11111111-1111-4111-8111-111111111111'));
  assert.ok(second.storage.getItem('cc_visitor_22222222-2222-4222-8222-222222222222'));
  assert.ok(second.storage.getItem('cc_session_11111111-1111-4111-8111-111111111111'));
  assert.ok(second.storage.getItem('cc_session_22222222-2222-4222-8222-222222222222'));
});

test('recovers from a corrupted stored session', async () => {
  const websiteId = '11111111-1111-4111-8111-111111111111';
  const harness = await createTrackerHarness({
    online: false,
    localStorage: {
      [`cc_session_${websiteId}`]: '{broken-json',
    },
  });

  assert.match(harness.storedSession().id, /^[a-f0-9]{32}$/);
});

test('refreshes the session before enqueuing an event after timeout', async () => {
  const harness = await createTrackerHarness({
    online: false,
    dataset: { sessionTimeout: '1000' },
  });
  const originalSessionId = harness.storedSession().id;

  harness.advanceTime(1000);
  harness.api().track('session_rotated');

  const custom = harness.queuedEvents().find((event) => event.type === 'CUSTOM');

  assert.notEqual(custom.sessionId, originalSessionId);
  assert.equal(custom.sessionId, harness.storedSession().id);
});

test('updates session lastSeenAt when events are tracked', async () => {
  const harness = await createTrackerHarness({ online: false });
  const previous = harness.storedSession().lastSeenAt;

  harness.advanceTime(5000);
  harness.api().track('session_touch');

  assert.equal(harness.storedSession().lastSeenAt, previous + 5000);
});
