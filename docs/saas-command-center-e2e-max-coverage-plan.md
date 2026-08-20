# SaaS Command Center — Maximum-Coverage E2E & Business Logic Testing Plan

> **Scope:** Phases 11–18 plus Phase 1–10 regression protection  
> **Goal:** Achieve **100% coverage of critical business rules/security boundaries** and the highest practical automated code coverage across backend, frontend, workers, database behavior, and cross-module workflows.

## Table of Contents

1. Testing Strategy
2. Coverage Targets
3. Release Gates
4. Test Environment
5. Database & Redis Strategy
6. Shared Test Infrastructure
7. Business Logic Coverage Matrix
8. Phase 11 — Foundation & Authentication
9. Phase 12 — Analytics Overview
10. Phase 13 — Reports & CSV
11. Phase 14 — Processing & Reliability
12. Phase 15 — Monitoring & Incidents
13. Phase 16 — Releases & Deployments
14. Phase 17 — Invitations, Notifications & Activity
15. Phase 18 — Webhooks & Integrations
16. Cross-Phase E2E Scenarios
17. Phase 1–10 Regression
18. Frontend Maximum-Coverage Plan
19. Backend Maximum-Coverage Plan
20. Security Testing
21. Concurrency, Idempotency & Recovery
22. Performance & Scalability
23. Migration Testing
24. Failure Injection
25. Test Data & Factories
26. Coverage Enforcement
27. Execution Order
28. CI Pipeline
29. Manual Verification
30. Defect Severity
31. Final Release Checklist
32. Definition of Done

---

# 1. Testing Strategy

Use multiple layers. No single layer replaces another.

## Layer A — Unit Tests

Test pure business rules, validators, state machines, calculations, token/signature helpers, retry/backoff logic, serializers, and DTO transforms.

## Layer B — Service Integration Tests

Test NestJS services against real Prisma/PostgreSQL and real Redis where required. Verify transactions, uniqueness, foreign keys, locks, workers, and cross-module hooks.

## Layer C — Backend API E2E

Run the real NestJS app with Jest + Supertest and real middleware, guards, validation pipes, exception filters, cookies, request IDs, CORS, PostgreSQL, and Redis.

## Layer D — Mocked Frontend Playwright

Verify UI rendering, forms, loading, empty, error, unauthorized, read-only, pagination, filtering, routing, responsive layouts, and accessibility without depending on backend stability.

## Layer E — Real Full-Stack Playwright

Run Next.js + NestJS + PostgreSQL + Redis together and verify real cookies, CORS, database writes, auth refresh, role guards, API contracts, workers, and browser flows.

## Layer F — Security / Reliability

Tenant isolation, SSRF, secret handling, token replay, webhook HMAC, retry/dead-letter, distributed locking, race conditions, and failure recovery.

## Layer G — Performance / Load

Validate p95 latency, worker concurrency, queue backlogs, pagination/index performance, large analytics ranges, and memory behavior.

---

# 2. Coverage Targets

## Critical Business Logic

**Target: 100% rule/branch coverage** for:

- Authentication and refresh-token rotation
- Workspace authorization
- Tenant isolation
- Application ownership
- Analytics ingestion validation
- Analytics processing idempotency
- Reprocessing rollback/recovery
- Monitoring incident lifecycle
- Deployment state machine
- Invitation token lifecycle
- Notification user isolation
- Webhook encryption/signing/retry
- SSRF protection
- Worker distributed locking

## Backend Code Coverage

| Metric     | Minimum | Preferred |
| ---------- | ------: | --------: |
| Statements |     90% |      95%+ |
| Branches   |     85% |   90–95%+ |
| Functions  |     90% |      95%+ |
| Lines      |     90% |      95%+ |

Critical modules should target **95%+ branches**.

## Frontend Coverage

- Form validation rules: **100%**
- Permission-controlled actions: **100%**
- Loading/error/empty states: **100%**
- Critical navigation: **100%**
- Critical API-error handling: **100%**
- Critical Playwright journeys: **100%**
- General component coverage: **85–90%+**

## E2E Business Coverage Pattern

Every critical workflow should have:

- happy path
- validation failure
- unauthenticated path
- forbidden-role path
- cross-tenant path
- not-found path
- duplicate/conflict path
- retry/recovery path where applicable

---

# 3. Release Gates

## Static Gates

- [ ] Prisma format
- [ ] Prisma validate
- [ ] Prisma generate
- [ ] Backend typecheck
- [ ] Backend lint: 0 errors / 0 warnings
- [ ] Frontend typecheck
- [ ] Frontend lint: 0 errors / 0 warnings
- [ ] Tracker build/tests
- [ ] Shared packages build

## Automated Test Gates

- [ ] Backend unit tests
- [ ] Backend integration tests
- [ ] Phase 11–18 backend E2E
- [ ] Phase 1–10 regression
- [ ] Mocked frontend Playwright
- [ ] Real full-stack Playwright
- [ ] Security suites
- [ ] Migration tests
- [ ] No `.only`
- [ ] No skipped critical tests

## Runtime Gates

- [ ] No reachable `throw new Error('Method not implemented.')`
- [ ] No duplicate production controllers/routes
- [ ] No PostgreSQL shared-client concurrency warnings
- [ ] No secret/token leakage
- [ ] No uncaught worker failures

---

# 4. Test Environment

```env
NODE_ENV=test
API_PORT=4001
WEB_PORT=3001
DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:55432/command_center_e2e
TEST_DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:55432/command_center_e2e
REDIS_URL=redis://127.0.0.1:56379
FRONTEND_URL=http://127.0.0.1:3001
CORS_ORIGINS=http://127.0.0.1:3001
JWT_ACCESS_SECRET=e2e-access-secret-at-least-32-characters-long
JWT_REFRESH_SECRET=e2e-refresh-secret-at-least-32-characters-long
INVITATION_TOKEN_PEPPER=e2e-invitation-token-pepper-at-least-32-characters
WEBHOOK_ENCRYPTION_KEY=AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=
ANALYTICS_PROCESSING_ENABLED=false
HEALTH_MONITOR_ENABLED=false
WEBHOOK_WORKER_ENABLED=false
NOTIFICATION_CLEANUP_ENABLED=false
WEBHOOK_CLEANUP_ENABLED=false
```

Disable automatic workers in most suites and invoke them directly for deterministic tests. Use separate scheduler-focused suites when timers are intentionally tested.

---

# 5. Database & Redis Strategy

## Clean Full Run

1. Drop E2E database.
2. Recreate E2E database.
3. Apply migrations.
4. Generate Prisma client.
5. Seed deterministic reference data.
6. Run tests.
7. Preserve DB/log evidence on failure.

## Required DB Checks

- [ ] Empty DB migration succeeds
- [ ] Existing/pre-Phase-14 DB upgrade succeeds
- [ ] Foreign keys valid
- [ ] Unique constraints valid
- [ ] Cascade behavior intentional
- [ ] Worker indexes present
- [ ] No applied migration edited later

## Redis Checks

- [ ] Shared rate limits across API instances
- [ ] Worker locks expire
- [ ] Stale keys do not block work forever
- [ ] Redis outage follows defined fail-open/fail-closed policy

---

# 6. Shared Test Infrastructure

```text
apps/api/test/
├── factories/
│   ├── user.factory.ts
│   ├── workspace.factory.ts
│   ├── application.factory.ts
│   ├── environment.factory.ts
│   ├── website.factory.ts
│   ├── analytics.factory.ts
│   ├── monitoring.factory.ts
│   ├── release.factory.ts
│   ├── invitation.factory.ts
│   ├── notification.factory.ts
│   └── webhook.factory.ts
├── helpers/
│   ├── create-test-application.ts
│   ├── auth.helper.ts
│   ├── database.helper.ts
│   ├── redis.helper.ts
│   ├── response.helper.ts
│   └── polling.helper.ts
└── fixtures/
    ├── health-server.ts
    └── webhook-receiver.ts
```

Frontend:

```text
apps/web/e2e/
├── fixtures/
│   ├── auth.fixture.ts
│   ├── workspace.fixture.ts
│   ├── api-mocks.ts
│   └── database.fixture.ts
└── full-stack/
```

---

# 7. Business Logic Coverage Matrix

| Domain       | Rule                                                      | Required Coverage        |
| ------------ | --------------------------------------------------------- | ------------------------ |
| Auth         | Refresh rotates; old token reuse fails                    | Unit + API E2E + Browser |
| Workspace    | Foreign workspace inaccessible                            | API E2E + Browser        |
| Roles        | Viewer read-only                                          | API E2E + Frontend E2E   |
| Analytics    | Duplicate source event never duplicates normalized record | Integration + E2E        |
| Processing   | Same range is idempotent                                  | Integration + E2E        |
| Processing   | Failure preserves prior valid analytics                   | Integration + E2E        |
| Monitoring   | Incident opens only at threshold                          | Unit + Integration + E2E |
| Monitoring   | Recovery resolves incident                                | Integration + E2E        |
| Deployment   | Invalid transition impossible                             | Unit + API E2E           |
| Rollback     | Effective version uses rollback target                    | Unit + E2E               |
| Invitation   | Token one-time, hashed, email-bound                       | Unit + API E2E + Browser |
| Notification | User cannot access another user's notification            | API E2E                  |
| Webhook      | Secret encrypted and never listed                         | Integration + E2E        |
| Webhook      | Exact raw body HMAC signed                                | Unit + Delivery E2E      |
| Webhook      | Retry only retryable failures                             | Unit + Worker E2E        |
| SSRF         | Internal/private targets blocked                          | Unit + E2E               |
| Concurrency  | Same job never executes twice                             | Multi-instance E2E       |

---

# 8. Phase 11 — Foundation & Authentication

## Unit Tests

- [ ] Access token claims
- [ ] Refresh token claims
- [ ] Invalid signature
- [ ] Expired token
- [ ] Wrong token type
- [ ] Refresh-token hash/verification
- [ ] Session create
- [ ] Session rotate
- [ ] Old refresh reuse rejected
- [ ] Revoked session rejected
- [ ] Logout current
- [ ] Logout all

## Backend API E2E

Create:

```text
apps/api/test/phase11-foundation-auth.e2e-spec.ts
```

Cases:

- [ ] Registration succeeds
- [ ] Duplicate email → 409
- [ ] Invalid email/password → 400
- [ ] Login succeeds
- [ ] Invalid credentials → 401
- [ ] Refresh cookie set
- [ ] HttpOnly / SameSite / Path verified
- [ ] Refresh rotates token
- [ ] Previous token fails after rotation
- [ ] Logout clears/revokes session
- [ ] Logout-all revokes all sessions
- [ ] Public health accessible
- [ ] Readiness access follows policy
- [ ] Invalid/missing access token rejected
- [ ] Allowed CORS origin works
- [ ] Unauthorized origin follows policy

## Mocked Frontend

- [ ] Login success/error/loading
- [ ] Register success/error
- [ ] Protected route behavior
- [ ] Session restoring state
- [ ] `next` URL return behavior

## Real Full-Stack

- [ ] Register in browser
- [ ] Login
- [ ] Reload session restoration
- [ ] Expired access token refresh
- [ ] Concurrent 401s produce one refresh flow
- [ ] Logout blocks protected route

---

# 9. Phase 12 — Analytics Overview

Use deterministic fixtures: 10 visitors, 15 sessions, 40 page views, 5 bounces, multiple pages/sources/countries/devices/browsers/OSes, current + previous periods, timezone-edge events.

## Backend

- [ ] Visitors exact
- [ ] Sessions exact
- [ ] Page views exact
- [ ] Bounce rate exact
- [ ] Duration exact
- [ ] Previous-period totals exact
- [ ] Percentage increase/decrease
- [ ] Zero previous period safe
- [ ] Hourly grouping
- [ ] Daily grouping
- [ ] Top pages ordered
- [ ] Top sources ordered
- [ ] Country/device/browser/OS totals
- [ ] Invalid date range → 400
- [ ] Missing website → 404
- [ ] Viewer can read
- [ ] Cross-workspace blocked
- [ ] Large integers serialize safely

## Frontend

- [ ] KPI cards
- [ ] comparison indicators
- [ ] trend chart
- [ ] top pages/sources
- [ ] presets/custom range
- [ ] loading/empty/error/retry
- [ ] responsive layouts

---

# 10. Phase 13 — Reports & CSV

## Business Rules

- Detailed totals reconcile with overview
- Pagination never duplicates/skips rows
- Sort fields allow-listed
- CSV excludes private analytics fields
- CSV formula injection neutralized

## Backend

- [ ] pages/sources/country/device/browser/OS/custom-event reports
- [ ] search
- [ ] ascending/descending sort
- [ ] pagination boundaries
- [ ] no overlap between pages
- [ ] invalid sort/dimension/page/limit → 400
- [ ] CSV content type
- [ ] CSV headers/rows
- [ ] range limit
- [ ] row limit
- [ ] escape `=`, `+`, `-`, `@`
- [ ] tracking keys excluded
- [ ] IP hashes excluded
- [ ] private properties excluded

## Frontend

- [ ] report tabs
- [ ] search/filter/sort
- [ ] URL persistence
- [ ] refresh persistence
- [ ] drill-down range preservation
- [ ] export success/failure
- [ ] responsive tables

---

# 11. Phase 14 — Processing & Reliability

This is a highest-risk area and should receive the deepest coverage.

## Raw Processing

- [ ] pending raw events selected
- [ ] already processed events skipped
- [ ] normalization correct
- [ ] page-view creation correct
- [ ] custom event handling correct
- [ ] duplicate source-event idempotent

## Visitor Rebuilding

- [ ] firstSeenAt
- [ ] lastSeenAt
- [ ] sessionCount
- [ ] pageViewCount
- [ ] eventCount
- [ ] no-event edge case

## Session Rebuilding

- [ ] startedAt / endedAt / lastEventAt
- [ ] duration / engaged duration
- [ ] pageView/customEvent counts
- [ ] bounce
- [ ] entry/exit page
- [ ] source attribution
- [ ] device/browser/OS attribution

## Page Views

- [ ] first page = entry
- [ ] last page = exit
- [ ] single-page session = both entry and exit
- [ ] repeated rebuild stable

## Aggregates

- [ ] hourly
- [ ] daily
- [ ] overview
- [ ] page/source/country/device/browser/OS/custom-event dimensions
- [ ] deterministic rebuild

## Idempotency

Run same range repeatedly:

- [ ] event count unchanged
- [ ] page-view count unchanged
- [ ] session count unchanged
- [ ] visitor count unchanged
- [ ] aggregate totals unchanged

## Transaction Failure

Inject failure after partial work:

- [ ] transaction rolls back
- [ ] previous analytics preserved
- [ ] raw event not lost
- [ ] retry succeeds

## Retry / Dead Letter

- [ ] retryCount increments
- [ ] exponential backoff bounded
- [ ] maxRetries enforced
- [ ] dead-letter state persisted
- [ ] error sanitized
- [ ] manual retry succeeds

## Distributed Lock

Two workers simultaneously:

- [ ] one acquires lock
- [ ] duplicate range not processed twice
- [ ] different websites can run concurrently
- [ ] lock released success/failure
- [ ] stale run recovery

## Mandatory Runtime Gate

Before Phase 14 passes, no reachable production code may contain:

```ts
throw new Error('Method not implemented.');
```

for visitor/session/page-view/aggregation rebuild paths.

---

# 12. Phase 15 — Monitoring & Incidents

Controlled fixture server endpoints:

```text
/healthy
/slow
/failure
/timeout
/redirect
/flaky
```

## SSRF — 100% policy branch coverage

Block:

- [ ] localhost
- [ ] 127.0.0.1
- [ ] 0.0.0.0
- [ ] 10/8
- [ ] 172.16/12
- [ ] 192.168/16
- [ ] IPv6 loopback/private
- [ ] link-local
- [ ] cloud metadata
- [ ] embedded credentials
- [ ] non-http protocols
- [ ] private-IP DNS resolution
- [ ] redirect to private target
- [ ] DNS revalidation before request

## Classification

- [ ] fast 200 → HEALTHY
- [ ] slow 200 → DEGRADED
- [ ] 500 → DOWN
- [ ] timeout → DOWN
- [ ] disabled → DISABLED
- [ ] history created every execution

## Incident Lifecycle

- [ ] failures below threshold → no incident
- [ ] threshold reached → one incident
- [ ] further failures update same incident
- [ ] recovery resolves incident
- [ ] disable behavior matches policy

## Scheduler

- [ ] due checks run
- [ ] future checks skipped
- [ ] disabled skipped
- [ ] bounded concurrency
- [ ] multi-instance lock
- [ ] retention cleanup

---

# 13. Phase 16 — Releases & Deployments

## Release

- [ ] create
- [ ] duplicate version same app → 409
- [ ] same version another app allowed
- [ ] Viewer blocked from writes
- [ ] cross-workspace blocked

## State Machine — 100% transitions

Valid:

```text
DRAFT -> SCHEDULED
DRAFT -> IN_PROGRESS
SCHEDULED -> DRAFT
SCHEDULED -> IN_PROGRESS
IN_PROGRESS -> SUCCESSFUL
IN_PROGRESS -> FAILED
FAILED -> IN_PROGRESS
FAILED -> ROLLED_BACK
SUCCESSFUL -> ROLLED_BACK
```

Explicitly test every invalid transition too.

## Metadata

- [ ] scheduled requires date
- [ ] failed requires reason
- [ ] successful stores finish time
- [ ] duration correct
- [ ] activity created
- [ ] attempt increments
- [ ] concurrent conflict → 409

## Rollback

- [ ] target successful
- [ ] same application/environment
- [ ] cannot target self
- [ ] effective version correct
- [ ] audit/activity created

---

# 14. Phase 17 — Invitations, Notifications & Activity

## Invitation Security

- [ ] cryptographic token
- [ ] raw token only create/resend response
- [ ] raw token never stored
- [ ] hash stored
- [ ] expiry
- [ ] accepted/revoked/declined token unusable
- [ ] resend invalidates old token
- [ ] token email-bound
- [ ] wrong signed-in email rejected
- [ ] existing member cannot be invited
- [ ] duplicate pending invite → 409
- [ ] rate limit

## Notifications

- [ ] invite notification
- [ ] acceptance notification
- [ ] failed deployment notification
- [ ] monitoring incident notification
- [ ] analytics dead-letter notification
- [ ] dedupe
- [ ] own-user list only
- [ ] unread count
- [ ] mark one read
- [ ] cannot mark foreign notification
- [ ] mark all read
- [ ] expiry/retention

## Activity

- [ ] description search
- [ ] actor name/email
- [ ] application name
- [ ] activity type
- [ ] actor/entity filters
- [ ] date range
- [ ] invalid range
- [ ] workspace isolation

---

# 15. Phase 18 — Webhooks & Integrations

## Management

- [ ] create/update/disable/re-enable
- [ ] rotate secret
- [ ] one-time secret display
- [ ] duplicate name → 409
- [ ] subscription required
- [ ] invalid subscription rejected
- [ ] Viewer read-only

## Encryption

- [ ] ciphertext produced
- [ ] plaintext absent
- [ ] decrypt = original secret
- [ ] IV differs per encryption
- [ ] bad auth tag rejected
- [ ] wrong key rejected
- [ ] exactly 32-byte encryption key required

## HMAC Signing

- [ ] exact raw body signed
- [ ] timestamp included
- [ ] valid HMAC accepted
- [ ] changed body rejected
- [ ] changed timestamp rejected
- [ ] wrong secret rejected

## Retry Policy

| Response      | Expected                                      |
| ------------- | --------------------------------------------- |
| 2xx           | SUCCEEDED                                     |
| 400           | non-retryable/dead-letter according to policy |
| 401/403       | non-retryable according to policy             |
| 408           | retry                                         |
| 425           | retry                                         |
| 429           | retry                                         |
| 5xx           | retry                                         |
| network error | retry                                         |
| timeout       | retry                                         |

## Worker

- [ ] attempt history
- [ ] bounded exponential backoff
- [ ] max attempts
- [ ] dead letter
- [ ] stale processing recovery
- [ ] bounded concurrency
- [ ] multi-instance dedupe

## SSRF / Log Safety

Repeat full monitoring SSRF suite and verify:

- [ ] raw secret absent from logs
- [ ] encrypted fields not exposed publicly
- [ ] request/response sensitive bodies absent
- [ ] Authorization headers absent

---

# 16. Cross-Phase E2E Scenarios

## Scenario A — Analytics failure → notification → webhook → recovery

1. Ingest events.
2. Force processing failure.
3. Exhaust retries.
4. Verify dead-letter.
5. Verify notification.
6. Verify webhook.
7. Retry.
8. Verify rebuild succeeds.
9. Verify no duplicates.

## Scenario B — Monitoring outage → incident → notification → webhook → recovery

- [ ] exactly one active incident
- [ ] one opened notification
- [ ] opened webhook
- [ ] recovery resolves incident
- [ ] resolved webhook
- [ ] health badge updates

## Scenario C — Failed deployment

- [ ] create release/deployment
- [ ] IN_PROGRESS → FAILED
- [ ] failure reason stored
- [ ] activity created
- [ ] notification created once
- [ ] webhook created once

## Scenario D — Invitation Journey

- [ ] owner invites
- [ ] invite notification
- [ ] user authenticates
- [ ] accepts
- [ ] membership created
- [ ] inviter notified
- [ ] activity searchable
- [ ] token reuse rejected

## Scenario E — Tenant Isolation

Test Workspace A against Workspace B for every resource family:

```text
applications
environments
websites
analytics
processing runs
health checks
incidents
releases
deployments
invitations
notifications
webhooks
deliveries
activity
```

---

# 17. Phase 1–10 Regression

All prior modules must remain green:

- [ ] auth/sessions
- [ ] workspaces/members
- [ ] applications/environments
- [ ] websites
- [ ] tracker ingestion
- [ ] milestones/tasks/blockers
- [ ] progress calculations
- [ ] activity
- [ ] role permissions
- [ ] analytics ingestion/processing/aggregation
- [ ] late events
- [ ] timezone behavior
- [ ] retention
- [ ] reprocessing

No prior test may be removed or weakened without documented rationale.

---

# 18. Frontend Maximum-Coverage Plan

Every critical page must cover:

## States

- [ ] loading
- [ ] success
- [ ] empty
- [ ] error
- [ ] retry
- [ ] unauthorized
- [ ] forbidden
- [ ] missing resource

## Forms

- [ ] required fields
- [ ] malformed values
- [ ] min/max
- [ ] server validation
- [ ] conflict
- [ ] submit loading
- [ ] success/failure
- [ ] duplicate-click prevention

## Role Matrix

For OWNER / ADMIN / DEVELOPER / VIEWER:

- [ ] correct controls visible
- [ ] forbidden controls hidden
- [ ] direct API mutation still rejected by backend

## Navigation

- [ ] deep links
- [ ] reload
- [ ] back/forward
- [ ] query persistence
- [ ] filters persist

## Responsive Viewports

```text
320x720
375x812
768x1024
1024x768
1440x900
```

## Accessibility

- [ ] labels
- [ ] keyboard navigation
- [ ] visible focus
- [ ] dialog focus trap
- [ ] accessible names
- [ ] heading structure
- [ ] no critical axe violations

---

# 19. Backend Maximum-Coverage Plan

## DTOs

Every DTO should cover:

- valid minimum
- valid full
- required missing
- invalid enum
- too short/long
- invalid UUID/date/URL
- extra-field behavior

## Controllers

For every endpoint:

- happy path
- unauthenticated
- forbidden role
- invalid params/body
- not found
- foreign workspace
- conflict

## Services

Every business method:

- each validation branch
- each conflict branch
- each state transition
- retry branches
- terminal branches
- DB failure where critical
- dependency failure where critical

## Workers

- no work
- one item
- batch
- partial failure
- total failure
- retry
- max retry
- stale recovery
- concurrency limit
- distributed lock

---

# 20. Security Testing

## Authentication

- [ ] access-token tampering
- [ ] refresh-token tampering
- [ ] refresh replay
- [ ] revoked/expired session
- [ ] logout-all

## Authorization

For every protected route:

- [ ] no token → 401
- [ ] invalid token → 401
- [ ] Viewer write → 403
- [ ] foreign workspace rejected
- [ ] foreign nested application/resource rejected

## Input Security

- [ ] oversized payload
- [ ] malformed JSON
- [ ] suspicious object keys
- [ ] script/HTML safely handled
- [ ] CSV formula protection
- [ ] unsafe URLs rejected

## Secrets

- [ ] JWT secrets never returned
- [ ] tracking secret not exposed
- [ ] invitation raw token not stored/logged
- [ ] webhook secret encrypted
- [ ] webhook secret only shown once

---

# 21. Concurrency, Idempotency & Recovery

## Analytics

- [ ] two same-range requests → no duplicate processing
- [ ] one active run/lock
- [ ] different websites can process concurrently

## Deployment

- [ ] conflicting transitions produce one valid winner and one conflict

## Invitation

- [ ] two accept requests → one membership only

## Webhook

- [ ] two workers cannot process same delivery twice

## Monitoring

- [ ] two schedulers do not run same check twice
- [ ] only one incident opens

---

# 22. Performance & Scalability

| Operation                 | Preferred p95 |
| ------------------------- | ------------: |
| Login                     |      < 300 ms |
| Workspace list            |      < 300 ms |
| Analytics overview        |      < 800 ms |
| Detailed report           |    < 1,500 ms |
| Notification unread count |      < 200 ms |
| Monitoring list           |      < 500 ms |
| Webhook integration list  |      < 500 ms |

Load scenarios:

- 100k+ raw analytics events
- 30-day overview
- max report/CSV range
- large reprocessing range
- 10k notifications/user
- 100–500 due health checks
- 1,000 queued webhook deliveries

Verify:

- [ ] API responsive
- [ ] no unbounded memory
- [ ] DB pool stable
- [ ] Redis stable
- [ ] worker concurrency bounded

---

# 23. Migration Testing

Mandatory for Phase 14–18 schema changes.

## Empty Database

```powershell
pnpm --filter @command-center/api exec prisma migrate deploy
```

## Existing Database Upgrade

1. Copy pre-Phase-14 database.
2. Apply new migrations.
3. Verify backfills.
4. Verify row counts.
5. Start API.
6. Run regression.

Specifically verify required `AnalyticsProcessingRun` fields:

```text
workspaceId
rangeStart
rangeEnd
lockKey
```

No data loss or invalid null migration is acceptable.

---

# 24. Failure Injection

## PostgreSQL

- temporary disconnect
- transaction rollback
- worker retry
- controlled API error

## Redis

- fail-open/fail-closed behavior
- lock failure
- rate-limit failure

## Email

- invitation delivery failure stored safely
- raw token absent from logs

## Webhook

- network failure
- timeout
- 429
- 500
- dead-letter

## Monitoring

- repeated failure
- recovery

---

# 25. Test Data & Factories

## Standard Users

| User         | Role           |
| ------------ | -------------- |
| Owner A      | OWNER          |
| Admin A      | ADMIN          |
| Developer A  | DEVELOPER      |
| Viewer A     | VIEWER         |
| Owner B      | OWNER          |
| Invited User | none initially |

## Standard Workspaces

```text
Workspace A
Workspace B
```

Each owns separate applications, environments, websites, analytics, monitoring, releases, notifications, invitations, and webhooks.

Rules:

- deterministic timestamps
- unique generated emails
- no dependency on test order
- each test owns its state

---

# 26. Coverage Enforcement

Example Jest thresholds:

```js
coverageThreshold: {
  global: {
    branches: 90,
    functions: 95,
    lines: 95,
    statements: 95,
  },
}
```

Use stricter per-module thresholds for auth, access control, analytics processing, monitoring, releases, invitations, and webhooks.

Exclude only generated code/static type declarations. Do not exclude difficult business services simply to increase the score.

Consider mutation testing for:

- deployment state machine
- retry/backoff
- permissions
- SSRF classification
- webhook signature verification

---

# 27. Execution Order

## Step 0 — Repository Hygiene

- [ ] remove accidental `.fixed.ts` duplicates
- [ ] no reachable unimplemented methods
- [ ] no `.only`

## Step 1 — Static

```powershell
pnpm --filter @command-center/api exec prisma format
pnpm --filter @command-center/api exec prisma validate
pnpm --filter @command-center/api exec prisma generate
pnpm --filter @command-center/api typecheck
pnpm --filter @command-center/api lint
pnpm --filter @command-center/web typecheck
pnpm --filter @command-center/web lint
```

## Step 2 — Unit + Coverage

```powershell
pnpm --filter @command-center/api test -- --coverage --runInBand
```

## Step 3 — Backend Phase E2E

```powershell
pnpm --filter @command-center/api test:e2e -- phase11
pnpm --filter @command-center/api test:e2e -- phase12
pnpm --filter @command-center/api test:e2e -- phase13
pnpm --filter @command-center/api test:e2e -- phase14
pnpm --filter @command-center/api test:e2e -- phase15
pnpm --filter @command-center/api test:e2e -- phase16
pnpm --filter @command-center/api test:e2e -- phase17
pnpm --filter @command-center/api test:e2e -- phase18
```

## Step 4 — Full Backend Regression

```powershell
pnpm --filter @command-center/api test:e2e
```

## Step 5 — Tracker

```powershell
pnpm --filter @command-center/tracker test
pnpm --filter @command-center/tracker build
```

## Step 6 — Mocked Frontend

```powershell
pnpm --filter @command-center/web exec playwright test e2e/phase11
pnpm --filter @command-center/web exec playwright test e2e/phase12
pnpm --filter @command-center/web exec playwright test e2e/phase13
pnpm --filter @command-center/web exec playwright test e2e/phase14
pnpm --filter @command-center/web exec playwright test e2e/phase15
pnpm --filter @command-center/web exec playwright test e2e/phase16
pnpm --filter @command-center/web exec playwright test e2e/phase17
pnpm --filter @command-center/web exec playwright test e2e/phase18
```

## Step 7 — Real Full Stack

```powershell
pnpm --filter @command-center/web exec playwright test e2e/full-stack
```

## Step 8 — Build

```powershell
pnpm build
```

## Step 9 — Security

Tenant isolation, SSRF, invitation-token, webhook-signature, secret leakage, rate-limit suites.

## Step 10 — Performance

Run controlled load suite.

## Step 11 — Manual Staging

Complete final browser/device/security checklist.

---

# 28. CI Pipeline

## Job 1 — Static

- Prisma validate/generate
- API typecheck/lint
- Web typecheck/lint

## Job 2 — Unit + Coverage

- Backend unit tests
- Frontend unit/component tests where present
- Enforce thresholds
- Upload coverage artifact

## Job 3 — Backend E2E

Services: PostgreSQL + Redis.

- migrate
- seed
- Phase 11–18
- Phase 1–10 regression

## Job 4 — Mocked Playwright

- build/start Next.js
- run mocked suites
- upload traces/screenshots/videos on failure

## Job 5 — Full Stack

- PostgreSQL
- Redis
- API
- Web
- health fixture
- webhook receiver
- Playwright real integration

## Job 6 — Security

- tenant isolation
- SSRF
- webhook crypto/signature
- secret scan
- dependency audit

## Job 7 — Production Build

```powershell
pnpm build
```

No release artifact if any previous job fails.

---

# 29. Manual Verification

Browsers:

- [ ] Chrome
- [ ] Edge
- [ ] Firefox
- [ ] Safari

Viewports:

- [ ] 320px
- [ ] 375px
- [ ] 768px
- [ ] 1024px
- [ ] 1440px

Critical journeys:

- [ ] register/login/logout
- [ ] workspace switch
- [ ] analytics overview/report export
- [ ] processing retry
- [ ] monitoring outage/recovery
- [ ] deployment transitions/rollback
- [ ] invitation acceptance
- [ ] notifications navigation
- [ ] webhook create/rotate/test

---

# 30. Defect Severity

## Critical

- tenant leak
- auth bypass
- refresh replay accepted
- raw secret/token leak
- SSRF bypass
- webhook signature failure
- valid analytics destroyed by failed reprocessing
- duplicate operational action from race condition

## High

- core workflow broken
- incorrect analytics totals
- duplicate incident
- invalid deployment transition accepted
- wrong-user notification
- webhook retry broken
- migration data loss

## Medium

- filter/pagination issue
- missing activity record
- broken empty/error state
- mobile issue

## Low

- style/copy issue
- minor accessibility warning
- internal duplication without functional impact

---

# 31. Final Release Checklist

## Static

- [ ] API typecheck
- [ ] API lint 0/0
- [ ] Web typecheck
- [ ] Web lint 0/0
- [ ] Prisma validate
- [ ] Full build

## Coverage

- [ ] Critical business logic 100% rule coverage
- [ ] Backend statements >= 90%, target 95%+
- [ ] Backend branches >= 85%, target 90–95%+
- [ ] Critical modules >= 95% branch coverage
- [ ] Frontend critical-state coverage complete

## E2E

- [ ] Phase 11
- [ ] Phase 12
- [ ] Phase 13
- [ ] Phase 14
- [ ] Phase 15
- [ ] Phase 16
- [ ] Phase 17
- [ ] Phase 18
- [ ] Cross-module
- [ ] Phase 1–10 regression
- [ ] Mocked browser
- [ ] Real full-stack browser

## Security

- [ ] authentication
- [ ] tenant isolation
- [ ] role permissions
- [ ] invitation token
- [ ] webhook crypto/signature
- [ ] SSRF
- [ ] secret leakage
- [ ] rate limits

## Reliability

- [ ] processing idempotency
- [ ] transaction rollback
- [ ] dead-letter recovery
- [ ] distributed locking
- [ ] Redis shared rate limits
- [ ] incident dedupe
- [ ] webhook bounded retries
- [ ] no PostgreSQL concurrency warnings

## Database

- [ ] clean migration
- [ ] upgrade migration
- [ ] no lost rows
- [ ] valid backfills
- [ ] indexes verified

---

# 32. Definition of Done

Testing is complete only when:

1. Every critical business rule has positive and negative automated coverage.
2. Every role boundary is tested.
3. Every tenant-owned resource is tested against cross-workspace access.
4. Every worker has idempotency, retry, dead-letter, and concurrency coverage where applicable.
5. Every security-sensitive token/secret has leakage and misuse coverage.
6. Frontend/backend integration is verified with the real API, not only mocks.
7. Phase 1–10 regression remains fully green.
8. Migration is tested from empty state and from an existing pre-Phase-14 database.
9. Static checks and production build pass.
10. No critical test is skipped or weakened merely to make CI pass.
11. No reachable production service contains placeholder/unimplemented logic.
12. Coverage thresholds are enforced in CI.
13. All Critical and High defects are closed before staging approval.

---

# Recommended Immediate Sequence for the Current Repository

```text
1. Finish backend lint cleanup
2. Verify/fix Phase 14 rebuildRange() implementations
3. Run backend unit tests with coverage
4. Phase 11 API E2E
5. Phase 12 API E2E
6. Phase 13 API E2E
7. Phase 14 API E2E + concurrency/idempotency
8. Phase 15 API E2E + SSRF
9. Phase 16 API E2E + state machine
10. Phase 17 API E2E + token/user isolation
11. Phase 18 API E2E + signing/SSRF/retry
12. Full Phase 1–18 backend regression
13. Tracker regression
14. Mocked frontend Phase 11–18 Playwright
15. Real full-stack Playwright
16. Migration upgrade test
17. Performance/security suites
18. Final pnpm build
19. Manual staging matrix
20. Final release-verification report
```

This order prioritizes core business logic and reliability before browser-level debugging, while preserving regression safety across the entire monorepo.
