# SaaS Command Center — Complete E2E Testing Plan

## Document Purpose

This document defines a production-ready testing strategy for the SaaS Command Center implementation completed through Phase 10.

The test plan covers:

- pnpm monorepo and local infrastructure
- NestJS backend
- Next.js frontend
- PostgreSQL and Prisma
- Authentication and workspace authorization
- SaaS application management
- Activity history
- Development milestones, tasks, blockers, and progress
- Website management and secure tracking keys
- Browser tracker SDK
- Public event ingestion
- Raw-event inspection
- Analytics normalization, sessionization, aggregation, reprocessing, and retention

> **Scope note:** This plan is based on the available Phase 1–10 implementation summary and project architecture. A complete source repository or repository archive was not available for a line-by-line code audit. Before execution, reconcile this plan with the current Swagger document, Prisma schema, route tree, and package scripts.

---

# Test Strategy

## 1. Quality Objectives

The testing program must prove that:

1. Every implemented Phase 1–10 feature works as designed.
2. Workspace and tenant data never leak across users or workspaces.
3. Role permissions are consistently enforced by the backend.
4. Frontend workflows match backend behavior.
5. Authentication, refresh-token rotation, logout, and session expiry are secure.
6. All database writes preserve consistency and expected relations.
7. Tracking does not break or significantly slow the tracked website.
8. Invalid, oversized, duplicate, unauthorized, or sensitive analytics events are rejected or sanitized.
9. Raw events are normalized and aggregated without duplication.
10. Time-zone, late-event, session, bounce, and retention calculations remain correct.
11. Production builds, migrations, and startup commands work from a clean environment.
12. The system remains usable across supported browsers, screen sizes, and network conditions.

## 2. Coverage Goal

The target is **100% feature and requirement coverage**, not an artificial claim of 100% executable-line coverage.

Recommended automated code-coverage gates:

| Area                                      |                Minimum Target |
| ----------------------------------------- | ----------------------------: |
| Overall backend statements/lines          |                           85% |
| Overall backend branches                  |                           80% |
| Authentication and authorization services |                           95% |
| Workspace isolation guards                | 100% decision-branch coverage |
| Progress calculation                      |            100% rule coverage |
| Tracking validation and sanitization      |                           95% |
| Analytics session and aggregation rules   |                           95% |
| Frontend feature components               |                           80% |
| Critical E2E user flows                   |                100% automated |
| API endpoint feature coverage             |                          100% |

## 3. Test Levels

| Test Level              | Purpose                                                           | Recommended Tooling        |
| ----------------------- | ----------------------------------------------------------------- | -------------------------- |
| Static validation       | Catch type, lint, schema, and build failures                      | TypeScript, ESLint, Prisma |
| Unit testing            | Test isolated rules and utilities                                 | Jest                       |
| Component testing       | Test frontend UI behavior and states                              | Testing Library            |
| API integration         | Test controllers, guards, services, and real test DB              | Jest + Supertest           |
| Database integration    | Validate constraints, transactions, cascades, and indexes         | Prisma + PostgreSQL        |
| E2E browser testing     | Validate complete user workflows                                  | Playwright                 |
| Tracker browser testing | Validate SDK inside real host pages                               | Playwright                 |
| Contract testing        | Validate API request/response compatibility                       | OpenAPI schema checks      |
| Accessibility testing   | Validate keyboard, labels, focus, contrast, and semantics         | axe-core + manual checks   |
| Performance testing     | Validate response time, throughput, stability, and resource usage | k6 or equivalent           |
| Security testing        | Validate OWASP, authorization, cookies, CORS, abuse, and secrets  | ZAP/manual/security tests  |

## 4. Test Environments

| Environment | Purpose                    | Data Policy            |
| ----------- | -------------------------- | ---------------------- |
| Local       | Developer validation       | Disposable seed data   |
| Test/CI     | Unit, integration, E2E     | Recreated per pipeline |
| Staging     | Production-like acceptance | Synthetic data only    |
| Production  | Smoke and monitoring only  | No destructive tests   |

Required services:

```text
Frontend:    Next.js web application
Backend:     NestJS API
Database:    PostgreSQL
Tracker:     tracker.js development/production server
Test host:   Static and SPA pages used to validate tracker behavior
```

## 5. Test Accounts and Roles

Create deterministic fixtures:

| Fixture                      | Workspace | Role      | Purpose                    |
| ---------------------------- | --------- | --------- | -------------------------- |
| owner.alpha@example.test     | Alpha     | OWNER     | Full permissions           |
| admin.alpha@example.test     | Alpha     | ADMIN     | Administrative actions     |
| developer.alpha@example.test | Alpha     | DEVELOPER | Development actions        |
| viewer.alpha@example.test    | Alpha     | VIEWER    | Read-only access           |
| owner.beta@example.test      | Beta      | OWNER     | Cross-tenant isolation     |
| outsider@example.test        | None      | None      | Unauthorized-access checks |

Use two workspaces with overlapping resource names to catch accidental name-based rather than ID-based authorization.

## 6. Core Test Data

Create the following fixtures:

- Workspace Alpha and Workspace Beta.
- Two applications in each workspace with identical names but different IDs.
- One active and one archived application.
- Technologies and links for each application.
- Milestones with mixed weights and statuses.
- Tasks with due dates, priorities, assignments, skipped states, and blockers.
- One enabled website, one disabled website, and one archived website.
- One connected and one unconnected website.
- A valid tracking key, a rotated/expired key, and random invalid keys.
- Raw events containing:
  - page views
  - heartbeats
  - custom events
  - duplicates
  - late events
  - invalid timestamps
  - sensitive query parameters
  - sensitive custom-property keys
  - multiple visitors and sessions
  - direct, internal, search, social, and referral sources
  - desktop, mobile, tablet, bot, and malformed user agents
- Analytics data crossing:
  - UTC midnight
  - website local midnight
  - month boundary
  - leap day where applicable
  - daylight-saving transition for a DST time zone

## 7. Entry Criteria

Testing may begin when:

- [ ] Requirements and acceptance criteria are frozen for the test cycle.
- [ ] Prisma schema validates.
- [ ] All migrations apply to a clean database.
- [ ] API and frontend compile.
- [ ] Test environment variables are available.
- [ ] Test database can be reset automatically.
- [ ] Seed script creates deterministic fixtures.
- [ ] Swagger/OpenAPI is available.
- [ ] Tracker can be hosted in the test environment.
- [ ] Critical known blockers are documented.

## 8. Exit Criteria

A release candidate is acceptable when:

- [ ] All P0 and P1 test cases pass.
- [ ] No open Critical or High severity defects remain.
- [ ] All critical E2E flows pass in Chromium, Firefox, and WebKit.
- [ ] Cross-workspace and cross-role authorization suites pass.
- [ ] Clean migration and production build/start tests pass.
- [ ] Tracker performance budget passes.
- [ ] Analytics fixture totals match expected values.
- [ ] Security baseline passes.
- [ ] Performance targets pass or approved exceptions are recorded.
- [ ] Accessibility baseline passes.
- [ ] Final test report is approved.

## 9. Defect Severity

| Severity | Definition                                                                                           |
| -------- | ---------------------------------------------------------------------------------------------------- |
| Critical | Data leak, authentication bypass, production startup failure, data corruption, tracking-key exposure |
| High     | Core workflow unusable, wrong authorization, major analytics inaccuracy, migration failure           |
| Medium   | Feature partially broken with workaround, incorrect validation, important UI issue                   |
| Low      | Cosmetic issue, minor text/layout inconsistency, non-blocking usability issue                        |

## 10. Automation Priorities

Automate first:

1. Authentication and refresh-token lifecycle.
2. Workspace isolation and role permissions.
3. Application CRUD and archive/restore.
4. Progress, blocker, and template rules.
5. Website tracking-key lifecycle.
6. Tracker page views, SPA navigation, heartbeats, and offline retry.
7. Ingestion validation, origin checks, deduplication, and rate limits.
8. Analytics session, bounce, time-zone, late-event, and idempotency rules.
9. Main browser user journeys.
10. Clean database migration and production startup.

---

# System Inventory

## Backend Modules

```text
config
database
auth
workspace
applications
activity
development
websites
analytics-ingestion
analytics-engine
```

## Frontend Feature Areas

```text
Authentication
Dashboard
Workspace creation and selection
Workspace settings
Workspace member management
Application list/create/detail/edit/settings
Application technologies and links
Application activity
Development board
Milestones and tasks
Kanban
Blockers
Development timeline
Website list/create/detail/edit/settings
Website installation
Tracking status
Raw event viewer
Analytics engine status and controls
Aggregate verification
```

## Tracker Application

```text
Tracker bundle
Development server
Production server
Visitor/session storage
Page-view capture
SPA navigation capture
Heartbeat capture
Custom-event API
Batching
Offline queue
Consent and Do Not Track
Beacon/no-cors delivery
```

---

# Test Phases

## Test Phase 0 — Test Foundation

### Objectives

- Establish deterministic fixtures.
- Create isolated test databases.
- Configure CI test execution.
- Define selectors and test IDs.
- Validate all test scripts.

### Checklist

- [ ] Create a dedicated `TEST_DATABASE_URL`.
- [ ] Reset schema before integration and E2E runs.
- [ ] Seed all role and workspace fixtures.
- [ ] Create API helper functions for register/login/refresh.
- [ ] Create Playwright storage states for OWNER, ADMIN, DEVELOPER, and VIEWER.
- [ ] Use stable `data-testid` attributes only where semantic selectors are insufficient.
- [ ] Capture screenshots, traces, and videos on failure.
- [ ] Publish JUnit and HTML reports.
- [ ] Add test retries only in CI, not locally.
- [ ] Quarantine no tests without a defect reference and expiry date.

## Test Phase 1 — Static, Build, and Migration Gates

### Checklist

- [ ] `pnpm install --frozen-lockfile` succeeds.
- [ ] All workspace filters resolve.
- [ ] Shared packages build.
- [ ] API typecheck passes.
- [ ] API lint passes.
- [ ] API unit tests pass.
- [ ] API build passes.
- [ ] Frontend typecheck passes.
- [ ] Frontend lint passes.
- [ ] Frontend build passes.
- [ ] Tracker typecheck passes.
- [ ] Tracker bundle build passes.
- [ ] Prisma format and validate pass.
- [ ] Migrations apply to an empty database.
- [ ] Seed succeeds.
- [ ] Compiled production API starts and answers health checks.
- [ ] Production frontend starts and serves authenticated routes.
- [ ] Tracker production server serves valid JavaScript.

## Test Phase 2 — Backend and Database Integration

### Checklist

- [ ] Controllers validate all DTOs.
- [ ] Guards run on every protected endpoint.
- [ ] Service transactions roll back on failure.
- [ ] Unique constraints are enforced.
- [ ] Foreign keys and delete behavior match requirements.
- [ ] Pagination is stable and deterministic.
- [ ] Error responses use a consistent schema.
- [ ] Logs exclude passwords, tokens, cookies, tracking keys, and sensitive event properties.

## Test Phase 3 — Frontend Component and Page Testing

### Checklist

- [ ] Every page has loading, success, empty, and error coverage.
- [ ] Every form has required, invalid, boundary, and server-error coverage.
- [ ] Every destructive action requires confirmation.
- [ ] Buttons disable while requests are running.
- [ ] Duplicate submissions are prevented.
- [ ] Route parameters always use the active workspace/resource ID.
- [ ] Keyboard navigation and focus handling work.
- [ ] Mobile layouts do not overflow horizontally.
- [ ] Error messages are understandable and associated with fields.

## Test Phase 4 — Critical Browser E2E

### Checklist

- [ ] Register → workspace created → dashboard displayed.
- [ ] Login → token refresh → continued session.
- [ ] Create second workspace → switch → isolated data.
- [ ] Create application → add technology/link → update → archive → restore.
- [ ] Apply development template → complete tasks → progress updates.
- [ ] Add blocker → completion prevented → resolve → completion allowed.
- [ ] Create website → key shown once → install tracker.
- [ ] Tracked host sends page views and custom events.
- [ ] Raw events become normalized analytics.
- [ ] Reprocessing is idempotent.
- [ ] Retention only deletes expired records.

## Test Phase 5 — Non-Functional Validation

### Checklist

- [ ] Security suite passes.
- [ ] Performance suite passes.
- [ ] Accessibility baseline passes.
- [ ] Responsive and cross-browser suite passes.
- [ ] Recovery and failure-state tests pass.
- [ ] Production smoke test passes.

---

# Module-by-Module Test Cases

## Phase 1 — Monorepo and Development Foundation

| ID     | Type       | Scenario                                         | Expected Result                                                        |
| ------ | ---------- | ------------------------------------------------ | ---------------------------------------------------------------------- |
| P1-001 | Build      | Install from clean checkout with frozen lockfile | All dependencies install without modifying lockfile                    |
| P1-002 | Functional | Run root `pnpm dev`                              | API, web, and tracker start with correct workspace filters             |
| P1-003 | Failure    | Required port already occupied                   | Process fails clearly without leaving child processes                  |
| P1-004 | Build      | Build packages before apps                       | Shared packages compile and apps resolve them                          |
| P1-005 | Config     | Missing `.env` values                            | API fails fast with explicit variable names                            |
| P1-006 | Production | Start compiled API                               | Correct compiled entry point loads and all direct dependencies resolve |
| P1-007 | Shutdown   | Send SIGTERM to API                              | Server stops and Prisma disconnects cleanly                            |
| P1-008 | Windows    | Run scripts in PowerShell                        | Quoting and workspace filters work on Windows                          |
| P1-009 | Failure    | Kill one concurrently managed service            | Root process terminates remaining services as configured               |
| P1-010 | Hygiene    | Search repository for committed secrets          | No real secrets or production credentials exist                        |

### Verification Checklist

- [ ] Clean install passes.
- [ ] Local development command passes.
- [ ] Production startup passes.
- [ ] Shutdown is graceful.
- [ ] Workspace scripts are cross-platform.

---

## Phase 2 — Backend and Frontend Infrastructure

| ID     | Type          | Scenario                                  | Expected Result                                                |
| ------ | ------------- | ----------------------------------------- | -------------------------------------------------------------- |
| P2-001 | API           | Request Swagger document                  | Valid OpenAPI document is returned                             |
| P2-002 | API           | Request unknown endpoint                  | Consistent 404 response                                        |
| P2-003 | Validation    | Send unknown DTO fields                   | Request rejected when whitelist/forbid mode requires it        |
| P2-004 | Error         | Throw known service exception             | Correct status and safe message returned                       |
| P2-005 | Error         | Trigger unexpected exception              | Generic 500 with no stack/secret leak                          |
| P2-006 | Frontend      | API client receives 401                   | One refresh attempt occurs, then original request retries once |
| P2-007 | Frontend      | Refresh also fails                        | Session clears and user is sent to login                       |
| P2-008 | Frontend      | Two requests receive 401 simultaneously   | Refresh requests are coordinated; no refresh storm             |
| P2-009 | UI            | Render Button variants and loading states | Correct size, disabled state, and accessible name              |
| P2-010 | UI            | Render Input/Select/Textarea errors       | Label, hint, error, and focus behavior are correct             |
| P2-011 | UI            | Render empty/loading/error components     | Layout and semantics are consistent                            |
| P2-012 | Accessibility | Tab through common UI components          | Visible focus and logical order                                |

### Verification Checklist

- [ ] API base behavior is consistent.
- [ ] API client refresh behavior is race-safe.
- [ ] Shared UI components pass accessibility checks.

---

## Phase 3 — PostgreSQL and Prisma Foundation

| ID     | Type        | Scenario                                                 | Expected Result                                                       |
| ------ | ----------- | -------------------------------------------------------- | --------------------------------------------------------------------- |
| P3-001 | Migration   | Apply all migrations to empty DB                         | Success with expected tables/enums/indexes                            |
| P3-002 | Migration   | Run migration deploy again                               | No duplicate or destructive changes                                   |
| P3-003 | Schema      | Validate generated Prisma client                         | Client imports and queries successfully                               |
| P3-004 | DB          | Create user with duplicate unique email                  | Unique constraint rejects duplicate                                   |
| P3-005 | DB          | Create duplicate workspace membership                    | Composite unique constraint rejects duplicate                         |
| P3-006 | DB          | Delete workspace                                         | Defined child relations cascade or preserve data exactly as specified |
| P3-007 | DB          | Delete user referenced by optional actor/assignee fields | Relations use expected SetNull/Restrict behavior                      |
| P3-008 | Transaction | Force failure halfway through multi-write operation      | All writes roll back                                                  |
| P3-009 | Seed        | Run seed twice                                           | Idempotent or fails with an explicit safe message                     |
| P3-010 | Performance | Explain common workspace-scoped queries                  | Relevant indexes are used                                             |
| P3-011 | Backup      | Backup and restore test DB                               | Restored DB passes integrity checks                                   |
| P3-012 | Isolation   | Reuse same resource name in two workspaces               | Both records coexist and remain isolated                              |

### Verification Checklist

- [ ] Schema, constraints, and indexes match code assumptions.
- [ ] Backup and restore procedure is tested.
- [ ] Cross-workspace data can coexist safely.

---

## Phase 4 — Authentication, Workspaces, and Roles

### Functional and API Test Cases

| ID       | Scenario                               | Role             | Expected Result                                                 |
| -------- | -------------------------------------- | ---------------- | --------------------------------------------------------------- |
| AUTH-001 | Register valid user                    | Public           | User and initial workspace/membership created                   |
| AUTH-002 | Register duplicate email               | Public           | 409/validation error; no duplicate user                         |
| AUTH-003 | Register malformed email               | Public           | 400 with field validation                                       |
| AUTH-004 | Register weak/short password           | Public           | 400 according to password policy                                |
| AUTH-005 | Login valid credentials                | Public           | Access token returned/set as designed; refresh cookie created   |
| AUTH-006 | Login invalid password                 | Public           | Generic unauthorized response; no user enumeration              |
| AUTH-007 | Login unknown email                    | Public           | Same observable response as invalid password                    |
| AUTH-008 | Refresh valid session                  | Auth cookie      | New access token and rotated refresh session                    |
| AUTH-009 | Reuse old refresh token after rotation | Auth cookie      | Rejected; reuse handling follows policy                         |
| AUTH-010 | Refresh expired token                  | Auth cookie      | 401 and cookie cleared where appropriate                        |
| AUTH-011 | Logout current session                 | Authenticated    | Session revoked and cookie cleared                              |
| AUTH-012 | Use access token after logout          | Authenticated    | Behavior matches token lifetime policy; refresh remains revoked |
| AUTH-013 | Request `/auth/me`                     | Authenticated    | User and workspace memberships returned correctly               |
| AUTH-014 | Request protected route without JWT    | Public           | 401                                                             |
| AUTH-015 | Use malformed JWT                      | Public           | 401 without stack leak                                          |
| AUTH-016 | Use token signed with wrong secret     | Public           | 401                                                             |
| AUTH-017 | Create additional workspace            | Authenticated    | Creator receives OWNER membership                               |
| AUTH-018 | Create workspace with duplicate name   | Authenticated    | Allowed or rejected according to defined rule                   |
| AUTH-019 | List workspaces                        | Authenticated    | Only memberships for current user are returned                  |
| AUTH-020 | Access workspace without membership    | Outsider         | 404 or 403 consistently; no metadata leak                       |
| AUTH-021 | List members                           | VIEWER           | Read allowed if designed                                        |
| AUTH-022 | Add member                             | OWNER/ADMIN      | Membership created                                              |
| AUTH-023 | Add member                             | DEVELOPER/VIEWER | Forbidden                                                       |
| AUTH-024 | Update role                            | OWNER/ADMIN      | Role changes according to hierarchy rules                       |
| AUTH-025 | Demote only OWNER                      | OWNER            | Rejected to avoid ownerless workspace                           |
| AUTH-026 | Remove self as only OWNER              | OWNER            | Rejected                                                        |
| AUTH-027 | Remove member                          | OWNER/ADMIN      | Membership removed; access immediately blocked                  |
| AUTH-028 | Add same member twice                  | OWNER/ADMIN      | Duplicate rejected                                              |
| AUTH-029 | Concurrent workspace creation          | Authenticated    | Both transactions remain valid and isolated                     |
| AUTH-030 | Cookie attributes in production        | Authenticated    | HttpOnly, Secure, correct SameSite and Path                     |

### UI/E2E Test Cases

- [ ] Registration form validates required fields.
- [ ] Password visibility and autocomplete attributes are safe.
- [ ] Login error does not reveal whether account exists.
- [ ] Refresh keeps user on the same protected page.
- [ ] Logout returns to login and browser back does not expose protected content.
- [ ] Dashboard lists all authorized workspaces.
- [ ] New-workspace form prevents duplicate submit.
- [ ] Workspace switch changes route IDs and displayed data.
- [ ] Member page displays roles and prevents unauthorized controls.
- [ ] Removed member loses access after refresh and on direct URL navigation.

---

## Phase 5 — SaaS Application Registry

### Application CRUD

| ID      | Scenario                                         | Expected Result                                 |
| ------- | ------------------------------------------------ | ----------------------------------------------- |
| APP-001 | Create application with all valid fields         | Application appears in active list              |
| APP-002 | Create with only required fields                 | Defaults are applied correctly                  |
| APP-003 | Submit empty/whitespace name                     | Rejected                                        |
| APP-004 | Submit name at maximum length                    | Accepted                                        |
| APP-005 | Submit name above maximum                        | Rejected                                        |
| APP-006 | Create duplicate slug/name if unique rule exists | Defined conflict behavior                       |
| APP-007 | Get application by valid ID                      | Complete detail returned                        |
| APP-008 | Get application from another workspace           | Not found/forbidden without leakage             |
| APP-009 | Update status                                    | Status changes and activity record is written   |
| APP-010 | Update priority                                  | Priority changes and activity record is written |
| APP-011 | Update nullable dates to null                    | Values clear correctly                          |
| APP-012 | Send invalid enum                                | 400                                             |
| APP-013 | Archive application                              | Hidden from active list; archivedAt set         |
| APP-014 | Update archived application                      | Rejected unless explicitly permitted            |
| APP-015 | Restore application                              | Returns to active list                          |
| APP-016 | Permanent delete as OWNER                        | Application and defined children are removed    |
| APP-017 | Permanent delete as ADMIN/DEVELOPER/VIEWER       | Forbidden                                       |
| APP-018 | List with pagination                             | Stable page size and metadata                   |
| APP-019 | Search case-insensitively                        | Matching applications returned                  |
| APP-020 | Combine status/category/priority filters         | Correct intersection                            |
| APP-021 | Sort by supported columns                        | Deterministic order                             |
| APP-022 | Unsupported sort field                           | Rejected or ignored safely                      |
| APP-023 | Page below 1 or limit above max                  | Validation error                                |
| APP-024 | Empty result                                     | Correct empty response and UI                   |

### Technologies

- [ ] Add valid technology.
- [ ] Reject empty name/type.
- [ ] Reject invalid enum.
- [ ] Update technology.
- [ ] Remove technology.
- [ ] Attempt to modify technology from another application/workspace.
- [ ] Add duplicate technology and verify defined behavior.
- [ ] Verify activity record for add/update/remove.

### Links

- [ ] Add production, staging, repository, documentation, design, API, and other links.
- [ ] Reject unsupported protocol such as `javascript:`.
- [ ] Accept valid `https://` URLs.
- [ ] Validate maximum label/URL lengths.
- [ ] Update and remove links.
- [ ] Cross-application link ID is rejected.
- [ ] Verify activity record for each change.

### Frontend Pages

```text
/workspaces/{workspaceId}/applications
/workspaces/{workspaceId}/applications/new
/workspaces/{workspaceId}/applications/{applicationId}
/workspaces/{workspaceId}/applications/{applicationId}/edit
/workspaces/{workspaceId}/applications/{applicationId}/settings
```

Checklist:

- [ ] Search, filters, pagination, and archive view work together.
- [ ] URL and displayed workspace stay synchronized.
- [ ] Card links use the correct workspace and application IDs.
- [ ] Form preserves user input after server error.
- [ ] Detail page handles deleted/not-found application.
- [ ] Viewer sees read-only controls.
- [ ] Destructive settings require confirmation.

---

## Phase 6 — Activity and Audit History

| ID      | Scenario                              | Expected Result                                    |
| ------- | ------------------------------------- | -------------------------------------------------- |
| ACT-001 | Create application                    | `APPLICATION_CREATED` record                       |
| ACT-002 | Update application                    | `APPLICATION_UPDATED` with changed fields          |
| ACT-003 | Change status                         | Previous/current status in metadata                |
| ACT-004 | Change priority                       | Previous/current priority in metadata              |
| ACT-005 | Archive/restore                       | Correct activity type                              |
| ACT-006 | Add/update/remove technology          | Correct entity type and ID                         |
| ACT-007 | Add/update/remove link                | Correct entity type and ID                         |
| ACT-008 | Development action                    | Correct milestone/task/blocker activity            |
| ACT-009 | Website action                        | Correct website activity                           |
| ACT-010 | Failed business operation             | No false activity record                           |
| ACT-011 | Transaction rollback                  | Activity and business write both roll back         |
| ACT-012 | Actor deleted later                   | History remains readable with nullable actor       |
| ACT-013 | Filter by type/entity/user/date       | Correct results                                    |
| ACT-014 | Paginate history                      | Stable chronological ordering                      |
| ACT-015 | Cross-workspace query                 | No leaked activity                                 |
| ACT-016 | Metadata contains secrets             | Tokens, cookies, and full tracking keys are absent |
| ACT-017 | Very long description/metadata        | Safely limited or accepted within DB constraints   |
| ACT-018 | UI displays unknown/new activity type | Safe fallback rendering                            |

Frontend checklist:

- [ ] Timeline loading, empty, error, and pagination states.
- [ ] Human-readable labels for all Phase 5–8 event types.
- [ ] Correct icon and badge per entity/action.
- [ ] Metadata expansion does not execute HTML.
- [ ] Long activity descriptions wrap correctly.

---

## Phase 7 — Milestones, Tasks, Blockers, and Progress

### Development Templates

| ID      | Scenario                                             | Expected Result                                        |
| ------- | ---------------------------------------------------- | ------------------------------------------------------ |
| DEV-001 | List templates                                       | All five templates returned                            |
| DEV-002 | Apply template to empty application                  | Milestones and tasks created in order                  |
| DEV-003 | Apply template when milestones exist without replace | Conflict                                               |
| DEV-004 | Apply with replace confirmation                      | Existing milestones/tasks/blockers replaced atomically |
| DEV-005 | Apply template to archived application               | Rejected                                               |
| DEV-006 | Apply invalid template enum                          | 400                                                    |
| DEV-007 | Template failure mid-transaction                     | No partial milestones/tasks                            |

### Milestones

- [ ] Create with valid name, weight, start, and due date.
- [ ] Reject weight below 1 and above 100.
- [ ] Reject due date before start date.
- [ ] Update title, description, dates, and weight.
- [ ] Reorder with complete valid ID list.
- [ ] Reject reorder with missing, duplicate, foreign, or extra IDs.
- [ ] Complete milestone with no blockers.
- [ ] Reject completion with open milestone/task blocker.
- [ ] Reopen completed milestone.
- [ ] Skip with mandatory reason.
- [ ] Reopen skipped milestone.
- [ ] Delete milestone and normalize remaining positions.
- [ ] Verify activity records.

### Tasks

- [ ] Create task under valid milestone.
- [ ] Reject task under skipped milestone.
- [ ] Validate title, weight, priority, and due date boundaries.
- [ ] Assign workspace member.
- [ ] Reject non-member assignee.
- [ ] Update task.
- [ ] Move between milestones.
- [ ] Reject move into skipped milestone.
- [ ] Reorder tasks with a complete ID list.
- [ ] Change status among TODO, IN_PROGRESS, and BLOCKED.
- [ ] Complete task without blockers.
- [ ] Reject completion with open blocker.
- [ ] Skip task with reason.
- [ ] Reopen completed/skipped task.
- [ ] Delete and normalize positions.
- [ ] Concurrent task moves do not create duplicate positions.

### Blockers

- [ ] Create application-level blocker.
- [ ] Create milestone-level blocker.
- [ ] Create task-level blocker.
- [ ] Reject task/milestone mismatch.
- [ ] Task becomes BLOCKED when blocker is attached.
- [ ] Resolve blocker with required resolution.
- [ ] Task returns to TODO only when no open blockers remain.
- [ ] Reopen blocker and verify task status.
- [ ] Delete blocker and release task if appropriate.
- [ ] Filter blocker list by state, severity, and search.

### Progress Rules

Use deterministic fixtures:

| Milestone | Weight | Tasks                         | Expected Progress |
| --------- | -----: | ----------------------------- | ----------------: |
| A         |     20 | 2/2 completed                 |              100% |
| B         |     30 | 1 of 2 equal-weight completed |               50% |
| C         |     50 | skipped                       |          excluded |

Expected application progress:

```text
(20 × 100 + 30 × 50) / (20 + 30) = 70%
```

Checklist:

- [ ] Completed task contributes its weight.
- [ ] Skipped task is excluded.
- [ ] Skipped milestone is excluded.
- [ ] Zero applicable task weight produces defined progress.
- [ ] Manual milestone completion behaves consistently.
- [ ] Changing task/milestone weight recalculates progress.
- [ ] Late blocker/status changes recalculate correctly.
- [ ] Application progress never falls below 0 or above 100.
- [ ] Repeated recalculation is idempotent.

### Frontend Development Page

- [ ] Apply-template flow and replacement confirmation.
- [ ] Create/edit/reorder milestone.
- [ ] Add/edit/move/reorder task.
- [ ] Kanban status change.
- [ ] Blocker creation and resolution.
- [ ] Overdue and upcoming task lists.
- [ ] Development timeline ordering.
- [ ] Progress bars update after server response.
- [ ] Read-only experience for VIEWER.
- [ ] Mobile layout supports horizontal Kanban without unusable clipping.

---

## Phase 8 — Website Management

### Website CRUD and Validation

| ID      | Scenario                                     | Expected Result                               |
| ------- | -------------------------------------------- | --------------------------------------------- |
| WEB-001 | Create valid production domain               | Website created and key returned once         |
| WEB-002 | Create `localhost:3000`                      | Accepted for local testing                    |
| WEB-003 | Create domain with protocol                  | Normalized to hostname[:port]                 |
| WEB-004 | Create domain with path/query/hash           | Rejected                                      |
| WEB-005 | Create wildcard domain                       | Rejected                                      |
| WEB-006 | Duplicate domain in same workspace           | Conflict                                      |
| WEB-007 | Same domain in different workspace           | Allowed                                       |
| WEB-008 | Valid IANA time zone                         | Accepted                                      |
| WEB-009 | Invalid time zone                            | Rejected                                      |
| WEB-010 | Blank allowed origins                        | Default origin generated                      |
| WEB-011 | Valid multiple origins                       | Normalized and deduplicated                   |
| WEB-012 | Origin with path or credentials              | Rejected                                      |
| WEB-013 | More than maximum origins                    | Rejected                                      |
| WEB-014 | Connect to same-workspace active application | Connected                                     |
| WEB-015 | Connect to foreign workspace application     | Not found/forbidden                           |
| WEB-016 | Connect to archived application              | Rejected                                      |
| WEB-017 | Disconnect                                   | applicationId cleared                         |
| WEB-018 | Disable                                      | New events rejected                           |
| WEB-019 | Enable active website                        | New events accepted                           |
| WEB-020 | Archive                                      | disabled and archivedAt set                   |
| WEB-021 | Modify archived website                      | Rejected                                      |
| WEB-022 | Restore                                      | archivedAt cleared; remains disabled          |
| WEB-023 | Rotate key                                   | New key returned; old key invalid immediately |
| WEB-024 | Retrieve website detail                      | Full key is never returned                    |
| WEB-025 | Search/filter/paginate                       | Correct results and metadata                  |

### Tracking-Key Security

- [ ] Raw key exists only in creation/rotation response.
- [ ] Database stores hash and prefix, never raw key.
- [ ] Logs do not print raw key.
- [ ] Activity metadata contains prefix only.
- [ ] Session storage behavior on frontend is understood and tested.
- [ ] Refreshing installation page after session storage clears explains how to rotate.
- [ ] Clipboard actions work over secure context.
- [ ] Rotation requires ADMIN/OWNER if configured.

### Frontend Website Pages

```text
/workspaces/{workspaceId}/websites
/workspaces/{workspaceId}/websites/new
/workspaces/{workspaceId}/websites/{websiteId}
/workspaces/{workspaceId}/websites/{websiteId}/edit
/workspaces/{workspaceId}/websites/{websiteId}/installation
/workspaces/{workspaceId}/websites/{websiteId}/settings
```

Checklist:

- [ ] List filters: active/archived, enabled/disabled, connected/unconnected.
- [ ] Create form loads applications.
- [ ] Created key appears once.
- [ ] Installation snippet contains correct website ID, endpoint, and key.
- [ ] Edit form does not silently change application connection.
- [ ] Settings connect/disconnect actions update correctly.
- [ ] Archive/restore and enable/disable controls reflect state.
- [ ] Long domains/origins wrap without layout break.

---

## Phase 9 — Tracker SDK and Event Ingestion

## Tracker SDK Functional Cases

| ID      | Scenario                         | Expected Result                                  |
| ------- | -------------------------------- | ------------------------------------------------ |
| TRK-001 | Load script asynchronously       | Host page remains interactive                    |
| TRK-002 | First load                       | One page-view event queued/sent                  |
| TRK-003 | Reload page                      | Same visitor, valid session according to timeout |
| TRK-004 | Inactivity beyond timeout        | New session ID                                   |
| TRK-005 | SPA `pushState` navigation       | New page view                                    |
| TRK-006 | SPA `replaceState` navigation    | New page view when URL changes                   |
| TRK-007 | Browser back/forward             | New page view                                    |
| TRK-008 | Hash navigation                  | Defined page-view behavior                       |
| TRK-009 | Same URL notified repeatedly     | Duplicate route view suppressed as designed      |
| TRK-010 | Visible page heartbeat           | Heartbeat sent with bounded duration             |
| TRK-011 | Hidden tab                       | No repeated visible heartbeat inflation          |
| TRK-012 | `pagehide`                       | Beacon/keepalive flush attempted                 |
| TRK-013 | Custom event valid name          | CUSTOM event sent                                |
| TRK-014 | Invalid custom-event name        | Ignored safely                                   |
| TRK-015 | Sensitive property keys          | Removed                                          |
| TRK-016 | Arrays/strings above limits      | Truncated                                        |
| TRK-017 | Local storage unavailable        | Tracker fails silently or uses safe fallback     |
| TRK-018 | Browser offline                  | Events remain queued                             |
| TRK-019 | Browser returns online           | Queue flushes                                    |
| TRK-020 | Queue above max                  | Oldest events dropped according to policy        |
| TRK-021 | Batch reaches threshold          | Flush occurs                                     |
| TRK-022 | Network endpoint fails           | Host page remains unaffected                     |
| TRK-023 | DNT enabled                      | No tracking by default                           |
| TRK-024 | Consent required and not granted | No tracking                                      |
| TRK-025 | Consent granted                  | Tracking starts                                  |
| TRK-026 | Consent denied after grant       | Tracking stops and queue clears                  |
| TRK-027 | Script included twice            | Tracker initializes once                         |
| TRK-028 | Invalid/missing data attributes  | Tracker exits without host error                 |
| TRK-029 | Host has strict CSP              | Document required CSP integration behavior       |
| TRK-030 | Ad blocker blocks tracker        | Host application continues normally              |

## Public Ingestion API Cases

Expected route:

```text
POST /api/v1/collect
```

| ID      | Scenario                               | Expected Result                                   |
| ------- | -------------------------------------- | ------------------------------------------------- |
| ING-001 | Valid batch                            | 202 with accepted count                           |
| ING-002 | Duplicate event IDs                    | Duplicates counted/ignored                        |
| ING-003 | Invalid website UUID                   | 400                                               |
| ING-004 | Unknown website                        | Unauthorized or not found per policy              |
| ING-005 | Invalid key format                     | 401                                               |
| ING-006 | Valid prefix, wrong secret             | 401                                               |
| ING-007 | Old rotated key                        | 401                                               |
| ING-008 | Disabled website                       | 403                                               |
| ING-009 | Archived website                       | 403                                               |
| ING-010 | Missing Origin                         | Rejected unless originless mode enabled           |
| ING-011 | Allowed Origin                         | Accepted                                          |
| ING-012 | Disallowed Origin                      | 403                                               |
| ING-013 | URL origin differs from request Origin | 400                                               |
| ING-014 | Payload over body limit                | 413                                               |
| ING-015 | More than 25 events                    | 400                                               |
| ING-016 | Zero events                            | 400                                               |
| ING-017 | Unknown fields                         | Rejected                                          |
| ING-018 | Future timestamp beyond tolerance      | 400                                               |
| ING-019 | Timestamp older than accepted window   | 400                                               |
| ING-020 | CUSTOM without eventName               | 400                                               |
| ING-021 | PAGE_VIEW with eventName               | 400                                               |
| ING-022 | Invalid screen dimensions              | 400                                               |
| ING-023 | Invalid time zone                      | Stored as null, not a request failure if designed |
| ING-024 | Sensitive URL query parameters         | Removed before persistence                        |
| ING-025 | URL fragment and credentials           | Removed                                           |
| ING-026 | Sensitive custom properties            | Removed                                           |
| ING-027 | `__proto__`/`constructor` properties   | Ignored; no prototype pollution                   |
| ING-028 | Rate limit exceeded                    | 429                                               |
| ING-029 | Same event IDs concurrently            | Exactly one stored                                |
| ING-030 | DB unavailable                         | Safe 5xx; no request data leaked                  |
| ING-031 | User-agent above limit                 | Truncated                                         |
| ING-032 | IP address                             | Only salted hash stored                           |
| ING-033 | Untrusted geo headers in development   | Country remains null                              |
| ING-034 | Trusted proxy geo header enabled       | Valid ISO code stored                             |
| ING-035 | Invalid geo code                       | Ignored                                           |

## Raw Event Admin APIs

Expected route family:

```text
GET /api/v1/workspaces/{workspaceId}/websites/{websiteId}/tracking/status
GET /api/v1/workspaces/{workspaceId}/websites/{websiteId}/tracking/events
```

Checklist:

- [ ] Auth required.
- [ ] Workspace isolation.
- [ ] Website must belong to workspace.
- [ ] Filter by type, name, visitor, session, and date.
- [ ] Pagination boundaries.
- [ ] JSON properties render safely.
- [ ] No raw IP or tracking key appears.
- [ ] Status totals match database.
- [ ] Auto-refresh stops when component unmounts.

---

## Phase 10 — Analytics Normalization and Aggregation

## Visitor Processing

- [ ] One normalized visitor per `(websiteId, externalVisitorId)`.
- [ ] Same external visitor ID in another website creates a different visitor.
- [ ] First seen uses earliest event.
- [ ] Last seen uses latest event.
- [ ] Session, page-view, and event counts rebuild accurately.
- [ ] Reprocessing does not create duplicate visitors.

## Session Processing

| ID      | Scenario                                    | Expected Result                          |
| ------- | ------------------------------------------- | ---------------------------------------- |
| ANA-001 | Single page view, no engagement             | Bounce                                   |
| ANA-002 | Single page view + 15s heartbeat            | Not bounce                               |
| ANA-003 | Two page views                              | Not bounce                               |
| ANA-004 | One page + custom event                     | Not bounce                               |
| ANA-005 | Multiple heartbeats                         | Engaged duration sums within cap         |
| ANA-006 | Wall duration greater than heartbeat        | Duration uses greater defined value      |
| ANA-007 | Heartbeat duration above cap                | Duration capped                          |
| ANA-008 | Late earlier event                          | Session start/entry rebuilt              |
| ANA-009 | Late later event                            | Session end/exit rebuilt                 |
| ANA-010 | Events arrive out of order                  | Session ordered by occurredAt            |
| ANA-011 | Same external session ID in another website | Separate session                         |
| ANA-012 | Bot user agent                              | Device BOT                               |
| ANA-013 | Unknown user agent                          | Defined OTHER/UNKNOWN behavior           |
| ANA-014 | No page view, custom event only             | Session still valid with null entry/exit |
| ANA-015 | One page is both first and last             | isEntry and isExit both true             |

## URL and Source Normalization

- [ ] Duplicate slashes collapse.
- [ ] Trailing slash policy is consistent.
- [ ] UTM and click identifiers are removed.
- [ ] Non-tracking query parameters are retained and sorted.
- [ ] URL fragments are excluded.
- [ ] Direct referrer maps to DIRECT.
- [ ] Same-origin referrer maps to INTERNAL.
- [ ] Google/Bing/etc. map to SEARCH.
- [ ] Facebook/LinkedIn/etc. map to SOCIAL.
- [ ] Other external domain maps to REFERRAL.
- [ ] Malformed referrer maps to UNKNOWN.
- [ ] Source derives from first relevant session event/page.

## Aggregation

| ID      | Scenario                             | Expected Result                                    |
| ------- | ------------------------------------ | -------------------------------------------------- |
| AGG-001 | Build hourly overview                | Counts match normalized fixture                    |
| AGG-002 | Build daily overview                 | Counts match fixture                               |
| AGG-003 | Build PAGE dimension                 | Per-path values correct                            |
| AGG-004 | Build SOURCE dimension               | Per-source values correct                          |
| AGG-005 | Build COUNTRY dimension              | Null mapped to Unknown                             |
| AGG-006 | Build DEVICE dimension               | Device totals correct                              |
| AGG-007 | Build BROWSER dimension              | Browser totals correct                             |
| AGG-008 | Build OS dimension                   | OS totals correct                                  |
| AGG-009 | Build CUSTOM_EVENT dimension         | Event-name totals correct                          |
| AGG-010 | Rebuild same bucket twice            | No metric inflation                                |
| AGG-011 | Late event in old bucket             | Old bucket rebuilt                                 |
| AGG-012 | Website time zone UTC                | Correct UTC boundaries                             |
| AGG-013 | Website time zone Asia/Dubai         | Correct local-day boundaries                       |
| AGG-014 | DST spring-forward day               | Correct shortened local day                        |
| AGG-015 | DST fall-back hour                   | Correct repeated-hour handling                     |
| AGG-016 | Empty bucket                         | Existing stale aggregate removed or remains absent |
| AGG-017 | Large duration stored as BigInt      | API serialization is safe                          |
| AGG-018 | Exact unique visitors across buckets | UI/docs do not incorrectly sum bucket uniques      |

## Processing Scheduler and Manual Controls

- [ ] Scheduler skips when disabled.
- [ ] Scheduler processes enabled active websites with pending events.
- [ ] Scheduler does not overlap itself in one process.
- [ ] Multi-instance limitation is documented and load-tested.
- [ ] Manual process honors maxEvents.
- [ ] Processing state moves RUNNING → COMPLETED.
- [ ] Failure moves state to FAILED with safe error text.
- [ ] Reprocess validates date order.
- [ ] Reprocess rejects range above 31 days.
- [ ] Reprocess deletes/rebuilds only selected range.
- [ ] Retention deletes data older than configured thresholds only.
- [ ] Raw events are deleted only after successful normalization where required.
- [ ] Visitor cleanup removes only visitors with no remaining sessions.
- [ ] Concurrent manual and scheduled processing does not duplicate data.

## Analytics Engine Frontend

```text
/workspaces/{workspaceId}/websites/{websiteId}/analytics-engine
```

Checklist:

- [ ] Status counts match API.
- [ ] Pending count updates after processing.
- [ ] Manual process shows loading state.
- [ ] Processing failure displays safe message.
- [ ] Reprocess requires both dates and confirmation.
- [ ] Aggregate period/dimension/date controls work.
- [ ] Aggregate table formats duration and bounce rate correctly.
- [ ] Recent sessions display entry, source, device, duration, and bounce.
- [ ] Retention requires confirmation.
- [ ] Viewer cannot perform restricted actions.
- [ ] Large datasets paginate or remain bounded.

---

# Backend Test Cases

## Controller and DTO Validation

Test every controller with:

- [ ] Missing required fields.
- [ ] Empty strings.
- [ ] Whitespace-only strings.
- [ ] Minimum valid length.
- [ ] Maximum valid length.
- [ ] One character above maximum.
- [ ] Invalid UUID.
- [ ] Invalid enum.
- [ ] Null where not allowed.
- [ ] Unknown extra field.
- [ ] Incorrect primitive type.
- [ ] Arrays above limit.
- [ ] Duplicate array values.
- [ ] Invalid date.
- [ ] Date boundary and ordering.
- [ ] Pagination below/above limits.

## Authorization Guards

For every protected endpoint, execute the role matrix:

| Endpoint Type               | OWNER |                      ADMIN |            DEVELOPER | VIEWER | Outsider | Anonymous |
| --------------------------- | ----: | -------------------------: | -------------------: | -----: | -------: | --------: |
| Read workspace resource     | Allow |                      Allow |                Allow |  Allow |     Deny |       401 |
| Create/update application   | Allow |                      Allow |                Allow |   Deny |     Deny |       401 |
| Archive/restore application | Allow |                      Allow |              Defined |   Deny |     Deny |       401 |
| Permanent delete            | Allow |                       Deny |                 Deny |   Deny |     Deny |       401 |
| Manage members              | Allow | Allow with hierarchy rules |                 Deny |   Deny |     Deny |       401 |
| Manage websites             | Allow |                      Allow | Allow where designed |   Deny |     Deny |       401 |
| Rotate tracking key         | Allow |                      Allow |   Deny if admin-only |   Deny |     Deny |       401 |
| Analytics process           | Allow |                      Allow | Allow where designed |   Deny |     Deny |       401 |
| Reprocess/retention         | Allow |                      Allow |                 Deny |   Deny |     Deny |       401 |

## Service-Level Transaction Tests

- [ ] Business write and activity write commit together.
- [ ] Template replacement is atomic.
- [ ] Blocker resolution and task-state release are atomic.
- [ ] Website creation and tracking-key storage are atomic.
- [ ] Analytics batch processing is atomic per batch.
- [ ] Aggregate bucket replacement is atomic.
- [ ] Errors leave no partial child rows.

## Error Handling

- [ ] Validation errors use 400.
- [ ] Authentication errors use 401.
- [ ] Authorization errors use 403 or intentionally hidden 404.
- [ ] Duplicate records use 409.
- [ ] Missing records use 404.
- [ ] Oversized payloads use 413.
- [ ] Rate limits use 429.
- [ ] Internal errors do not reveal SQL, paths, stack traces, secrets, or user data.
- [ ] Correlation/request IDs are available in logs where configured.

---

# Frontend Test Cases

## Route Protection

- [ ] Anonymous access to protected page redirects to login.
- [ ] Logged-in access to auth pages redirects to dashboard where appropriate.
- [ ] Expired access token refreshes transparently.
- [ ] Failed refresh clears state and redirects once.
- [ ] Direct navigation to foreign workspace/resource shows safe not-found state.
- [ ] Browser back after logout does not reveal sensitive data.

## Forms

For every form:

- [ ] Required labels and accessible names.
- [ ] Client validation matches backend validation.
- [ ] Server errors display without losing input.
- [ ] Enter key submits once.
- [ ] Double click does not create duplicates.
- [ ] Loading state disables relevant controls.
- [ ] Cancel navigates without unintended save.
- [ ] Unsaved-change behavior is defined.
- [ ] Trim behavior is consistent.
- [ ] Maximum lengths are enforced or communicated.

## Lists and Tables

- [ ] Loading skeleton/spinner.
- [ ] Empty state.
- [ ] Error and retry state.
- [ ] Pagination next/previous boundaries.
- [ ] Search debounce or explicit submit behavior.
- [ ] Filter reset.
- [ ] Stable row/card keys.
- [ ] Long text truncation and tooltip/detail behavior.
- [ ] Keyboard-accessible actions.
- [ ] Mobile overflow strategy.

## Destructive Actions

- [ ] Confirmation describes impact.
- [ ] Cancel leaves data unchanged.
- [ ] Confirm sends one request.
- [ ] Failure preserves current UI state and shows error.
- [ ] Success redirects or refreshes predictably.
- [ ] Archived resources cannot be edited through stale UI.

## Accessibility

- [ ] One logical `h1` per page.
- [ ] Heading hierarchy is valid.
- [ ] Labels are connected to inputs.
- [ ] Error messages use `aria-describedby` or equivalent.
- [ ] Dialog focus is trapped and restored.
- [ ] Visible keyboard focus.
- [ ] Color is not the only status indicator.
- [ ] Contrast meets WCAG AA.
- [ ] Tables have semantic headers.
- [ ] Icons have accessible names or are hidden.
- [ ] Loading states announce changes where important.
- [ ] Reduced-motion preference is respected.

---

# API Test Cases

## API Contract Rules

Every endpoint should be tested for:

- [ ] Correct HTTP method.
- [ ] Correct path and route parameter names.
- [ ] Required authentication.
- [ ] Required role.
- [ ] Content-Type handling.
- [ ] Request schema.
- [ ] Response schema.
- [ ] Status code.
- [ ] Pagination metadata.
- [ ] Consistent date format.
- [ ] No unexpected fields or secrets.
- [ ] Idempotency behavior where applicable.
- [ ] CORS behavior.
- [ ] Rate limit behavior where applicable.
- [ ] OpenAPI document matches implementation.

## Primary Endpoint Matrix

### Authentication

```text
POST /api/v1/auth/register
POST /api/v1/auth/login
POST /api/v1/auth/refresh
POST /api/v1/auth/logout
GET  /api/v1/auth/me
```

### Workspaces and Members

```text
GET/POST /api/v1/workspaces
GET/PATCH /api/v1/workspaces/{workspaceId}
GET/POST /api/v1/workspaces/{workspaceId}/members
PATCH/DELETE /api/v1/workspaces/{workspaceId}/members/{memberId}
```

> Confirm exact member route names against Swagger.

### Applications

```text
GET/POST /api/v1/workspaces/{workspaceId}/applications
GET/PATCH/DELETE /api/v1/workspaces/{workspaceId}/applications/{applicationId}
POST /api/v1/workspaces/{workspaceId}/applications/{applicationId}/archive
POST /api/v1/workspaces/{workspaceId}/applications/{applicationId}/restore
```

### Technologies and Links

```text
POST /api/v1/workspaces/{workspaceId}/applications/{applicationId}/technologies
PATCH/DELETE .../technologies/{technologyId}

POST /api/v1/workspaces/{workspaceId}/applications/{applicationId}/links
PATCH/DELETE .../links/{linkId}
```

### Activity

```text
GET /api/v1/workspaces/{workspaceId}/applications/{applicationId}/activities
```

> Confirm exact route against Swagger.

### Development

```text
GET  .../development/summary
POST .../development/apply-template
GET/POST .../development/milestones
PATCH/DELETE .../development/milestones/{milestoneId}
POST .../development/milestones/{milestoneId}/complete
POST .../development/milestones/{milestoneId}/reopen
POST .../development/milestones/{milestoneId}/skip
POST .../development/milestones/reorder

POST .../development/milestones/{milestoneId}/tasks
PATCH/DELETE .../development/tasks/{taskId}
POST .../development/tasks/{taskId}/status
POST .../development/tasks/{taskId}/complete
POST .../development/tasks/{taskId}/reopen
POST .../development/tasks/{taskId}/skip
POST .../development/tasks/{taskId}/move
POST .../development/milestones/{milestoneId}/tasks/reorder

GET/POST .../development/blockers
PATCH/DELETE .../development/blockers/{blockerId}
POST .../development/blockers/{blockerId}/resolve
POST .../development/blockers/{blockerId}/reopen
```

### Websites

```text
POST  /api/v1/workspaces/{workspaceId}/websites
GET   /api/v1/workspaces/{workspaceId}/websites
GET   /api/v1/workspaces/{workspaceId}/websites/{websiteId}
PATCH /api/v1/workspaces/{workspaceId}/websites/{websiteId}
POST  /api/v1/workspaces/{workspaceId}/websites/{websiteId}/enable
POST  /api/v1/workspaces/{workspaceId}/websites/{websiteId}/disable
POST  /api/v1/workspaces/{workspaceId}/websites/{websiteId}/archive
POST  /api/v1/workspaces/{workspaceId}/websites/{websiteId}/restore
POST  /api/v1/workspaces/{workspaceId}/websites/{websiteId}/rotate-key
POST  /api/v1/workspaces/{workspaceId}/websites/{websiteId}/connect
POST  /api/v1/workspaces/{workspaceId}/websites/{websiteId}/disconnect
```

### Tracking

```text
POST /api/v1/collect
GET  /api/v1/workspaces/{workspaceId}/websites/{websiteId}/tracking/status
GET  /api/v1/workspaces/{workspaceId}/websites/{websiteId}/tracking/events
```

### Analytics Engine

```text
GET  /api/v1/workspaces/{workspaceId}/websites/{websiteId}/analytics-engine/status
GET  /api/v1/workspaces/{workspaceId}/websites/{websiteId}/analytics-engine/aggregates
POST /api/v1/workspaces/{workspaceId}/websites/{websiteId}/analytics-engine/process
POST /api/v1/workspaces/{workspaceId}/websites/{websiteId}/analytics-engine/reprocess
POST /api/v1/workspaces/{workspaceId}/websites/{websiteId}/analytics-engine/retention
```

---

# User Flow Test Cases

## UF-01 — New User Onboarding

```text
Register
→ Initial workspace is created
→ Dashboard loads
→ User sees OWNER role
→ Create first application
```

Checks:

- [ ] No duplicate workspace or membership.
- [ ] Auth cookie and access token work.
- [ ] Refresh preserves onboarding state.
- [ ] Application belongs to the created workspace.

## UF-02 — Multiple Workspace Management

```text
Create Workspace Alpha
→ Create application “Portal”
→ Create Workspace Beta
→ Create another “Portal”
→ Switch workspaces
```

Checks:

- [ ] Each workspace shows only its own application.
- [ ] Direct foreign URLs are rejected.
- [ ] Dashboard counts are workspace-aware.
- [ ] Selected workspace persists according to design.

## UF-03 — Team and Role Workflow

```text
Owner adds Admin, Developer, Viewer
→ Admin manages membership
→ Developer edits application
→ Viewer attempts write
→ Owner removes Developer
```

Checks:

- [ ] Permissions match role matrix.
- [ ] Removal revokes access.
- [ ] Audit history records supported changes.
- [ ] Last-owner safeguards work.

## UF-04 — Complete Application Lifecycle

```text
Create application
→ Add technologies
→ Add links
→ Edit status and priority
→ Archive
→ Restore
→ Delete as owner
```

Checks:

- [ ] Every state is visible in UI and DB.
- [ ] Activity history is correct.
- [ ] Archived application rules are enforced.
- [ ] Delete cascade/preservation behavior is correct.

## UF-05 — Development Planning Workflow

```text
Apply AI SaaS template
→ Add custom milestone
→ Assign tasks
→ Start work
→ Add blocker
→ Attempt completion
→ Resolve blocker
→ Complete tasks
→ Verify progress
```

Checks:

- [ ] Template counts are correct.
- [ ] Blocker prevents completion.
- [ ] Progress excludes skipped work.
- [ ] Kanban and timeline remain synchronized.

## UF-06 — Website Setup Workflow

```text
Create website
→ Copy key
→ Open installation page
→ Connect to application
→ Edit origins/time zone
→ Rotate key
```

Checks:

- [ ] Key is shown only when expected.
- [ ] Old key stops working.
- [ ] New installation snippet is correct.
- [ ] Activity history contains website events.

## UF-07 — End-to-End Analytics Workflow

```text
Install tracker on test host
→ Visit pages
→ Navigate SPA routes
→ Wait for heartbeat
→ Send custom event
→ View raw events
→ Process analytics
→ View normalized sessions and aggregates
```

Checks:

- [ ] Visitor/session IDs are stable.
- [ ] Raw event count matches sent fixtures.
- [ ] Sensitive data is removed.
- [ ] Pending count becomes zero.
- [ ] Aggregate totals match fixture expectations.

## UF-08 — Offline Tracker Workflow

```text
Open tracked host
→ Disable network
→ Navigate and emit events
→ Re-enable network
→ Wait for flush
```

Checks:

- [ ] Host remains functional.
- [ ] Queue persists within policy.
- [ ] Events eventually arrive once.
- [ ] Deduplication prevents inflation.

## UF-09 — Late Event and Reprocessing Workflow

```text
Process initial events
→ Send a late earlier event
→ Process again
→ Reprocess selected date range
```

Checks:

- [ ] Entry/session start changes correctly.
- [ ] Affected buckets rebuild.
- [ ] No duplicate normalized events.
- [ ] Unrelated date buckets remain unchanged.

## UF-10 — Website Security Lifecycle

```text
Disable website
→ Send event
→ Enable website
→ Send event
→ Archive website
→ Send event
→ Restore website
→ Send event before enabling
```

Checks:

- [ ] Only enabled, unarchived state accepts events.
- [ ] Restore does not silently enable tracking.

---

# Edge Cases and Boundary Conditions

## Authentication

- [ ] Email with uppercase characters.
- [ ] Leading/trailing spaces in email.
- [ ] Very long password.
- [ ] Unicode password.
- [ ] Simultaneous refresh requests.
- [ ] Refresh exactly at expiry.
- [ ] Revoked session used on another device.
- [ ] Clock skew between client and server.
- [ ] User removed from workspace while page is open.

## Workspaces and Applications

- [ ] Zero workspaces after an account-state anomaly.
- [ ] Hundreds of workspaces.
- [ ] 10,000 applications in one workspace.
- [ ] Unicode and emoji in names/descriptions.
- [ ] Same slug/name in separate workspaces.
- [ ] Archived parent with active child records.
- [ ] Concurrent updates and last-write behavior.
- [ ] Delete while another user is editing.

## Development

- [ ] Milestone with no tasks.
- [ ] All tasks skipped.
- [ ] All milestones skipped.
- [ ] Weights at 1 and 100.
- [ ] Extremely unbalanced weights.
- [ ] Due date exactly equal to start date.
- [ ] Task due at current time.
- [ ] Multiple blockers on one task.
- [ ] Move task into same milestone.
- [ ] Concurrent reorders.
- [ ] Deleted assignee.
- [ ] Template replacement with many child records.

## Websites and Tracker

- [ ] Internationalized/punycode domain.
- [ ] IPv4 and IPv6 local origins.
- [ ] Port 80/443 normalization.
- [ ] Origin case normalization.
- [ ] Browser private mode.
- [ ] localStorage quota exceeded.
- [ ] sendBeacon unavailable.
- [ ] fetch unavailable or blocked.
- [ ] Browser closes during flush.
- [ ] 100 queued events.
- [ ] Multiple tabs using same visitor/session.
- [ ] Session timeout while tab sleeps.
- [ ] Title/referrer at maximum lengths.
- [ ] Malformed URL and malformed referrer.
- [ ] Browser with DNT value variations.

## Analytics

- [ ] No page views, only custom events.
- [ ] Only heartbeats.
- [ ] Events with same occurredAt.
- [ ] ReceivedAt order differs from occurredAt order.
- [ ] Event exactly at bucket start.
- [ ] Event exactly at bucket end.
- [ ] Website time zone changed after historical data exists.
- [ ] DST gap and repeated local hour.
- [ ] Leap day.
- [ ] Month/year boundary.
- [ ] BigInt duration near serialization boundary.
- [ ] Empty aggregate after data deletion.
- [ ] Retention cutoff equality.
- [ ] Failed processing run followed by retry.
- [ ] Scheduler and manual process start simultaneously.

---

# Security Test Cases

## Authentication and Session Security

- [ ] Passwords are hashed with an approved algorithm.
- [ ] Refresh tokens are stored only as hashes.
- [ ] Raw refresh token never appears in DB/logs.
- [ ] Refresh tokens rotate.
- [ ] Replayed old refresh token is rejected.
- [ ] Logout revokes session.
- [ ] Cookies are HttpOnly.
- [ ] Secure cookie is enabled in production.
- [ ] SameSite policy is correct.
- [ ] Cookie path is minimal.
- [ ] Access tokens are not persisted in localStorage.
- [ ] Brute-force/rate protection exists on auth endpoints.
- [ ] Error timing/messages do not enable user enumeration.

## Authorization and Tenant Isolation

Execute every resource endpoint with:

- Owner from correct workspace.
- Member with each role.
- User from another workspace.
- Authenticated user with no membership.
- Anonymous user.
- Valid resource ID from another workspace.
- Valid child ID paired with the wrong parent ID.

Checks:

- [ ] No IDOR.
- [ ] No cross-workspace list leakage.
- [ ] No cross-application child modification.
- [ ] Hidden resources do not reveal names or existence.
- [ ] Backend enforcement does not depend on hidden frontend controls.

## Input and Output Security

- [ ] SQL injection strings in all text/search fields.
- [ ] Stored XSS payloads in names, descriptions, titles, URLs, event names, and properties.
- [ ] Reflected XSS through query parameters.
- [ ] `javascript:` and `data:` URLs rejected where links are clickable.
- [ ] HTML is rendered as text.
- [ ] Prototype-pollution keys are rejected or ignored.
- [ ] Mass-assignment fields such as `workspaceId`, `ownerId`, role, hash, and archivedAt cannot be overwritten.
- [ ] Error responses reveal no stack, query, file path, or secret.
- [ ] CSV/formula injection is considered for future export features.

## Tracking and Ingestion Security

- [ ] Tracking key compared safely.
- [ ] Old rotated key rejected.
- [ ] Full key absent from GET responses.
- [ ] Allowed origins strictly validated.
- [ ] Dashboard CORS is restricted.
- [ ] Public collect endpoint does not allow credentials.
- [ ] Oversized payload rejected before expensive processing.
- [ ] Rate limit cannot be trivially bypassed by malformed headers.
- [ ] User-supplied geo headers are ignored unless behind trusted proxy.
- [ ] Raw IP is never persisted.
- [ ] Sensitive query parameters are removed.
- [ ] Form values/DOM content are never captured.
- [ ] Custom property sensitive names are dropped.
- [ ] Event timestamps are bounded.
- [ ] Reprocess max range prevents resource abuse.

## Browser and Platform Security Headers

Validate production responses:

- [ ] Content-Security-Policy.
- [ ] Strict-Transport-Security.
- [ ] X-Content-Type-Options.
- [ ] Referrer-Policy.
- [ ] Permissions-Policy.
- [ ] Frame protection via CSP `frame-ancestors`.
- [ ] No sensitive caching on authenticated pages.
- [ ] Source maps are handled according to deployment policy.

## Dependency and Supply Chain

- [ ] Lockfile committed.
- [ ] Dependency audit reviewed.
- [ ] No unexpected install scripts.
- [ ] Tracker bundle contains no server secrets.
- [ ] SBOM generated where required.
- [ ] CI secrets are masked.
- [ ] Production image runs as non-root where applicable.

---

# Performance Test Cases

## Proposed Performance Targets

These are initial acceptance targets and should be calibrated against production infrastructure.

| Operation                              |                  Proposed Target |
| -------------------------------------- | -------------------------------: |
| Login API p95                          |                         < 500 ms |
| Standard authenticated CRUD p95        |                         < 400 ms |
| Paginated list p95 with realistic data |                         < 700 ms |
| Public collect API p95                 |                         < 150 ms |
| Public collect API p99                 |                         < 400 ms |
| Tracker gzipped bundle                 |                          ≤ 12 KB |
| Tracker main-thread blocking           |       < 50 ms on mid-tier device |
| Raw-event admin query p95              |                            < 1 s |
| 30-day aggregate query p95             |                            < 1 s |
| Process 5,000 events                   |       < 30 s on staging baseline |
| Frontend LCP on dashboard              | < 2.5 s on standard test profile |
| Frontend CLS                           |                            < 0.1 |

## API Load Profiles

### Baseline

```text
20 virtual users
10 minutes
Normal CRUD mix
No error rate above 1%
```

### Ingestion Load

```text
Start: 25 requests/second
Ramp: 100 requests/second
Stress: 250 requests/second
Spike: 500 requests/second for 30 seconds
Batch size mix: 1, 10, 25 events
```

Validate:

- [ ] Response latency.
- [ ] 202/429 distribution.
- [ ] CPU and memory.
- [ ] Database connections.
- [ ] Event loss.
- [ ] Duplicate handling.
- [ ] Recovery after spike.

### Analytics Processing

Seed:

```text
10 websites
100,000 raw events
10,000 visitors
20,000 sessions
30 days of data
```

Validate:

- [ ] Throughput.
- [ ] Memory stability.
- [ ] No event duplication.
- [ ] Scheduler fairness across websites.
- [ ] Aggregate query latency.
- [ ] Reprocessing latency.
- [ ] Lock/contention behavior.

## Frontend Performance

- [ ] Lighthouse or equivalent production-build audit.
- [ ] Route bundle sizes.
- [ ] No unnecessary full-page refetch loops.
- [ ] Large lists remain responsive.
- [ ] Tracking status polling stops on unmount.
- [ ] Analytics table remains responsive at maximum returned rows.
- [ ] Images/icons do not cause layout shift.
- [ ] Slow 3G loading states remain usable.

## Soak Testing

Run 4–8 hours:

- [ ] Continuous ingestion.
- [ ] Scheduler processing.
- [ ] Periodic dashboard queries.
- [ ] No memory growth indicating leaks.
- [ ] No database connection exhaustion.
- [ ] No unbounded rate-limit map growth.
- [ ] No event backlog growth under target load.

---

# Responsive and Cross-Browser Testing

## Browser Matrix

| Platform   | Browser                   |
| ---------- | ------------------------- |
| Windows 11 | Chrome, Edge, Firefox     |
| macOS      | Safari, Chrome            |
| iOS        | Mobile Safari             |
| Android    | Chrome                    |
| CI         | Chromium, Firefox, WebKit |

## Viewport Matrix

```text
360 × 800
390 × 844
768 × 1024
1024 × 768
1280 × 800
1440 × 900
1920 × 1080
```

## Responsive Checklist

- [ ] Navigation remains accessible.
- [ ] Cards stack without overlap.
- [ ] Forms remain usable at 360px.
- [ ] Tables provide controlled horizontal scroll.
- [ ] Kanban columns remain understandable.
- [ ] Buttons remain tappable.
- [ ] Dialogs fit the viewport.
- [ ] Toast/error messages are not clipped.
- [ ] Long URLs/domains wrap.
- [ ] No body-level horizontal overflow.
- [ ] Browser zoom at 200% remains usable.

## Tracker Cross-Browser Checklist

- [ ] localStorage behavior.
- [ ] `crypto.randomUUID` fallback.
- [ ] `navigator.sendBeacon`.
- [ ] `fetch` keepalive/no-cors.
- [ ] History API patching.
- [ ] Visibility and pagehide events.
- [ ] DNT behavior.
- [ ] Consent behavior.
- [ ] Private/incognito mode.
- [ ] Third-party/ad-blocking interference.

---

# Database Test Cases

## Data Integrity

- [ ] All foreign keys exist.
- [ ] All composite unique constraints exist.
- [ ] Required indexes exist.
- [ ] String lengths match DTO limits.
- [ ] Enum values match frontend/backend constants.
- [ ] Archive fields preserve history.
- [ ] SetNull relationships behave correctly.
- [ ] Cascades do not delete unrelated workspace data.
- [ ] Tracking key hash and prefix uniqueness are enforced.
- [ ] Raw event unique `(websiteId, eventId)` enforced.
- [ ] Normalized event unique `(websiteId, sourceEventId)` enforced.
- [ ] Visitor/session composite uniqueness enforced.
- [ ] Aggregate bucket uniqueness enforced.

## Query and Index Verification

Run `EXPLAIN ANALYZE` for:

- [ ] Workspace application list.
- [ ] Activity timeline.
- [ ] Development summary.
- [ ] Website list.
- [ ] Raw events by website/date/type.
- [ ] Pending raw events.
- [ ] Session by website/date.
- [ ] Page views by path/date.
- [ ] Hourly/daily aggregate range queries.
- [ ] Retention deletes.

## Migration Safety

- [ ] Upgrade populated Phase 1–9 database to Phase 10.
- [ ] Verify existing rows remain valid.
- [ ] Verify defaults and nullable columns.
- [ ] Measure lock duration on large event tables.
- [ ] Test migration in staging clone.
- [ ] Document rollback or forward-fix plan.
- [ ] Verify backup immediately before migration.

---

# Integration Test Cases

## Frontend ↔ API

- [ ] API client serializes query parameters correctly.
- [ ] Null and optional date fields match DTO behavior.
- [ ] Pagination field names match frontend types.
- [ ] Error messages are handled.
- [ ] 401 refresh/retry works on every feature API.
- [ ] 403/404 states render safely.
- [ ] Enum labels match API enums.
- [ ] BigInt-like API fields are serializable.

## API ↔ Database

- [ ] Every create/read/update/archive/restore flow persists expected values.
- [ ] Transactions prevent partial records.
- [ ] Unique conflicts map to clear API errors.
- [ ] Delete behavior matches UI warning.
- [ ] Analytics processor updates processing state correctly.

## Tracker ↔ Ingestion

- [ ] Snippet endpoint matches environment.
- [ ] Content type accepted without preflight.
- [ ] Origin header matches allowed origin.
- [ ] Batch schema matches DTO.
- [ ] SDK version stored.
- [ ] Retry duplicates are ignored.

## Ingestion ↔ Analytics Engine

- [ ] Accepted raw event becomes pending.
- [ ] Processor creates visitor/session/event/page view.
- [ ] Raw event links to normalized event.
- [ ] Status pending count decrements.
- [ ] Aggregates rebuild.
- [ ] Raw retention does not delete unprocessed data.

---

# Test Coverage Checklist

## Foundation

- [ ] Monorepo scripts.
- [ ] Environment validation.
- [ ] Production builds.
- [ ] Production startup.
- [ ] Graceful shutdown.
- [ ] Clean migration.
- [ ] Backup/restore.

## Authentication and Authorization

- [ ] Registration.
- [ ] Login.
- [ ] Refresh rotation.
- [ ] Logout.
- [ ] Session expiry.
- [ ] Cookie security.
- [ ] Workspace creation.
- [ ] Workspace switching.
- [ ] Member management.
- [ ] All role matrices.
- [ ] Cross-workspace isolation.

## Application Registry

- [ ] CRUD.
- [ ] Search.
- [ ] Filters.
- [ ] Sorting.
- [ ] Pagination.
- [ ] Archive/restore.
- [ ] Permanent delete.
- [ ] Technologies.
- [ ] Links.
- [ ] Activity history.

## Development Tracking

- [ ] Templates.
- [ ] Milestones.
- [ ] Tasks.
- [ ] Assignees.
- [ ] Status changes.
- [ ] Reordering.
- [ ] Moving.
- [ ] Skipping/reopening.
- [ ] Blockers.
- [ ] Progress calculation.
- [ ] Overdue/upcoming.
- [ ] Kanban.
- [ ] Timeline.

## Websites

- [ ] Creation.
- [ ] Domain validation.
- [ ] Time-zone validation.
- [ ] Origin validation.
- [ ] Enable/disable.
- [ ] Archive/restore.
- [ ] Connect/disconnect.
- [ ] Key creation.
- [ ] Key rotation.
- [ ] Installation UI.

## Tracker and Ingestion

- [ ] Page views.
- [ ] SPA navigation.
- [ ] Heartbeats.
- [ ] Custom events.
- [ ] Visitor/session IDs.
- [ ] Batching.
- [ ] Offline queue.
- [ ] Consent.
- [ ] DNT.
- [ ] Silent failure.
- [ ] Origin validation.
- [ ] Key validation.
- [ ] Payload validation.
- [ ] Sanitization.
- [ ] Deduplication.
- [ ] Rate limiting.
- [ ] Raw-event viewer.

## Analytics Engine

- [ ] Visitors.
- [ ] Sessions.
- [ ] Page views.
- [ ] Entry/exit.
- [ ] Duration.
- [ ] Bounce.
- [ ] Sources.
- [ ] Country.
- [ ] Device/browser/OS.
- [ ] Hourly aggregates.
- [ ] Daily aggregates.
- [ ] All dimensions.
- [ ] Late events.
- [ ] Idempotency.
- [ ] Scheduler.
- [ ] Manual processing.
- [ ] Reprocessing.
- [ ] Retention.
- [ ] Engine UI.

## Non-Functional

- [ ] Accessibility.
- [ ] Responsive layout.
- [ ] Cross-browser.
- [ ] Performance.
- [ ] Load.
- [ ] Soak.
- [ ] Security.
- [ ] Dependency audit.
- [ ] Logging/privacy.

---

# Recommended Automated Test Suite Layout

```text
apps/api/
├── src/**/*.spec.ts
├── test/
│   ├── jest-e2e.json
│   ├── auth.e2e-spec.ts
│   ├── workspace.e2e-spec.ts
│   ├── applications.e2e-spec.ts
│   ├── activity.e2e-spec.ts
│   ├── development.e2e-spec.ts
│   ├── websites.e2e-spec.ts
│   ├── ingestion.e2e-spec.ts
│   ├── analytics-engine.e2e-spec.ts
│   └── helpers/
│       ├── database.ts
│       ├── auth.ts
│       ├── fixtures.ts
│       └── assertions.ts

apps/web/
├── src/**/*.test.tsx
└── e2e/
    ├── auth.spec.ts
    ├── workspaces.spec.ts
    ├── applications.spec.ts
    ├── development.spec.ts
    ├── websites.spec.ts
    ├── tracker-installation.spec.ts
    ├── raw-events.spec.ts
    ├── analytics-engine.spec.ts
    └── fixtures/

apps/tracker/
├── src/**/*.spec.ts
└── e2e/
    ├── static-host.spec.ts
    ├── spa-host.spec.ts
    ├── offline.spec.ts
    ├── consent.spec.ts
    └── cross-browser.spec.ts

tests/performance/
├── auth.k6.js
├── crud.k6.js
├── ingestion.k6.js
└── analytics.k6.js
```

---

# CI Quality Gates

Recommended pipeline order:

```text
1. Install with frozen lockfile
2. Secret scan and dependency audit
3. Prisma format and validate
4. Typecheck all packages
5. Lint all packages
6. Unit tests with coverage
7. Build shared packages
8. Build API, frontend, and tracker
9. Start PostgreSQL test service
10. Apply migrations to clean DB
11. Run API integration/E2E tests
12. Start API, frontend, tracker, and test host
13. Run Playwright critical suite
14. Run accessibility checks
15. Run lightweight performance smoke
16. Publish reports and artifacts
```

Merge must be blocked when:

- A build fails.
- A migration fails.
- A P0/P1 automated test fails.
- Coverage drops below the approved threshold.
- Cross-workspace authorization tests fail.
- Secret scanning finds a confirmed secret.
- Critical dependency vulnerability has no approved exception.

---

# Known Risks

| Risk                                                 | Impact                                        | Required Mitigation/Test                                    |
| ---------------------------------------------------- | --------------------------------------------- | ----------------------------------------------------------- |
| No full repository audit was available for this plan | Route/file mismatch                           | Reconcile with Swagger and route tree before implementation |
| Automated E2E was previously deferred                | Regressions may be undetected                 | Implement critical Playwright suite first                   |
| In-memory ingestion rate limiter                     | Incorrect limits in multi-instance deployment | Replace with shared Redis limiter before scaling            |
| In-process analytics scheduler                       | Duplicate processing across instances         | Dedicated worker or distributed lock                        |
| Refresh-token concurrency                            | Multiple refreshes/revocations                | Add simultaneous-401 test                                   |
| Complex role hierarchy                               | Authorization gaps                            | Full endpoint × role matrix                                 |
| Tracker blocked by browser/privacy tools             | Missing analytics                             | Test silent failure and document expected loss              |
| localStorage restrictions                            | Visitor/session instability                   | Private-mode and blocked-storage tests                      |
| Time-zone/DST calculations                           | Wrong daily analytics                         | Fixture tests across DST and local midnight                 |
| Late events                                          | Aggregate mismatch                            | Rebuild and idempotency tests                               |
| Large raw-event tables                               | Slow queries/retention                        | Explain plans, load tests, partitioning review              |
| Raw event privacy                                    | Accidental sensitive data                     | Sanitization, logging, and manual privacy audit             |
| Key shown in frontend session storage                | Exposure on shared browser                    | Threat-model and UX review                                  |
| Production startup path/dependencies                 | Deployment failure                            | Build-and-run smoke in CI                                   |
| Cascade deletes                                      | Unexpected data loss                          | Raw SQL FK/cascade verification                             |
| Polling status every five seconds                    | Excess API load                               | Multi-user load test and pause on hidden tab                |
| Manual retention endpoint                            | Destructive action risk                       | Role test, confirmation, backup, dry-run consideration      |

---

# Final Testing Report

Use the following report after execution.

## Release Information

| Field              | Value |
| ------------------ | ----- |
| Release/Commit     |       |
| Environment        |       |
| Test Start         |       |
| Test End           |       |
| QA Owner           |       |
| Backend Version    |       |
| Frontend Version   |       |
| Tracker Version    |       |
| Database Migration |       |

## Execution Summary

| Test Type          | Planned | Passed | Failed | Blocked | Not Run |
| ------------------ | ------: | -----: | -----: | ------: | ------: |
| Static/build       |         |        |        |         |         |
| Unit               |         |        |        |         |         |
| API integration    |         |        |        |         |         |
| Database           |         |        |        |         |         |
| Frontend component |         |        |        |         |         |
| Browser E2E        |         |        |        |         |         |
| Tracker            |         |        |        |         |         |
| Security           |         |        |        |         |         |
| Performance        |         |        |        |         |         |
| Accessibility      |         |        |        |         |         |

## Phase Status

| Phase    | Status     | Blocking Defects | Notes |
| -------- | ---------- | ---------------: | ----- |
| Phase 1  | NOT TESTED |                  |       |
| Phase 2  | NOT TESTED |                  |       |
| Phase 3  | NOT TESTED |                  |       |
| Phase 4  | NOT TESTED |                  |       |
| Phase 5  | NOT TESTED |                  |       |
| Phase 6  | NOT TESTED |                  |       |
| Phase 7  | NOT TESTED |                  |       |
| Phase 8  | NOT TESTED |                  |       |
| Phase 9  | NOT TESTED |                  |       |
| Phase 10 | NOT TESTED |                  |       |

## Defect Summary

| Severity | Open | Closed | Accepted Risk |
| -------- | ---: | -----: | ------------: |
| Critical |      |        |               |
| High     |      |        |               |
| Medium   |      |        |               |
| Low      |      |        |               |

## Security Result

- [ ] Authentication controls passed.
- [ ] Authorization and tenant isolation passed.
- [ ] Cookie and token handling passed.
- [ ] CORS passed.
- [ ] Tracking-key security passed.
- [ ] Input/XSS/injection checks passed.
- [ ] Privacy and logging checks passed.
- [ ] Dependency scan passed.

## Performance Result

- [ ] CRUD latency targets passed.
- [ ] Ingestion latency and throughput targets passed.
- [ ] Analytics processing target passed.
- [ ] Aggregate query target passed.
- [ ] Tracker size and host performance passed.
- [ ] Soak test found no leak or backlog growth.

## Final Verification Checklist

- [ ] Clean checkout installation passed.
- [ ] Clean database migration passed.
- [ ] Seed passed.
- [ ] Production API started successfully.
- [ ] Production frontend started successfully.
- [ ] Tracker production build and server passed.
- [ ] Authentication lifecycle passed.
- [ ] Workspace isolation passed.
- [ ] All role matrices passed.
- [ ] Application lifecycle passed.
- [ ] Activity history passed.
- [ ] Development workflow passed.
- [ ] Website and key lifecycle passed.
- [ ] Tracker and ingestion passed.
- [ ] Analytics processing and aggregates passed.
- [ ] Security baseline passed.
- [ ] Performance baseline passed.
- [ ] Accessibility baseline passed.
- [ ] Cross-browser critical suite passed.
- [ ] No Critical or High defects remain.

## QA Recommendation

Choose one:

```text
APPROVED FOR RELEASE
APPROVED WITH DOCUMENTED RISKS
REJECTED — BLOCKING DEFECTS REMAIN
```

### Recommendation Notes

```text
Add final QA decision, unresolved risks, rollback requirements,
and monitoring actions here.
```
