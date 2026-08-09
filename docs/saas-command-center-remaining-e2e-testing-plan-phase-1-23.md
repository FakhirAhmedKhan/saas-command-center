# SaaS Command Center — Remaining E2E Testing Plan (Phases 1–23)

## Purpose

This document defines the remaining End-to-End (E2E) testing work for **SaaS Command Center**, including the newly planned developer features:

- Phase 19 — Repository Integration Foundation
- Phase 20 — Code Explorer / Web Code Editor
- Phase 21 — Git & GitHub Intelligence
- Phase 22 — Repository Write Operations
- Phase 23 — AI Developer Intelligence

The goal is to verify the complete product across:

- Backend / API
- Frontend / Web
- PostgreSQL / Prisma
- Redis-dependent flows
- GitHub integration
- Repository security
- Workspace isolation
- RBAC
- Code Explorer
- Git operations
- Webhooks
- AI developer features

---

# Current Testing Status

## Already Verified / Mostly Green

| Phase    | Area                          | Status                         |
| -------- | ----------------------------- | ------------------------------ |
| Phase 1  | Monorepo Foundation           | ✅ Passed                      |
| Phase 2  | Backend Foundation            | ✅ Core build/typecheck passed |
| Phase 3  | Database Foundation           | ✅ Passed                      |
| Phase 4  | Authentication + Workspaces   | ✅ 46/46 API E2E               |
| Phase 5  | Application Registry          | ✅ 28/28 API E2E               |
| Phase 11 | Authentication Regression     | ✅ Passed                      |
| Phase 12 | Analytics Overview Regression | ✅ Passed                      |

---

## Known Pending Issues

### Phase 6 — Activity / Audit

Current isolated result:

```text
4 passed
2 failed
```

Pending:

- [ ] Activity filters/pagination returns `400` instead of expected `200`
- [ ] Cross-workspace activity isolation returns `200` instead of expected `404`

These must be fixed without weakening the tenant-isolation test.

---

### Phase 13 — Analytics Reports

- [ ] Fix current API E2E failures
- [ ] Verify query contract
- [ ] Verify report filters
- [ ] Verify exports
- [ ] Verify workspace isolation
- [ ] Verify frontend Playwright Phase 13

---

### Phase 14 — Analytics Processing

- [ ] Fix current API E2E failures
- [ ] Verify processing status
- [ ] Verify reprocessing
- [ ] Verify authorization
- [ ] Verify scheduler-related behavior
- [ ] Verify frontend Playwright Phase 14

---

### Phase 15 — Monitoring

Known test issues:

- [ ] Replace stale application fixture enum values
- [ ] Fix missing setup in legacy `monitoring.e2e-spec.ts`
- [ ] Re-run Phase 15 monitoring suite
- [ ] Verify health-check permissions
- [ ] Verify private/internal destination protection
- [ ] Verify incident creation and recovery
- [ ] Verify frontend Playwright Phase 15

---

# E2E Testing Principles

## API Test Isolation

API E2E tests should run one file at a time while all tests share one PostgreSQL test database.

Use:

```powershell
pnpm exec jest `
    --config "./test/jest-e2e.config.cjs" `
    --runInBand `
    --runTestsByPath "test/<file>.e2e-spec.ts"
```

Do not run multiple database-resetting test suites in parallel until isolated databases/schemas are implemented.

---

## No Weak Tests

Do not use:

```text
.skip
.only
any
@ts-ignore
eslint-disable
fake assertions
broad status arrays just to pass
```

Tests must verify the actual contract.

---

## Security Rules

Every workspace-scoped feature should test:

- OWNER access
- ADMIN access
- DEVELOPER access
- VIEWER access
- Anonymous access
- Outsider access
- Cross-workspace isolation
- Invalid resource IDs
- Malformed UUIDs
- Secret leakage

---

# Remaining Existing Phases — E2E Plan

# Phase 6 — Activity and Audit History

## Backend E2E

File:

```text
apps/api/test/activity.e2e-spec.ts
```

Test:

- [ ] Create activity
- [ ] Update activity
- [ ] Technology activity
- [ ] Link activity
- [ ] Archive activity
- [ ] Restore activity
- [ ] Rejected operations do not create activity
- [ ] Filter by activity type
- [ ] Filter by actor
- [ ] Pagination
- [ ] Workspace isolation
- [ ] Application isolation
- [ ] No authentication secrets exposed

## Frontend

- [ ] Activity feed loads
- [ ] Filters work
- [ ] Pagination works
- [ ] Empty state
- [ ] Error state
- [ ] No secret metadata rendered

## Exit Criteria

```text
API E2E: 100%
Frontend E2E: 100%
Tenant isolation: verified
```

---

# Phase 7 — Development Progress

## Backend Files

```text
development.e2e-spec.ts
development-progress.e2e-spec.ts
development-roles.e2e-spec.ts
development-activity.e2e-spec.ts
```

## Test

- [ ] Milestone CRUD
- [ ] Task CRUD
- [ ] Blocker CRUD
- [ ] Progress calculation
- [ ] Completion flows
- [ ] Blocker resolution
- [ ] Role restrictions
- [ ] Activity generation
- [ ] Cross-workspace isolation
- [ ] Invalid payloads
- [ ] Archived application behavior

## Frontend

- [ ] Milestone UI
- [ ] Task UI
- [ ] Blocker UI
- [ ] Progress UI
- [ ] Role-restricted buttons
- [ ] Validation
- [ ] Empty states

---

# Phase 8 — Website Management

## Backend Files

```text
websites.e2e-spec.ts
website-roles.e2e-spec.ts
website-environments.e2e-spec.ts
website-activity.e2e-spec.ts
```

## Test

- [ ] Website create/update/delete
- [ ] Environment management
- [ ] Tracking key generation
- [ ] Key rotation
- [ ] Connection status
- [ ] Role permissions
- [ ] Website activity
- [ ] Workspace isolation
- [ ] Invalid domain / URL handling
- [ ] Secret tracking key handling

## Frontend

- [ ] Website listing
- [ ] Website details
- [ ] Environment UI
- [ ] Tracking setup UI
- [ ] Key rotation
- [ ] Connection state
- [ ] RBAC controls

---

# Phase 9 — Tracker and Event Ingestion

## Backend / Tracker

Files:

```text
analytics-ingestion.e2e-spec.ts
analytics-ingestion-security.e2e-spec.ts
analytics-ingestion-rate-limit.e2e-spec.ts
raw-events.e2e-spec.ts
tracking-admin.e2e-spec.ts
```

## Test

- [ ] Tracker build
- [ ] Tracker unit tests
- [ ] Page view ingestion
- [ ] Custom event ingestion
- [ ] Invalid tracking key
- [ ] Revoked tracking key
- [ ] Rate limiting
- [ ] Payload validation
- [ ] Origin/domain validation
- [ ] Raw event persistence
- [ ] Admin event inspection
- [ ] Secret leakage prevention

---

# Phase 10 — Analytics Engine

## Backend Files

```text
analytics-engine-status.e2e-spec.ts
analytics-engine-processing.e2e-spec.ts
analytics-visitors.e2e-spec.ts
analytics-sessions.e2e-spec.ts
analytics-pageviews.e2e-spec.ts
analytics-aggregates.e2e-spec.ts
analytics-timezones.e2e-spec.ts
analytics-late-events.e2e-spec.ts
analytics-retention.e2e-spec.ts
analytics-reprocessing.e2e-spec.ts
```

## Test

- [ ] Visitor aggregation
- [ ] Session aggregation
- [ ] Page-view aggregation
- [ ] Custom-event aggregation
- [ ] Time zones
- [ ] Late events
- [ ] Retention
- [ ] Reprocessing
- [ ] Processing status
- [ ] Analytics isolation
- [ ] Invalid date ranges
- [ ] Large range behavior

---

# Phase 13 — Analytics Reports

## Backend

File:

```text
phase13-analytics-reports.e2e-spec.ts
```

## Test

- [ ] Pages report
- [ ] Events report
- [ ] Dimension reports
- [ ] Date filtering
- [ ] Sorting
- [ ] Pagination
- [ ] Export pages
- [ ] Export events
- [ ] Export dimensions
- [ ] Invalid query handling
- [ ] Workspace isolation
- [ ] Website isolation
- [ ] RBAC

## Frontend

Directory:

```text
apps/web/e2e/phase13
```

Test:

- [ ] Reports page
- [ ] Filters
- [ ] Tables
- [ ] Export actions
- [ ] Empty state
- [ ] API error handling

---

# Phase 14 — Analytics Processing

## Backend

File:

```text
phase14-analytics-processing.e2e-spec.ts
```

## Test

- [ ] Processing status
- [ ] Manual reprocessing
- [ ] Invalid ranges
- [ ] Duplicate reprocess request
- [ ] Role restrictions
- [ ] Viewer cannot mutate
- [ ] Cross-workspace block
- [ ] Processing error state
- [ ] Successful rebuild
- [ ] Processing idempotency

## Frontend

Directory:

```text
apps/web/e2e/phase14
```

Test:

- [ ] Status page
- [ ] Reprocess form
- [ ] Validation
- [ ] Loading state
- [ ] Completed state
- [ ] Failure state
- [ ] RBAC

---

# Phase 15 — Monitoring

## Backend

Files:

```text
phase15-monitoring.e2e-spec.ts
monitoring.e2e-spec.ts
```

## Test

- [ ] Health-check create/update/delete
- [ ] Manual health-check run
- [ ] Schedule state
- [ ] Failure counter
- [ ] Incident creation
- [ ] Incident deduplication
- [ ] Incident recovery
- [ ] History
- [ ] Application filter
- [ ] Target type filter
- [ ] Enabled filter
- [ ] Summary
- [ ] Application summary
- [ ] Private destination protection
- [ ] SSRF protections
- [ ] Viewer read-only access
- [ ] Outsider access blocked
- [ ] No credentials exposed

## Frontend

Directory:

```text
apps/web/e2e/phase15
```

Test:

- [ ] Monitoring dashboard
- [ ] Checks table
- [ ] Check creation
- [ ] Incidents
- [ ] Summary cards
- [ ] Filters
- [ ] Role restrictions

---

# Phase 16 — Releases and Deployments

## Backend

File:

```text
phase16-releases-deployments.e2e-spec.ts
```

## Test

- [ ] Release create/update
- [ ] Deployment create/update
- [ ] Environment state
- [ ] Release/deployment relationship
- [ ] Role restrictions
- [ ] Workspace isolation
- [ ] Application isolation
- [ ] Invalid state transitions
- [ ] History
- [ ] No secrets exposed

## Frontend

Directory:

```text
apps/web/e2e/phase16
```

Test:

- [ ] Release UI
- [ ] Deployment UI
- [ ] Status display
- [ ] Environment selection
- [ ] Empty/loading/error states

---

# Phase 17 — Team Operations

## Backend

File:

```text
phase17-team-operations.e2e-spec.ts
```

## Test

- [ ] Team operation creation
- [ ] Invitations
- [ ] Notifications
- [ ] Role restrictions
- [ ] Read/unread state
- [ ] User lookup
- [ ] Workspace isolation
- [ ] Outsider blocking
- [ ] Invalid invitation
- [ ] Notification filtering

## Frontend

Directory:

```text
apps/web/e2e/phase17
```

Test:

- [ ] Team page
- [ ] Invitation UI
- [ ] Notification UI
- [ ] Read/unread behavior
- [ ] RBAC

---

# Phase 18 — Webhook Integrations

## Backend

File:

```text
phase18-webhook-integrations.e2e-spec.ts
```

## Test

- [ ] Create webhook
- [ ] Update webhook
- [ ] Delete webhook
- [ ] Enable/disable webhook
- [ ] Webhook signing secret
- [ ] Signature verification
- [ ] Retry behavior
- [ ] Delivery history
- [ ] Failed delivery handling
- [ ] Duplicate delivery behavior
- [ ] Workspace isolation
- [ ] Viewer restrictions
- [ ] Private/internal URL protection
- [ ] Secret redaction

## Frontend

Directory:

```text
apps/web/e2e/phase18
```

Test:

- [ ] Webhook list
- [ ] Create webhook
- [ ] Edit webhook
- [ ] Delete webhook
- [ ] Delivery history
- [ ] Error handling
- [ ] RBAC

---

# NEW PHASE 19 — Repository Integration Foundation

## Backend E2E File

Recommended:

```text
apps/api/test/phase19-repository-integrations.e2e-spec.ts
```

## Core Setup

Each test should create:

- Workspace OWNER
- ADMIN
- DEVELOPER
- VIEWER
- Outsider
- Application
- RepositoryConnection fixture
- Mocked GitHub API provider

Avoid hitting real GitHub during E2E tests.

---

## Repository Connection Tests

- [ ] OWNER can connect repository
- [ ] ADMIN can connect repository
- [ ] DEVELOPER cannot connect repository
- [ ] VIEWER cannot connect repository
- [ ] Anonymous request rejected
- [ ] Outsider rejected
- [ ] Invalid repository rejected
- [ ] Duplicate repository connection rejected
- [ ] Application can optionally link repository
- [ ] Repository cannot be linked across workspaces

---

## Repository List / Detail

- [ ] List workspace repositories
- [ ] Read repository detail
- [ ] Repository metadata correct
- [ ] Default branch correct
- [ ] Private/public state correct
- [ ] Last sync visible
- [ ] Cross-workspace repository hidden

---

## Disconnect

- [ ] OWNER can disconnect
- [ ] ADMIN can disconnect
- [ ] DEVELOPER cannot disconnect
- [ ] VIEWER cannot disconnect
- [ ] Disconnect nonexistent repository returns correct error

---

## GitHub Credential Security

- [ ] Installation token never returned
- [ ] Private key never returned
- [ ] OAuth/GitHub secret never returned
- [ ] Tokens not stored in activity metadata
- [ ] Tokens not logged in API error response

---

## Repository Sync

- [ ] Manual sync succeeds
- [ ] Sync updates metadata
- [ ] Sync updates default branch
- [ ] GitHub API failure recorded
- [ ] Rate-limit failure handled
- [ ] Sync status returned
- [ ] Duplicate sync protected

---

## GitHub Webhooks

- [ ] Valid signature accepted
- [ ] Invalid signature rejected
- [ ] Missing signature rejected
- [ ] Duplicate delivery ID ignored
- [ ] Push event updates repository
- [ ] Branch create event handled
- [ ] Branch delete event handled
- [ ] Pull request event handled
- [ ] Workflow event handled
- [ ] Unknown event safely ignored

---

## Phase 19 Frontend Playwright

Recommended directory:

```text
apps/web/e2e/phase19
```

Test:

- [ ] Repository page loads
- [ ] Connect GitHub button
- [ ] Connected repository card
- [ ] Repository detail
- [ ] Sync action
- [ ] Disconnect modal
- [ ] Loading state
- [ ] API failure state
- [ ] Empty state
- [ ] OWNER/ADMIN controls
- [ ] DEVELOPER restrictions
- [ ] VIEWER restrictions

---

## Phase 19 Exit Criteria

```text
Backend E2E     100%
Frontend E2E    100%
RBAC            verified
Tenant isolation verified
Secret leakage  0
```

---

# NEW PHASE 20 — Code Explorer / Web Code Editor

## Backend E2E File

Recommended:

```text
apps/api/test/phase20-code-explorer.e2e-spec.ts
```

---

## Repository Tree Tests

- [ ] Load root tree
- [ ] Load nested directory
- [ ] Empty directory
- [ ] Invalid directory
- [ ] Invalid branch
- [ ] Different branch returns different tree
- [ ] Private repo requires permission
- [ ] Cross-workspace blocked

---

## File Content Tests

- [ ] Read TypeScript file
- [ ] Read JavaScript file
- [ ] Read JSON file
- [ ] Read Markdown file
- [ ] Read Prisma file
- [ ] Binary file recognized
- [ ] Large file rejected/handled
- [ ] Invalid file path rejected
- [ ] File SHA returned
- [ ] Correct language metadata returned

---

## Search Tests

- [ ] Search by filename
- [ ] Search by path
- [ ] Search by extension
- [ ] Search by content
- [ ] No-result response
- [ ] Search respects branch
- [ ] Search respects repository permissions

---

## Diff Tests

- [ ] Compare main vs development
- [ ] Compare feature vs main
- [ ] Modified file
- [ ] Added file
- [ ] Deleted file
- [ ] Unchanged file
- [ ] Invalid base branch
- [ ] Invalid head branch
- [ ] Invalid file

---

## Code Explorer Security

- [ ] Path traversal blocked
- [ ] Unsupported binary content blocked
- [ ] Repository token not returned
- [ ] Cross-workspace code access blocked
- [ ] VIEWER policy enforced
- [ ] Large payload protection
- [ ] Rate limiting

---

## Phase 20 Frontend Playwright

Recommended:

```text
apps/web/e2e/phase20
```

Test:

- [ ] Explorer loads
- [ ] Folder expands
- [ ] Folder collapses
- [ ] File opens
- [ ] Monaco loads
- [ ] Syntax highlighting
- [ ] Multiple tabs
- [ ] Close tab
- [ ] Active tab
- [ ] Branch selector
- [ ] Branch changes tree
- [ ] File search
- [ ] Breadcrumb
- [ ] Markdown preview
- [ ] JSON preview
- [ ] Image preview
- [ ] Diff viewer
- [ ] Loading state
- [ ] Empty state
- [ ] API error handling

---

## Phase 20 Exit Criteria

```text
Repository browsing        ✅
Read-only code viewing     ✅
Branch switching           ✅
Search                     ✅
Diff                       ✅
Tenant isolation           ✅
Security tests             ✅
```

---

# NEW PHASE 21 — Git & GitHub Intelligence

## Backend E2E File

Recommended:

```text
apps/api/test/phase21-github-intelligence.e2e-spec.ts
```

---

## Repository Overview

- [ ] Repository metadata
- [ ] Default branch
- [ ] Branch count
- [ ] Latest commit
- [ ] Open PR count
- [ ] Workflow status
- [ ] Contributor count
- [ ] Health score

---

## Commits

- [ ] Commit history
- [ ] Pagination
- [ ] Branch filter
- [ ] Author filter
- [ ] Commit details
- [ ] Changed files
- [ ] Additions/deletions
- [ ] Invalid SHA
- [ ] Repository isolation

---

## Branches

- [ ] Branch listing
- [ ] Default branch flag
- [ ] Protected branch flag
- [ ] Ahead count
- [ ] Behind count
- [ ] Last commit
- [ ] Open PR relation
- [ ] Merged state

---

## Branch Health

- [ ] Healthy branch
- [ ] Behind branch
- [ ] Stale branch
- [ ] Cleanup candidate
- [ ] Protected branch scoring
- [ ] CI failure penalty
- [ ] Health score deterministic

---

## Pull Requests

- [ ] Open PR list
- [ ] Closed PR list
- [ ] Merged PR list
- [ ] PR details
- [ ] Review status
- [ ] Mergeability
- [ ] Files changed
- [ ] CI/check status
- [ ] Cross-workspace blocked

---

## GitHub Actions

- [ ] Workflow list
- [ ] Run list
- [ ] Successful run
- [ ] Failed run
- [ ] In-progress run
- [ ] Branch filtering
- [ ] Commit relation
- [ ] Duration
- [ ] GitHub API failure handling

---

## Contributors

- [ ] Contributor list
- [ ] Commit counts
- [ ] 7-day activity
- [ ] 30-day activity
- [ ] 90-day activity

---

## Repository Health

- [ ] Healthy repository
- [ ] Failed workflow affects score
- [ ] Stale branches affect score
- [ ] Behind branches affect score
- [ ] Open PR conditions
- [ ] No data handling
- [ ] Score boundaries 0–100

---

## Phase 21 Frontend Playwright

Recommended:

```text
apps/web/e2e/phase21
```

Test:

- [ ] Repository overview
- [ ] Commit table
- [ ] Branch table
- [ ] Ahead/behind badges
- [ ] Branch health score
- [ ] Stale filter
- [ ] PR list
- [ ] PR detail
- [ ] Actions page
- [ ] Workflow state
- [ ] Contributors
- [ ] Repository health page
- [ ] Open file in Code Explorer
- [ ] Open PR changes in Code Explorer
- [ ] Loading/error/empty states

---

# NEW PHASE 22 — Repository Write Operations

## Backend E2E File

Recommended:

```text
apps/api/test/phase22-repository-write.e2e-spec.ts
```

---

## Branch Creation

- [ ] OWNER create branch
- [ ] ADMIN create branch
- [ ] DEVELOPER create branch
- [ ] VIEWER rejected
- [ ] Duplicate branch rejected
- [ ] Invalid branch name rejected
- [ ] Source SHA validated

---

## File Editing

- [ ] Update existing file
- [ ] Create file
- [ ] Delete file
- [ ] Invalid SHA conflict
- [ ] Branch required
- [ ] Protected/default branch protection
- [ ] Cross-workspace blocked
- [ ] Audit activity written

---

## Commit

- [ ] Commit changes
- [ ] Commit message required
- [ ] Multiple changed files
- [ ] Author metadata
- [ ] SHA changes
- [ ] Conflict handling
- [ ] GitHub API error handling

---

## Pull Request Creation

- [ ] Create PR
- [ ] Base branch validation
- [ ] Head branch validation
- [ ] PR title required
- [ ] Duplicate PR handling
- [ ] Permission checks
- [ ] PR returned to frontend

---

## Write Security

- [ ] VIEWER never writes
- [ ] Outsider never writes
- [ ] Protected branch rules
- [ ] GitHub credentials never exposed
- [ ] Audit contains no secrets
- [ ] CSRF/auth protections
- [ ] Rate limits

---

## Phase 22 Frontend Playwright

Recommended:

```text
apps/web/e2e/phase22
```

Test:

- [ ] Enter edit mode
- [ ] Modify file
- [ ] Dirty tab indicator
- [ ] Save
- [ ] Discard
- [ ] Create file
- [ ] Delete file
- [ ] Create branch
- [ ] Review diff
- [ ] Commit dialog
- [ ] Commit success
- [ ] Create PR
- [ ] Conflict UI
- [ ] Protected branch warning
- [ ] VIEWER cannot edit

---

# NEW PHASE 23 — AI Developer Intelligence

## Backend E2E File

Recommended:

```text
apps/api/test/phase23-ai-developer-intelligence.e2e-spec.ts
```

AI provider should be mocked/stubbed in E2E.

Do not depend on a real paid AI service in normal CI E2E.

---

## Explain Code

- [ ] Explain selected file
- [ ] Explain selected lines
- [ ] Unsupported/binary file rejected
- [ ] Large-context protection
- [ ] Repository permission required
- [ ] Secret redaction before AI request

---

## Repository Summary

- [ ] Repository summary generated
- [ ] Architecture summary
- [ ] Module summary
- [ ] Empty repository handling
- [ ] Provider failure handling

---

## Commit Summary

- [ ] Daily commit summary
- [ ] Branch-specific summary
- [ ] Multiple authors
- [ ] No commits state
- [ ] Large commit range protection

---

## AI Pull Request Review

- [ ] Review changed files
- [ ] Risk finding
- [ ] Security warning
- [ ] Missing test recommendation
- [ ] Large PR handling
- [ ] AI error handling

---

## Risk Detection

- [ ] Auth changes marked risky
- [ ] Database migration marked risky
- [ ] RBAC/guard changes marked risky
- [ ] Documentation-only change stays low risk
- [ ] Suggested regression suites returned

---

## Ask Repository

- [ ] Find authentication module
- [ ] Find analytics module
- [ ] Find Prisma setup
- [ ] Find monitoring code
- [ ] Unknown question handled
- [ ] Source references returned
- [ ] Cross-repository data not leaked

---

## AI Security

- [ ] Repository permissions checked before AI call
- [ ] Secrets removed from prompt
- [ ] `.env` content protected
- [ ] Private keys protected
- [ ] GitHub tokens protected
- [ ] Prompt-injection content handled
- [ ] Usage/rate limit enforced
- [ ] AI audit event generated

---

## Phase 23 Frontend Playwright

Recommended:

```text
apps/web/e2e/phase23
```

Test:

- [ ] Explain Code button
- [ ] AI drawer/modal
- [ ] Repository summary
- [ ] Commit summary
- [ ] PR review
- [ ] Risk badge
- [ ] Ask Repository
- [ ] Loading state
- [ ] Streaming/result state
- [ ] AI provider error
- [ ] Rate-limit state
- [ ] Permission state

---

# Cross-Phase Integration E2E

Create a final full-stack suite.

Recommended:

```text
apps/web/e2e/full-stack-developer-command-center
```

## Scenario 1 — GitHub to Code Explorer

```text
Connect GitHub
    ↓
Select repository
    ↓
Open repository
    ↓
Select branch
    ↓
Browse files
    ↓
Open TypeScript file
```

- [ ] Complete flow works

---

## Scenario 2 — Branch Intelligence to Diff

```text
Repositories
    ↓
Branches
    ↓
Select branch 20 commits behind
    ↓
Compare with main
    ↓
Open Monaco Diff
```

- [ ] Complete flow works

---

## Scenario 3 — Commit to Code

```text
Commit History
    ↓
Open Commit
    ↓
Changed Files
    ↓
Open File
    ↓
Code Explorer
```

- [ ] Complete flow works

---

## Scenario 4 — Pull Request to Diff

```text
PR
 ↓
Changed Files
 ↓
View Changes
 ↓
Monaco Diff
```

- [ ] Complete flow works

---

## Scenario 5 — Edit to Pull Request

Phase 22:

```text
Open Code
 ↓
Create Branch
 ↓
Edit
 ↓
Review Diff
 ↓
Commit
 ↓
Create PR
```

- [ ] Complete flow works

---

## Scenario 6 — AI Review

Phase 23:

```text
Open Pull Request
 ↓
AI Review
 ↓
Risk findings
 ↓
Open risky file
 ↓
Code Explorer
```

- [ ] Complete flow works

---

# Performance E2E / Load Validation

## Repository APIs

Test:

- [ ] Repository with 1,000 files
- [ ] Repository with 10,000 files
- [ ] Deep folder nesting
- [ ] Large branch count
- [ ] Large commit history
- [ ] Many pull requests

Targets should be defined before production.

Suggested checks:

```text
Repository metadata API      fast
Cached branch list           fast
File tree                    lazy-loaded
Large files                  guarded
GitHub API calls             cached/rate-aware
```

---

# Security E2E Matrix

Every new repository feature should test:

| Scenario                      | Expected                  |
| ----------------------------- | ------------------------- |
| Anonymous                     | 401                       |
| Workspace outsider            | 403/404 based on contract |
| VIEWER write attempt          | 403                       |
| Wrong repository workspace    | 404 preferred             |
| Invalid GitHub signature      | rejected                  |
| Duplicate webhook delivery    | ignored                   |
| GitHub token leakage          | never                     |
| Path traversal                | rejected                  |
| Protected branch direct write | rejected                  |
| Private/internal webhook URL  | rejected                  |
| AI access to secret file      | blocked/redacted          |

---

# CI Testing Strategy

## Pull Request CI

Run:

```text
Typecheck
Lint
Build
Unit tests
Changed-module E2E
```

---

## Main / Development Branch CI

Run:

```text
All API E2E
All frontend Playwright
Prisma validation
Production build
Tracker tests
```

---

## Nightly Full Regression

Run:

```text
Phase 1–23 API E2E
Phase 12–23 frontend E2E
Full-stack integration
Repository integration mocks
Security E2E
Performance smoke tests
```

---

# Fast Local Runner Strategy

Because the API tests currently share one PostgreSQL test database:

```text
API E2E files
→ sequential
```

Frontend Playwright can be grouped more aggressively where safe:

```text
Playwright
→ parallel workers
```

Future improvement:

```text
Jest Worker 1 → test schema/database 1
Jest Worker 2 → test schema/database 2
Jest Worker 3 → test schema/database 3
```

Then API E2E can run safely in parallel.

---

# Final Test Milestones

## Milestone A — Existing Platform Stabilized

- [ ] Phase 6 fixed
- [ ] Phase 13 fixed
- [ ] Phase 14 fixed
- [ ] Phase 15 fixed
- [ ] Phase 16 green
- [ ] Phase 17 green
- [ ] Phase 18 green

---

## Milestone B — Repository Foundation

- [ ] Phase 19 backend green
- [ ] Phase 19 frontend green
- [ ] GitHub security green

---

## Milestone C — Code Explorer

- [ ] Phase 20 backend green
- [ ] Phase 20 frontend green
- [ ] Diff/search/branch switching green

---

## Milestone D — GitHub Intelligence

- [ ] Phase 21 backend green
- [ ] Phase 21 frontend green
- [ ] Branch health verified
- [ ] GitHub Actions verified

---

## Milestone E — Repository Editing

- [ ] Phase 22 backend green
- [ ] Phase 22 frontend green
- [ ] Protected branch security green

---

## Milestone F — AI Developer Intelligence

- [ ] Phase 23 backend green
- [ ] Phase 23 frontend green
- [ ] AI security tests green

---

# Production Readiness Gate

Do not consider the extended platform production-ready until:

- [ ] API typecheck passes
- [ ] API build passes
- [ ] Web typecheck passes
- [ ] Web lint passes
- [ ] Web production build passes
- [ ] Prisma validate passes
- [ ] Prisma migration status clean
- [ ] Tracker build/tests pass
- [ ] Phase 1–23 required backend E2E pass
- [ ] Phase 12–23 frontend E2E pass
- [ ] Cross-workspace security verified
- [ ] GitHub credential security verified
- [ ] Webhook security verified
- [ ] Protected branch behavior verified
- [ ] AI secret-redaction verified
- [ ] No `.skip`
- [ ] No fake assertions
- [ ] No critical/high security issue remains

---

# Final Testing Roadmap

```text
Existing Platform
Phase 1–18
     │
     ├── Fix pending Phase 6
     ├── Fix pending Phase 13
     ├── Fix pending Phase 14
     └── Fix pending Phase 15
     │
     ▼
Phase 19
Repository Integration E2E
     │
     ▼
Phase 20
Code Explorer E2E
     │
     ▼
Phase 21
GitHub Intelligence E2E
     │
     ▼
Phase 22
Repository Write E2E
     │
     ▼
Phase 23
AI Developer Intelligence E2E
     │
     ▼
Cross-Phase Full Stack
     │
     ▼
Security + Performance
     │
     ▼
Production Readiness
```

---

# Expected Final Outcome

After this plan is completed, SaaS Command Center will have verified E2E coverage for:

- SaaS management
- Workspaces
- Authentication
- Applications
- Development tracking
- Websites
- Analytics
- Monitoring
- Releases
- Deployments
- Team operations
- Webhooks
- GitHub repository connections
- Code Explorer
- Branch intelligence
- Commits
- Pull requests
- GitHub Actions
- Repository health
- Browser-based code editing
- Commit / branch / PR workflows
- AI-powered developer intelligence

The final objective is a stable, secure, fully tested **SaaS + Developer Command Center**.
