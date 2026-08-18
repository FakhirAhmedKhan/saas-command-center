# SaaS Command Center — Engineering Audit (2026-08-17)

_Branch `devlopment`, HEAD `fa4865d`. Read-only audit — no files modified, no packages installed, no destructive commands run._

_This is the third audit pass on this repository, following `monorepo-audit-2026-08-09.md` and `verification-results-and-fix-plan-2026-08-13.md`. Rather than re-discovering the codebase from scratch, every prior finding was re-verified directly against current source across five parallel investigations (backend, frontend, database/tenancy, security/CI/deployment, shared-packages/tracker) — including the GitHub repository-import feature added in the four days since the last pass, which had not been audited before._

---

## Executive Summary

|                          |                                                                |
| ------------------------ | -------------------------------------------------------------- |
| **Overall health**       | Fundamentally sound design, incomplete follow-through          |
| **Critical issues (P0)** | 3                                                              |
| **High issues (P1)**     | 6                                                              |
| **Medium issues (P2)**   | 11                                                             |
| **Low issues (P3)**      | 14                                                             |
| **Fixed since 08-09**    | 12                                                             |
| **Security posture**     | Strong crypto/session fundamentals; auth endpoints unthrottled |
| **Architecture quality** | Clean module boundaries; two P0s dormant since 08-09           |
| **Testing quality**      | Substantial suites; CI likely cannot run them right now        |
| **Deployment readiness** | Not configured for any target                                  |
| **Overall score**        | 58 / 100                                                       |
| **Production readiness** | Not Ready                                                      |

### What actually changed since Aug 13

Two previously-Critical bugs are genuinely fixed: the cross-tenant IDOR in the analytics dead-letter retry endpoint, and the always-500 processing-status endpoint. The frontend's triplicate HTTP clients and duplicate auth providers were consolidated into one of each, and login/register now surface real backend error messages. `TRUST_PROXY` is no longer hardcoded, and the shared packages (`ui`, `shared-types`, `eslint-config`) went from unrealized scaffolding to genuinely adopted infrastructure across dozens of files.

Set against that: the two issues both prior audits called the #1 priority — the missing `ScheduleModule.forRoot()` (which leaves every background job dead) and the duplicated analytics-processing pipeline — are **still exactly as broken as they were on Aug 9**, eight days and two "must verify" checklists later. A new GitHub repository-import feature landed with solid authorization and input-safety fundamentals, but shipped with a hardcoded dev-only App slug that breaks the feature outside the developer's own machine, and reintroduced the second-HTTP-client problem the team had just finished fixing elsewhere. Most seriously: the test suite was restructured into a new `packages/test-code` workspace, but `.github/workflows/ci.yml` was never updated to match — `pnpm test` in CI now very likely fails outright for want of Postgres/Redis/Chrome, rather than the previous, subtler problem of silently skipping e2e coverage.

> **Read this first:** confirm whether CI is currently green. If it is, that's worth understanding _why_ before trusting it — see [Testing → CI status](#ci-status--read-this-section-fully-before-trusting-any-green-checkmark).

---

## Repository Architecture

Plain pnpm workspace (no Turbo/Nx — appropriate at this size), 3 apps + 6 packages, no orchestrator-level build cache.

| Package                                | Purpose                                 | Framework                         | Depends on             | Used by                                    |
| -------------------------------------- | --------------------------------------- | --------------------------------- | ---------------------- | ------------------------------------------ |
| `apps/api`                             | REST API, `/api/v1`                     | NestJS 11 · Prisma 7 (pg adapter) | shared-types           | web, tracker (via HTTP)                    |
| `apps/web`                             | Dashboard SPA-in-App-Router             | Next.js 15 · React 19             | shared-types, ui       | browser                                    |
| `apps/tracker`                         | Browser analytics beacon SDK            | vanilla TS, esbuild               | —                      | customer sites → api                       |
| `packages/shared-types`                | Cross-app enum/type source of truth     | hand-written TS                   | —                      | api, web (~65 files, up from 4)            |
| `packages/ui`                          | 14 shared components                    | React                             | clsx, tailwind-merge   | web (51 files, up from 1)                  |
| `packages/validation`                  | Zod schemas, 12 domain files            | Zod 4                             | shared-types           | **nobody — 0 consumers**                   |
| `packages/eslint-config`               | Shared flat ESLint config               | —                                 | —                      | api, web, tracker (fixed since 08-09)      |
| `packages/tsconfig`                    | base/node/react tsconfig bases          | —                                 | —                      | api, web (tracker still doesn't extend it) |
| `packages/test-code/{api,web,tracker}` | Relocated test suites (new since 08-13) | Jest, Vitest, Playwright          | hoisted deps from apps | root `pnpm test`                           |

**Request flow:** Browser (client components, all 34 routes) → one consolidated `apiRequest` HTTP client → NestJS `/api/v1/*` → `JwtAuthGuard` (global) → `WorkspaceAccessGuard` → `WorkspaceRolesGuard` → thin controllers → services → `PrismaService` (pg adapter) → PostgreSQL. Background work (analytics aggregation, webhook delivery, health checks, cleanup) is designed as claim-pattern + Postgres-advisory-lock `@Cron` services — architecturally sound, still completely inert (see ARCH-01).

**New since the last audit — GitHub repository import:** a full OAuth/GitHub-App flow was added: `apps/api/src/modules/repositories/*` (5 services, an 8-file static analyzer for detecting frameworks/package managers/monorepo layout from an imported repo's tree) plus `apps/web/src/features/repositories/*` (code explorer, repo dashboard) and two new routes (`github/callback`, `github/setup`). It is architecturally clean — correct workspace scoping, PKCE-protected OAuth state, HMAC-verified webhooks, bounded/sandboxed parsing of untrusted repo content — but shipped with a functional bug (BE-01) and a regression of an already-fixed frontend problem (FE-02).

---

## Prior-Audit Ledger

Every headline finding from the 08-09 and 08-13 docs, re-verified against source as of today — not assumed from the docs themselves.

### Fixed since 08-09 (confirmed)

- **Cross-tenant IDOR in the analytics dead-letter retry endpoint.** `analytics-processing-queue.service.ts:101-109` now filters by `{id, workspaceId, websiteId, status}` before mutation.
- **`AnalyticsProcessingAccessService.getCanReprocess`** — was an unimplemented stub, always 500'd the processing-status endpoint. Fully implemented, non-throwing, membership-role-scoped (`analytics-processing-access.service.ts:24-39`).
- **Three competing frontend HTTP clients, two competing auth providers.** Consolidated to one `api-client.ts` and one `AuthProvider`. (A second client was then reintroduced for a different feature — see FE-02.)
- **Login/register error messages.** Previously showed generic "Request failed with status 401" instead of the real backend message. `api-client.ts` now reads the response body; regression-tested in `login/page.test.tsx:106-118`.
- **`trust proxy` hardcoded `true`.** Now `TRUST_PROXY`-env-driven, defaults to `false` (`configure-application.ts:91-98`).
- **`WorkspaceRole`/`TaskStatus` types** independently redefined 4-5 times, with real drift on `TaskStatus`. Every frontend occurrence now re-exports from `@command-center/shared-types`; drift confirmed gone against current Prisma enums.
- **`packages/eslint-config` and `packages/ui`** had zero/near-zero consumers. eslint-config now imported by all 3 apps; ui grew from 1 component/1 file to 14 components/51 files.
- **Stray `.bak` e2e spec file.** Confirmed deleted in commit `4d5dbb4`.

### Still open — unchanged since 08-09

- `ScheduleModule.forRoot()` never registered — see ARCH-01.
- Duplicate analytics-processing pipelines both registered — see ARCH-02.
- No dedicated rate limiting on `/auth/login`/`register`/`refresh` — see SEC-01.
- `SharedRateLimitGuard` trusts caller-supplied headers for rate-limit identity — see SEC-02.
- Zero `error.tsx`/`global-error.tsx` boundaries — see FE-01.
- `RawAnalyticsEvent` missing index on `processedAt` — see DB-01.
- CI: `--no-frozen-lockfile`, no `prisma generate`, no e2e/Playwright execution — see CI-01.

### Partially improved

- `DevelopmentService` "god service" — 2034 → 1753 lines, still one file covering 4 domains, not yet split.
- Dead files — the `.bak` and a few orphans were cleaned up, but `analytics-processing.service.fixed.ts` (0 bytes), `apps/api/src/health/*`, and `app-providers.tsx` are all still present and unreferenced. See [Dead & Duplicate Code](#dead--duplicate-code).
- Frontend test coverage — file count grew 66 → 72, but the specific large dashboards flagged as near-zero on 08-13 (monitoring, releases, integrations) are still near-zero, and the new repositories/code-explorer components joined that list rather than avoiding it.

> Two items from `docs/REVIEW_NOTES.md` — "`AnalyticsProcessingRun.initiatedByUserId` has no relation" and "`RawAnalyticsEvent` is missing `countryCode`" — are themselves now stale: both fields exist correctly in the current schema. Worth updating that doc so it doesn't mislead the next reader.

---

## Critical Findings (P0)

All three are continuations or compounding of issues flagged in the first audit eight days ago — none are newly introduced, but none have been fixed either.

### ARCH-01 — Background job scheduler is never bootstrapped

**Severity:** P0 · **Confidence:** CONFIRMED

`apps/api/src/app.module.ts` imports no `ScheduleModule` (repo-wide grep for the symbol: zero matches). NestJS's `@Cron`/`@Interval` decorators are inert unless `ScheduleModule.forRoot()` is registered somewhere in the module tree.

**Impact:** analytics processing, webhook delivery, health-check monitoring, and retention cleanup — six separate services across the codebase — never fire. Any feature that assumes processed analytics data or delivered webhooks exist will show stale or empty state indefinitely, with no error to indicate why.

**Fix:** add `ScheduleModule.forRoot()` to `app.module.ts`'s imports; add a startup assertion (or log line) confirming `SchedulerRegistry` has the expected jobs after boot. This is additive registration of a standard module — low risk, the job logic itself is already implemented and unit-tested.

**Related:** `apps/api/src/app.module.ts` · `webhook-delivery-worker.service.ts:43` · `health-monitoring-scheduler.service.ts:32` · `analytics-processing-scheduler.service.ts:37`

### ARCH-02 — Two independent analytics-processing pipelines both registered

**Severity:** P0 · **Confidence:** CONFIRMED

`app.module.ts` imports both `AnalyticsEngineModule` and `AnalyticsProcessingModule`. The legacy pipeline (`analytics-engine`) self-starts via `onModuleInit()` + `setInterval`, gated by `ANALYTICS_PROCESSING_SCHEDULER_ENABLED` (unset in `.env.example` → off by default). The newer queue/worker/dead-letter pipeline (`analytics-processing`) uses `@Cron(EVERY_MINUTE)`, gated by `ANALYTICS_SCHEDULER_ENABLED=true` (set by default) — but is fully inert today because of ARCH-01.

**Impact:** today, in practice, neither pipeline processes events unless an operator manually flips the legacy env var — which would then make the legacy pipeline the sole active one, the opposite of the apparent intended direction. Naively fixing ARCH-01 without also resolving this would turn on both pipelines simultaneously, double-processing the same `RawAnalyticsEvent` rows.

**Fix:** decide which pipeline is canonical (the queue/worker/dead-letter design has access control, status tracking, and the fixed IDOR — it looks like the intended replacement), then remove the losing scheduler's provider registration entirely rather than leaving it disabled-by-env-var.

**Related:** `apps/api/src/app.module.ts` · `modules/analytics-engine/services/analytics-processing-scheduler.service.ts` · `modules/analytics-processing/services/analytics-processing-scheduler.service.ts`

### CI-01 — CI is very likely failing outright right now

**Severity:** P0 · **Confidence:** CONFIRMED

`.github/workflows/ci.yml` was last touched Aug 3 and still runs `pnpm install --no-frozen-lockfile`, no `prisma generate` step, and a bare `pnpm test`. But the test suite was restructured after Aug 13 into `packages/test-code/{api,web,tracker}`, and root `pnpm test` now runs `test:all` → the full 46-suite API E2E regression (needs `TEST_DATABASE_URL`/`TEST_REDIS_URL`, enforced by an explicit startup check) _and_ the full Playwright suite (needs a real installed Chrome — `channel: 'chrome'`, no Playwright browser-install step exists anywhere).

**Impact:** CI provisions none of this — no Postgres/Redis service container, no `prisma generate`, no browser install. What used to be a coverage gap (e2e tests silently never ran) is now very likely an outright pipeline failure on every PR and push to main, which is a stronger merge-blocker than before but also means CI currently gives no usable signal at all until someone confirms and fixes this.

**Fix:** add a Postgres + Redis service block, add a `prisma generate` (or `migrate deploy`) step before typecheck/test/build, switch to `--frozen-lockfile`, install Chrome for the Playwright job, and split unit vs. e2e vs. Playwright into separate CI jobs so a slow full-stack suite doesn't block fast feedback on every PR.

**Related:** `.github/workflows/ci.yml` · `packages/test-code/api/package.json:9` · `packages/test-code/web/package.json:8` · `packages/test-code/api/setup-env.ts:15,46`

---

## High Priority Findings (P1)

### SEC-01 — No dedicated rate limiting on login, register, or refresh

**Confidence:** CONFIRMED

Only the generous global `ThrottlerModule` tier (100 req/min/IP) applies — zero `@Throttle()` overrides exist on any of the three most sensitive public endpoints in the app.

**Fix:** add a stricter `@Throttle({ default: { limit: 5, ttl: 60_000 } })` (tune to product needs) on `register`/`login`/`refresh`.

**File:** `apps/api/src/modules/auth/controllers/auth.controller.ts:43,67,91`

### FE-01 — Zero error boundaries across all 34 routes

**Confidence:** CONFIRMED

No `error.tsx` or `global-error.tsx` exists anywhere in `apps/web/src/app` — confirmed by exhaustive search, unchanged since 08-13 despite 3 new routes being added since (the GitHub callback/setup pages, repositories list). Every unhandled render exception falls through to Next's default, unbranded error screen instead of the app's own `PageError` component.

**Fix:** add a root `app/global-error.tsx` and route-group-level `error.tsx` for `(dashboard)`/`(auth)`, reusing the existing `PageError` component.

### FE-02 — New repositories feature reintroduced a second, weaker HTTP client

**Confidence:** CONFIRMED

`features/repositories/repositories-api.ts:11-59` defines its own `repositoryRequest()` fetch wrapper — sharing the token store with `api-client.ts`, but with **no 401 → refresh → retry logic**, unlike the consolidated client every other feature uses. Every call in the repositories/code-explorer feature (list, connect, sync, link/unlink, branches, tree, file, search, diff) goes through it. No test exercises a 401 response.

**Impact:** this is precisely the "competing HTTP clients" problem the first audit flagged as its top Critical finding, freshly reintroduced in new code four days after the team finished consolidating everywhere else. Users browsing repository code around the access-token's natural expiry will see spurious auth failures while still validly authenticated.

**Fix:** delete `repositoryRequest`, route these calls through the shared `apiRequest`.

**File:** `apps/web/src/features/repositories/repositories-api.ts:11-59` · `code-explorer-api.ts`

### BE-01 — GitHub App installation URL is hardcoded to a dev-only slug

**Confidence:** CONFIRMED — flagged independently by two agents

`github-app.service.ts:92-97`: the config-driven read is commented out and replaced with a literal:

```ts
// const slug = this.required('GITHUB_APP_SLUG');
const slug = 'saas-command-center-dev';
```

**Impact:** every "Connect GitHub"/"Import from GitHub" entry point sends users to `github.com/apps/saas-command-center-dev/installations/new` regardless of environment. Outside the developer's own machine, this either 404s or installs the wrong GitHub App — the entire repository-import feature is non-functional in any shared or production environment as shipped.

**Fix:** restore `this.required('GITHUB_APP_SLUG')`; add the variable to `.env.example` and env validation.

**File:** `apps/api/src/modules/repositories/services/github-app.service.ts:92-97`

### CI-02 — No deployment configuration exists for any target

**Severity:** P1 (dormant) · **Confidence:** HIGH CONFIDENCE

No `vercel.json`, no `render.yaml`, no `Dockerfile` anywhere in the repo. If this repo is connected to Vercel with Root Directory = `apps/web` and default install/build commands (the natural first thing an operator would try), the build would fail: `apps/web` depends on `@command-center/shared-types`'s built `dist/` output, which is only produced by the root `pnpm build:packages` script — not invoked by `apps/web`'s own `next build`, and not checked into git.

**Fix:** add a `vercel.json` (or platform-equivalent) that runs the install/build from the monorepo root, or add an explicit `prebuild` step in `apps/web/package.json` that builds its workspace dependencies first.

### FE-03 — Frontend test coverage remains far below target on the components that matter most

**Confidence:** CONFIRMED

As measured 08-13: statements/branches/functions/lines all ~41-42%, against a ≥90%/85% target. Re-checked now: test-file count grew 66 → 72, but the specific large stateful dashboards already called out — `monitoring-dashboard.tsx` (950 lines), `release-deployment-dashboard.tsx` (884 lines), `webhook-integrations-dashboard.tsx` (761 lines) — still have **zero** test files, and the new `repositories-dashboard.tsx`/`code-explorer.tsx` joined that list rather than avoiding it. New test investment since 08-13 went into API-layer/leaf-component files, not into closing the flagged gap.

**Fix:** treat this as its own project phase (per the 08-13 doc's own conclusion) — start with the 0%-coverage large dashboards, since they're the highest point-value targets.

---

## Backend Findings

Module boundaries remain clean (zero `forwardRef` anywhere in the codebase), controllers are consistently thin, and the new repositories module inherited the same workspace-scoped-lookup discipline as the rest of the app. The gaps below are the residue.

- **BE-02 [P2, CONFIRMED] No centralized Prisma error translation.** `all-exceptions.filter.ts` still has no `Prisma.PrismaClientKnownRequestError` branch. `P2002` (unique constraint) is now hand-duplicated in ~10 service files (the new `repository-import.service.ts:218-224` added a 10th), and `P2025` (not found) isn't translated anywhere.
- **BE-03 [P3, CONFIRMED] Two competing exception filters, one dead.** `AllExceptionsFilter` is registered; `common/filters/http-exception.filter.ts`'s `GlobalExceptionFilter` is unreferenced dead code that happens to match the `code`/`details` shape implied by `packages/shared-types` — meaning that contract is currently fictional.
- **BE-04 [P3, CONFIRMED] `DevelopmentService` remains oversized.** 1753 lines (down from 2034) covering templates, milestones, tasks, and blockers in one file. Not yet split.

### New: repositories / GitHub-import module

The highest-risk area to get wrong on a first pass — OAuth, webhook signatures, untrusted repo content — was done carefully. No SSRF (all outbound calls target hardcoded GitHub hosts), no prototype pollution, bounded/sandboxed parsing of untrusted `package.json`/workspace-manifest content, and webhook signatures verified with `timingSafeEqual`. The issues below are real but narrower.

- **BE-05 [P3, CONFIRMED] Zero test coverage for the entire repositories module.** No unit or e2e spec references `repositories`, `github-app`, or anything under `modules/repositories/`.
- **BE-06 [P3, CONFIRMED] OAuth connect-intent rows are never cleaned up.** No cleanup job touches `PersonalGithubConnectIntent`/`RepositoryConnectIntent`. A user's PKCE verifier is only cleared on a successful callback — an abandoned flow leaves it stored indefinitely. Low exploitability but real data-retention debt.
- **BE-07 [P4, CONFIRMED] `normalizeEmail()` reimplemented independently twice.** Down from 3-4 at the last audit, but the (still entirely unused) `packages/validation` package was built for exactly this. `workspace-invitation.service.ts:720` · `users.service.ts:155`

---

## Frontend Findings

The consolidation work since 08-09 is real: one HTTP client, one auth provider, real backend error messages on login. The all-client-components architecture (every one of 34 routes is `'use client'`) remains a deliberate, unchanged design choice — flagged here as a characteristic, not re-litigated as a bug.

- **FE-04 [P2, CONFIRMED] Dead abort-controller cleanup, now found in 4 dashboards (was 1).** An `AbortController` is created inside an `async useCallback`, and its `return () => controller.abort()` becomes the resolved value of that async function — not a `useEffect` cleanup. In-flight requests are never actually cancelled. Found in `monitoring-dashboard.tsx:476-509`, `release-deployment-dashboard.tsx:410-456`, `webhook-integrations-dashboard.tsx:313-333`, and `workspace-invitations-panel.tsx:37-55`. The correct pattern already exists elsewhere (`analytics-reports-dashboard.tsx:541-568`) — it just wasn't applied consistently. **Fix:** move `AbortController` creation directly inside the `useEffect` body.
- **FE-05 [P2, HIGH CONFIDENCE] Unvalidated full-page redirect to a backend-supplied URL.** `github-setup-client.tsx:56-58` — `window.location.replace(result.authorizationUrl)` fires automatically on page load with no scheme/host allowlist check. **Fix:** assert `authorizationUrl.startsWith('https://github.com/')` before navigating.
- **FE-06 [P2, HIGH CONFIDENCE] Code explorer has no stale-response/unmount guards.** All five async handlers in `code-explorer.tsx` (`initialize`, `openFile`, `changeBranch`, `performSearch`, `compareActiveFile`) call `setState` after `await` with no cancellation check — unlike its sibling `repositories-dashboard.tsx`, which guards correctly with an `active` flag. **Fix:** add the same guard pattern.
- **FE-07 [P3, CONFIRMED] Wrong `ApiError` import from a private Next.js internal path.** `monitoring-dashboard.tsx:28` and `analytics-processing-panel.tsx:8` both import from `next/dist/server/api-utils` instead of the app's real `api-error.ts`. `instanceof` checks are always `false`, silently dropping `requestId` from error displays.
- **FE-08 [P3, CONFIRMED] Polling has no tab-visibility gating.** `notification-bell.tsx`, `monitoring-dashboard.tsx` (30s), `use-analytics-processing.ts` (5s while active) keep polling in hidden/background tabs.
- **FE-09 [Not a bug, CONFIRMED] OAuth `state` handling, checked and cleared.** `github-callback-client.tsx` forwards `code`/`state` to the backend verbatim with no client-side comparison — correct for GitHub App OAuth. No open-redirect or CSRF gap found.

---

## Frontend ↔ Backend Integration Findings

No shape mismatches were found between what the frontend expects and what the backend returns for any flow traced this pass (auth, workspaces, repositories, analytics). The integration risk in this codebase isn't contract drift — it's the duplicated-client problem: two different frontend clients (FE-02) now implement two different error/retry contracts against the same backend, which is a more subtle integration bug than a field-name mismatch would be, because it only surfaces at the token-expiry boundary.

The `code`/`details` error-response shape implied by `packages/shared-types` is not actually what the backend emits (see BE-03) — anything written against that assumed contract would be wrong today.

---

## Database Findings

16 model files, well-normalized, deliberate cascade/restrict/set-null choices verified relation-by-relation. The new repositories schema (2 tables + 1 migration, added for GitHub import) is clean: correctly workspace-scoped, correctly indexed, correct `onDelete` behavior, and its compound-unique constraints genuinely prevent duplicate repo imports.

- **DB-01 [P2 → P1 once ARCH-01 ships, CONFIRMED] `RawAnalyticsEvent` has no index on `processedAt`.** The highest-write-volume table has 7 indexes, none including `processedAt` — the exact filter both schedulers use to find pending events. **Fix:** add `@@index([websiteId, processedAt, occurredAt])`. `apps/api/prisma/models/analytics-ingestion.prisma:33-40`
- **DB-02 [P2, CONFIRMED] Unbounded in-memory pagination on high-cardinality analytics reports.** `analytics-reports.service.ts:742-751`'s `loadDimensionReport` loads the full result set into Node memory, then paginates with `.slice()` in JS.
- **DB-03 [P2, CONFIRMED] `Workspace.ownerId` ↔ OWNER membership row isn't enforced by the schema, and service code actively depends on it.** Every current write path keeps the invariant correctly in sync inside a single transaction, but `workspace-members.service.ts:160-166,199-201` reads only `workspace.ownerId` to block demoting/removing the owner — nothing checks whether an OWNER membership row actually exists. **Fix:** a DB-level CHECK/trigger, or an integration test asserting the invariant.
- **DB-04 [P3, CONFIRMED] Soft-delete convention now has five different shapes.** `deletedAt`, `archivedAt`, hard-delete, `enabled`, and the new `RepositoryConnection.isAvailable`/`archived` pair.
- **DB-05 [P3, CONFIRMED] `ApplicationBlocker`'s application/milestone/task consistency isn't schema-enforced.** Mitigated correctly in `development.service.ts:1147-1214`'s `createBlocker`; not exploitable today, only fragile against a future direct-write path.

**Checked and found clean:** multi-tenant isolation swept across `repositories`, `applications`, `websites`, `development`, `releases`, `team-operations`, `webhooks`, and `monitoring` services — every bare `id`-only lookup found is preceded by a workspace-validated fetch earlier in the same call chain; no new cross-tenant IDOR was found anywhere in this pass. 54 `Cascade` relations remain deliberate and correct, including on the new repositories tables.

---

## Authentication & Authorization Findings

This remains the strongest layer of the codebase, and the pass found nothing to weaken that assessment.

- **Password hashing:** argon2id, confirmed unchanged. Still relies on library-default cost parameters rather than explicit tuning (P4, hardening opportunity, not a live weakness).
- **Refresh-token rotation:** tokens stored only as SHA-256 hashes, atomic rotation with reuse-detection that revokes the entire session family on mismatch — confirmed unchanged and correct.
- **Cookies:** `httpOnly` hardcoded true, `secure`/`sameSite` validated at startup, production forces `COOKIE_SECURE=true`.
- **Workspace membership guards:** `WorkspaceAccessGuard` + `WorkspaceRolesGuard` applied consistently across every workspace-scoped controller checked, including the new repositories module.
- **Gaps:** SEC-01 (no auth-endpoint rate limiting) and SEC-02 (rate-limit identity bypass) below — both unchanged since 08-09.

---

## Security Findings

- **SEC-02 [P2, CONFIRMED] Rate-limit identity trusts caller-supplied headers.** `shared-rate-limit.guard.ts:7-21` buckets by `X-Tracking-Key`/`X-Api-Key` before falling back to IP, with no verification the header corresponds to anything real. Any authenticated caller can rotate the header per request to reset their own bucket on webhook-creation, secret-rotation, and invitation-resend endpoints. Impact is bounded — every affected route still requires valid auth + workspace role first.
- **SEC-03 [P3, CONFIRMED] Weak hardcoded fallback for an analytics salt.** `analytics-ingestion.service.ts:57` falls back to `'local-development-change-this'` if `ANALYTICS_IP_HASH_SALT` is unset.

**Checked and confirmed clean:**

- **CORS:** exact-match origin allowlist via a `Set`, no wildcard/regex, validated at startup. The one carve-out (public `/collect` tracker endpoint) is deliberate and documented in code.
- **Secrets:** full repo-wide scan for API-key-shaped strings, PEM headers, and common secret patterns — zero real credentials found in tracked files. All `.env.example` templates use obvious placeholders.
- **GitHub App credentials:** private key never logged, webhook HMAC comparison uses `timingSafeEqual` with a length guard, OAuth access tokens are never persisted at all (by explicit design).
- **Tracker XSS surface:** tracked URLs/properties are attacker-influenced by design, but both client and server independently sanitize, and no path renders tracked data as raw HTML anywhere in the dashboard.

---

## Monorepo Findings

This is the layer with the most visible progress since 08-09 — and one new regression.

- **PKG-01 [P2, CONFIRMED] `packages/validation` grew into a real 12-file Zod library — and still has zero consumers.** What was "3 pure functions" at the last audit is now a full schema library (`common`, `auth`, `workspaces`, `applications`, `websites`, `team-operations`, `webhooks`, `development`, `analytics`, `tracking`, `monitoring`, `releases`) with real dependencies on Zod 4 and `shared-types`. It is imported by neither app and declared in neither `package.json`. **Fix:** a decision, not a code change — either wire it into DTO/form validation where intended, or delete it.
- **PKG-02 [P2, CONFIRMED] `apps/tracker`'s tsconfig has no `extends` — and now has real drift, not just duplication.** The base sets `noUncheckedIndexedAccess`, `forceConsistentCasingInFileNames`, `esModuleInterop`, `resolveJsonModule`, and `isolatedModules` — none of which are present in `apps/tracker/tsconfig.json`. `noUncheckedIndexedAccess` in particular is a real strictness reduction for a file that does a lot of array/object indexing on untrusted page data. **Fix:** add `"extends": "../../packages/tsconfig/base.json"` and reconcile resulting type errors.

**Fixed since 08-09:**

- `packages/eslint-config`: 0 → 3 consumers (all three apps).
- `packages/shared-types`: ~4 files/2 exports → ~65 files, with the previously-drifted `TaskStatus` enum now confirmed matching Prisma exactly.
- `packages/ui`: 1 component/1 file → 14 components/51 files.
- `WorkspaceRole` type: previously redefined 4-5 times independently → single source of truth.

---

## Performance Findings

No new hotspots were found this pass; the ones already documented remain unchanged.

- **Backend:** `Promise.all` used correctly for independent parallel reads throughout. The one real hotspot, `RawEventProcessingService.process()`, still does up to 6 sequential DB round-trips per raw event inside a `Serializable` transaction — currently moot since the scheduler feeding it is dead (ARCH-01), but will matter the moment it's turned back on.
- **Database:** see DB-01 (missing index) and DB-02 (unbounded in-memory pagination). `release-deployment.service.ts`'s per-environment lookup is N+1-shaped but parallelized and bounded — low practical impact.
- **GitHub API calls (new):** `PersonalRepositoriesService.list` loops over installations sequentially, parallelizing only the 2 calls within each installation rather than across all of them. Minor.
- **Frontend:** all 34 routes are client components with no code-splitting (`next/dynamic` used nowhere), so large dashboard panels bundle eagerly even for rarely-shown sub-panels. A deliberate design choice, unchanged since 08-09.

---

## Testing Findings

### CI status — read this section fully before trusting any green checkmark

See CI-01. The test-runner shape changed underneath `.github/workflows/ci.yml` without the workflow being updated: what used to be "CI silently only runs unit tests" is now "CI's single `pnpm test` step transitively requires a live Postgres, a live Redis, and an installed Chrome browser it never provisions." Confirm current CI status directly before relying on it for anything.

### E2E slowness — root cause found

Investigated why individual API E2E suites take tens of seconds and a full run takes many minutes. Root cause: **40 of 46** `.e2e-spec.ts` files call `createTestApp()` inside `beforeEach` rather than `beforeAll` — a full compile of ~20 NestJS modules, a fresh Postgres connection pool, a fresh Redis client, plus a full `TRUNCATE ... CASCADE` reset, **per individual test case**, not per file. Over half of all 542 test cases (315) live in these 40 files. Combined with `maxWorkers: 1` and an explicit `--runInBand` flag (zero cross-file parallelism), this fully explains the symptom — it's architectural, not a slow query or a slow individual test.

**Fix:** convert the 40 files to the `beforeAll`-boot pattern already proven correct in the other 9, paired with either transactional rollback per test or a cheaper reset than full-table truncate; consider raising `maxWorkers` for self-contained files.

### Positive findings

- Test-database safety is well-guarded: two independent checks refuse to run against a database whose name doesn't contain `"test"`, and a matching check forces a non-zero Redis DB index.
- Backend unit (96 tests) and API e2e (543 tests) both reportedly pass when run standalone/manually — this is a real, substantial suite; the problem is CI's ability to execute it, not the suite's quality.

### Still open

- `apps/web/vitest.config.mts` still has no `testTimeout`/`pool` tuning, despite the 08-13 doc identifying the default 5000ms timeout plus coverage-instrumentation overhead as the cause of flaky local coverage runs.
- `apps/web/e2e/full-stack/global-setup.ts` still creates real users/workspaces/data per run with no `globalTeardown` — unbounded row growth in the dedicated full-stack e2e database.
- No tests exist yet for the new `repositories` backend module or the new GitHub OAuth/code-explorer frontend components (see BE-05, FE-03).

---

## Deployment Findings

No deployment has apparently been configured yet for any target. See CI-02 for the concrete monorepo build-order risk this creates the moment a Vercel-style deploy is attempted.

- No `vercel.json`, `render.yaml`, or `Dockerfile` anywhere in the repo — `infrastructure/docker-compose.yml` defines a local-dev Postgres container only, no app containers.
- Node/pnpm version pins are consistent everywhere they're specified (root `package.json` engines, CI's `setup-node`/`pnpm/action-setup`) — there's just nowhere else to check yet, since no deployment target config exists.
- **Minor DX nit:** `apps/api/.env.example` documents `DATABASE_URL` port `5433`, but `infrastructure/docker-compose.yml` exposes Postgres on `55432` — a fresh clone following the example verbatim won't connect without manual correction.

---

## Code Quality Findings

- **God service:** `DevelopmentService`, 1753 lines / 4 domains (BE-04). No other file in the codebase approaches this size — the largest file in the new repositories module is 550 lines, appropriately sized.
- **Style drift:** repositories controllers mix two equivalent-but-independently-defined `AuthenticatedRequest` interface shapes rather than sharing one.
- **Defense-in-depth pattern, repeated:** both `applications.service.ts`/`websites.service.ts` (08-09 finding) and the new `repositories.service.ts:251-275`'s `linkApplication`/`unlinkApplication` validate ownership via one call, then mutate via a second call keyed only on `id`. Safe today, but the same "one refactor away from a real gap" shape now exists in two places instead of one.
- No overengineering was found — no abstraction layers add complexity without earning it; the codebase's problems are consistently under-finished migrations, not over-built ones.

---

## Dead & Duplicate Code

### Definitely unused — confirmed zero references

| File                                                              | Evidence                                                                    |
| ----------------------------------------------------------------- | --------------------------------------------------------------------------- |
| `analytics-engine/services/analytics-processing.service.fixed.ts` | 0 bytes, zero imports anywhere                                              |
| `apps/api/src/health/*` (4 files)                                 | Orphaned duplicate — `app.module.ts` only wires the real `modules/health/*` |
| `analytics-engine/controllers/analytics-ingestion.controller.ts`  | Not in `AnalyticsEngineModule`'s `controllers` array                        |
| `apps/web/src/providers/app-providers.tsx`                        | Zero references anywhere                                                    |
| `common/filters/http-exception.filter.ts`                         | Unreferenced outside itself (see BE-03)                                     |
| `apps/tracker/src/index.ts`                                       | Build entry point is `tracker.ts` directly; unbuilt leftover stub           |
| `activity-feed.tsx.backup-20260810-054631` / `…-054800`           | Two stale pre-migration snapshots, zero references                          |
| `pnpm-workspace.yaml.backup` (repo root)                          | Predates the `test-code` workspace-glob addition, zero references           |

### Likely unused — new since this pass

14 duplicate `.spec.ts` files remain scattered under `apps/api/src/**` (e.g. `health/health.controller.spec.ts`, `bootstrap/startup-checks.spec.ts`) — near-identical copies (diff shows only import-path changes) of files that now live in `packages/test-code/api/unit/`. The old `apps/api/jest.config.cjs` that would run them is itself orphaned; the live config only matches `packages/test-code/api/unit/**`. These 14 files compile fine but never execute — left behind by the test-suite relocation.

### Checked and found NOT dead (false positive from filename pattern-matching)

`packages/test-code/api/helpers/analytics-engine-old.ts` — despite the name, actively imported by 4 live e2e spec files.

---

## Dependency Findings

- **No version conflicts:** a full cross-check of every `dependencies`/`devDependencies`/`peerDependencies` entry across all 12 `package.json` files found zero same-package/different-version conflicts.
- **Redundant direct deps in `apps/web`:** `clsx` and `tailwind-merge` are declared directly but never imported directly in `apps/web/src` — both are used only inside `packages/ui`'s `cn()` utility, which already declares them itself. (`lucide-react`, by contrast, genuinely is imported directly in 52 files in addition to being used inside `packages/ui` — both declarations there are warranted.)
- **Test packages declare zero explicit dependencies:** all three `packages/test-code/{api,web,tracker}` manifests rely entirely on `nodeLinker: hoisted` to resolve Jest/Playwright/Vitest/`pg`/`supertest` from the apps' own manifests. Works today, but the coupling is invisible in the test packages' own files.
- **Two validation paradigms, currently latent:** `apps/api` uses `class-validator` for all live DTO validation; the unused `packages/validation` is built on Zod. Not live duplication today since nothing consumes the Zod package (PKG-01).

---

## Configuration Findings

| Variable                                                                 | Used by                          | Required             | Risk if misconfigured                                                                                         |
| ------------------------------------------------------------------------ | -------------------------------- | -------------------- | ------------------------------------------------------------------------------------------------------------- |
| `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET`                               | api                              | Yes (prod)           | Validated ≥32 chars, rejects placeholder patterns — low risk                                                  |
| `TRUST_PROXY`                                                            | api                              | No, defaults `false` | Operator must set correctly (numeric hop count) for the real proxy topology — undocumented beyond the default |
| `CORS_ORIGINS`                                                           | api                              | Yes                  | Strict exact-match, validated at startup — low risk                                                           |
| `ANALYTICS_SCHEDULER_ENABLED` / `ANALYTICS_PROCESSING_SCHEDULER_ENABLED` | api                              | No                   | Both moot until ARCH-01 ships; misconfiguration risk becomes real double-processing at that point (ARCH-02)   |
| `GITHUB_APP_SLUG`                                                        | api (intended, currently unused) | —                    | Not read at all right now — see BE-01                                                                         |
| `ANALYTICS_IP_HASH_SALT`                                                 | api                              | No, weak fallback    | See SEC-03                                                                                                    |
| `TEST_DATABASE_URL` / `TEST_REDIS_URL`                                   | packages/test-code/api           | Yes for e2e          | Double-guarded against pointing at a non-test database — low risk                                             |

No secret values are reproduced above or elsewhere in this report. The one committed inconsistency found: `apps/api/.env.example`'s documented `DATABASE_URL` port (5433) doesn't match `infrastructure/docker-compose.yml`'s exposed port (55432).

---

## Observability Findings

Request-ID generation/propagation middleware exists and is test-covered. Structured exception handling exists via `AllExceptionsFilter`, though without Prisma-specific error translation (BE-02). No metrics/dashboards or audit-trail layer was found beyond what's described above — reasonable for the project's current stage, but worth flagging that, combined with the dead background-job layer (ARCH-01), there is currently no signal that would tell an operator analytics processing or webhook delivery has silently stopped working; the only current source of truth is reading the database directly.

---

## Top 20 Bugs / Risks

| Rank | ID      | Sev | Area       | Problem                                                                        | Confidence           |
| ---- | ------- | --- | ---------- | ------------------------------------------------------------------------------ | -------------------- |
| 1    | ARCH-01 | P0  | Backend    | Scheduler never bootstrapped — all background jobs dead                        | CONFIRMED            |
| 2    | ARCH-02 | P0  | Backend    | Two analytics pipelines both registered, would double-process if naively fixed | CONFIRMED            |
| 3    | CI-01   | P0  | CI/Testing | CI likely fails outright — test suite needs infra CI doesn't provision         | CONFIRMED            |
| 4    | SEC-01  | P1  | Security   | No rate limiting on login/register/refresh                                     | CONFIRMED            |
| 5    | FE-01   | P1  | Frontend   | Zero error boundaries across 34 routes                                         | CONFIRMED            |
| 6    | FE-02   | P1  | Frontend   | Second HTTP client reintroduced, no 401-retry logic                            | CONFIRMED            |
| 7    | BE-01   | P1  | Backend    | GitHub App slug hardcoded to dev value — breaks feature outside dev            | CONFIRMED (2 agents) |
| 8    | CI-02   | P1  | Deployment | No deployment config; default Vercel path would break the build                | HIGH CONFIDENCE      |
| 9    | FE-03   | P1  | Frontend   | Test coverage ~41%, large dashboards still ~0%                                 | CONFIRMED            |
| 10   | SEC-02  | P2  | Security   | Rate-limit identity trusts caller-supplied headers                             | CONFIRMED            |
| 11   | DB-01   | P2  | Database   | Missing index on the scheduler's primary filter column                         | CONFIRMED            |
| 12   | FE-04   | P2  | Frontend   | Dead abort-cleanup pattern, now in 4 dashboards                                | CONFIRMED            |
| 13   | DB-02   | P2  | Database   | Unbounded in-memory pagination on analytics reports                            | CONFIRMED            |
| 14   | PKG-01  | P2  | Monorepo   | 12-file validation library with zero consumers                                 | CONFIRMED            |
| 15   | BE-02   | P2  | Backend    | No centralized Prisma error translation, 10 duplicated instances               | CONFIRMED            |
| 16   | DB-03   | P2  | Database   | Owner/membership invariant unenforced, actively relied upon                    | CONFIRMED            |
| 17   | CI-03   | P2  | Testing    | Per-test app boot makes e2e suite architecturally slow                         | CONFIRMED            |
| 18   | CI-04   | P2  | Testing    | Full-stack Playwright has no DB teardown between runs                          | CONFIRMED            |
| 19   | FE-06   | P2  | Frontend   | Code explorer has no stale-response/unmount guards                             | HIGH CONFIDENCE      |
| 20   | PKG-02  | P2  | Monorepo   | Tracker tsconfig drift — 5 strictness flags silently missing                   | CONFIRMED            |

---

## Recommended Improvements

### Immediate — before anything else ships

- Confirm current CI status and fix the Postgres/Redis/Chrome/`prisma generate`/`--frozen-lockfile` gaps (CI-01) — nothing else matters if CI can't verify it.
- Register `ScheduleModule.forRoot()` _and_ resolve which analytics pipeline is canonical in the same change (ARCH-01 + ARCH-02) — fixing one without the other creates a worse bug than either alone.
- Restore the `GITHUB_APP_SLUG` env read (BE-01) — the repository-import feature is non-functional outside the developer's machine as shipped.
- Delete `repositoryRequest` and route the repositories feature through the shared `apiRequest` (FE-02).

### Short term

- Add auth-endpoint rate limiting and fix the header-trust rate-limit bypass (SEC-01, SEC-02).
- Add `error.tsx`/`global-error.tsx` boundaries (FE-01).
- Add the missing `processedAt` index (DB-01) before ARCH-01 ships, not after.
- Fix the abort-cleanup pattern in all 4 affected dashboards at once (FE-04) — it's one bug shape, fix it as one PR.
- Add a `vercel.json` (or equivalent) before the first real deployment attempt (CI-02).

### Medium term

- Close the frontend coverage gap on the large dashboards, treated as its own phase (FE-03).
- Convert the 40 `beforeEach`-boot e2e files to `beforeAll` (CI-03).
- Split `DevelopmentService` (BE-04); centralize Prisma error translation (BE-02).
- Decide the fate of `packages/validation` — adopt or delete (PKG-01).
- Fix the tracker tsconfig drift and reconcile any resulting type errors (PKG-02).

### Optional

- Add a DB-level CHECK/trigger for the owner/membership invariant (DB-03).
- Add tab-visibility gating to the three polling call sites (FE-08).
- Add a scheduled cleanup job for expired OAuth connect-intents once ARCH-01 exists (BE-06).
- Delete the 8 confirmed-dead files and the 14 orphaned duplicate spec files (see Cleanup Candidates).
- Explicit argon2id cost tuning instead of library defaults.

---

## Technical Debt Matrix

| Area                        | Current Problem                                      |             Risk |        Difficulty | Priority |
| --------------------------- | ---------------------------------------------------- | ---------------: | ----------------: | -------: |
| Background jobs             | Scheduler dormant, dual pipelines registered         |             High |               Low |       P0 |
| CI pipeline                 | Untouched since test-suite relocation; likely broken |             High |               Low |       P0 |
| Repositories module         | Hardcoded dev slug, zero tests, second HTTP client   |             High |           Low–Med |       P1 |
| Frontend error handling     | No error boundaries anywhere                         |           Medium |               Low |       P1 |
| Frontend test coverage      | Large dashboards near-zero coverage                  |           Medium |              High |       P1 |
| Deployment                  | No config for any target; build-order gap            | Medium (dormant) |               Low |       P1 |
| Auth endpoint hardening     | No dedicated throttling                              |           Medium |               Low |       P2 |
| Analytics query performance | Missing index, unbounded in-memory pagination        |           Medium |               Low |       P2 |
| E2E suite architecture      | Per-test app boot, no parallelism                    |    Low (DX only) |            Medium |       P2 |
| Shared validation package   | 12-file library, zero adoption                       |              Low | Medium (decision) |       P2 |
| Development service size    | 1753-line god service                                |              Low |            Medium |       P3 |
| Dead/orphaned files         | 8 confirmed-dead + 14 orphaned specs                 |              Low |               Low |       P3 |

---

## Testing Gap Matrix

| Feature                                               | Existing Coverage                         | Missing Coverage                                                                               | Risk                                               |
| ----------------------------------------------------- | ----------------------------------------- | ---------------------------------------------------------------------------------------------- | -------------------------------------------------- |
| Auth (login/register/refresh)                         | Strong — unit + e2e + frontend tests      | Auth-endpoint rate-limit behavior itself                                                       | Low                                                |
| Analytics processing pipeline                         | Good unit/e2e coverage of the logic       | No test asserts the scheduler actually fires (can't, until ARCH-01)                            | High — the untested path is exactly the dead one   |
| Repositories / GitHub import (backend)                | None                                      | OAuth/PKCE flow, webhook HMAC verification, analyzer edge cases                                | Medium-High — newest, least-verified surface       |
| Repositories / code explorer (frontend)               | Leaf components only (tree, diff, viewer) | Orchestrating components: repositories-dashboard, code-explorer, github-callback/setup clients | Medium — race conditions in FE-06 are exactly here |
| Large dashboards (monitoring, releases, integrations) | Small sub-component tests only            | The dashboards themselves — 700-950 line files at ~0%                                          | Medium                                             |
| Redis reconnect / advisory-lock contention            | None                                      | Simulated connection drop, concurrent lock acquisition, release-on-error                       | Medium                                             |
| Webhook retry/backoff/dead-letter                     | Partial                                   | Full retry-count and backoff-timing assertions                                                 | Medium                                             |
| Tracker real-browser edge cases                       | Core flows covered (5 real-Chrome tests)  | Offline-network retry, real DNT enforcement, real consent UI, multi-session/timeout            | Low — already flagged as known/optional            |

---

## Architecture Improvement Plan

**1. Background processing**

- Current state: fully designed (claim-pattern + Postgres advisory locks, dead-letter handling, status tracking) but never bootstrapped, and exists twice.
- Recommended state: one registered scheduler, the queue/worker/dead-letter pipeline as canonical, legacy pipeline's provider registration removed entirely (not just disabled).
- Benefit: restores the entire background-processing layer with zero new logic needed.
- Migration difficulty: Low for registration; Medium for confidently retiring the legacy pipeline.

**2. Frontend HTTP client**

- Current state: two implementations exist again (the consolidated one, plus the new repositories-only one).
- Recommended state: one client, used everywhere, with a lint rule or code-review checklist item that catches a new fetch wrapper being introduced.
- Benefit: prevents this exact regression from recurring a third time.
- Migration difficulty: Low for the code; the harder part is process.

**3. CI ↔ test-suite alignment**

- Current state: CI configuration and the test-suite's actual shape have drifted apart.
- Recommended state: CI provisions exactly what `pnpm test` needs (Postgres, Redis, Chrome), split into fast (unit) and slow (e2e/Playwright) jobs.
- Benefit: CI becomes trustworthy again.
- Migration difficulty: Low — CI configuration, not new test-writing.

---

## Performance Improvement Plan

**High impact / Low effort:** add the `processedAt` index on `RawAnalyticsEvent` (DB-01) before turning the scheduler back on.

**High impact / Medium effort:** convert the 40 `beforeEach`-boot e2e files to `beforeAll` (CI-03) — the single highest-leverage change for developer feedback-loop speed.

**Medium impact / Low effort:** SQL-side-paginate `loadDimensionReport` (DB-02); batch the sequential per-raw-event processing once the scheduler is live.

**Low priority:** parallelize the per-installation GitHub API loop in `PersonalRepositoriesService.list`; code-split large dashboard panels with `next/dynamic` once the client/server-component strategy decision is made.

---

## Security Remediation Plan

| Finding | Severity | Attack Scenario                                                                                                          | Fix                                                                                   |
| ------- | -------- | ------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------- |
| SEC-01  | P1       | Credential-stuffing / brute-force against login with only a shared 100/min/IP budget                                     | Add `@Throttle` override on login/register/refresh                                    |
| SEC-02  | P2       | Authenticated caller rotates `X-Tracking-Key` per request to bypass webhook/invitation rate limits                       | Key the throttle on authenticated `userId`/`workspaceId`, not client-supplied headers |
| BE-01   | P1       | Not an attack — a functional break, but security-adjacent: users are silently redirected to install the wrong GitHub App | Restore `GITHUB_APP_SLUG` env read                                                    |
| FE-05   | P2       | Would require a compromised backend response to redirect a user off-domain on page load                                  | Allowlist `authorizationUrl`'s host before navigating                                 |
| SEC-03  | P3       | Guessable IP-hash salt if never set, weakening visitor-IP anonymization                                                  | Require `ANALYTICS_IP_HASH_SALT` explicitly in production                             |

---

## Cleanup Candidates

_Nothing below was removed as part of this audit._

| File / Symbol                                                    | Reason                                                       | Confidence                                                    |
| ---------------------------------------------------------------- | ------------------------------------------------------------ | ------------------------------------------------------------- |
| `analytics-processing.service.fixed.ts`                          | 0 bytes, zero references                                     | Definite                                                      |
| `apps/api/src/health/*`                                          | Orphaned duplicate of the real health module                 | Definite                                                      |
| `analytics-engine/controllers/analytics-ingestion.controller.ts` | Not wired into its module's controller list                  | Definite                                                      |
| `apps/web/src/providers/app-providers.tsx`                       | Zero references                                              | Definite                                                      |
| `common/filters/http-exception.filter.ts`                        | Unreferenced, superseded by `AllExceptionsFilter`            | Definite (after confirming the error-shape decision in BE-03) |
| `apps/tracker/src/index.ts`                                      | Unbuilt, unimported stub                                     | Definite                                                      |
| 2× `activity-feed.tsx.backup-*`                                  | Stale pre-migration snapshots                                | Definite                                                      |
| `pnpm-workspace.yaml.backup`                                     | Predates current workspace glob                              | Definite                                                      |
| 14 duplicate `.spec.ts` under `apps/api/src/**`                  | Superseded by `packages/test-code/api/unit/`, never executed | High — verify the new copies are complete replacements first  |
| `apps/api/jest.config.cjs`                                       | Orphaned — no script references it anymore                   | High                                                          |
| `packages/validation` (whole package)                            | Zero consumers despite 12-file investment                    | Needs a decision, not just confirmation — see PKG-01          |

---

## Final Prioritized Roadmap

### Phase 1 — Critical Stability & CI Trust

```text
[ ] Confirm actual current CI pass/fail status
[ ] Fix CI: Postgres/Redis service containers, prisma generate, --frozen-lockfile, Chrome install for Playwright
[ ] Register ScheduleModule.forRoot() and resolve the dual-pipeline decision in the same change
[ ] Restore GITHUB_APP_SLUG env read
```

### Phase 2 — Backend Correctness

```text
[ ] Add auth-endpoint rate limiting; fix the header-trust rate-limit bypass
[ ] Add the processedAt index before the scheduler goes live
[ ] Centralize Prisma error handling; delete the dead exception filter
```

### Phase 3 — Frontend Correctness

```text
[ ] Delete repositoryRequest, route repositories/code-explorer through the shared client
[ ] Add error.tsx/global-error.tsx boundaries
[ ] Fix the 4-file abort-cleanup bug in one pass
[ ] Add unmount/stale-response guards to code-explorer.tsx
```

### Phase 4 — Database Reliability

```text
[ ] Add a CHECK/trigger or integration test for the owner/membership invariant
[ ] SQL-paginate loadDimensionReport
[ ] Decide and document a single soft-delete convention going forward
```

### Phase 5 — Testing

```text
[ ] Convert 40 beforeEach-boot e2e files to beforeAll
[ ] Write tests for the repositories backend module and the new GitHub frontend components
[ ] Close the coverage gap on large frontend dashboards, as its own tracked phase
[ ] Add full-stack Playwright teardown
```

### Phase 6 — Performance

```text
[ ] Batch per-raw-event processing once the scheduler is live
[ ] Parallelize the per-installation GitHub API loop
[ ] Decide the client/server-component strategy for the frontend, then act on it deliberately
```

### Phase 7 — Architecture & Cleanup

```text
[ ] Split DevelopmentService
[ ] Decide the fate of packages/validation
[ ] Fix the tracker tsconfig drift
[ ] Delete the confirmed-dead files and orphaned spec files
[ ] Update docs/REVIEW_NOTES.md — two of its four caveats are now stale
```

---

## Final Scorecard

| Category             |  Score | Reason                                                                                        |
| -------------------- | -----: | --------------------------------------------------------------------------------------------- |
| Architecture         |   7/10 | Clean module boundaries; two P0s dormant since 08-09                                          |
| Backend              | 6.5/10 | Strong auth/authz fundamentals; core scheduler/pipeline bugs unfixed                          |
| Frontend             | 5.5/10 | Real consolidation progress, offset by a fresh regression (FE-02) and persistent gaps         |
| Database             |   8/10 | Excellent schema discipline maintained through new feature work, no new tenant-isolation gaps |
| Security             | 6.5/10 | Strong crypto/session/CORS/secrets hygiene; auth rate limiting still missing                  |
| Type Safety          |   7/10 | Shared-types adoption fixed real drift; one tsconfig drift regression in tracker              |
| Error Handling       |   5/10 | Two competing filters unresolved; no centralized Prisma error translation                     |
| Testing              |   5/10 | Substantial, passing suites; CI likely cannot execute them right now                          |
| Performance          |   6/10 | Mostly efficient; documented hotspots unchanged                                               |
| Maintainability      |   6/10 | Oversized service persists; shared-package adoption genuinely improved this                   |
| Observability        |   5/10 | Request IDs and structured exceptions exist; no signal for silently-dead background jobs      |
| Deployment Readiness |   2/10 | No configuration exists for any target; a build-order gap would break a naive first attempt   |

**Overall Score: 58 / 100**
**Production Readiness: Not Ready**

Down slightly from the prior audit's 64/100, but the number hides a mixed story: genuine, verified fixes landed (two Critical IDOR/stub bugs, HTTP-client/auth-provider consolidation, `trust proxy`, three shared packages going from scaffolding to real infrastructure). Against that, the two issues both prior audits called the single highest-priority fix — the dead scheduler and the duplicated analytics pipeline — remain completely unaddressed after eight days and two written "must verify" checklists, new feature work shipped a functional bug and a regressed architectural pattern, and the test-CI relationship broke in a way that's easy to miss until someone actually looks at a live CI run. The core design remains sound — this is a codebase worth finishing, not rebuilding — but Phase 1 of the roadmap above needs to happen before anything else is trusted.

---

_Method: every finding above was traced to its actual implementation and confirmed against current source (not assumed from prior audit docs), with confidence rated CONFIRMED / HIGH CONFIDENCE / POTENTIAL. No files were modified, no packages installed, no destructive commands run. Five parallel investigations covered backend, frontend, database/tenancy, security/CI/deployment, and shared-packages/tracker; overlapping findings (e.g. the GitHub App slug bug, caught independently by two of them) were treated as additional confirmation, not double-counted._
