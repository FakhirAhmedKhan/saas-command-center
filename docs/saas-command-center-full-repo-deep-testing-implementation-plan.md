# SaaS Command Center — Full Repository Deep Testing Implementation Plan

## Goal

Build one clear testing system for the entire monorepo so we can verify:

- Backend business logic
- API contracts
- Database behavior
- Redis / workers / schedulers
- Frontend UI behavior
- Frontend ↔ API integration
- Tracker SDK behavior
- Security and tenant isolation
- Reliability, retries, idempotency, and concurrency
- Production build and migration safety
- Performance and release readiness

The testing target is the complete repository, not only one app.

---

# 1. Repository Areas to Test

```text
saas-command-center/
├─ apps/
│  ├─ api/          → Backend / NestJS / Prisma / workers
│  ├─ web/          → Next.js frontend / Playwright / Vitest
│  └─ tracker/      → Browser analytics SDK
├─ packages/
│  ├─ shared-types/
│  ├─ validation/
│  ├─ ui/
│  ├─ eslint-config/
│  └─ tsconfig/
├─ infrastructure/
├─ scripts/
└─ reports/
```

We will treat testing as six major areas:

1. API / Backend
2. Web / Frontend
3. Tracker SDK
4. Shared packages
5. Database + Redis + workers
6. Full-stack + security + performance

---

# 2. Testing Layers

Use these layers together.

## Layer A — Static Validation

Run before functional testing.

Verify:

- TypeScript
- ESLint
- Prisma validate
- Prisma generate
- package builds
- production builds
- ESM compatibility

## Layer B — Unit Tests

Test isolated business logic.

Examples:

- token helpers
- analytics calculations
- CSV sanitization
- date-range rules
- deployment state machine
- webhook signing
- invitation tokens
- tracker utilities

## Layer C — Service / Integration Tests

Test real service behavior with dependencies.

Examples:

- Prisma transactions
- database uniqueness
- Redis locks
- retry logic
- worker state
- analytics rebuilding

## Layer D — API E2E

Run the real NestJS application with:

- guards
- validation pipes
- cookies
- auth
- PostgreSQL
- Redis where required
- real HTTP requests

## Layer E — Frontend Unit / Component

Use Vitest for:

- utilities
- API client
- form logic
- validation
- state helpers
- error handling

## Layer F — Browser E2E

Use Playwright for:

- UI workflows
- routing
- forms
- permissions
- loading/error/empty states
- responsive behavior

## Layer G — Real Full Stack

Verify:

```text
Browser
→ Next.js
→ NestJS
→ Prisma
→ PostgreSQL
→ Redis / workers where needed
```

## Layer H — Security / Reliability / Performance

Verify:

- tenant isolation
- RBAC
- token replay
- SSRF
- HMAC signatures
- secret leakage
- idempotency
- retries
- dead-letter
- concurrency
- load
- migration safety

---

# 3. Current Baseline

## Web

Current unit coverage baseline:

```text
161 / 161 tests passed
Statements: 100%
Branches:   99.42%
Functions:  100%
Lines:      100%
```

Important:

This is coverage of the files currently included in Vitest, not automatically the whole Next.js application.

## Tracker

Current tracker baseline:

```text
56 / 56 tests passed
Lines:      96.12%
Branches:   92.16%
Functions:  96.30%
```

Tracker lint, typecheck, and build also pass.

## API

Current API coverage run is not yet trustworthy because existing unit suites contain failures.

Known current blockers:

- Jest `src/...` path resolution
- analytics CSV test expectation
- analytics date-range contract mismatch
- generated Prisma code included in coverage
- several backend services currently have no unit coverage

So API testing is the first priority.

---

# 4. Implementation Order

Use this exact order.

```text
Stage 1  → Fix API unit-test runner
Stage 2  → Establish clean coverage baselines
Stage 3  → API E2E Phase 1–18 regression
Stage 4  → API E2E Phase 19–23
Stage 5  → Tracker deep regression
Stage 6  → Web mocked Playwright
Stage 7  → Real full-stack Playwright
Stage 8  → Security testing
Stage 9  → Reliability / concurrency / recovery
Stage 10 → Migration / performance / production gate
```

Do not jump directly to performance or browser E2E while backend contracts are still failing.

---

# 5. Stage 1 — Fix API Unit-Test Infrastructure

## Goal

Make all existing API unit tests run correctly before measuring coverage.

## Tasks

### 1. Fix Jest alias resolution

Jest must understand imports such as:

```ts
import { PrismaService } from 'src/database/prisma.service';
```

Verify or add mapping similar to:

```js
moduleNameMapper: {
  '^src/(.*)$': '<rootDir>/src/$1',
}
```

Exact configuration must match the current API Jest config.

### 2. Exclude generated Prisma from coverage

Do not count:

```text
src/generated/**
dist/**
coverage/**
```

Generated code should not reduce application coverage.

### 3. Fix broken test expectations

Review:

```text
analytics-csv.spec.ts
analytics-date-range.spec.ts
safe-http-client.service.spec.ts
health.controller.spec.ts
analytics-metrics.spec.ts
```

Rule:

Do not change production behavior just to make tests green.

For each failure decide:

```text
real production bug
OR
stale/broken test
OR
test-runner/configuration issue
```

### Exit Criteria

```text
API unit suites: 100% executing
No test-runner resolution errors
No generated Prisma coverage
test:cover completes
```

---

# 6. Stage 2 — Establish Coverage Baselines

Run:

```powershell
pnpm --filter @command-center/api test:cover
pnpm --filter @command-center/web test:cover
pnpm --filter @command-center/tracker test:cover
```

Then run root:

```powershell
pnpm run test:cover
```

Record:

```text
API
Statements:
Branches:
Functions:
Lines:

WEB
Statements:
Branches:
Functions:
Lines:

TRACKER
Lines:
Branches:
Functions:
```

## Targets

### API

```text
Statements >= 90%
Branches   >= 85%
Functions  >= 90%
Lines      >= 90%
```

Critical modules should aim for 95%+ branch coverage.

### Web

```text
Critical utilities/forms/RBAC behavior: complete
General unit/component coverage: 85%+
```

### Tracker

```text
Lines      >= 90%
Branches   >= 90%
Functions  >= 90%
```

Tracker is already above these targets.

---

# 7. Stage 3 — API E2E Phase 1–18 Regression

Run API E2E one suite/file at a time because the current tests share a PostgreSQL test database.

General execution pattern:

```powershell
pnpm exec jest `
  --config "./test/jest-e2e.config.cjs" `
  --runInBand `
  --runTestsByPath "test/<file>.e2e-spec.ts"
```

## Testing Order

### Phase 1–5

Reconfirm:

- monorepo foundation
- backend foundation
- database
- auth/workspaces
- application registry

### Phase 6

Fix and verify:

- activity filters/pagination
- activity workspace isolation
- application isolation
- secret-safe metadata

Security rule:

Cross-workspace activity must never be weakened just to make the test pass.

### Phase 7

Development:

- milestones
- tasks
- blockers
- progress calculations
- roles
- activity
- archived app behavior

### Phase 8

Websites:

- CRUD
- domain validation
- allowed origins
- key generation
- rotation
- role permissions
- workspace isolation

### Phase 9

Tracking ingestion:

- valid ingestion
- invalid/revoked key
- rate limiting
- origin checks
- payload validation
- sanitization
- raw event persistence
- deduplication

### Phase 10

Analytics engine:

- visitors
- sessions
- page views
- aggregates
- time zones
- late events
- retention
- reprocessing
- idempotency

### Phase 11

Auth regression:

- login
- register
- refresh rotation
- logout
- public health
- CORS

### Phase 12

Analytics overview:

- totals
- previous-period comparison
- grouping
- top dimensions
- date ranges
- tenant isolation

### Phase 13

Reports:

- filters
- pagination
- sorting
- dimensions
- CSV
- formula injection
- export limits
- workspace isolation

### Phase 14

Highest priority.

Verify:

- processing status
- manual reprocess
- raw-event normalization
- visitor rebuild
- session rebuild
- page-view entry/exit
- aggregates
- same-range idempotency
- transaction rollback
- retry/dead-letter
- locks

Because processing code changed recently, Phase 14 must receive deep regression testing.

### Phase 15

Monitoring:

- create/update/delete check
- manual run
- threshold
- incident open
- incident dedupe
- recovery
- history
- scheduler
- SSRF

SSRF testing must cover:

```text
localhost
127.0.0.1
0.0.0.0
private IPv4
private IPv6
link-local
metadata endpoints
redirect to private target
private DNS resolution
non-http protocols
embedded credentials
```

### Phase 16

Releases/deployments:

- create
- state transitions
- invalid transitions
- scheduling
- failure reason
- duration
- rollback
- concurrent conflict
- activity

### Phase 17

Team operations:

- invitations
- notification isolation
- token expiry
- token reuse
- resend
- invitation acceptance
- activity
- user lookup
- read/unread

### Phase 18

Webhooks:

- create/update/disable
- secret rotation
- encryption
- HMAC
- retry rules
- dead-letter
- worker dedupe
- SSRF
- secret redaction

### Exit Criteria

```text
Phase 1–18 required API E2E = green
No skipped critical tests
No fake assertions
No unresolved tenant-isolation failures
```

---

# 8. Stage 4 — API E2E Phase 19–23

## Phase 19 — Repository Integration

Test:

- connect/disconnect repository
- manual sync
- GitHub webhook signature
- duplicate delivery
- repository RBAC
- workspace isolation
- GitHub credential leakage

Use mocked GitHub APIs in normal E2E.

## Phase 20 — Code Explorer

Test:

- repository tree
- nested folders
- file content
- branches
- search
- diff
- large files
- binary handling
- path traversal
- cross-workspace access

## Phase 21 — GitHub Intelligence

Test:

- repository overview
- commits
- branches
- pull requests
- workflows
- contributors
- branch health
- repository health score
- API failures

## Phase 22 — Repository Writes

Test:

- create branch
- edit file
- create/delete file
- commit
- conflict handling
- protected/default branch restrictions
- create PR
- activity audit
- RBAC

## Phase 23 — AI Developer Intelligence

AI provider should be mocked.

Test:

- explain code
- repository summary
- commit summary
- AI PR review
- risk detection
- ask repository
- large context protection
- permissions
- usage limits
- secret redaction
- prompt-injection protection

### Exit Criteria

```text
Phase 19–23 API E2E = green
Repository isolation verified
GitHub secrets never exposed
AI secrets never exposed
```

---

# 9. Stage 5 — Tracker Deep Regression

Tracker already has strong internal coverage.

Do not rewrite it unless tests expose bugs.

## Unit / SDK Regression

Keep all current 56 tests green.

Verify:

- initialization
- duplicate initialization
- visitor IDs
- session IDs
- timeout
- custom events
- page views
- pushState
- replaceState
- popstate
- heartbeat
- hidden page behavior
- URL sanitization
- sensitive properties
- batching
- offline queue
- retry
- sendBeacon
- consent
- Do Not Track
- corrupted storage
- localStorage failure

## Add Browser-Level Tracker E2E

Create host fixtures:

```text
static host
SPA host
offline host
consent host
```

Test in Playwright:

```text
tracker bundle loads
initial pageview
SPA navigation
custom event
network failure
network recovery
pagehide
multiple tabs
session timeout
DNT
consent
```

## Tracker ↔ API Integration

Verify:

```text
tracker.js
→ POST /api/v1/collect
→ raw event
→ processing
→ normalized analytics
```

### Exit Criteria

```text
Tracker internal tests green
Tracker build green
Browser tracker tests green
Real collect integration green
```

---

# 10. Stage 6 — Web Deep Testing

Web requires both Vitest and Playwright.

## A. Vitest

Keep existing 161 tests green.

Expand coverage beyond utility files.

Priority targets:

- form validation
- API error handling
- permission helpers
- query/filter state
- analytics formatting
- monitoring state
- releases state
- invitation state
- webhook state
- repository state

Do not create meaningless snapshot-only tests just to increase percentage.

## B. Mocked Playwright

For each important page test:

```text
loading
success
empty
error
retry
401
403
404
```

For every form test:

```text
required fields
invalid values
server validation
conflict
submit loading
success
failure
double-click prevention
```

For every role:

```text
OWNER
ADMIN
DEVELOPER
VIEWER
```

Verify:

- correct controls visible
- forbidden actions hidden
- direct backend mutation still rejected by API

## Frontend Phase Coverage

Cover UI for:

```text
Auth
Workspaces
Applications
Activity
Development
Websites
Tracking
Analytics
Reports
Processing
Monitoring
Releases
Team operations
Webhooks
Repositories
Code Explorer
GitHub Intelligence
Repository writes
AI features
```

### Exit Criteria

```text
Critical Web unit tests green
Mocked Playwright green
No critical page missing loading/error/empty coverage
RBAC UI verified
```

---

# 11. Stage 7 — Real Full-Stack Playwright

This is required before release.

Run:

```text
Browser
→ Next.js
→ NestJS
→ PostgreSQL
```

Add Redis/workers where required.

## Core Full-Stack Journeys

### Journey 1 — Authentication

```text
Register
→ Login
→ reload
→ refresh token
→ logout
```

### Journey 2 — Workspace / Application

```text
Create workspace
→ create application
→ update
→ archive
→ restore
```

### Journey 3 — Development

```text
Create milestone
→ create tasks
→ add blocker
→ resolve
→ complete
→ progress updates
```

### Journey 4 — Website / Tracker / Analytics

```text
Create website
→ install tracker
→ send page view
→ custom event
→ process analytics
→ verify overview/report
```

### Journey 5 — Monitoring

```text
Create check
→ fail
→ incident
→ notification
→ recover
```

### Journey 6 — Deployment

```text
Create release
→ deployment
→ fail/succeed
→ activity
→ notification
```

### Journey 7 — Invitation

```text
Invite user
→ login
→ accept
→ membership
→ activity
```

### Journey 8 — Webhook

```text
Create integration
→ trigger event
→ delivery
→ signature
→ retry if needed
```

### Journey 9 — GitHub / Repository

```text
Connect repository
→ browse tree
→ open file
→ inspect commits/branches
```

### Journey 10 — Repository Write

```text
create branch
→ edit file
→ commit
→ create PR
```

### Journey 11 — AI

```text
open code
→ explain
→ review PR
→ verify source references
```

---

# 12. Stage 8 — Security Testing

This is a separate gate.

## Authentication

Test:

- access token tampering
- refresh token tampering
- refresh replay
- expired token
- revoked session
- logout-all
- concurrent refresh

## Authorization

For every protected family:

```text
anonymous
outsider
VIEWER
DEVELOPER
ADMIN
OWNER
foreign workspace
foreign nested resource
```

## Tenant Isolation

Test Workspace A against Workspace B for:

```text
applications
development
websites
analytics
processing
monitoring
incidents
releases
deployments
invitations
notifications
webhooks
repositories
code explorer
AI access
activity
```

## Secret Safety

Verify no leakage of:

```text
password
JWT secret
refresh token
tracking key
invitation token
webhook secret
GitHub token
private key
.env content
Authorization headers
```

## Input Security

Test:

- malformed JSON
- oversized body
- SQL-like strings
- HTML/script strings
- prototype-pollution keys
- invalid UUID
- unsafe URLs
- CSV formulas
- path traversal

### Exit Criteria

```text
No auth bypass
No tenant leak
No secret leak
No SSRF bypass
No protected-branch bypass
```

---

# 13. Stage 9 — Reliability / Concurrency / Recovery

## Analytics

Test:

- same range twice
- two workers same range
- different websites concurrently
- partial failure rollback
- retry success
- dead-letter
- stale lock recovery

## Monitoring

Test:

- two schedulers
- one check executes once
- only one incident opens
- recovery resolves same incident

## Webhooks

Test:

- two workers same delivery
- retryable vs non-retryable response
- max attempts
- dead-letter
- stale processing recovery

## Invitations

Test:

- two accept requests
- exactly one membership

## Deployment

Test:

- simultaneous conflicting transitions
- one valid winner
- one conflict

### Exit Criteria

```text
No duplicate business operation
No partial corruption
Retries bounded
Dead-letter recoverable
Locks released correctly
```

---

# 14. Stage 10 — Database, Migration, Performance, Production Gate

## Database

Verify:

- Prisma format
- Prisma validate
- Prisma generate
- clean migration
- upgrade migration
- foreign keys
- unique constraints
- cascade behavior
- indexes
- backfills

## Performance

Load-test:

```text
100k+ analytics events
30-day analytics overview
large report
large reprocessing range
10k notifications
100–500 monitoring checks
1,000 webhook deliveries
large repositories
many commits/branches/PRs
```

Watch:

- p95 latency
- CPU
- memory
- DB pool
- Redis
- queue depth
- worker concurrency

## Production Build

Final gate:

```powershell
pnpm install --frozen-lockfile
pnpm build:packages
pnpm --filter @command-center/api typecheck
pnpm --filter @command-center/api lint
pnpm --filter @command-center/api build
pnpm --filter @command-center/web typecheck
pnpm --filter @command-center/web lint
pnpm --filter @command-center/web build
pnpm --filter @command-center/tracker typecheck
pnpm --filter @command-center/tracker lint
pnpm --filter @command-center/tracker build
pnpm run test:cover
```

Then run:

```text
API E2E
Web Playwright
Full-stack Playwright
Security
Migration
Performance smoke
```

---

# 15. Recommended Test Folder Structure

## API

```text
apps/api/test/
├─ helpers/
├─ factories/
├─ fixtures/
├─ phase01-*.e2e-spec.ts
├─ phase02-*.e2e-spec.ts
├─ ...
├─ phase23-*.e2e-spec.ts
├─ security/
├─ reliability/
└─ full-regression/
```

## Web

```text
apps/web/
├─ src/**/*.test.ts
└─ e2e/
   ├─ mocked/
   ├─ phase01/
   ├─ ...
   ├─ phase23/
   ├─ full-stack/
   ├─ security/
   └─ accessibility/
```

## Tracker

```text
apps/tracker/
├─ src/
├─ test/
├─ test-support/
└─ e2e/
   ├─ static-host/
   ├─ spa-host/
   ├─ offline/
   ├─ consent/
   └─ full-stack/
```

---

# 16. Reporting Strategy

Create one report per stage.

```text
reports/
├─ coverage-baseline.md
├─ api-phase01-18.md
├─ api-phase19-23.md
├─ tracker-regression.md
├─ web-playwright.md
├─ full-stack.md
├─ security.md
├─ reliability.md
├─ migration.md
├─ performance.md
└─ final-release-verification.md
```

Every report should contain:

```text
Command
Passed
Failed
Skipped
Known defects
Files changed
Retest result
Final status
```

---

# 17. Rule for Fixing Failures

For every failing test:

```text
1. Reproduce
2. Identify whether it is:
   - production bug
   - stale test
   - fixture problem
   - runner/config problem
3. Fix the real cause
4. Run isolated test
5. Run related phase
6. Run regression
7. Record result
```

Never use:

```text
.skip
.only
any
@ts-ignore
fake assertion
broad expected status arrays
eslint-disable just to silence real errors
```

---

# 18. Final Definition of Done

The repository is ready only when:

- API static checks pass
- Web static checks pass
- Tracker static checks pass
- shared packages pass
- coverage commands pass
- Phase 1–23 required API E2E pass
- critical frontend Playwright pass
- Tracker browser integration passes
- real Browser → Web → API → DB flow passes
- tenant isolation is verified
- role permissions are verified
- security-sensitive secrets are protected
- analytics processing is idempotent and failure-safe
- workers are retry-safe and concurrency-safe
- migrations work on clean and existing databases
- production builds succeed
- no Critical or High defect remains

---

# 19. Simple Execution Roadmap

```text
1. Fix API Jest/coverage runner
2. Get clean API/Web/Tracker coverage baseline
3. Test API Phase 1–6
4. Test API Phase 7–12
5. Test API Phase 13–18
6. Test API Phase 19–23
7. Run full API regression
8. Run Tracker 56-test regression
9. Add Tracker browser integration
10. Run Web Vitest
11. Run Web mocked Playwright
12. Run real full-stack Playwright
13. Run security suite
14. Run concurrency/reliability suite
15. Run migration checks
16. Run performance smoke/load
17. Run final production build
18. Create final release-verification report
```

This sequence keeps the testing process simple while still giving deep coverage of the entire repository.
