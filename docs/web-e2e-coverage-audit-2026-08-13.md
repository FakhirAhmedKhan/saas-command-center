# Frontend Test Verification Report — `apps/web`

**Date:** 2026-08-13
**Scope:** `apps/web` only. Backend and Tracker testing handled separately and left untouched.

---

## Test Results

| Layer                 | Result                                                                                                                                                          |
| --------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Unit/component suites | **66/66 passed**                                                                                                                                                |
| Unit/component tests  | **553/553 passed**, 0 failed, 0 skipped                                                                                                                         |
| Mocked Playwright     | 76 passed / 47 failed / 1 skipped / 14 did not run (138 total) — **all failures confirmed pre-existing**, reproduced identically on unmodified pre-session code |
| Full-stack Playwright | **15 passed / 6 failed / 5 did not run** (26 total) — clean run against fresh real API + DB + web + tracker                                                     |

## Coverage (honest, full `src/**`)

| Metric     | Before (rigged config) | After      |
| ---------- | ---------------------- | ---------- |
| Statements | 8.00%                  | **41.44%** |
| Branches   | 9.31%                  | **41.12%** |
| Functions  | 4.58%                  | **41.76%** |
| Lines      | 8.19%                  | **42.10%** |

Coverage targets (not yet met — see Remaining Manual Testing):

- General frontend: Statements ≥ 90%, Lines ≥ 90%, Functions ≥ 90%, Branches ≥ 85%
- Critical auth/security/business flows: 95–100% meaningful coverage

---

## Phase 1–3 Findings (Baseline Audit)

### Original test architecture

- **Unit tests:** Vitest 4, `node` environment, 9 files / 161 tests — all testing pure `*-utils.ts` modules or the `lib/api` HTTP client. **Zero component tests existed** (`0` `.test.tsx` files anywhere in the project, out of 97 `.tsx` files).
- **Playwright (mocked):** `e2e/batch10/**`, `e2e/batch11/**`, `e2e/phase12-18/**` — 138 tests across 22 files, substantive assertions (role-based visibility, request payloads, confirm-dialog flows).
- **Full-stack Playwright:** `e2e/full-stack/**` — 7 spec files against real API + Postgres + web + tracker.

### The core honesty problem

`vitest.config.mts` had its coverage `include` hard-restricted to:

```
include: ['src/features/**/*-utils.ts', 'src/features/lib/api/**/*.ts']
```

with a comment stating: _"Widening this to all of src/ would bury the real numbers under untested UI."_ This hid ~93% of the codebase (all of `app/**`, `components/**`, `providers/**`, and every non-utils file in `features/**`) from coverage measurement — a textbook case of the "suspicious exclusions" this audit exists to catch. **Fixed**: widened to `src/**/*.{ts,tsx}` excluding only test/type-only/generated files. This is a config-only change; no test assertions were touched.

### Pre-fix honest baseline

Statements 8.00% / Branches 9.31% / Functions 4.58% / Lines 8.19%. Pre-fix coverage quality score: **22/100**.

### Weakest modules identified (pre-work)

Entire `features/auth/**` (auth-provider, gates, protected-route) had zero unit coverage — the highest-risk code in the app. All `*-api.ts` service modules were untested at the unit level. All `features/**/components/*.tsx` were untested.

---

## Improvements Made

- Fixed the coverage config (see above) — measures real `src/**` now.
- Added component-testing infrastructure: `@testing-library/react`, `@testing-library/jest-dom`, `@testing-library/user-event`, a `jsdom` environment opt-in via `// @vitest-environment jsdom` docblocks, and `vitest.setup.ts` (cleanup after each test). None of this existed before.
- Added **43 new test files** (auth, workspaces/applications/websites, analytics, UI-reliability/security), bringing total unit/component tests from 161 to 553.
- Fixed 5 real lint violations surfaced by the new tests: an unsafe `window` mutation during render (moved into `useEffect`), two `import/order` violations, and an unnecessary `any` cast (replaced with a fully-typed test fixture).
- Excluded the generated `playwright-report-fullstack/**` artifact directory from ESLint scope (it was linting minified Playwright trace-viewer JS as if it were source).
- Fixed 3 of 5 confirmed production bugs (see below); flagged 2 for a product/design decision.

---

## Real Bugs Found

All verified independently (URL resolution, direct source reads, or reproduction) before being reported or fixed — none taken on trust from a subagent's claim alone.

### 1. Open redirect — FIXED

**File:** `src/app/(auth)/login/page.tsx:39`
`nextPath.startsWith('/')` accepted protocol-relative URLs like `//evil.com`. Browsers resolve `//evil.com` to `https://evil.com`, so a crafted `?next=` param could redirect a user off-site after login.
**Fix:** `nextPath.startsWith('/') && !nextPath.startsWith('//')`.
**Proof:** `login/page.test.tsx` — regression test asserting `//evil.com` falls back to `/dashboard`.

### 2. Mojibake arrow glyphs — FIXED

**File:** `src/features/analytics-overview/analytics-overview-dashboard.tsx:91,99`
Metric-change labels contained double-UTF-8-encoded bytes (`â†‘` / `â†“`) instead of real `↑` / `↓` characters. Real users saw garbled text like "â†‘ 28%" in the analytics dashboard.
**Fix:** replaced with the correct Unicode characters.
**Proof:** `analytics-overview-dashboard.test.tsx` — asserts the exact correct glyph renders.

### 3. Tab-highlight collision — FIXED

**File:** `src/features/websites/components/website-sub-nav.tsx:29`
`pathname.startsWith(tab.href)` caused `/analytics-engine` to also match the `/analytics` tab's href prefix, so visiting the Analytics Engine page marked both tabs as `aria-current="page"` simultaneously.
**Fix:** `pathname === tab.href || pathname.startsWith(`${tab.href}/`)`.
**Proof:** `website-sub-nav.test.tsx` — asserts only the correct tab is marked current.

### 4. Logout redirect race — NOT FIXED (needs a design decision)

**Files:** `src/components/layout/app-shell.tsx:99-102`, `src/features/auth/protected-route-content.tsx:17-27`
`handleLogout` calls `await logout()` then `router.replace('/login')`. Independently, `ProtectedRoute`'s own `useEffect` watches auth `status` and fires `router.replace('/login?next=/dashboard')` the instant status flips to unauthenticated — which happens at the same moment, while the dashboard is still mounted. Two competing navigations race; the final URL is nondeterministic.
**Found via:** `e2e/full-stack/fullstack-auth.spec.ts:83` ("logs out and protects the dashboard again"), which failed expecting `/login` but received `/login?next=%2Fdashboard`. Reproduced on a clean full-stack run (not a one-off flake — Playwright's own retry log showed both outcomes occurring across polling ticks: 4× the `/dashboard` value, 19× the `/login?next=...` value).
**Why not fixed:** this needs a product decision — either `ProtectedRoute` should skip its own redirect when a navigation is already in flight, or the logout handler should stop self-redirecting and let `ProtectedRoute` own the redirect alone. Not a one-line fix; deferred to you.

### 5. Viewer role can see "New application" create action — NOT FIXED (needs a design decision)

**Files:** `src/features/applications/components/applications-header.tsx`, `src/app/(dashboard)/workspaces/[workspaceId]/applications/page.tsx:142`
The "New application" link renders unconditionally — no role check exists anywhere in its render path. A VIEWER-role workspace member sees and can click a create action they should not have.
**Found via:** `e2e/full-stack/fullstack-authorization.spec.ts:28` ("hides owner-only creation actions"), which expected 0 matching links for a viewer and found 1. Confirmed by direct source read — `ApplicationsHeader` takes no role/permission prop at all.
**Why not fixed:** whether the backend still correctly rejects the actual write wasn't verified in this pass (backend testing is handled separately per your instructions), and the right UI fix (a reusable `<RoleGate>` component vs. a per-page conditional) is a design choice beyond this task's scope. Flagged for your decision.

---

## Coverage Breakdown by Area

### Fully Covered

- Auth core logic: `auth-provider.tsx` (state machine, login/register/logout/logoutAll, workspace merge logic), route guards (`auth-gates.tsx`, `protected-route-content.tsx`), login/register redirect-safety
- `features/lib/api/api-client.ts` — 100% statements, 98.6% branches (pre-existing, strong)
- All `*-api.ts` request-builder modules across applications, websites, workspaces, analytics (4 modules), tracking, activity, development, monitoring, releases, repositories, integrations, team-operations — previously 0%, now unit-tested for exact method/path/body/query-param shape
- Status badges (monitoring, releases) — full enum-branch coverage
- Security-sensitive shared components: `PageError`, `PageLoading`, `WorkspaceSwitcher`, `NotificationBell`

### Partially Covered

- Feature dashboard/panel components (analytics-overview, analytics-processing, analytics-reports, analytics-engine, applications, websites, development, monitoring, releases, repositories, team-operations) — formatting/branching logic tested; large orchestration components deliberately left to Playwright per testing-pyramid guidance, to avoid duplicating 130+ existing Playwright assertions in shallow unit tests

### Missing Coverage

- `src/app/**` page/layout files (0%) — thin data-fetching/composition wiring, already covered end-to-end by 22 Playwright spec files
- `app-shell.tsx`, `providers.tsx` — pure composition, no branching logic
- A handful of `*-dashboard.tsx` files over 700 lines (repositories, monitoring, releases, integrations) — same reasoning as above

---

## Stale Tests Found

None. No test required updating for a legitimately-changed product behavior.

## Flaky Tests Found

- A handful of `userEvent`-driven component tests (e.g. `link-manager.test.tsx`) intermittently exceed the default 5s timeout **only under heavy parallel machine load** (many Vitest workers running concurrently). Reproducibly pass in isolation and in scoped batch runs — not a test defect. Worth raising the default `testTimeout` if this recurs in CI.
- 3 full-stack Playwright tests (register account, create workspace, duplicate application slug) showed timing sensitivity tied to sequential execution against a freshly-booted dev server. A clean run (15 passed) materially outperformed a run against reused/stale servers (9 passed), suggesting environment sensitivity beyond pure application bugs. Flagged for awareness, not conclusively root-caused further.

## Remaining Manual Testing

1. Decide on and implement fixes for the logout-race and viewer-permission-leak bugs (items 4 and 5 above).
2. Confirm the backend actually rejects a VIEWER's application-create attempt at the API layer (defense in depth, even after any UI fix).
3. Investigate the 3 timing-sensitive full-stack tests further if they keep failing in CI.
4. Push coverage toward the 90%/85% targets — decide whether the large dashboard components (repositories, monitoring, releases, integrations) warrant additional unit tests or remain Playwright-only.
5. The 47 pre-existing mocked-Playwright failures are a separate, larger investigation: `playwright.config.ts`'s `testDir: './e2e'` has no `testIgnore` for `full-stack/**`, so full-stack specs get picked up and fail without their real backend; plus there are real `strict mode violation` (duplicate `role="alert"` / duplicate button matches) and timeout patterns unrelated to this session's changes. Out of this session's scope but worth a dedicated pass.

---

## Final Frontend Test Health Score: 62/100

Up from an honest baseline of ~22/100 (see Phase 1–3 findings). Held back from a higher score by: coverage still well under target, 2 unresolved real bugs (one security-relevant), and a pre-existing, unaddressed mocked-Playwright suite with 47 failures.
