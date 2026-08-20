# API Backend E2E Coverage Summary

> **Audit date:** 2026-08-13
> **Scope:** `apps/api` — NestJS + Prisma + PostgreSQL + Redis
> **Method:** Evidence-based. All figures below were measured by executing the suites and
> parsing the merged Istanbul coverage report, not taken from prior reports.

---

## Overall Status

| Metric                        | Value                      |
| ----------------------------- | -------------------------- |
| E2E Suites                    | **40** (verified passing)  |
| E2E Tests                     | **519** (verified passing) |
| Unit Tests                    | **49** passing (10 suites) |
| Fully Covered Areas           | **11** of 33               |
| Partially Covered Areas       | **17** of 33               |
| Not Covered Areas             | **5** of 33                |
| Estimated Behavioral Coverage | **~68%**                   |
| Code Coverage — Statements    | **80.28%** (4962 / 6181)   |
| Code Coverage — Branches      | **62.52%** (1973 / 3156)   |
| Code Coverage — Functions     | **82.48%** (866 / 1050)    |
| Code Coverage — Lines         | **~80%**                   |

### Verification notes

**The suite initially reported 510 of 519 tests failing.** The cause was environmental, not
test quality: the test database container (`command-center-postgres-test`) is configured with
`tmpfs` storage in `infrastructure/docker-compose.yml`, so its schema is wiped on every
container restart. After running `prisma migrate deploy` against it, all 519 tests pass and the
stated baseline reproduces exactly.

A second migration (`20260812214000_repository_integrations`) had never been applied to that
database.

**On exclusion honesty.** The coverage configuration does _not_ inflate the result:

- 190 production `.ts` files exist (excluding `src/generated/` and `*.spec.ts`)
- 183 appear in the merged coverage report
- The 7 absent files are type-only interfaces (zero runtime statements) plus one empty,
  unreferenced dead file (`analytics-processing.service.fixed.ts`)
- `*.module.ts` files **are** included in the merged report

The 80.28% figure is real and was not obtained by excluding production code.

---

## Coverage by Backend Area

| Backend Area                                         | E2E Coverage                    | Security         | Error Paths | Status            |
| ---------------------------------------------------- | ------------------------------- | ---------------- | ----------- | ----------------- |
| Authentication                                       | 23 tests, 16 authz asserts      | Strong           | Good        | **FULLY COVERED** |
| Sessions / refresh tokens                            | In auth suite                   | Strong           | Good        | **FULLY COVERED** |
| Workspace creation                                   | 5 tests                         | Isolation tested | Thin        | PARTIAL           |
| Workspace members & roles                            | 18 tests, 5 authz               | Strong           | Good        | **FULLY COVERED** |
| Applications                                         | 11 tests, 7 validation          | Yes              | Good        | **FULLY COVERED** |
| Application links                                    | 5 tests                         | Weak             | 2 asserts   | PARTIAL           |
| Application technologies                             | 5 tests                         | Weak             | 3 asserts   | PARTIAL           |
| Application roles                                    | 7 tests, 11 authz               | Strong           | Authz-only  | **FULLY COVERED** |
| Activity logging                                     | 6 tests                         | Isolation tested | Thin        | PARTIAL           |
| Development milestones / tasks / blockers / progress | 27 tests                        | Roles tested     | Good        | **FULLY COVERED** |
| Websites                                             | 8 tests, 7 validation           | Weak             | Good        | PARTIAL           |
| Website roles & environments                         | 12 tests, 9 authz               | Strong           | Thin        | **FULLY COVERED** |
| Analytics ingestion                                  | 5 tests                         | Separate suite   | 0 asserts   | PARTIAL           |
| Analytics ingestion security                         | 7 tests, 8 authz, 12 validation | **Excellent**    | Strong      | **FULLY COVERED** |
| Analytics rate limiting                              | 4 tests                         | Yes              | Good        | **FULLY COVERED** |
| Analytics raw events                                 | 7 tests                         | Isolation tested | Moderate    | PARTIAL           |
| Tracking admin                                       | 5 tests                         | Isolation tested | Moderate    | PARTIAL           |
| Analytics processing                                 | 22 + 7 tests                    | Partial          | Moderate    | PARTIAL           |
| Sessions (analytics)                                 | 7 tests                         | None             | 0 asserts   | PARTIAL           |
| Visitors                                             | 4 tests                         | None             | 0 asserts   | PARTIAL           |
| Page views                                           | 6 tests                         | None             | 0 asserts   | PARTIAL           |
| Aggregates                                           | 8 tests                         | 1 assert         | 1 assert    | PARTIAL           |
| Time zones                                           | 5 tests                         | None             | 0 asserts   | PARTIAL           |
| Late events                                          | 5 tests                         | None             | 0 asserts   | PARTIAL           |
| Reprocessing                                         | 8 tests                         | Isolation tested | Moderate    | PARTIAL           |
| Retention                                            | 6 tests                         | Isolation tested | Thin        | PARTIAL           |
| Analytics reports                                    | 41 tests, 12 validation         | Strong           | Strong      | **FULLY COVERED** |
| Monitoring                                           | 45 tests, 15 validation         | Strong           | Strong      | **FULLY COVERED** |
| Releases & deployments                               | 43 tests, 12 validation         | Strong           | Strong      | **FULLY COVERED** |
| Team invitations                                     | 36 tests, 10 validation         | Strong           | Strong      | **FULLY COVERED** |
| Notifications                                        | Inside team-ops suite           | Partial          | Partial     | PARTIAL           |
| Webhooks (API surface)                               | 40 tests, 18 validation         | Strong           | Strong      | PARTIAL &lowast;  |
| GitHub repository integrations                       | 27 tests, 12 authz              | Strong           | Mocked      | PARTIAL &lowast;  |
| Code Explorer                                        | 26 tests                        | Yes              | Good        | PARTIAL &lowast;  |
| Security / tenant isolation / authorization          | 23 of 40 suites                 | Strong           | —           | **FULLY COVERED** |

&lowast; API surface is well covered, but the underlying client or worker is mocked out — see
[Critical Missing Coverage](#critical-missing-coverage).

---

## What E2E Covers Well

**Business-flow and endpoint coverage is genuinely strong.** The `phase13`–`phase20` suites
(41, 45, 43, 36, 40, 27 and 26 tests respectively) are the strongest work in the repository:
dense validation assertions, explicit role checks, and cross-tenant probes throughout.

**Security coverage is the standout.** 23 of 40 suites contain explicit cross-tenant or
foreign-workspace assertions. `analytics-ingestion-security` (8 authorization + 12 validation
assertions across only 7 tests) and the RBAC suites (`application-roles`, `website-roles`,
`workspace-roles`) are rigorous.

**Database and integration coverage is real, not mocked.** Tests run against an actual
PostgreSQL instance with `resetDatabase()` per test and assert on Prisma state directly. The
analytics pipeline suites invoke `processingService.processForWorkspace()` in-process (43 call
sites) and verify the materialized rows that result — genuine integration testing rather than
stubbed behavior.

---

## What E2E Does Not Cover Well

### The test harness does not boot the production application

This is the most consequential finding. `test/helpers/create-test-app.ts` hand-rolls its own
bootstrap and never calls `configureApplication()`. Production applies **10** bootstrap steps;
the test harness replicates **3** (`setGlobalPrefix`, `useGlobalPipes`, `cookieParser`).

Never exercised by any of the 519 tests:

| Component                            | Coverage |
| ------------------------------------ | -------- |
| `AllExceptionsFilter`                | **0%**   |
| `HttpExceptionFilter`                | **0%**   |
| `requestIdMiddleware`                | **0%**   |
| `helmet` security headers            | **0%**   |
| CORS configuration (`configureCors`) | **0%**   |
| Body-size limits (`BODY_LIMIT`)      | **0%**   |
| `enableShutdownHooks()`              | **0%**   |

**Consequence:** every error the E2E tests assert on is shaped by Nest's _default_ exception
filter, not the application's own. The production error envelope (`requestId`, `code`, `path`,
`timestamp`) is therefore unverified. There are **zero 500-level assertions** in the entire
suite.

### Background jobs are never triggered

Five `@Cron`-decorated services exist. **No scheduler entrypoint is called from any E2E test.**
Their 38–46% coverage comes purely from module instantiation, not execution:

- `analytics-engine/services/analytics-processing-scheduler.service.ts` — 43.2%
- `analytics-processing/services/analytics-processing-scheduler.service.ts` — 38.9%
- `monitoring/services/health-monitoring-scheduler.service.ts` — 41.5%
- `team-operations/services/team-operations-cleanup.service.ts` — 63.2%
- `webhooks/services/webhook-cleanup.service.ts` — 63.2%

### Outbound clients are mocked away

`phase19-repository-integrations.e2e-spec.ts` calls
`.overrideProvider(GithubAppService).useValue(githubAppMock)`, so the real client is never
executed — it sits at **6.81% statements / 0% branches**. Likewise
`webhook-delivery-worker.service.ts` is at **32%**, and a comment inside `phase18` explicitly
concedes it verifies "the READ contract (listDeliveries) without" running the worker.

### Branch coverage is the honest weak spot

At **62.52%**, failure branches are systematically untested even where statement coverage looks
healthy:

| File                                | Statements | Branches |
| ----------------------------------- | ---------- | -------- |
| `postgres-advisory-lock.service.ts` | 91.3%      | **25%**  |
| `redis.service.ts`                  | 83.3%      | **0%**   |
| `webhook-signature.service.ts`      | 92.9%      | **0%**   |
| `webhook-secret-crypto.service.ts`  | 90.5%      | **0%**   |

---

## Critical Missing Coverage

1. **Global exception filters (0%)** — the production error contract is entirely unverified
2. **GitHub API client (6.81%)** — auth, token exchange, rate limits and pagination unexercised
3. **Webhook delivery worker (32%)** — retry, backoff and outbound signing never run
4. **Schedulers (0% execution)** — all five cron services
5. **Bootstrap and middleware (0%)** — helmet, CORS, request-ID, body limits
6. **Redis failure branches (0%)** — connection loss and eviction untested
7. **Advisory-lock contention (25% branch)** — the concurrency-safety failure path
8. **`analytics-aggregation.service.ts` (13.6%)** and **`github-code.service.ts` (13.2%)**

---

## Unit Tests Still Required For

| Target                                                       | Current    | Why it needs unit tests                                  |
| ------------------------------------------------------------ | ---------- | -------------------------------------------------------- |
| `common/filters/all-exceptions.filter.ts`                    | 0%         | Error envelope, status mapping, Prisma error translation |
| `common/filters/http-exception.filter.ts`                    | 0%         | Response shape                                           |
| `common/middleware/request-id.middleware.ts`                 | 0%         | ID generation and propagation                            |
| `config/runtime-config.ts`                                   | 0%         | Env validation, bad-config failure                       |
| `bootstrap/startup-checks.ts`                                | 0%         | Startup failure paths                                    |
| `repositories/services/github-app.service.ts`                | 6.81%      | Token exchange, 401/403/429 handling                     |
| `webhooks/services/webhook-delivery-worker.service.ts`       | 32%        | Retry, backoff, dead-letter                              |
| `infrastructure/redis/redis.service.ts`                      | 0% branch  | Failure and reconnect paths                              |
| `infrastructure/database/postgres-advisory-lock.service.ts`  | 25% branch | Contention, release-on-error                             |
| `analytics-engine/services/analytics-aggregation.service.ts` | 13.6%      | Rollup math                                              |
| `database/database-health.service.ts`                        | 46.7%      | Degraded-database reporting                              |

---

## Coverage by Module Area

Weakest first, measured from the merged report:

| Area                   | Statement Coverage | Statements |
| ---------------------- | ------------------ | ---------- |
| `main.ts`              | 0.0%               | 15         |
| `bootstrap`            | 0.0%               | 62         |
| `common`               | 40.3%              | 134        |
| `users`                | 62.5%              | 32         |
| `config`               | 66.4%              | 110        |
| `repositories`         | 68.7%              | 530        |
| `analytics-engine`     | 71.8%              | 708        |
| `analytics-overview`   | 73.7%              | 224        |
| `database`             | 75.0%              | 36         |
| `webhooks`             | 75.0%              | 368        |
| `health`               | 77.2%              | 79         |
| `analytics-processing` | 81.6%              | 266        |
| `monitoring`           | 83.0%              | 371        |
| `applications`         | 84.4%              | 379        |
| `workspace`            | 85.3%              | 286        |
| `team-operations`      | 85.6%              | 291        |
| `activity`             | 87.5%              | 144        |
| `websites`             | 89.1%              | 275        |
| `infrastructure`       | 89.1%              | 46         |
| `analytics-ingestion`  | 89.4%              | 358        |
| `development`          | 90.2%              | 550        |
| `releases`             | 90.6%              | 255        |
| `auth`                 | 91.1%              | 316        |
| `version`              | 91.7%              | 12         |
| `analytics-reports`    | 94.7%              | 303        |

---

## Final Assessment

### API Backend E2E Coverage: 68 / 100

Score composition:

| Dimension                         | Score |
| --------------------------------- | ----- |
| Endpoint / business-flow coverage | 85    |
| Security coverage                 | 82    |
| Database / integration coverage   | 80    |
| Error-path coverage               | 45    |
| Branch coverage                   | 62    |
| Background-job coverage           | 15    |
| Infrastructure coverage           | 10    |

### Verdict: MODERATELY COVERED

The 519 passing tests are not vanity. The `phase13`–`phase20` suites and the RBAC/isolation work
are genuinely high quality, and tenant isolation is better covered than is typical for a codebase
this size. Business logic and authorization are **strongly** covered.

But coverage is **shaped like a dome**: excellent across the request/response surface, hollow
underneath. The system is well tested at the layer where developers write features, and largely
untested at the layer where production incidents originate — error handling, background jobs,
outbound integrations and infrastructure failure. Because the harness bypasses
`configureApplication()`, the suite validates an application that differs from the one actually
deployed.

Two things prevent a higher score, and neither is fixable by adding more endpoint tests:
**62.52% branch coverage** (failure paths systematically skipped) and **0% execution of
schedulers, filters and middleware**. Closing those gaps is unit- and integration-test work.

### Highest-leverage single fix

Make `test/helpers/create-test-app.ts` call the real `configureApplication()`. That one change
would exercise the exception filters, request-ID middleware, helmet and CORS across all 519
existing tests at once — and would likely surface real error-contract bugs immediately.

### Caveat on reproducibility

The `tmpfs` test database means this baseline is only reproducible **after** applying migrations.
If CI restarts that container without running `prisma migrate deploy`, it will report the same
false 510-failure result observed at the start of this audit.
