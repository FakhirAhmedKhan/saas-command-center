# Tracking SDK E2E Review

> **Review date:** 2026-08-13
> **Scope:** Real-Chrome Tracker SDK end-to-end suite
> **Method:** Inspection only. No files were modified to produce this review. All findings
> were traced to specific lines in the test and tracker sources.

**Files reviewed**

- `apps/web/e2e/full-stack/fullstack-tracker-browser.spec.ts`
- `apps/web/e2e/full-stack/fixtures/helpers.ts`
- `apps/web/playwright.fullstack.config.ts`
- `apps/tracker/src/tracker.ts`

---

## Verification Summary

**The test genuinely exercises the real built `tracker.js` in real Chrome.** This is not a
simulation. Evidence:

- `playwright.fullstack.config.ts:77` runs `pnpm --dir ../tracker build && pnpm --dir ../tracker start`
- The script is injected from `http://127.0.0.1:3102/tracker.js` via a real `<script>` tag
  (spec lines 83-102)
- Chrome is the real browser channel (`channel: 'chrome'`), not Chromium headless shell
- A browser-side `fetch` probe asserts the served bundle is real JavaScript over 1 KB

**Flow coverage is complete except one link:**

```
Chrome → tracker.js → POST /api/v1/collect → [DB verified only indirectly] → tracking UI → analytics processing
```

### Verdict

**Correct, with minor improvements needed.**

- No production bug found.
- No weakened assertions found.
- One test bug (the `expectMetric` locator) was found and fixed earlier in this session.

---

## Event Accounting — the 5 / 3 / 1 / 1 counts are correct

The expected counts are not arbitrary. Traced against tracker source:

| Step                                | Trigger                                          | Event        | Running total |
| ----------------------------------- | ------------------------------------------------ | ------------ | ------------- |
| `installTracker`                    | `start()` → `trackPageView()` (`tracker.ts:420`) | PAGE_VIEW #1 | 1             |
| `track('browser_checkout_started')` | explicit API call                                | CUSTOM #1    | 2             |
| `pushState('/pricing/compare')`     | route hook (`tracker.ts:613-616`)                | PAGE_VIEW #2 | 3             |
| 15s interval elapses                | `heartbeatTimer` (`tracker.ts:220`, `426`)       | HEARTBEAT #1 | 4             |
| `reload()` + re-`installTracker`    | fresh `start()`                                  | PAGE_VIEW #3 | 5             |

**Totals:** 5 events — 3 PAGE_VIEW, 1 HEARTBEAT, 1 CUSTOM. Matches the assertions exactly.

---

## What Is Correct

### Assertions are strict and honest

Nothing appears written merely to pass:

- **Exact URL equality including query-param ordering** —
  `` `${trackingOrigin}/pricing/compare?utm_campaign=browser&z=9` `` (spec:380)
- **Negative security assertions** — `token=` and `#private` must be absent (spec:304-305,
  382-383). This proves PII and fragment stripping, and is genuinely valuable.
- **`toEqual` rather than `toMatchObject`** on custom event properties (spec:352), which
  rejects unexpected extra keys.
- **Heartbeat duration bounded on both sides** — 14s to 17s (spec:400-401), matching the real
  15s interval in `tracker.ts:220`. A one-sided assertion would have been weaker.

### Identity and persistence are properly covered

`visitorId` and `sessionId` are asserted stable across custom events, SPA navigation, and a
**full page reload** (spec:417-418). The reload case is the real proof of localStorage
persistence, reinforced by reading `localStorage` directly (spec:313-320).

### Transport verification is unusually rigorous

Using a **CDP session** to read `Sec-Fetch-Mode: no-cors` (spec:288-292) is the correct
approach — Playwright's `allHeaders()` cannot observe browser-computed headers. Content-type
`text/plain` is also asserted, matching `tracker.ts:379`.

### Isolation is well designed

- `reuseExistingServer: false` on all three servers guarantees fresh processes
- `ANALYTICS_PROCESSING_SCHEDULER_ENABLED: 'false'` removes background-job nondeterminism, so
  test 3's `Pending: 5 → 0` transition is deterministic
- `workers: 1` combined with `mode: 'serial'` suits the shared-state design

### On `net::ERR_ABORTED` — harmless, and correctly so

These messages are **expected** and do not indicate an SDK delivery defect.

`tracker.ts:374` deliberately uses `mode: 'no-cors'`, which produces an opaque response that
Chrome surfaces as aborted. The proof it is benign: the events **did** reach PostgreSQL, which
tests 2 and 3 then verify by asserting `Total events: 5`. The tracker is fire-and-forget by
design and never inspects response status — which is unavoidable under `no-cors`.

---

## Problems Found

### P1 — The PostgreSQL link is asserted only indirectly (medium)

The suite contains **no direct database query**. The only evidence of persistence is the UI
rendering 5 / 3 / 1 / 1. That is real end-to-end proof, but it cannot distinguish a genuine DB
write from a caching layer, and a UI regression would misreport as a tracker failure.

### P2 — `page.on(...)` listeners registered after `page.goto` (low, real)

At spec:186-202 the console and pageerror handlers attach **after** the navigation at
spec:185. Errors thrown during initial page load are therefore silently lost. Diagnostic-only,
but it weakens failure triage.

### P3 — Heartbeat wait is timing-fragile (low-medium)

spec:388-390 waits up to 22s for a 15s heartbeat, inside a **45s global timeout**. Test 1
currently runs ~20.7s. On a slower CI machine this is the most likely source of flake — the
margin is thin.

### P4 — `expectMetric` still uses XPath (low)

Now correct and strict (`toHaveCount(1)` guards against ambiguity), but
`xpath=../following-sibling::p[1]` still couples the tests to DOM nesting. A `data-testid` on
the Metric value element would be robust against markup changes.

### P5 — Cross-test dependency via module-level state (low, by design)

`websiteId` and `trackingKey` are module globals, so tests 2 and 3 fail meaninglessly if test 1
fails. `mode: 'serial'` makes this intentional and acceptable, but **test 3 lacks test 2's
`expect(websiteId).not.toBe('')` guard**.

### P6 — No DB reset in global setup (low)

`global-setup.ts` seeds via HTTP without truncating tables. Unique per-run domains prevent
collisions, but the database accumulates data across runs.

---

## Missing Coverage

Ranked by value:

1. **`sendBeacon` path is never tested** — `tracker.ts:359-364` uses `navigator.sendBeacon` on
   pagehide/unload. The suite only exercises the `fetch` branch. This is the highest-value gap:
   beacon delivery is how real users' final events arrive.
2. **Offline queue and retry** — `persistQueue()` on failure (`tracker.ts:388`) is untested
   in-browser. No assertion that queued events survive and resend when connectivity returns.
3. **DNT and consent gating** — the test hardcodes `respectDnt='true'` and
   `requireConsent='false'`, and never verifies that `doNotTrack='1'` suppresses tracking or
   that `setConsent('deny')` clears the queue (`tracker.ts:396-407`).
4. **Origin rejection** — `allowedOrigins` is configured but there is no negative test that a
   disallowed origin is refused by the API.
5. **Invalid tracking key** — no assertion that a bad key is rejected.
6. **Batch cap (25) and queue cap (100)** — covered by VM tests but not in real Chrome.
7. **Multi-session** — session timeout producing a second session is untested; test 3 asserts
   `Sessions: 1`.

---

## Recommended Fixes

Nothing has been changed. In priority order:

| #   | Fix                                                                                                                                                               | Addresses  |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| 1   | Add a direct PostgreSQL assertion — query `raw_analytics_events` on port 5435 for the 5 events grouped by type, alongside the existing UI checks                  | P1         |
| 2   | Move the `page.on(...)` registrations above `page.goto` (one-line reorder)                                                                                        | P2         |
| 3   | Raise test 1's timeout via `test.setTimeout(90_000)`, or shorten the interval using `data-heartbeat-interval` (already supported at `tracker.ts:220`) to cut ~15s | P3         |
| 4   | Add a `data-testid` to the Metric value element — the only production-side change suggested, and it is test infrastructure rather than behavior                   | P4         |
| 5   | Add a `sendBeacon` delivery test                                                                                                                                  | Missing #1 |
| 6   | Add `expect(websiteId).not.toBe('')` to test 3 to match test 2's guard                                                                                            | P5         |

---

## Final Tracking SDK E2E Score: 82 / 100

| Dimension                       | Score | Note                                                                                  |
| ------------------------------- | ----- | ------------------------------------------------------------------------------------- |
| Real-browser authenticity       | 19/20 | Genuine built bundle, real Chrome, CDP-level verification                             |
| Flow completeness               | 15/20 | DB link asserted only through the UI                                                  |
| Assertion strictness            | 19/20 | Exact equality, negative security assertions, bounded ranges                          |
| Event-type coverage             | 14/20 | PAGE_VIEW / CUSTOM / HEARTBEAT / SPA / reload solid; beacon, offline, consent missing |
| Robustness and flake resistance | 8/10  | Heartbeat margin thin against the 45s timeout                                         |
| Isolation and config            | 7/10  | Excellent server isolation; no DB reset                                               |

**This is a genuinely strong, trustworthy E2E suite** — well above typical for this kind of
browser SDK. The negative security assertions and CDP header verification show real rigor, and
the expected counts are honestly derived from tracker behavior rather than reverse-engineered
from a passing run. The gap to 90+ is the direct database assertion and the `sendBeacon` path.

---

## Service Topology (verified)

| Service       | Port | Started by                             | Fresh per run    |
| ------------- | ---- | -------------------------------------- | ---------------- |
| Web (Next.js) | 3100 | `pnpm exec next dev -p 3100`           | yes              |
| API (NestJS)  | 4100 | `pnpm --dir ../api start`              | yes              |
| Tracker       | 3102 | `pnpm --dir ../tracker build && start` | yes              |
| PostgreSQL    | 5435 | external container                     | no (no truncate) |

Correct invocation for this suite:

```powershell
npx playwright test --config=playwright.fullstack.config.ts e2e/full-stack/fullstack-tracker-browser.spec.ts
```

Note that `playwright.config.ts` (without `.fullstack`) starts `pnpm dev` on port 3000 and will
fail this suite with `ECONNREFUSED 127.0.0.1:4100`.
