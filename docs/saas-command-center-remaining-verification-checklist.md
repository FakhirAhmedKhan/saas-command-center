# SaaS Command Center — Remaining Work & Verification Checklist

_Last updated: 2026-08-13_

This checklist compares the old monorepo audit with the work completed since then.

## ✅ Completed / Verified

| Area | Change | Status |
|---|---|---|
| API E2E | 45 suites / 543 tests | ✅ PASS |
| API Unit | 14 suites / 96 tests | ✅ PASS |
| Production bootstrap | E2E now uses real `configureApplication()` | ✅ VERIFIED |
| Exception handling | `AllExceptionsFilter` covered and oversized body `500 -> 413` bug fixed | ✅ VERIFIED |
| Request ID | Middleware generation/propagation covered | ✅ VERIFIED |
| Runtime config | Unit coverage | ✅ 100% |
| Startup checks | Unit coverage | ✅ 100% |
| CORS / Helmet / body limits | Production-like infrastructure E2E | ✅ VERIFIED |
| Dead-letter retry IDOR | Workspace isolation bug fixed | ✅ VERIFIED |
| Analytics processing | Previously broken processing/rebuilder paths fixed | ✅ VERIFIED |
| Tracker VM tests | 63 / 63 | ✅ PASS |
| Tracker real Chrome E2E | 5 / 5 | ✅ PASS |
| Tracker DB persistence | Direct PostgreSQL verification | ✅ VERIFIED |
| Tracker `sendBeacon` | Real-browser coverage | ✅ VERIFIED |
| Tracker invalid key/origin | Negative tests | ✅ VERIFIED |

## 🔎 Must Verify Against Current Code

These came from the older audit and may already be fixed. Verify before changing code.

- [ ] `ScheduleModule.forRoot()` is registered in `AppModule`.
- [ ] Only the intended analytics-processing pipeline is active; legacy duplicate processing is removed or intentionally retained.
- [ ] Frontend uses one auth provider instead of two competing providers.
- [ ] Frontend uses one HTTP/API client instead of three competing token stores.
- [ ] Login/register display the real backend error message.
- [ ] CI runs API E2E tests automatically.
- [ ] CI runs frontend Playwright tests automatically.
- [ ] CI/fresh build runs `prisma generate`.
- [ ] CI uses `pnpm install --frozen-lockfile`.
- [ ] `http-exception.filter.ts` is truly unused before deleting it.
- [ ] Shared types/validation packages are now actually consumed consistently.

## 🟠 Remaining Backend Testing / Hardening

- [ ] Run final strict merged API coverage (`scripts/full-coverage.cjs`).
- [ ] Compare against old baseline:
  - Statements: `80.28%`
  - Branches: `62.52%`
  - Functions: `82.48%`
  - Lines: `~80%`
- [ ] Improve Redis failure/reconnect branch coverage.
- [ ] Test PostgreSQL advisory-lock contention and release-on-error.
- [ ] Improve webhook delivery worker retry/backoff/dead-letter coverage.
- [ ] Exercise scheduler/cron entrypoints.
- [ ] Improve real `GithubAppService` coverage using controlled HTTP responses.
- [ ] Investigate/fix the PostgreSQL `client.query()` concurrency deprecation warning.
- [ ] Verify auth-specific rate limiting.
- [ ] Verify rate-limit identity cannot be bypassed with rotating client headers.

## 🟡 Remaining Tracker Follow-up

Tracker is complete enough to move on, but these are optional hardening items:

- [ ] Real-browser offline queue/retry.
- [ ] Real-browser DNT behavior.
- [ ] Real-browser consent allow/deny behavior.
- [ ] Multi-session/session-timeout behavior.
- [ ] Replace fragile XPath metric locator with a semantic/test-id locator.
- [ ] Add DB cleanup/reset between full-stack runs.

## 🔴 Frontend — Next Main Stage

First measure the current frontend baseline before fixing anything.

- [ ] Inspect current Vitest/Jest/Playwright setup.
- [ ] List all unit/component/integration/E2E tests.
- [ ] Run frontend unit/component tests with coverage.
- [ ] Record:
  - Statements %
  - Branches %
  - Functions %
  - Lines %
  - Passed / failed / skipped tests
- [ ] Verify production files are not dishonestly excluded.
- [ ] Identify weak or untested frontend modules.
- [ ] Verify authentication flows:
  - login
  - register
  - logout
  - session restore
  - invalid credentials
  - redirects
- [ ] Verify workspace flows and role-dependent UI.
- [ ] Verify applications/websites CRUD and error/empty/loading states.
- [ ] Verify analytics dashboards and tracking installation UI.
- [ ] Verify forms, dialogs, filters, pagination and navigation.
- [ ] Verify unauthorized/cross-workspace routes.
- [ ] Run normal Playwright.
- [ ] Run full-stack Playwright.
- [ ] Run production `next build`.
- [ ] Produce final frontend coverage/health score.

### Frontend coverage targets

| Metric | Target |
|---|---:|
| Statements | ≥ 90% |
| Lines | ≥ 90% |
| Functions | ≥ 90% |
| Branches | ≥ 85% |
| Critical auth/security flows | 95–100% meaningful coverage |

## 🟡 Architecture / Performance Work Still Worth Reviewing

- [ ] Confirm frontend client/server component strategy.
- [ ] Add route-level `error.tsx` / `global-error.tsx` where appropriate.
- [ ] Reduce duplicated `useEffect` data-fetching logic.
- [ ] Fix polling to respect tab visibility where useful.
- [ ] Verify `RawAnalyticsEvent` pending-processing index.
- [ ] Review deep offset pagination on high-volume tables.
- [ ] Review per-event sequential analytics processing performance.
- [ ] Review large `DevelopmentService` split/refactor.
- [ ] Remove confirmed dead/orphaned code only after repository-wide verification.

## Final Completion Gate

Project testing can be considered complete for this phase when:

- [x] Backend unit regression passes.
- [x] Backend E2E regression passes.
- [x] Tracker VM regression passes.
- [x] Tracker real-browser E2E passes.
- [ ] Final merged backend strict coverage is recorded.
- [ ] Frontend coverage baseline is measured.
- [ ] Important frontend gaps are covered.
- [ ] Frontend Playwright/full-stack regression passes.
- [ ] CI is verified to run the critical suites.
- [ ] Remaining old audit findings are rechecked against the current codebase.

## Current Status

```text
Backend functional tests      ✅ Strong
Backend production bootstrap  ✅ Verified
Backend strict coverage       ⏳ Final merged rerun pending
Tracker                       ✅ Strong / ready
Frontend                      🔴 Next deep-testing stage
CI                            🔎 Needs verification
Architecture/performance      🟡 Follow-up after frontend
```
