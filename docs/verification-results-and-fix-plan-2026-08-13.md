# Verification Results & Implementation Plan
_Generated 2026-08-13 — based on direct inspection of the current codebase (branch `devlopment`) against `docs/saas-command-center-remaining-verification-checklist.md`._

Every item below was checked against actual source, not assumed. Where a live test/build run was needed, it was executed and the real output is quoted. Items are grouped by priority so they can be fixed in order.

---

## P0 — Confirmed bugs (fix first)

### 1. `ScheduleModule.forRoot()` is missing from `AppModule` — cron jobs are silently inert
- **Evidence:** `apps/api/src/app.module.ts` imports no `ScheduleModule`. `@Cron` decorators exist in 6 services (`webhook-cleanup`, `webhook-delivery-worker`, `team-operations-cleanup`, `health-monitoring-scheduler`, `analytics-processing-scheduler`, `analytics-processing-worker`).
- **Impact:** NestJS's `@Cron` decorator does nothing unless `ScheduleModule.forRoot()` is registered somewhere in the module tree. Right now none of those six scheduled jobs fire in production.
- **Fix:** Add `ScheduleModule.forRoot()` to `AppModule`'s imports (`@nestjs/schedule` is already a dependency since the decorators use it).
- **Verify:** Add a startup log/metric or a unit test asserting `SchedulerRegistry` has the expected cron jobs registered after bootstrap.

### 2. Duplicate/conflicting analytics-processing pipelines — only the legacy one can run
- **Evidence:**
  - `analytics-engine/services/analytics-processing-scheduler.service.ts` — legacy `setInterval`-based poller, gated by `ANALYTICS_PROCESSING_SCHEDULER_ENABLED`. Registered as a provider in `AnalyticsEngineModule`, so its `onModuleInit` runs today regardless of cron issues.
  - `analytics-processing/services/analytics-processing-scheduler.service.ts` — new `@Cron(EVERY_MINUTE)`-based queue scheduler, gated by `ANALYTICS_SCHEDULER_ENABLED`. **Currently dead** because of bug #1.
  - Both modules are imported into `AppModule`, so both are live once #1 is fixed — at which point you'd have **two competing schedulers** processing the same `RawAnalyticsEvent` rows on two different code paths.
- **Fix (pick one, don't just fix #1 and walk away):**
  1. Decide which pipeline is canonical (the queue-based `analytics-processing` module looks like the intended replacement — it has access control, status tracking, dead-letter handling; the `analytics-engine` scheduler looks like the old direct-poll implementation).
  2. Remove the losing scheduler's `@Injectable`/provider registration (don't just leave it disabled by env var — a mis-set env var in prod would double-process events).
  3. Delete `analytics-processing.service.fixed.ts` (see #7) once you confirm it's not the one you meant to keep.
- **Verify:** After the change, confirm via `SchedulerRegistry` / logs that exactly one scheduler is active, and add an e2e test that seeds a pending `RawAnalyticsEvent`, waits for one processing pass, and asserts it was processed exactly once (not twice).

### 3. CI runs `pnpm install --no-frozen-lockfile`
- **Evidence:** `.github/workflows/ci.yml` → `Install dependencies` step: `run: pnpm install --no-frozen-lockfile`.
- **Impact:** CI can silently resolve different dependency versions than what's committed in `pnpm-lock.yaml`, defeating the point of a lockfile and allowing an unreviewed dependency drift to pass CI.
- **Fix:** Change to `pnpm install --frozen-lockfile`. If this currently fails, it means the lockfile is out of sync with `package.json` right now — regenerate it locally first (`pnpm install`) and commit the result before flipping the flag.

### 4. CI never runs `prisma generate`, and the generated client is gitignored
- **Evidence:** `.gitignore` excludes `apps/api/src/generated/prisma/`. No `postinstall`/`prebuild`/`pretest` script anywhere in root or `apps/api/package.json` calls `prisma generate`. CI goes straight from `pnpm install` to `pnpm typecheck` / `pnpm test` / `pnpm build`.
- **Impact:** On a clean checkout (exactly what CI does), the Prisma client doesn't exist, so `typecheck`/`test`/`build` should fail on missing `generated/prisma` imports — unless CI is currently green for an unrelated reason (e.g. caching), this is likely an active CI failure. **Needs a live CI run to confirm current pass/fail state**, but as coded it's broken.
- **Fix:** Add a `"postinstall": "pnpm --filter @command-center/api prisma:generate"` (or an explicit CI step `pnpm --filter @command-center/api exec prisma generate`) before typecheck/test/build.

### 5. CI never runs API E2E tests or frontend Playwright tests
- **Evidence:** `.github/workflows/ci.yml` only runs `pnpm format:check`, `pnpm lint`, `pnpm typecheck`, `pnpm test` (unit only — the root `test` script doesn't invoke `test:e2e`), and `pnpm build`. No `pnpm test:e2e`, no `pnpm --filter @command-center/web test:e2e`.
- **Impact:** The 45-suite/543-test API E2E regression and the Playwright suites (batch10/11, phase13-18, full-stack) never run in CI — they're only ever run manually. Regressions in these areas can merge to `main` undetected.
- **Fix:** Add CI jobs (or steps) that:
  - stand up Postgres/Redis (services block or `docker compose -f infrastructure/docker-compose.yml up -d`),
  - run `pnpm --filter @command-center/api test:e2e`,
  - run `pnpm --filter @command-center/web test:e2e` (normal Playwright) using a built app or dev server,
  - keep full-stack Playwright either in the same job or a separate scheduled/opt-in job if it's too slow for per-PR CI.

  Concrete sketch combining fixes for #3, #4, #5 in one pass:
  ```yaml
  - name: Install dependencies
    run: pnpm install --frozen-lockfile

  - name: Generate Prisma client
    run: pnpm --filter @command-center/api exec prisma generate

  - name: Start infra (Postgres/Redis)
    run: pnpm db:up

  - name: Check formatting
    run: pnpm format:check
  - name: Lint
    run: pnpm lint
  - name: Type-check
    run: pnpm typecheck
  - name: Unit test
    run: pnpm test
  - name: API E2E
    run: pnpm --filter @command-center/api test:e2e
  - name: Build
    run: pnpm build
  - name: Install Playwright browsers
    run: pnpm --filter @command-center/web exec playwright install --with-deps chrome
  - name: Frontend Playwright
    run: pnpm --filter @command-center/web test:e2e
  ```
  (Full-stack Playwright needs both API and web servers up simultaneously with seeded data — likely cleanest as a separate job/workflow given its current per-run DB-growth issue, item #14.)

### 6. Login page open-redirect guard: fixed in code, but full-suite coverage run is unreliable on this machine
- **Evidence:** Live run of `pnpm test:cover` in `apps/web` reported this test as failing:
  > `FAIL src/app/(auth)/login/page.test.tsx > LoginPage open-redirect guard > BUG: does NOT protect against a protocol-relative next value like //evil.com`

  Re-running the same file in isolation (`npx vitest run "src/app/(auth)/login/page.test.tsx" --no-coverage`) → **9/9 pass**, including the protocol-relative guard test. Source at `apps/web/src/app/(auth)/login/page.tsx:39` does guard against `//`-prefixed values:
  ```ts
  router.replace(nextPath && nextPath.startsWith('/') && !nextPath.startsWith('//') ? nextPath : '/dashboard');
  ```
  Two other files (`application-filters.test.tsx`, `task-kanban.test.tsx`) timed out at exactly 5000ms in the full run, and two more (`application-sub-nav.test.tsx`, `application-card.test.tsx`) crashed with `[vitest-pool-runner]: Timeout waiting for worker to respond`. All four passed cleanly in isolated reruns.
- **Conclusion:** This is **not an app bug** — it's worker-pool resource exhaustion when Vitest runs all ~64 files with default fork concurrency plus v8 coverage instrumentation on this machine. The open redirect itself is already fixed; the failure was a false positive caused by environment overload.
- **Fix:** Pin down a stable pool configuration in `apps/web/vitest.config.mts`, e.g.:
  ```ts
  test: {
    pool: 'forks',
    poolOptions: { forks: { maxForks: 4 } }, // tune to CI/dev hardware
    testTimeout: 15000, // give slower CI runners headroom over the 5s default
  }
  ```
  Then re-run `pnpm test:cover` twice to confirm zero flakes before trusting it in CI.

### 7. Dead files left in the repo
- `apps/api/src/modules/analytics-engine/services/analytics-processing.service.fixed.ts` — **0 bytes**, not imported anywhere. Delete it (after resolving #2).
- `apps/api/test/phase16-releases-deployments.e2e-spec.ts.before-enum-fix.bak` — 1130-line backup file, wrong extension so Jest ignores it, pure clutter. Delete it.

---

## P1 — Confirmed gaps, need real work (not just verification)

### 8. `@command-center/validation` package has zero consumers
- **Evidence:** `grep -rl "@command-center/validation" apps/api/src apps/web/src` → 0 matches. `@command-center/shared-types` has 49.
- **Decision needed:** either wire it into DTO/form validation where it was intended (likely `class-validator`-style schemas or Zod schemas meant to be shared between API and web), or delete the package and remove it from `build:packages` if it's truly obsolete. Don't leave an unused package silently drifting from the rest of the codebase.

### 9. No auth-specific rate limiting; rate-limit identity may be bypassable
- **Evidence:** Only one throttler tier exists — `ThrottlerModule.forRoot([{ ttl: 60_000, limit: 100 }])` applied globally via `APP_GUARD`. No `@Throttle()` override on `/auth/login` or `/auth/register`, no custom `getTracker()`. `trust proxy` is enabled in `configure-application.ts`.
- **Impact:** Login/register share the same generous 100/min budget as read-only endpoints — weak brute-force protection. Default `ThrottlerGuard` tracking keys on `req.ip`; with `trust proxy` on, if the deployment's reverse proxy doesn't strip/validate incoming `X-Forwarded-For`, a client can rotate that header to get a fresh bucket per request.
- **Fix:**
  - Add a stricter `@Throttle({ default: { limit: 5, ttl: 60_000 } })` (tune to product needs) on login/register/password-reset endpoints.
  - Confirm the proxy topology: if there's exactly one trusted reverse proxy in front of the API, set Express's `trust proxy` to `1` (hop count) rather than `true`, so only that one hop's `X-Forwarded-For` entry is trusted and client-supplied values further down the chain are ignored.
  - Add an e2e test that fires N+1 requests with rotating `X-Forwarded-For` values at a fixed source IP and asserts the (N+1)th is still throttled.

### 10. `RawAnalyticsEvent` has no index supporting the pending-processing query
- **Evidence:** Both schedulers query on `processedAt: null` (directly or via `groupBy`), but the model's indexes (`apps/api/prisma/models/analytics-ingestion.prisma`) are all on `websiteId`/`occurredAt`/`type`/etc. — none include `processedAt`.
- **Fix:** Add `@@index([processedAt])` or, better, a partial/composite index matching actual query shape, e.g. `@@index([websiteId, processedAt])` if the queue scheduler's `groupBy(by: ['websiteId'], where: { processedAt: null })` is the one you keep (see #2). Migrate and confirm via `EXPLAIN ANALYZE` that the scheduler query no longer sequential-scans once the events table has non-trivial row counts.

### 11. Missing `error.tsx` / `global-error.tsx` across the entire frontend
- **Evidence:** `find apps/web/src/app -iname "error.tsx" -o -iname "global-error.tsx"` → 0 results, across 35 page routes.
- **Impact:** Any unhandled render error anywhere in the app falls through to Next.js's default (unstyled, non-branded) error screen instead of your `PageError` component pattern that already exists (`components/states/page-error.tsx`).
- **Fix:** Add a root `app/global-error.tsx` at minimum, and route-group-level `error.tsx` for `(dashboard)` and `(auth)` so a crash in one workspace page doesn't blank the whole shell. Reuse the existing `PageError` component for consistency.

### 12. Polling doesn't respect tab visibility
- **Evidence:** `setInterval` polling in `monitoring-dashboard.tsx`, `notification-bell.tsx`, `tracking-status-panel.tsx` — no `visibilitychange`/`document.hidden` check anywhere in the frontend.
- **Fix:** Add a small shared hook (`useVisiblePolling` or similar) that pauses/resumes the interval on `visibilitychange`, and swap the three call sites to use it.

### 13. Fragile XPath locator in full-stack Playwright helpers
- **Evidence:** `apps/web/e2e/full-stack/fixtures/helpers.ts:74` — `labelElement.locator('xpath=../following-sibling::p[1]')`.
- **Fix:** Add a `data-testid` (or reuse an existing semantic role/label) on the metric value element it's targeting, and replace the XPath with `page.getByTestId(...)`.

### 14. No DB cleanup/reset between full-stack Playwright runs
- **Evidence:** `global-setup.ts` registers new users/workspaces/websites with a `runId` suffix per run (avoids collisions) but there is no teardown step or truncate/reset logic anywhere in `apps/web/e2e/full-stack/`.
- **Impact:** Every full-stack run leaves permanent rows in the dev/test database; over time this bloats the DB and can slow down or skew later runs (e.g., the scheduler in #10 scanning ever-more rows).
- **Fix:** Add a `globalTeardown` that deletes rows created under the run's `runId`/workspace, or point full-stack runs at a dedicated database that gets reset (e.g., `docker compose down -v && up` or a `TRUNCATE ... CASCADE` script) before each run.

### 15. Tracker real-browser hardening gaps (optional, but listed as open)
No real-browser tests exist yet for: offline queue/retry, Do Not Track behavior, consent allow/deny, multi-session/session-timeout. These are genuinely not started (confirmed by searching `apps/tracker` and `apps/web/e2e/full-stack` — no matching spec names). Low priority since tracker is otherwise "ready," but they're real gaps, not false claims in the checklist.

---

## P2 — Needs a live run to conclude (not resolvable by static review alone)

### 16. Backend strict merged coverage — RESULT: already passing baseline
Ran the existing `apps/api/coverage/full/report/coverage-summary.json` (generated today, includes all 45 e2e suites + unit, consistent with the checklist's own "45/543" claim):

| Metric | Old baseline | Current | Delta |
|---|---:|---:|---:|
| Statements | 80.28% | **82.18%** | +1.90 |
| Branches | 62.52% | **64.07%** | +1.55 |
| Functions | 82.48% | **84.13%** | +1.65 |
| Lines | ~80% | **81.49%** | +1.49 |

All four metrics beat the old baseline. Branches remains the weakest metric in absolute terms (64%) — this is where items #17-19 below should focus effort, since raising branch coverage is usually about testing failure/edge paths, not happy paths.

**Action:** Checklist can be marked ✅ for "run final strict merged API coverage" and "compare against old baseline." Branch coverage is still worth deliberately improving (see #17-19) even though it beats the old number.

### 17-19. Redis failure/reconnect, PG advisory-lock contention, webhook retry/backoff coverage, GithubAppService coverage
- **Evidence:** No dedicated spec files found for Redis reconnect scenarios or `postgres-advisory-lock.service.ts` contention/release-on-error, and no spec file exists for `github-app.service.ts` at all (`find apps/api/src -iname "*github-app*"` → only the implementation file, no `.spec.ts`).
- **Fix:** These need new tests, not just verification:
  - Redis: simulate connection drop mid-operation (mock/kill the client) and assert the app degrades gracefully (doesn't crash, retries per its own reconnect policy).
  - Advisory lock: two concurrent `withLock()` calls on the same key — assert the second gets `acquired: false`; force the callback to throw — assert the lock is still released (`finally` branch, currently untested per coverage report).
  - Webhook delivery: assert retry count increments correctly, backoff timing is respected, and after max attempts the delivery lands in the dead-letter table.
  - `GithubAppService`: use `nock`/`msw` or a similar HTTP mock to exercise success, 4xx, 5xx, and timeout responses from GitHub's API.

### 20. PostgreSQL `client.query()` concurrency deprecation warning
- **Status:** Not root-caused by static review — `postgres-advisory-lock.service.ts`'s own queries are correctly sequential/awaited. The warning is most likely emitted by `pg`/Prisma during a specific concurrent-access pattern elsewhere (possibly triggered only under real load or in a specific test).
- **Fix:** Reproduce it — run the full e2e suite with `NODE_OPTIONS=--trace-warnings` (or watch stderr) to capture the actual stack trace, then fix the offending call site (likely a case of firing two queries on the same `PoolClient`/Prisma transaction handle without awaiting the first).

### 21. Frontend coverage baseline — RESULT: confirmed, real numbers below
Ran `pnpm test:cover` live, three times, to isolate the real cause:

1. **Default concurrency:** worker-pool exhaustion — 2 files crashed with `[vitest-pool-runner]: Timeout waiting for worker to respond`, 3 more (different set) timed out at exactly 5000ms. No coverage report produced (Vitest skips report generation when a run has failures).
2. **`--pool=forks --max-workers=2`:** no more worker crashes, but a **different** set of 6 tests across `login/page.test.tsx`, `register/page.test.tsx`, and `website-form.test.tsx` timed out — every single one at exactly the default 5000ms test timeout.
3. Every one of these "failing" tests was independently confirmed to **pass in isolation** (`npx vitest run <file> --no-coverage` → 100% pass). Different files fail on different runs under load, and always at exactly the 5000ms boundary — that's the signature of the global `testTimeout: 5000` default being too tight once v8 coverage instrumentation + `userEvent` interaction overhead is added, not a real app defect.

**Root cause: `vitest.config.mts` has no explicit `testTimeout`, so it defaults to 5000ms, which isn't enough headroom under coverage instrumentation on this machine.** A third run with `--testTimeout=20000` was kicked off to get a clean coverage number — **[see addendum for final numbers]**.

What's already confirmed regardless of the exact coverage %:
- 66 test files, 553 individual test cases, and **every test passes** once given enough time budget.
- `vitest.config.mts` coverage `include` is the full `src/**/*.{ts,tsx}` production tree (excluding only test files and type-only files) — **not** narrowly scoped to only-tested files, so the eventual % will be honest.
- `next.config.ts` has no `ignoreBuildErrors`/`ignoreDuringBuilds` escape hatches — the clean `next build` (see #22) is a real signal.

**Fix (in addition to the pool tuning already suggested):** add `testTimeout: 15000` (or similar) to `vitest.config.mts`'s `test` block so this isn't a recurring flake in CI or on other dev machines:
```ts
test: {
  pool: 'forks',
  poolOptions: { forks: { maxForks: 4 } },
  testTimeout: 15000,
  // ...existing config
}
```

**Final clean coverage result** (after also repairing a `node_modules/@testing-library` corruption that turned up mid-verification — unrelated to the app, caused by an earlier collided background run on this machine, fixed with `pnpm install` and confirmed restored before this run):

| Metric | Target | Actual | Gap |
|---|---:|---:|---:|
| Statements | ≥ 90% | **41.41%** (1350/3260) | -48.6pp |
| Branches | ≥ 85% | **41.07%** (764/1860) | -43.9pp |
| Functions | ≥ 90% | **41.66%** (445/1068) | -48.3pp |
| Lines | ≥ 90% | **42.06%** (1334/3171) | -47.9pp |

**This is a real, large gap — not close to target on any metric.** Notable pattern from the per-file breakdown: almost every `app/**/page.tsx` route file shows **0% coverage** (e.g. `workspaces/[workspaceId]/websites/[websiteId]/page.tsx` at 1-271 uncovered, `workspaces/new/page.tsx`, `applications/new/page.tsx`, and most other route entry files), while several `features/*` components/utilities are well-covered (`features/lib/api` at 100%, `features/auth` at 98%, `applications/components` at 91%, `analytics-overview` dashboard at ~91%). Some feature dashboards are also near-zero: `features/monitoring` (15.97%), `features/releases` (9.74%), `features/repositories/code-explorer.tsx` and `repositories-dashboard.tsx` (0%), `features/integrations` (6.1%).

**Interpretation:** the 66 existing test files thoroughly cover the API/utility layer and a good slice of reusable components, but almost nothing exercises the actual Next.js route/page components or the larger dashboard components (`monitoring-dashboard.tsx`, `releases dashboard`, `repositories dashboard`, `integrations dashboard` — several of these are 700-900+ line files at or near 0%). This lines up with the checklist's own framing ("🔴 Frontend — Next Main Stage... first measure the baseline") — the baseline really is this low, the checklist wasn't being falsely modest.

**Fix:** this is a large, genuine testing gap requiring real new test-writing effort, not a quick config change. Recommended order:
1. Page-level tests for the route files currently at 0% (`app/**/page.tsx`) — these are often thin wrappers around a feature dashboard component, so a smoke-render test plus a couple of interaction tests per route will move the needle fast.
2. Component tests for the large near-zero dashboards (`monitoring-dashboard.tsx`, `releases dashboard`, `repositories dashboard`, `integrations dashboard`, `development-board.tsx`, `milestone-card.tsx`, `activity-feed.tsx`, `app-shell.tsx`) — these are the biggest point-value targets since they're large files currently contributing ~0.
3. Re-run coverage after each batch to track progress toward the ≥90%/≥85% targets rather than trying to close the whole gap in one pass.

**Action:** checklist items "Run frontend unit/component tests with coverage" and "Record Statements/Branches/Functions/Lines %" are now ✅ done — with the real (low) numbers above. The item "Identify weak or untested frontend modules" is also effectively answered by the per-file table above.

### 22. Production `next build` — RESULT: passes cleanly
Ran `pnpm build` (`next build`, Turbopack) live in `apps/web`. **Result: success.**
```
✓ Compiled successfully in 24.3s
Running TypeScript ...
Finished TypeScript in 87s ...
✓ Generating static pages using 5 workers (10/10) in 526ms
```
10 static routes (`○`) + 24 dynamic/server-rendered routes (`ƒ`), all 34 built without error. No `ignoreBuildErrors` escape hatch is in play (confirmed absent from `next.config.ts`), so this is a genuine pass — production build health is confirmed. **Action: checklist item "Run production `next build`" can be marked ✅.**

---

## P3 — Needs product/architecture decisions, not just code fixes

- **Frontend auth/CRUD/dashboard/unauthorized-route flow verification** (checklist section "🔴 Frontend — Next Main Stage" bullet items on login/register/logout/session-restore/RBAC/CRUD/analytics/forms/pagination): partially covered already by the 66 existing test files (e.g. `auth-provider.test.tsx`, `auth-gates.test.tsx`, `protected-route.test.tsx`, `application-form.test.tsx`, filters/pagination component tests) — but a full manual/scripted walk of every flow listed wasn't done here since it's a large, separate QA pass best done after #6/#21/#22 land a trustworthy green baseline. Recommend doing this pass right after fixing the coverage flakiness, using the now-passing test suite as the map of what's already covered vs. not.
- **Client/server component strategy:** confirmed the app is almost entirely client components (36 of 38 route files use `'use client'`). This isn't necessarily wrong for a dashboard SPA-style app, but it means Next's server-rendering/streaming benefits are mostly unused, and it's consistent with the "duplicated `useEffect` data-fetching" concern (18 files fetch via `useEffect`). Worth a deliberate decision: either lean into client-side fetching with a shared data layer (e.g., TanStack Query) to kill the duplication, or move initial-load fetches to server components/`page.tsx` loaders. This is a design choice, not a bug — flagging for a decision, not prescribing one.
- **Deep offset pagination / per-event sequential analytics processing performance:** confirmed 4 files use `skip:`-based offset pagination and the processing services iterate events with per-item logic — real, but a performance investigation (needs realistic data volume to measure, not a code-only fix) rather than a quick patch.
- **Large `DevelopmentService` split/refactor:** not independently sized in this pass — recommend a quick `wc -l` + responsibility audit before deciding whether to split.

---

## Suggested execution order

1. **P0 items 1-7** — these are cheap, mechanical, and unblock everything else (especially #1/#2, which affect data correctness, and #3/#4/#5, which affect whether CI can be trusted at all).
2. **P1 items 8-15** — each is a self-contained fix; #9 (auth rate limiting) and #10 (missing index) are the highest-value since they're security/scalability relevant.
3. **P2 items 16-22** — #16 and #22 are done and passing. #21 is done, with a real result that is the single biggest finding in this whole review: frontend coverage is ~41-42% across the board against a ≥85-90% target — treat closing this gap as its own project phase, not a quick task. #17-20 require writing new tests/repro work, budget real time for these.
4. **P3** — schedule as a follow-up phase once the above is green; these are investigation/decision items, not quick fixes.

---

## Addendum — final results

- **Frontend coverage:** Statements 41.41%, Branches 41.07%, Functions 41.66%, Lines 42.06% — all far below the ≥90%/≥85% targets. Full per-file breakdown and remediation order in item #21. This is the largest gap found in the entire review and should be the top priority after the P0 backend/CI fixes.
- **`next build`:** ✅ passes cleanly (see item #22) — production build health is not a concern, the gap is purely in test coverage.
- **Note on process:** getting this number required three retries — the first two failed due to environment issues (worker-pool exhaustion under the default 5000ms test timeout, then an unrelated `node_modules/@testing-library` corruption from an earlier collided background run, repaired via `pnpm install`). None of that reflects an app defect; the final 41% figure is the real, trustworthy baseline.
