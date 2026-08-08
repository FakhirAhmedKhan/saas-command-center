# SaaS Command Center — Phases 11–20 Implementation Plan

> **Current baseline:** Phases 1–10 are implemented and covered by 206 backend E2E tests, 56 tracker tests, and 40 frontend Playwright tests. Batch 11 real full-stack testing is paused and should resume after Phase 20.

---

# Phase 11

## Goal

Create a reliable full-stack foundation so the real Next.js frontend, NestJS API, Prisma, PostgreSQL, authentication cookies, health checks, and environment configuration behave consistently in development, testing, and production.

**Priority:** High

## Dependencies & Prerequisites

- Phases 1–10 remain passing.
- PostgreSQL development and test databases are available.
- Current frontend and backend environment variables are documented.
- Existing Batch 11 full-stack setup is preserved but paused.

## Backend Tasks

- [ ] Create a shared `configureApplication(app)` bootstrap function.
- [ ] Use the shared bootstrap from both `main.ts` and E2E test startup.
- [ ] Register cookie parsing in the production API.
- [ ] Confirm refresh-token cookie creation, rotation, logout, and logout-all.
- [ ] Expose a minimal public `/api/v1/health` endpoint.
- [ ] Keep detailed health diagnostics protected when they expose internal information.
- [ ] Align CORS, Helmet, request IDs, validation pipes, exception filters, and body parsers across environments.
- [ ] Separate production environment validation from test-only variables.
- [ ] Remove duplicate ingestion controllers and keep one registered implementation.
- [ ] Remove backup, duplicate, generated, and obsolete files introduced during testing.
- [ ] Add an explicit API startup check for database connectivity and required secrets.

## Frontend Tasks

- [ ] Centralize API base URL and environment configuration.
- [ ] Verify login, registration, refresh, logout, and session restoration against the real API.
- [ ] Standardize loading, empty, unauthorized, and server-error states.
- [ ] Add one shared API error mapper for forms and page requests.
- [ ] Confirm protected routes wait for session restoration before redirecting.
- [ ] Confirm cookie-based refresh works across the intended frontend and API domains.
- [ ] Remove any mock-only assumptions from production components.
- [ ] Keep Batch 10 mocked browser tests as fast regression coverage.

## Verification Checklist

- [ ] API typecheck, lint, and production build pass.
- [ ] Web typecheck, lint, and production build pass.
- [ ] Existing 302 automated tests remain passing.
- [ ] Public health endpoint returns `200` without authentication.
- [ ] A real browser can register, log in, refresh, log out, and restore a session.
- [ ] CORS blocks unauthorized origins and allows configured origins.
- [ ] Production and E2E app bootstrap use the same middleware configuration.
- [ ] No `.bak`, `.before-*`, duplicate controller, or stale generated files remain tracked.

## Risks & Important Considerations

- Cross-domain cookies require correct `SameSite`, `Secure`, domain, and proxy settings.
- Changes to shared bootstrap can affect every API test.
- Health endpoints must not expose credentials, connection strings, or sensitive system details.

## Expected Outcome

A stable, production-parity foundation with consistent frontend/backend behavior and no major differences between local, E2E, and production startup.

---

# Phase 12

## Goal

Deliver the first real analytics dashboard that gives users a clear overview of traffic and engagement for each tracked website.

**Priority:** High

## Dependencies & Prerequisites

- Phase 11 authentication and API integration are stable.
- Existing analytics visitors, sessions, page views, events, and aggregate tables are available.
- Website access and role guards remain enforced.

## Backend Tasks

- [ ] Add an analytics overview endpoint per workspace and website.
- [ ] Return visitors, sessions, page views, bounce rate, and average duration.
- [ ] Return previous-period comparison values.
- [ ] Return time-series data grouped by hour or day.
- [ ] Return top pages, sources, countries, devices, browsers, and operating systems.
- [ ] Support validated date ranges and website timezone handling.
- [ ] Enforce workspace isolation and read permissions.
- [ ] Add response DTOs and OpenAPI documentation.
- [ ] Add safe serialization for all `BigInt` values.
- [ ] Add database indexes only where query plans show a real need.
- [ ] Add API E2E tests for overview metrics, filtering, roles, and isolation.

## Frontend Tasks

- [ ] Create a website analytics overview page.
- [ ] Add date-range selection with sensible presets.
- [ ] Add KPI cards for visitors, sessions, page views, bounce rate, and duration.
- [ ] Add a traffic trend chart.
- [ ] Add top pages and top sources panels.
- [ ] Add country, device, browser, and operating-system summaries.
- [ ] Add loading skeletons, empty states, error states, and retry actions.
- [ ] Make the dashboard responsive for desktop, tablet, and mobile.
- [ ] Preserve filters in the URL where practical.
- [ ] Add Playwright coverage using mocked and real API flows.

## Verification Checklist

- [ ] KPI totals match known database fixtures.
- [ ] Current and previous period comparisons are correct.
- [ ] Date boundaries respect the website timezone.
- [ ] Viewer users can read analytics but cannot perform administrative actions.
- [ ] Cross-workspace analytics requests are rejected.
- [ ] Empty websites show a helpful onboarding state.
- [ ] Dashboard remains usable on mobile screens.
- [ ] Backend and frontend tests pass.

## Risks & Important Considerations

- Avoid loading raw events directly for dashboard requests.
- Large date ranges should use aggregates instead of expensive live calculations.
- Define metric formulas once and reuse them across API, documentation, and UI labels.

## Expected Outcome

Users can open a website and understand its core traffic and engagement metrics from one responsive dashboard.

---

# Phase 13

## Goal

Add detailed analytics reports, filtering, drill-down views, and export capabilities without introducing unnecessary analytics complexity.

**Priority:** High

## Dependencies & Prerequisites

- Phase 12 overview metrics and date handling are stable.
- Aggregate dimensions are producing correct values.
- Pagination and filtering conventions are defined.

## Backend Tasks

- [ ] Add detailed report endpoints for pages and custom events.
- [ ] Add report endpoints for sources, countries, devices, browsers, and operating systems.
- [ ] Support pagination, sorting, search, date range, and dimension filters.
- [ ] Add page-level metrics: views, visitors, entrances, exits, bounce rate, and duration.
- [ ] Add custom-event totals and unique visitor counts.
- [ ] Add CSV export endpoints with strict row and date-range limits.
- [ ] Sanitize exported values to prevent spreadsheet formula injection.
- [ ] Add role and workspace-isolation checks to every report endpoint.
- [ ] Add contract and E2E tests for filters, ordering, pagination, and exports.
- [ ] Document report limits and supported dimensions.

## Frontend Tasks

- [ ] Add analytics tabs for Overview, Pages, Sources, Geography, Technology, and Events.
- [ ] Create reusable report-table components.
- [ ] Add search, filters, sorting, and pagination.
- [ ] Add drill-down navigation from overview cards to reports.
- [ ] Add CSV download actions with loading and error feedback.
- [ ] Keep date and filter state synchronized across analytics pages.
- [ ] Add clear labels and tooltips for calculated metrics.
- [ ] Add responsive table behavior for smaller screens.
- [ ] Add browser tests for filters, exports, and deep links.

## Verification Checklist

- [ ] Report totals reconcile with overview totals.
- [ ] Sorting and pagination produce stable results.
- [ ] CSV exports contain expected columns and safe values.
- [ ] Invalid date ranges and unsupported dimensions return `400`.
- [ ] Export limits prevent excessive database and memory usage.
- [ ] Filters remain after navigation and page refresh.
- [ ] Viewer access remains read-only.
- [ ] Backend and frontend tests pass.

## Risks & Important Considerations

- CSV export can become expensive; enforce practical limits.
- Do not expose raw IP hashes, tracking keys, or sensitive event properties.
- Avoid adding funnels, cohorts, or attribution models before the core reports are stable.

## Expected Outcome

Users can investigate where traffic comes from, which pages perform best, which events occur, and export practical reports for further analysis.

---

# Phase 14

## Goal

Make analytics processing reliable, scalable, recoverable, and safe for multiple API instances.

**Priority:** High

## Dependencies & Prerequisites

- Phases 12–13 confirm the required analytics outputs.
- Existing processing, reprocessing, retention, and scheduler behavior is documented.
- Redis or a PostgreSQL advisory-lock strategy is selected.

## Backend Tasks

- [ ] Split the large analytics processing service into focused services.
- [ ] Separate raw-event processing, visitor rebuilding, session rebuilding, page-view rebuilding, aggregation, retention, and reprocessing.
- [ ] Make range reprocessing failure-safe.
- [ ] Preserve existing normalized data until a rebuild succeeds.
- [ ] Add processing-run status, retry count, failure reason, and timestamps.
- [ ] Add a distributed lock for scheduled processing.
- [ ] Move ingestion rate limiting from process memory to Redis or another shared store.
- [ ] Return `429 Too Many Requests` with retry information.
- [ ] Remove concurrent-query patterns that trigger the PostgreSQL deprecation warning.
- [ ] Add bounded retries and dead-letter handling for repeatedly failing batches.
- [ ] Add processing metrics and structured logs.
- [ ] Add E2E tests for concurrency, failure recovery, retry, idempotency, and multi-instance safety.

## Frontend Tasks

- [ ] Add an analytics processing status panel for authorized users.
- [ ] Show last successful run, pending events, failed events, and last error.
- [ ] Add a safe manual reprocess action with a date-range limit.
- [ ] Add confirmation dialogs for destructive or expensive actions.
- [ ] Add progress, success, partial-failure, and retry states.
- [ ] Hide processing controls from Viewer users.
- [ ] Add retention settings only if the product requires workspace-level control.
- [ ] Add browser tests for status and role-based processing controls.

## Verification Checklist

- [ ] Processing is idempotent under repeated execution.
- [ ] Two workers cannot process the same website range simultaneously.
- [ ] Failed reprocessing does not remove previously valid analytics.
- [ ] Rate limits are shared across API instances.
- [ ] Rate-limit responses use `429`.
- [ ] PostgreSQL concurrent-query warnings are removed.
- [ ] Processing status is accurate after success and failure.
- [ ] Existing analytics totals remain unchanged after refactoring.

## Risks & Important Considerations

- Data-processing refactors can silently change metric definitions.
- Introduce staging or versioning before deleting old normalized records.
- Keep worker concurrency conservative until real load measurements are available.

## Expected Outcome

Analytics processing becomes reliable under failures, retries, concurrent workers, and horizontal scaling.

---

# Phase 15

## Goal

Turn the platform into a true command center by adding practical application and website health monitoring.

**Priority:** High

## Dependencies & Prerequisites

- Phase 11 production configuration is stable.
- Applications, websites, and environments already exist.
- A background processing mechanism from Phase 14 is available.

## Backend Tasks

- [ ] Add configurable HTTP health checks for applications and websites.
- [ ] Store check URL, interval, timeout, expected status, and enabled state.
- [ ] Record latest status, response time, failure reason, and last checked time.
- [ ] Store a limited health-check history.
- [ ] Add application and workspace health-summary endpoints.
- [ ] Add incident creation after configurable consecutive failures.
- [ ] Resolve incidents after successful recovery.
- [ ] Add role checks for creating or changing health-check configuration.
- [ ] Add scheduler limits to prevent excessive outbound requests.
- [ ] Block private-network and unsafe URLs to reduce SSRF risk.
- [ ] Add tests for healthy, failing, timeout, recovery, permissions, and SSRF protection.

## Frontend Tasks

- [ ] Add health status to application and website cards.
- [ ] Add a command-center overview for Healthy, Degraded, Down, and Unknown states.
- [ ] Add health-check configuration forms.
- [ ] Add response-time and recent-status history.
- [ ] Add incident details and recovery timeline.
- [ ] Add filters for status, application, environment, and owner.
- [ ] Add clear empty and disabled-monitoring states.
- [ ] Add responsive monitoring views.
- [ ] Add Playwright coverage for configuration, incidents, and recovery.

## Verification Checklist

- [ ] Health checks run at configured intervals.
- [ ] Timeouts and invalid responses are handled safely.
- [ ] SSRF protections block private and restricted destinations.
- [ ] Repeated failures create one incident rather than duplicates.
- [ ] Recovery closes or resolves the active incident.
- [ ] Viewer users cannot change monitoring configuration.
- [ ] Dashboard health totals match stored statuses.
- [ ] Existing applications without monitoring continue working normally.

## Risks & Important Considerations

- Outbound health checks can be abused without SSRF controls.
- Avoid very short intervals in the first release.
- Retain only the history needed for the product to control database growth.

## Expected Outcome

Users can see which SaaS applications are healthy, degraded, or down and quickly identify active incidents.

---

# Phase 16

## Goal

Add release and deployment tracking so teams can understand what version is running in each environment.

**Priority:** Medium–High

## Dependencies & Prerequisites

- Application and environment models are stable.
- Workspace roles and activity logging are available.
- Phase 15 health state can be linked to deployments.

## Backend Tasks

- [ ] Add release and deployment models.
- [ ] Track version, environment, status, commit reference, release notes, deployed by, and timestamps.
- [ ] Support Draft, Scheduled, In Progress, Successful, Failed, and Rolled Back states.
- [ ] Link deployments to applications and environments.
- [ ] Add endpoints to create, update, list, and view deployments.
- [ ] Add deployment activity and audit records.
- [ ] Add optional links to repository, CI job, and live environment.
- [ ] Add rollback-reference metadata without implementing automatic rollback.
- [ ] Add validation for duplicate versions and invalid state transitions.
- [ ] Add E2E tests for roles, transitions, filters, and workspace isolation.

## Frontend Tasks

- [ ] Add release and deployment pages per application.
- [ ] Add a release creation form.
- [ ] Add environment and deployment-status filters.
- [ ] Add deployment timeline and release-note display.
- [ ] Show current version per environment.
- [ ] Link deployment failures to health incidents when available.
- [ ] Add read-only Viewer behavior.
- [ ] Add empty, loading, and error states.
- [ ] Add browser tests for release creation and status changes.

## Verification Checklist

- [ ] Invalid state transitions are rejected.
- [ ] Deployment history is ordered and complete.
- [ ] Current environment version is calculated correctly.
- [ ] Workspace isolation is enforced.
- [ ] Activity records identify who changed deployment state.
- [ ] Viewer users remain read-only.
- [ ] Health and deployment links do not create circular dependencies.
- [ ] Backend and frontend tests pass.

## Risks & Important Considerations

- Keep Phase 16 focused on tracking; do not build a full CI/CD platform.
- Repository and deployment links must be validated.
- Automatic rollback should remain out of scope until deployment providers are integrated safely.

## Expected Outcome

Teams can track what was released, where it was deployed, its current status, and how it relates to application health.

---

# Phase 17

## Goal

Improve team operations with invitation workflows, in-app notifications, and a more useful audit and activity experience.

**Priority:** Medium

## Dependencies & Prerequisites

- Existing workspace member and role logic remains stable.
- Activity records are available across major modules.
- Email delivery provider is selected if email invitations are included.

## Backend Tasks

- [ ] Add secure workspace invitation tokens with expiry and one-time use.
- [ ] Support invite, resend, revoke, accept, and decline flows.
- [ ] Prevent duplicate active invitations.
- [ ] Add notification records with read/unread status.
- [ ] Generate notifications for invitations, assignments, failed deployments, incidents, and important processing failures.
- [ ] Add notification list, unread count, mark-read, and mark-all-read endpoints.
- [ ] Expand activity filtering by actor, resource, action, and date.
- [ ] Define notification retention and cleanup.
- [ ] Add rate limits to invitation and resend actions.
- [ ] Add E2E tests for invitation security, notification access, and tenant isolation.

## Frontend Tasks

- [ ] Add workspace invitation management.
- [ ] Add invite acceptance and decline screens.
- [ ] Add a notification center and unread indicator.
- [ ] Add mark-read and mark-all-read actions.
- [ ] Add links from notifications to the relevant resource.
- [ ] Improve activity views with filters and readable event summaries.
- [ ] Add empty and expired-invitation states.
- [ ] Ensure Viewer users can read permitted notifications but cannot manage members.
- [ ] Add Playwright coverage for invitation and notification journeys.

## Verification Checklist

- [ ] Invitation tokens expire and cannot be reused.
- [ ] Revoked invitations cannot be accepted.
- [ ] Duplicate active invitations are prevented.
- [ ] Notifications are visible only to the intended user.
- [ ] Unread counts remain consistent.
- [ ] Activity filters return correct tenant-scoped results.
- [ ] Invitation endpoints are rate-limited.
- [ ] Email failures do not create misleading invitation states.

## Risks & Important Considerations

- Invitation tokens must never be stored or logged in plain text.
- Notifications can grow quickly; define retention and indexing early.
- Keep notification rules explicit to avoid overwhelming users.

## Expected Outcome

Workspace onboarding becomes secure and user-friendly, while important operational events are visible through notifications and a searchable activity history.

---

# Phase 18

## Goal

Add safe external integrations through signed webhooks and a small, maintainable integration framework.

**Priority:** Medium

## Dependencies & Prerequisites

- Stable event definitions exist for applications, deployments, incidents, analytics, and workspace activity.
- Background retry processing from Phase 14 is available.
- Secrets-management rules are defined.

## Backend Tasks

- [ ] Add webhook endpoint configuration per workspace.
- [ ] Support selected event subscriptions rather than sending every event.
- [ ] Encrypt webhook secrets at rest.
- [ ] Sign outgoing webhook payloads.
- [ ] Add delivery logs, response status, duration, and retry count.
- [ ] Add bounded retries with exponential backoff.
- [ ] Add a dead-letter state after repeated failure.
- [ ] Add a manual test-delivery action.
- [ ] Prevent private-network and unsafe webhook destinations.
- [ ] Add webhook payload versioning.
- [ ] Add one optional first-party integration only if required, such as GitHub deployment metadata.
- [ ] Add security and E2E tests for signatures, retries, permissions, and SSRF controls.

## Frontend Tasks

- [ ] Add an Integrations settings page.
- [ ] Add webhook creation and editing forms.
- [ ] Add event-subscription selection.
- [ ] Show the secret only once after creation.
- [ ] Add delivery logs and failure details.
- [ ] Add test-delivery and disable actions.
- [ ] Add clear setup documentation inside the UI.
- [ ] Hide secret-management controls from unauthorized roles.
- [ ] Add Playwright coverage for webhook setup and delivery logs.

## Verification Checklist

- [ ] Webhook signatures can be independently verified.
- [ ] Secrets are encrypted and never returned after initial creation.
- [ ] Failed deliveries retry with bounded backoff.
- [ ] Unsafe destinations are rejected.
- [ ] Workspace isolation is enforced.
- [ ] Delivery logs do not contain credentials or sensitive payload data.
- [ ] Payload versions remain backward-compatible.
- [ ] Disabling a webhook immediately stops new deliveries.

## Risks & Important Considerations

- Webhooks introduce SSRF, secret-management, and retry-storm risks.
- Start with a small event catalog and version payloads from the beginning.
- Do not add many provider-specific integrations before the generic framework is stable.

## Expected Outcome

External systems can receive secure, reliable Command Center events without tightly coupling the platform to many third-party services.

---

# Phase 19

## Goal

Harden the complete application for security, performance, accessibility, observability, and operational scale.

**Priority:** High

## Dependencies & Prerequisites

- Feature development for Phases 11–18 is substantially complete.
- Major API and UI contracts are stable.
- A staging environment is available.

## Backend Tasks

- [ ] Run a structured authorization review for every route.
- [ ] Add or verify rate limits for auth, invitations, exports, reprocessing, health checks, and webhooks.
- [ ] Require strong production secrets and remove unsafe defaults.
- [ ] Review CORS, cookies, proxy trust, forwarded IPs, and secure headers.
- [ ] Add structured logs with request and processing correlation IDs.
- [ ] Add application metrics for latency, errors, database queries, workers, queues, and webhooks.
- [ ] Add slow-query logging and review query plans.
- [ ] Add load tests for ingestion, analytics queries, processing, and health checks.
- [ ] Add database backup and restore verification.
- [ ] Add dependency vulnerability scanning.
- [ ] Add explicit data-retention rules.
- [ ] Fix remaining deprecated or unsafe database-client usage.

## Frontend Tasks

- [ ] Run Chromium, Firefox, and WebKit test suites.
- [ ] Add automated axe accessibility checks.
- [ ] Verify keyboard-only navigation and focus management.
- [ ] Add application-level error boundaries.
- [ ] Add client error reporting with sensitive-data filtering.
- [ ] Review bundle size and remove unnecessary dependencies.
- [ ] Optimize slow pages, large tables, and chart rendering.
- [ ] Add performance budgets for key routes.
- [ ] Verify mobile and tablet layouts.
- [ ] Verify all forms expose accessible labels and useful validation messages.

## Verification Checklist

- [ ] No known High or Critical dependency vulnerabilities remain.
- [ ] Authorization tests cover all sensitive routes.
- [ ] Load targets are documented and met.
- [ ] Slow queries are identified and improved.
- [ ] Cross-browser tests pass.
- [ ] Automated accessibility checks pass with no serious violations.
- [ ] Backup restoration succeeds in a clean environment.
- [ ] Logs and metrics provide enough information to diagnose failures.
- [ ] Sensitive data is excluded from logs and error reporting.

## Risks & Important Considerations

- Performance tuning should be driven by measurements, not assumptions.
- Observability tools must not capture passwords, tokens, tracking keys, or private event data.
- Security hardening can change cookies, proxies, and headers; retest real browser sessions afterward.

## Expected Outcome

The application is measurable, secure, accessible, and capable of handling realistic production workloads.

---

# Phase 20

## Goal

Complete CI/CD, deployment automation, production documentation, final real full-stack testing, and launch readiness.

**Priority:** High

## Dependencies & Prerequisites

- Phases 11–19 are complete.
- Staging closely matches production.
- Production hosting, database, Redis, storage, email, and monitoring providers are selected.

## Backend Tasks

- [ ] Add CI jobs for install, lint, typecheck, unit tests, E2E tests, build, Prisma validation, and migration checks.
- [ ] Add isolated PostgreSQL and Redis services in CI.
- [ ] Add deployment-safe migration procedures.
- [ ] Add Docker or hosting build definitions.
- [ ] Add startup, readiness, and liveness checks.
- [ ] Add production environment validation.
- [ ] Add database backup schedules and restore documentation.
- [ ] Add rollback procedures for API and migrations.
- [ ] Add production smoke-test endpoints and scripts.
- [ ] Add release tagging and changelog generation.

## Frontend Tasks

- [ ] Add CI jobs for lint, typecheck, production build, component tests, and Playwright.
- [ ] Run Batch 10 mocked browser tests in CI.
- [ ] Resume and complete Batch 11 real full-stack E2E tests.
- [ ] Add real full-stack journeys for all major Phase 11–20 features.
- [ ] Add production smoke tests for login, dashboard, application, website, analytics, and monitoring.
- [ ] Validate production environment variables and API URLs.
- [ ] Add deployment previews where supported.
- [ ] Confirm cache headers and static-asset behavior.
- [ ] Finalize user-facing setup and troubleshooting documentation.

## Verification Checklist

- [ ] A clean CI run passes from a fresh checkout.
- [ ] All migrations apply to a clean database.
- [ ] All migrations are tested against a production-like database copy.
- [ ] Backend, tracker, and frontend builds pass.
- [ ] Existing 302 tests remain passing.
- [ ] Updated Batch 11 real full-stack tests pass.
- [ ] New Phase 11–20 tests pass.
- [ ] Staging smoke tests pass after deployment.
- [ ] Backup and restore procedures are verified.
- [ ] Rollback procedures are documented and rehearsed.
- [ ] Production monitoring and alerts are active.
- [ ] Final security and accessibility checks pass.
- [ ] Release checklist is approved.

## Risks & Important Considerations

- Never run destructive E2E cleanup against development or production databases.
- Migration rollback may require forward-fix procedures rather than down migrations.
- Keep production deployment simple and repeatable before adding advanced release automation.

## Expected Outcome

A production-ready SaaS Command Center with automated delivery, verified full-stack behavior, documented operations, and clear release and rollback procedures.

---

# Overall Roadmap

## Timeline

Estimated duration: **18–22 weeks** for a small team working sequentially, with some backend and frontend work performed in parallel.

| Phase | Focus                                                 | Estimated Duration |
| ----- | ----------------------------------------------------- | -----------------: |
| 11    | Full-stack foundation and production parity           |          1–2 weeks |
| 12    | Analytics overview dashboard                          |            2 weeks |
| 13    | Detailed analytics and exports                        |            2 weeks |
| 14    | Analytics reliability and scalability                 |          2–3 weeks |
| 15    | Health monitoring and incidents                       |          2–3 weeks |
| 16    | Releases and deployments                              |            2 weeks |
| 17    | Invitations, notifications, and activity              |            2 weeks |
| 18    | Webhooks and integrations                             |          2–3 weeks |
| 19    | Security, performance, accessibility, observability   |          2–3 weeks |
| 20    | CI/CD, real full-stack testing, and production launch |          1–2 weeks |

## Milestones

### Milestone 1 — Stable Full-Stack Foundation

**Phases:** 11–12

- Production and test startup are aligned.
- Real authentication and session restoration work.
- Core analytics dashboard is usable.

### Milestone 2 — Complete Analytics Experience

**Phases:** 13–14

- Detailed reports and exports are available.
- Processing is recoverable, scalable, and multi-instance safe.

### Milestone 3 — Operational Command Center

**Phases:** 15–16

- Application health, incidents, releases, and deployments are visible.

### Milestone 4 — Team and Integration Readiness

**Phases:** 17–18

- Secure invitations, notifications, activity history, and webhooks are available.

### Milestone 5 — Production Launch

**Phases:** 19–20

- Security, performance, accessibility, observability, CI/CD, and real full-stack E2E are complete.

## Final Deliverables

- Production-parity NestJS and Next.js configuration
- Real browser-to-API authentication and session restoration
- Analytics overview and detailed reporting
- Safe analytics processing, reprocessing, retention, and distributed coordination
- Application and website health monitoring
- Incident history and recovery tracking
- Release and deployment tracking
- Workspace invitations and in-app notifications
- Searchable activity and audit experience
- Signed outgoing webhooks with delivery logs
- Cross-browser and accessibility coverage
- Performance and load-test results
- Security-hardening checklist and fixes
- Structured logs, metrics, health checks, and alerts
- CI/CD pipelines
- Clean database migration and backup procedures
- Updated real full-stack E2E suite
- Production deployment, smoke-test, rollback, and operations documentation

---

## Recommended Execution Rule

Complete each phase using this order:

1. Confirm API and UI contracts.
2. Implement database and backend behavior.
3. Add backend tests.
4. Implement frontend behavior.
5. Add frontend and browser tests.
6. Run regression tests.
7. Update documentation.
8. Do not begin the next phase until the current verification checklist is complete.
