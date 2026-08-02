# SaaS Analytics and Portfolio Command Center
## Detailed End-to-End Implementation Plan

---

# Table of Contents

1. [Project Overview](#project-overview)
2. [Recommended Architecture](#recommended-architecture)
3. [Implementation Principles](#implementation-principles)
4. [Overall Roadmap](#overall-roadmap)
5. [Phase 0 — Product Definition and Research](#phase-0-product-definition-and-research)
6. [Phase 1 — Monorepo and Development Foundation](#phase-1-monorepo-and-development-foundation)
7. [Phase 2 — Backend Foundation](#phase-2-backend-foundation)
8. [Phase 3 — Database Foundation](#phase-3-database-foundation)
9. [Phase 4 — Authentication, Workspaces, and Roles](#phase-4-authentication-workspaces-and-roles)
10. [Phase 5 — SaaS Application Registry](#phase-5-saas-application-registry)
11. [Phase 6 — Activity and Audit History](#phase-6-activity-and-audit-history)
12. [Phase 7 — Milestones, Tasks, Blockers, and Progress](#phase-7-milestones-tasks-blockers-and-progress)
13. [Phase 8 — Website Management](#phase-8-website-management)
14. [Phase 9 — Tracking SDK and Event Ingestion](#phase-9-tracking-sdk-and-event-ingestion)
15. [Phase 10 — Analytics Data Model and Aggregation](#phase-10-analytics-data-model-and-aggregation)
16. [Phase 11 — Analytics Dashboard](#phase-11-analytics-dashboard)
17. [Phase 12 — Real-Time Analytics](#phase-12-real-time-analytics)
18. [Phase 13 — Environments, Services, and Deployments](#phase-13-environments-services-and-deployments)
19. [Phase 14 — Health Monitoring and Incidents](#phase-14-health-monitoring-and-incidents)
20. [Phase 15 — Portfolio Command Center](#phase-15-portfolio-command-center)
21. [Phase 16 — GitHub Integration](#phase-16-github-integration)
22. [Phase 17 — Costs, Subscriptions, and Renewals](#phase-17-costs-subscriptions-and-renewals)
23. [Phase 18 — Releases, Decisions, and Documentation](#phase-18-releases-decisions-and-documentation)
24. [Phase 19 — Alerts and Notifications](#phase-19-alerts-and-notifications)
25. [Phase 20 — AI Portfolio Assistant](#phase-20-ai-portfolio-assistant)
26. [Phase 21 — Testing, Security, and Quality](#phase-21-testing-security-and-quality)
27. [Phase 22 — Production Deployment and Operations](#phase-22-production-deployment-and-operations)
28. [Recommended Release Groups](#recommended-release-groups)
29. [Progress Milestones](#progress-milestones)
30. [Final Definition of Done](#final-definition-of-done)

---

# Project Overview

## Product purpose

The platform combines two connected products:

1. **SaaS portfolio management**
2. **Privacy-aware website analytics**

It is intended to answer:

> What is happening across all SaaS applications, what is unfinished or unhealthy, and what should be worked on next?

## Main capabilities

- Secure user accounts and workspaces
- SaaS application registry
- Milestones, tasks, blockers, and automatic progress
- Website registration and tracking SDK
- Analytics reports and real-time visitors
- Environments, services, deployments, health checks, and incidents
- Portfolio Command Center and evidence-based work queue
- GitHub integration
- Costs, subscriptions, and renewals
- Releases, technical decisions, and documentation
- Alerts and notifications
- Read-only AI portfolio assistant

---

# Recommended Architecture

## Monorepo structure

Use a **pnpm monorepo**:

```text
saas-command-center/
├── apps/
│   ├── api/
│   ├── web/
│   └── tracker/
├── packages/
│   ├── shared-types/
│   ├── validation/
│   ├── ui/
│   ├── eslint-config/
│   └── tsconfig/
├── infrastructure/
├── docs/
├── package.json
├── pnpm-workspace.yaml
└── README.md
```

## Technology stack

| Area | Recommended technology |
|---|---|
| Monorepo | pnpm workspaces |
| Backend | NestJS modular monolith |
| Frontend | Next.js |
| Database | PostgreSQL |
| ORM | Prisma |
| Authentication | JWT access tokens and rotating hashed refresh tokens |
| Real-time | Socket.IO |
| Tracker | Lightweight TypeScript/JavaScript bundle |
| Validation | class-validator; optional browser-safe Zod schemas |
| Background work | NestJS scheduler first; BullMQ and Redis when needed |
| API docs | Swagger |
| Tests | Jest, Vitest, Testing Library, Playwright |
| CI/CD | GitHub Actions |
| Local infrastructure | Docker Compose |

## Main relationship model

```text
Workspace
└── SaaS Application
    ├── Websites
    ├── Repositories
    ├── Milestones
    │   └── Tasks
    ├── Blockers
    ├── Environments
    │   └── Services
    │       ├── Deployments
    │       └── Health Checks
    ├── Incidents
    ├── Costs and Subscriptions
    ├── Releases
    ├── Decisions and Documents
    ├── Alerts
    └── Activity History
```

---

# Implementation Principles

1. **Build structured data before AI.** Reliable records come before recommendations or summaries.
2. **Use a modular monolith first.** Do not introduce microservices until real scaling needs justify them.
3. **One application can own many resources.** Never assume one application equals one website, repository, environment, or service.
4. **The backend is the source of truth.** Project progress, analytics metrics, costs, health, and attention scores are calculated on the server.
5. **Keep package boundaries strict.** Shared packages contain safe contracts and UI, not database access or private backend services.
6. **Every recommendation must be explainable.** Show evidence and calculation factors rather than unexplained scores.
7. **Complete phases properly.** A phase requires data design, backend, frontend, tests, documentation, and acceptance verification.

---

# Overall Roadmap

| Order | Phase | Main outcome |
|---:|---|---|
| 1 | Phase 0 | Product Blueprint Approved |
| 2 | Phase 1 | Development Workspace Ready |
| 3 | Phase 2 | API Foundation Stable |
| 4 | Phase 3 | Database Foundation Ready |
| 5 | Phase 4 | Secure Workspace Access |
| 6 | Phase 5 | All Applications Registered |
| 7 | Phase 6 | Project History Available |
| 8 | Phase 7 | Development Status Visible |
| 9 | Phase 8 | Websites Connected |
| 10 | Phase 9 | Real Tracking Working |
| 11 | Phase 10 | Analytics Engine Accurate |
| 12 | Phase 11 | Analytics Reports Usable |
| 13 | Phase 12 | Live Visitors Visible |
| 14 | Phase 13 | Deployment State Visible |
| 15 | Phase 14 | Production Health Visible |
| 16 | Phase 15 | Command Center Usable |
| 17 | Phase 16 | Repositories Connected |
| 18 | Phase 17 | Operating Costs Visible |
| 19 | Phase 18 | Project Knowledge Preserved |
| 20 | Phase 19 | Important Problems Delivered |
| 21 | Phase 20 | AI Answers from Real Data |
| 22 | Phase 21 | Release Candidate Approved |
| 23 | Phase 22 | Production Launch |

---

# Phase 0 — Product Definition and Research

## Purpose

Define exactly what the product will do before writing code. This prevents feature confusion, incorrect relationships, and expensive database redesign later.

## Dependencies and prerequisites

- A list of the SaaS applications you want to manage
- A clear description of the original problem
- Agreement that this phase is research only; no coding is required

## Tasks

### Product scope

- [ ] **Write a one-paragraph problem statement** — Keep every later decision connected to the real problem.
- [ ] **Define the target user** — Decide whether the first version is for one developer, a small team, or organizations.
- [ ] **List all planned modules** — Create one complete feature inventory before choosing the MVP.
- [ ] **Label features as MVP, later, or optional** — Control scope and avoid building everything at once.
- [ ] **Write explicit non-goals** — Make clear what the first release will not include.

### Terminology

- [ ] **Define Workspace** — Clarify the private ownership boundary for users and teams.
- [ ] **Define SaaS Application** — Establish the main product record that other data belongs to.
- [ ] **Define Website, Repository, Environment, Service, and Deployment** — Prevent one resource type from being confused with another.
- [ ] **Define Milestone, Task, Blocker, Incident, and Alert** — Give project and operational records consistent meanings.

### User journeys

- [ ] **Map registration and onboarding** — Understand the first experience for a new user.
- [ ] **Map application creation** — Define the minimum information required to register a SaaS product.
- [ ] **Map development tracking** — Show how milestones, tasks, and blockers will be maintained.
- [ ] **Map website tracking** — Document website creation, tracker installation, and report viewing.
- [ ] **Map deployment and incident handling** — Clarify how operational problems will be recorded and resolved.
- [ ] **Map cost, renewal, and AI-assistant flows** — Define later workflows without implementing them early.

### Architecture decisions

- [ ] **Confirm pnpm monorepo** — Keep related TypeScript applications in one repository.
- [ ] **Confirm modular monolith backend** — Avoid premature microservice complexity.
- [ ] **Confirm PostgreSQL and Prisma** — Use a relational database for the many connected records.
- [ ] **Choose initial hosting assumptions** — Ensure later architecture can run in the intended environment.

## Expected outcome

A written product blueprint containing the MVP, future scope, terminology, data relationships, user roles, and primary user journeys.

## Risks and important considerations

- Coding before relationships are agreed
- Combining analytics and project management without clear boundaries
- Adding GitHub, alerts, and AI to the first release
- Treating every idea as mandatory

## Progress milestone

### Product Blueprint Approved

- [ ] Problem statement approved
- [ ] MVP and non-goals documented
- [ ] Main entities and relationships approved
- [ ] Technology direction approved
- [ ] Phase order approved

## Phase summary

The team knows what will be built, why it will be built, and what will be postponed.

---

# Phase 1 — Monorepo and Development Foundation

## Purpose

Create a clean repository where the API, dashboard, tracker, and shared packages can evolve together without becoming tightly coupled.

## Dependencies and prerequisites

- Phase 0 completed
- Node.js and pnpm selected
- Git repository available
- Docker available for local infrastructure

## Tasks

### Repository structure

- [ ] **Create apps/api** — Store the NestJS backend independently.
- [ ] **Create apps/web** — Store the Next.js dashboard independently.
- [ ] **Create apps/tracker** — Keep the external website tracker lightweight and separate.
- [ ] **Create packages/shared-types** — Share browser-safe TypeScript contracts and enums.
- [ ] **Create packages/ui and tooling packages** — Reuse UI elements and lint or TypeScript configuration safely.
- [ ] **Create docs and infrastructure folders** — Version architecture notes and deployment files with the code.

### Workspace conventions

- [ ] **Assign unique package names** — Make pnpm filters and CI commands predictable.
- [ ] **Define dependency direction** — Applications may use shared packages; shared packages must never depend on applications.
- [ ] **Add root development, build, lint, and test commands** — Give contributors one consistent entry point.
- [ ] **Add shared TypeScript, ESLint, and formatting rules** — Keep all packages consistent.

### Environment and Git strategy

- [ ] **Create .env.example files** — Document every required variable without storing secrets.
- [ ] **Separate frontend-safe variables from backend secrets** — Prevent private values from entering browser bundles.
- [ ] **Define branch and pull-request rules** — Make changes reviewable and reversible.
- [ ] **Plan CI checks** — Require lint, type checking, tests, and builds before merging.

## Expected outcome

A predictable monorepo with strict package boundaries, shared tooling, documented environment variables, and clear root commands.

## Risks and important considerations

- Frontend importing backend services
- Shared packages becoming a dumping ground
- Incorrect package names breaking pnpm filters
- Secrets committed to Git

## Progress milestone

### Development Workspace Ready

- [ ] Folder structure approved
- [ ] Package names unique
- [ ] Dependency boundaries documented
- [ ] Root commands defined
- [ ] Environment rules documented
- [ ] CI checks planned

## Phase summary

The repository is ready for implementation, but no product features are built yet.

---

# Phase 2 — Backend Foundation

## Purpose

Build the reusable NestJS API behavior needed by every feature module.

## Dependencies and prerequisites

- Phase 1 completed
- apps/api created
- Environment-variable strategy documented

## Tasks

### Configuration and startup

- [ ] **Create configuration module** — Load settings through one validated system.
- [ ] **Validate environment variables during startup** — Fail early when required configuration is missing.
- [ ] **Add /api/v1 prefix and versioning rules** — Keep future API changes manageable.
- [ ] **Enable graceful shutdown** — Close database and network resources safely.

### API standards

- [ ] **Add global validation** — Reject invalid requests consistently.
- [ ] **Add global exception handling** — Return predictable and safe error responses.
- [ ] **Add request IDs and structured logging** — Trace failures without exposing secrets.
- [ ] **Define pagination and date formats** — Prevent each module from inventing a different format.

### Security and observability

- [ ] **Configure CORS** — Allow only intended clients.
- [ ] **Add security headers and body-size limits** — Reduce common web risks and abuse.
- [ ] **Add rate-limiting foundation** — Protect authentication and public ingestion later.
- [ ] **Add health and version endpoints** — Support deployment checks and monitoring.
- [ ] **Add Swagger** — Keep the API understandable and testable.

## Expected outcome

A stable API that starts safely, validates configuration and requests, logs consistently, exposes health information, and produces documented responses.

## Risks and important considerations

- Adding feature modules before common behavior is stable
- Logging access tokens or personal data
- Unrestricted CORS
- Inconsistent error responses

## Progress milestone

### API Foundation Stable

- [ ] Development startup works
- [ ] Production build works
- [ ] Configuration validation works
- [ ] Health endpoint works
- [ ] Swagger works
- [ ] Errors and logs are consistent

## Phase summary

All later backend modules can now follow the same configuration, validation, error, and logging conventions.

---

# Phase 3 — Database Foundation

## Purpose

Create a safe PostgreSQL and Prisma foundation with repeatable migrations and isolated test data.

## Dependencies and prerequisites

- Phase 2 completed
- PostgreSQL selected
- Docker Compose or managed development database available

## Tasks

### Local and test databases

- [ ] **Define PostgreSQL development service** — Give every contributor the same local database.
- [ ] **Create a separate test database** — Prevent automated tests from damaging development data.
- [ ] **Document database lifecycle commands** — Make startup, reset, and backup behavior clear.

### Prisma foundation

- [ ] **Initialize Prisma and database module** — Centralize database access inside the backend.
- [ ] **Create migration, seed, and test-reset scripts** — Make schema changes repeatable.
- [ ] **Define UUID, timestamp, naming, and soft-delete conventions** — Keep models consistent.
- [ ] **Define transaction and cascade-delete rules** — Avoid accidental data loss.

### Initial models and testing

- [ ] **Create User, Workspace, WorkspaceMember, and AuthSession models** — Prepare authentication and tenant ownership.
- [ ] **Add ownership indexes and unique constraints** — Protect data integrity and query performance.
- [ ] **Test migrations on clean and populated databases** — Catch unsafe schema changes early.
- [ ] **Document rollback and backup expectations** — Prepare for staging and production operations.

## Expected outcome

A reliable persistence layer with repeatable migrations, a separate test database, initial ownership models, and intentional deletion behavior.

## Risks and important considerations

- Tests using the wrong database
- Unsafe cascade deletion
- Missing workspace indexes
- Editing migrations after deployment
- Plain-text token storage

## Progress milestone

### Database Foundation Ready

- [ ] Development database works
- [ ] Test database isolated
- [ ] Prisma connects
- [ ] Initial migration succeeds
- [ ] Seed succeeds
- [ ] Migration rules documented
- [ ] Ownership indexes exist

## Phase summary

The project can now store users and workspaces safely and evolve its schema predictably.

---

# Phase 4 — Authentication, Workspaces, and Roles

## Purpose

Protect private data and ensure each request is authorized for the correct workspace and role.

## Dependencies and prerequisites

- Phase 3 completed
- User and workspace models available
- Secure cookie or token transport strategy selected

## Tasks

### Authentication

- [ ] **Implement registration and login** — Allow users to create and access accounts.
- [ ] **Hash passwords with a modern password-hashing library** — Protect stored credentials.
- [ ] **Issue short-lived access tokens** — Limit damage if an access token is exposed.
- [ ] **Implement hashed refresh-token rotation and reuse detection** — Support secure long-lived sessions.
- [ ] **Implement logout and logout-all-sessions** — Allow users to revoke access.

### Workspace and roles

- [ ] **Create a workspace during onboarding** — Give all business data a tenant owner.
- [ ] **Implement membership and role guards** — Control actions by OWNER, ADMIN, DEVELOPER, and VIEWER roles.
- [ ] **Add workspace ownership checks to service methods** — Prevent cross-workspace data leaks.
- [ ] **Define owner-transfer and permanent-deletion rules** — Avoid orphaned workspaces.

### Frontend and tests

- [ ] **Build registration, login, logout, and protected layouts** — Provide the complete account flow.
- [ ] **Handle token refresh and expired sessions** — Keep the user experience stable and secure.
- [ ] **Test duplicate accounts, invalid passwords, rotation, reuse, roles, and isolation** — Verify both authentication and authorization.

## Expected outcome

Every private request is tied to an authenticated user, workspace, and authorized role.

## Risks and important considerations

- Cross-workspace access
- Refresh tokens stored in plain text
- Long-lived access tokens
- Frontend-only authorization
- Deleting the only owner

## Progress milestone

### Secure Workspace Access

- [ ] Registration and login work
- [ ] Refresh rotation works
- [ ] Logout works
- [ ] Workspace isolation tests pass
- [ ] Role tests pass
- [ ] Protected frontend routes work

## Phase summary

The platform now has a secure tenant boundary for all future application data.

---

# Phase 5 — SaaS Application Registry

## Purpose

Create the central record for every SaaS application and solve the first part of the original visibility problem.

## Dependencies and prerequisites

- Phase 4 completed
- Workspace authorization stable
- Application terminology approved

## Tasks

### Data model

- [ ] **Create SaasApplication** — Store name, descriptions, category, status, priority, dates, and archive state.
- [ ] **Create ApplicationTechnology** — Record frontend, backend, database, AI, infrastructure, and other technologies.
- [ ] **Create ApplicationLink** — Store production, staging, repository, documentation, design, and other URLs.
- [ ] **Define status and priority enums** — Keep filtering and reporting consistent.

### Backend

- [ ] **Implement create, list, view, update, archive, and restore** — Provide the complete application lifecycle.
- [ ] **Implement owner-only permanent deletion** — Protect important records from accidental removal.
- [ ] **Add search, filtering, sorting, and pagination** — Make a larger portfolio manageable.
- [ ] **Implement technology and link management** — Keep application context in one place.

### Frontend and initial data

- [ ] **Build application cards and table** — Provide quick and detailed portfolio views.
- [ ] **Build create, edit, settings, archive, and restore flows** — Allow full management without direct database changes.
- [ ] **Add loading, empty, and error states** — Keep the interface understandable in every state.
- [ ] **Register all existing SaaS applications** — Populate the product with real data immediately.

## Expected outcome

One screen lists all SaaS applications with their current basic status, priority, technology stack, and important links.

## Risks and important considerations

- Assuming one application has one website or repository
- Relying permanently on manual progress
- Deleting applications that later own analytics
- Inconsistent statuses

## Progress milestone

### All Applications Registered

- [ ] CRUD works
- [ ] Filters and sorting work
- [ ] Technology and links work
- [ ] Archive and restore work
- [ ] Workspace isolation passes
- [ ] Real applications entered

## Phase summary

The platform now knows which SaaS applications exist, but it does not yet know their detailed development progress.

---

# Phase 6 — Activity and Audit History

## Purpose

Record what changed, who changed it, and when it changed using one shared history system.

## Dependencies and prerequisites

- Phase 5 completed
- Application records available
- Authenticated actors available

## Tasks

### Activity model and service

- [ ] **Create ApplicationActivity** — Store application, actor, type, affected entity, safe metadata, and timestamp.
- [ ] **Create reusable activity writer** — Prevent every module from inventing its own audit format.
- [ ] **Support user and system actors** — Record manual changes and automated events.
- [ ] **Update application lastActivityAt** — Make inactivity visible in the portfolio.
- [ ] **Sanitize metadata** — Prevent secrets and sensitive values from entering audit history.

### Initial events and UI

- [ ] **Record application lifecycle, status, priority, technology, and link events** — Capture the first meaningful changes.
- [ ] **Build application and workspace activity feeds** — Let users understand project history.
- [ ] **Add filters and pagination** — Keep large timelines usable.

## Expected outcome

Every important application change appears in a consistent, searchable timeline.

## Risks and important considerations

- Sensitive metadata
- Excessive low-value events
- Large activity tables
- Activity logging breaking the main transaction

## Progress milestone

### Project History Available

- [ ] Reusable activity service works
- [ ] Application actions create records
- [ ] lastActivityAt updates
- [ ] Timeline works
- [ ] Sensitive metadata tests pass

## Phase summary

The platform can now explain how an application reached its current state.

---

# Phase 7 — Milestones, Tasks, Blockers, and Progress

## Purpose

Track completed work, unfinished work, overdue items, and blockers, then calculate project progress from real records.

## Dependencies and prerequisites

- Phase 5 completed
- Phase 6 completed
- Application ownership stable

## Tasks

### Models and templates

- [ ] **Create ApplicationMilestone** — Group major deliverables with dates, status, position, and weight.
- [ ] **Create ApplicationTask** — Track manageable work items, ownership, due dates, and completion.
- [ ] **Create ApplicationBlocker** — Record why work cannot continue and how it was resolved.
- [ ] **Create Standard SaaS, AI SaaS, mobile, API, and e-commerce templates** — Speed up project setup without forcing one structure on every product.

### Progress calculation

- [ ] **Calculate milestone progress from applicable task weights** — Replace unreliable manual percentages.
- [ ] **Calculate application progress from weighted milestones** — Produce one explainable overall value.
- [ ] **Exclude skipped work and require skip reasons** — Avoid lowering progress for intentionally removed scope.
- [ ] **Recalculate on status, weight, move, reopen, and delete operations** — Keep progress accurate after every change.
- [ ] **Return calculation explanation** — Allow users to understand the percentage.

### Backend and frontend

- [ ] **Implement milestone, task, and blocker lifecycles** — Support create, update, reorder, complete, reopen, skip, block, resolve, and filter operations.
- [ ] **Build development summary, milestone list, Kanban board, timeline, and blocker panel** — Make project status easy to scan.
- [ ] **Show overdue work and upcoming deadlines** — Surface work that needs immediate attention.
- [ ] **Add activity events** — Preserve development history.

## Expected outcome

The platform shows exact project progress, remaining work, overdue items, and open blockers for every application.

## Risks and important considerations

- Misleading weights
- Premature task completion
- Undefined empty-milestone behavior
- Large Kanban performance
- Unexpected progress changes when moving tasks

## Progress milestone

### Development Status Visible

- [ ] Milestones, tasks, and blockers work
- [ ] Progress recalculates automatically
- [ ] Templates work
- [ ] Overdue work appears
- [ ] Existing applications receive milestone plans

## Phase summary

This phase directly solves the problem of forgetting where each application stopped.

---

# Phase 8 — Website Management

## Purpose

Connect one or more analytics websites to each SaaS application and manage their tracking configuration.

## Dependencies and prerequisites

- Phase 5 completed
- Applications exist
- Authentication and workspace isolation stable

## Tasks

### Website model

- [ ] **Create Website with workspace and optional application relation** — Allow multiple websites under one SaaS product.
- [ ] **Store name, domain, time zone, enabled state, allowed origins, and tracking key** — Provide the configuration required by analytics.
- [ ] **Define archive and tracking-key rotation rules** — Protect analytics history while supporting security changes.

### Backend and frontend

- [ ] **Implement website CRUD, enable, disable, archive, and key rotation** — Manage the complete website lifecycle.
- [ ] **Implement connect and disconnect from applications** — Keep analytics websites organized under products.
- [ ] **Build website list, form, detail, installation, and settings screens** — Make setup possible without backend knowledge.
- [ ] **Validate domain, time zone, origin, and ownership** — Protect report accuracy and tenant isolation.

## Expected outcome

Each SaaS application can contain multiple independently configured analytics websites.

## Risks and important considerations

- Deleting analytics context
- Breaking trackers after key rotation
- Incorrect time zone
- Overly strict or loose origin rules

## Progress milestone

### Websites Connected

- [ ] Website lifecycle works
- [ ] Tracking keys secure
- [ ] Multiple websites per application work
- [ ] Time-zone settings work
- [ ] Workspace isolation passes

## Phase summary

Websites are ready to receive tracker installations.

---

# Phase 9 — Tracking SDK and Event Ingestion

## Purpose

Collect reliable analytics events from external websites without slowing down or breaking them.

## Dependencies and prerequisites

- Phase 8 completed
- Tracking keys exist
- Privacy and retention choices documented

## Tasks

### Tracker SDK

- [ ] **Keep the tracker framework-independent** — Allow installation on any website.
- [ ] **Generate visitor and session identifiers** — Group events into meaningful users and visits.
- [ ] **Capture page views, titles, referrers, route changes, screen data, heartbeats, and custom events** — Collect the minimum data needed for reports.
- [ ] **Batch or send events asynchronously** — Reduce performance impact.
- [ ] **Fail silently** — Ensure analytics failure never breaks the customer website.
- [ ] **Track bundle size and load performance** — Keep installation lightweight.

### Public ingestion API

- [ ] **Validate tracking key and website status** — Accept events only for valid enabled websites.
- [ ] **Validate and sanitize payloads** — Prevent invalid, oversized, or sensitive data.
- [ ] **Add event IDs and deduplication** — Avoid inflated metrics from retries.
- [ ] **Record receive time and return quickly** — Keep the public endpoint fast.
- [ ] **Add rate and abuse protection** — Protect infrastructure from misuse.

### Privacy and testing

- [ ] **Define IP, user-agent, storage, consent, and retention behavior** — Make privacy decisions explicit.
- [ ] **Remove sensitive query parameters and never capture form values** — Reduce accidental personal-data collection.
- [ ] **Test static pages, SPAs, tabs, invalid keys, duplicates, offline behavior, blockers, and slow connections** — Verify reliability in real browsers.

## Expected outcome

Real websites send page views, sessions, heartbeats, and custom events through a lightweight and resilient tracker.

## Risks and important considerations

- Duplicate events
- Bot traffic
- Performance overhead
- Privacy-law requirements
- Sensitive URL data
- Browser storage restrictions
- Ad blockers

## Progress milestone

### Real Tracking Working

- [ ] Tracker loads asynchronously
- [ ] Page views and sessions arrive
- [ ] SPA routes captured
- [ ] Deduplication works
- [ ] Host website remains stable
- [ ] Privacy behavior documented

## Phase summary

The platform now collects raw analytics data from real websites.

---

# Phase 10 — Analytics Data Model and Aggregation

## Purpose

Turn raw events into accurate, well-defined, and fast analytics reports.

## Dependencies and prerequisites

- Phase 9 completed
- Real events available
- Metric definitions approved

## Tasks

### Metric definitions

- [ ] **Define visitor, session, page view, bounce, duration, active visitor, source, entry, and exit** — Ensure backend, frontend, tests, and users use the same meanings.

### Processing models and logic

- [ ] **Create Visitor, Session, AnalyticsEvent, PageView, HourlyAggregate, and DailyAggregate** — Separate raw data from reporting data.
- [ ] **Implement visitor and session lifecycle** — Group incoming events correctly.
- [ ] **Normalize URLs and referrers** — Prevent reports from splitting equivalent pages and sources.
- [ ] **Parse device, browser, operating system, and country where allowed** — Create useful dimensions.

### Aggregation and performance

- [ ] **Create idempotent hourly and daily aggregation** — Make repeated jobs safe.
- [ ] **Aggregate pages, sources, countries, devices, and browsers** — Support detailed reports.
- [ ] **Handle late events and reprocessing** — Keep reports accurate when events arrive late.
- [ ] **Add indexes, range limits, retention, and query-plan checks** — Keep reports fast as data grows.

## Expected outcome

Accurate analytics can be served quickly without scanning all raw events for every request.

## Risks and important considerations

- Aggregates not matching raw events
- Time-zone boundaries
- Late-event duplication
- Session-definition changes
- Large event tables

## Progress milestone

### Analytics Engine Accurate

- [ ] Metric definitions documented
- [ ] Session and bounce fixtures pass
- [ ] Hourly and daily aggregation pass
- [ ] Dimensions pass
- [ ] Query performance acceptable

## Phase summary

The raw tracking stream is converted into trustworthy report data.

---

# Phase 11 — Analytics Dashboard

## Purpose

Present website performance in a clear, accessible, and accurate dashboard.

## Dependencies and prerequisites

- Phase 10 completed
- Aggregation APIs available
- Website selector available

## Tasks

### Overview and reports

- [ ] **Build visitors, sessions, page views, views per session, duration, bounce, and comparison cards** — Show the most important metrics first.
- [ ] **Build trend charts** — Show change over time.
- [ ] **Build pages, sources, countries, devices, browsers, operating systems, and custom-event reports** — Allow detailed investigation.

### Date and interface behavior

- [ ] **Add standard presets and custom ranges** — Make common reporting periods easy to select.
- [ ] **Show website time zone and previous-period comparison** — Prevent confusion around date boundaries.
- [ ] **Add loading, empty, error, retry, responsive, and accessible states** — Make the dashboard usable in normal and failure conditions.
- [ ] **Synchronize important filters with the URL** — Support bookmarking and sharing views.

### Verification

- [ ] **Compare every metric to fixture data** — Prove dashboard values are correct.
- [ ] **Test zero data, one session, long ranges, time-zone boundaries, daylight saving, and zero previous period** — Cover important edge cases.

## Expected outcome

Users can understand website performance without inspecting raw events or database records.

## Risks and important considerations

- Frontend and backend calculations diverge
- Unclear metric labels
- Inaccessible charts
- Very large date ranges
- Time-zone confusion

## Progress milestone

### Analytics Reports Usable

- [ ] Overview and detailed reports work
- [ ] Date and comparison controls work
- [ ] Empty and error states work
- [ ] Fixtures match
- [ ] Accessibility baseline passes

## Phase summary

The analytics engine now has a user-facing reporting experience.

---

# Phase 12 — Real-Time Analytics

## Purpose

Show active visitors and their current pages without requiring dashboard refreshes.

## Dependencies and prerequisites

- Phase 9 heartbeats available
- Phase 4 socket authentication possible
- Website ownership stable

## Tasks

### Real-time rules

- [ ] **Define heartbeat interval, active timeout, tab behavior, and current-page behavior** — Make active-visitor counts consistent.

### Socket.IO backend

- [ ] **Authenticate sockets and authorize website subscriptions** — Prevent cross-workspace leaks.
- [ ] **Create website-specific rooms** — Send events only to the correct dashboard.
- [ ] **Broadcast counts and current pages** — Update the dashboard live.
- [ ] **Handle timeout, disconnect, reconnect, and rate limits** — Keep state correct under normal network changes.
- [ ] **Document Redis adapter requirement for multi-instance deployment** — Prepare for later scaling without adding Redis immediately.

### Frontend and tests

- [ ] **Build active count, current pages, connection state, and reconnect indicators** — Make live status understandable.
- [ ] **Test tabs, websites, workspaces, timeout, reconnect, unauthorized access, and connection load** — Verify isolation and stability.

## Expected outcome

Live website activity updates correctly and remains isolated by website and workspace.

## Risks and important considerations

- Cross-workspace event leakage
- Tabs counted incorrectly
- Stale active visitors
- Proxy configuration
- Multi-instance scaling

## Progress milestone

### Live Visitors Visible

- [ ] Socket authentication works
- [ ] Rooms isolated
- [ ] Counts and pages work
- [ ] Timeout and reconnect work
- [ ] Cross-workspace tests pass

## Phase summary

The analytics dashboard can now show what is happening right now.

---

# Phase 13 — Environments, Services, and Deployments

## Purpose

Track where each application runs and which version is deployed to every service.

## Dependencies and prerequisites

- Phase 5 completed
- Activity system available
- Manual deployment records accepted for the first version

## Tasks

### Models

- [ ] **Create ApplicationEnvironment** — Represent development, preview, staging, and production targets.
- [ ] **Create ApplicationService** — Represent frontend, API, worker, database, queue, storage, and other components.
- [ ] **Create Deployment** — Record provider, status, branch, commit, duration, URLs, failure, and rollback.

### Workflow and frontend

- [ ] **Implement manual deployment lifecycle** — Support queued, building, deploying, successful, failed, cancelled, and rolled-back states before provider automation.
- [ ] **Build environment and service management** — Show the structure of each running application.
- [ ] **Build deployment history and detail views** — Make current and past releases traceable.
- [ ] **Generate activity records** — Connect operational changes to the application timeline.

## Expected outcome

Users can identify production services, the currently deployed version, failed releases, and rollback history.

## Risks and important considerations

- Preview failure incorrectly affecting production
- Provider status differences
- Manual records becoming stale
- Deleting environments with history

## Progress milestone

### Deployment State Visible

- [ ] Environments and multiple services work
- [ ] Deployment lifecycle works
- [ ] Production version visible
- [ ] Failures and rollbacks visible
- [ ] Activities generated

## Phase summary

The platform now knows what is running and where it is running.

---

# Phase 14 — Health Monitoring and Incidents

## Purpose

Detect service failures, create incidents after meaningful thresholds, and resolve them after recovery.

## Dependencies and prerequisites

- Phase 13 completed
- Service health URLs available
- Scheduled background execution available

## Tasks

### Models

- [ ] **Create HealthCheck and HealthCheckResult** — Store check configuration and historical results.
- [ ] **Create ApplicationIncident** — Track warning and critical operational problems from start through resolution.

### Worker and rules

- [ ] **Run enabled checks with timeout and response timing** — Measure availability without blocking normal API requests.
- [ ] **Use consecutive failure and recovery thresholds** — Reduce false incidents from temporary network issues.
- [ ] **Prevent duplicate incidents and clean old results** — Keep incident history and storage manageable.
- [ ] **Calculate explainable application health** — Combine production availability, critical services, deployment state, incidents, and freshness.

### Frontend

- [ ] **Build health score, explanation, uptime, response-time, history, and incident views** — Give users operational visibility.
- [ ] **Support acknowledgment and authorized manual resolution** — Allow teams to manage active incidents.

## Expected outcome

Production failures become visible automatically, duplicate incidents are prevented, and recoveries close the correct incident.

## Risks and important considerations

- False positives
- Overloading small services
- Provider blocks
- Large result tables
- Unsafe direct database checks

## Progress milestone

### Production Health Visible

- [ ] Scheduled checks work
- [ ] Thresholds work
- [ ] Incidents open and deduplicate
- [ ] Recovery resolves
- [ ] Health score explainable
- [ ] Production severity correct

## Phase summary

The platform can now distinguish healthy, warning, and critical applications using real operational data.

---

# Phase 15 — Portfolio Command Center

## Purpose

Combine project, analytics, deployment, and health information into one cross-application decision dashboard.

## Dependencies and prerequisites

- Phases 5, 7, 11, 13, and 14 completed
- Summary queries optimized

## Tasks

### Portfolio summary

- [ ] **Create totals for application stages, critical health, blockers, overdue work, failures, and visitors** — Provide an immediate portfolio snapshot.
- [ ] **Build a portfolio table with status, priority, progress, health, blockers, deployment, traffic, activity, and launch date** — Allow detailed comparison.

### Work queue and attention engine

- [ ] **Create deterministic rules for downtime, critical incidents, failed production deployments, blockers, overdue milestones, inactivity, and missing analytics** — Prioritize work using explainable evidence.
- [ ] **Return score factors and affected records** — Make every recommendation auditable.
- [ ] **Ensure production issues outrank development issues** — Protect live applications first.

### Filters, saved views, and performance

- [ ] **Add status, priority, health, category, blocker, failure, overdue, inactive, and production filters** — Make the portfolio easy to focus.
- [ ] **Add saved views** — Preserve common working sets.
- [ ] **Use grouped queries, caching, invalidation, indexes, and precomputation** — Avoid one query per application and slow dashboards.

## Expected outcome

One page explains where every SaaS application stands and what should receive attention first.

## Risks and important considerations

- Untrustworthy complex scores
- Stale data
- Production and development severity mixed
- Paused and archived applications treated incorrectly

## Progress milestone

### Command Center Usable

- [ ] Summary accurate
- [ ] Portfolio table accurate
- [ ] Work queue ordered
- [ ] Evidence included
- [ ] Filters and saved views work
- [ ] Performance acceptable

## Phase summary

The original portfolio-visibility goal is now delivered in one central dashboard.

---

# Phase 16 — GitHub Integration

## Purpose

Connect repositories and surface commits, pull requests, issues, workflow failures, releases, and inactivity signals.

## Dependencies and prerequisites

- Phase 5 completed
- Public callback and webhook URLs available
- Secure secret storage available

## Tasks

### GitHub App and models

- [ ] **Create a GitHub App with minimum permissions** — Use installation-based access instead of long-lived personal tokens.
- [ ] **Create repository, commit, pull request, issue, workflow, release, and processed-webhook models** — Store only the engineering data needed by the product.

### Connection and synchronization

- [ ] **Implement installation callback and repository selection** — Let users connect repositories to applications.
- [ ] **Run initial and incremental synchronization** — Populate data and recover from missed webhooks.
- [ ] **Handle push, pull request, issue, workflow, release, repository, and installation events** — Keep engineering state fresh.
- [ ] **Handle rate limits, duplicates, retries, and revocation** — Make the integration dependable.

### Security and UI

- [ ] **Verify webhook signatures and avoid permanent installation-token storage** — Protect repository access.
- [ ] **Build repository overview, commits, pull requests, issues, workflows, releases, sync state, and resync controls** — Make engineering activity useful.
- [ ] **Add repository signals to the Command Center** — Highlight failed workflows, pending reviews, and inactivity.
- [ ] **Never use commit count as project progress** — Keep activity separate from completion.

## Expected outcome

Repository activity and engineering problems appear inside each SaaS application and the portfolio dashboard.

## Risks and important considerations

- Rate limits
- Duplicate webhooks
- Private repository permissions
- Revoked installations
- Large history
- Activity mistaken for progress

## Progress milestone

### Repositories Connected

- [ ] Installation works
- [ ] Repository connection works
- [ ] Sync and webhooks work
- [ ] Invalid signatures rejected
- [ ] Revocation handled
- [ ] Signals appear in portfolio

## Phase summary

GitHub now provides activity evidence without replacing milestone-based progress.

---

# Phase 17 — Costs, Subscriptions, and Renewals

## Purpose

Track the operating cost of every application and prevent forgotten financial commitments.

## Dependencies and prerequisites

- Phase 5 completed
- Date and time-zone utilities stable
- Currency strategy approved

## Tasks

### Models and categories

- [ ] **Create ApplicationCost** — Store one-time and recurring expenses by provider and category.
- [ ] **Create ApplicationSubscription** — Track plan, billing cycle, renewal, status, auto-renew, and management link.
- [ ] **Define hosting, database, domain, email, storage, AI, monitoring, authentication, tools, and other categories** — Make portfolio totals understandable.

### Calculations and renewals

- [ ] **Calculate monthly, annual, one-time, provider, category, application, and portfolio totals** — Show where money is being spent.
- [ ] **Keep mixed currencies separate initially** — Avoid inaccurate totals.
- [ ] **Detect renewals at 30, 14, 7, and 1 day plus overdue** — Give users time to act.
- [ ] **Highlight inactive or archived applications with active costs** — Identify unnecessary spending.

### Frontend

- [ ] **Build application cost page, subscription table, breakdowns, renewal calendar, and portfolio cost dashboard** — Make financial obligations easy to scan.

## Expected outcome

Users know the monthly and annual cost of each application and which subscriptions need attention.

## Risks and important considerations

- Mixed-currency errors
- Duplicate expenses
- Unrecorded price changes
- Variable fees treated as fixed
- Missing renewal dates

## Progress milestone

### Operating Costs Visible

- [ ] Costs and subscriptions work
- [ ] Totals accurate
- [ ] Currencies handled safely
- [ ] Renewals detected
- [ ] Inactive costly applications highlighted

## Phase summary

The portfolio now includes financial visibility, not only technical status.

---

# Phase 18 — Releases, Decisions, and Documentation

## Purpose

Preserve what is deployed, why important choices were made, and how each application should be run.

## Dependencies and prerequisites

- Phases 7 and 13 completed
- Phase 16 recommended
- Activity system available

## Tasks

### Release management

- [ ] **Create ApplicationRelease and ReleaseItem** — Record versions, environments, deployments, commits, features, fixes, security changes, breaking changes, and known issues.
- [ ] **Implement draft, publish, fail, rollback, and archive lifecycle** — Keep release history complete.
- [ ] **Link releases to tasks, commits, and deployments** — Provide traceability from planned work to production.

### Decision records

- [ ] **Create ApplicationDecision with context, decision, alternatives, consequences, and status** — Prevent repeated architecture debates and lost reasoning.
- [ ] **Support proposed, accepted, rejected, and superseded states** — Preserve decision history.

### Documentation center

- [ ] **Create documents for overview, requirements, architecture, database, API, setup, deployment, testing, security, operations, issues, roadmap, and incident runbooks** — Keep operational knowledge with each application.
- [ ] **Calculate completeness for required documents** — Highlight knowledge gaps.
- [ ] **Sanitize Markdown and detect likely secrets** — Reduce security risks.
- [ ] **Build release, decision, and documentation interfaces** — Make the knowledge usable.

## Expected outcome

A developer can return months later and understand the current production version, important decisions, setup process, deployment process, and known issues.

## Risks and important considerations

- Outdated documentation
- Pasted credentials
- Unsafe Markdown
- Conflicting versions
- Incorrect automatic release notes

## Progress milestone

### Project Knowledge Preserved

- [ ] Releases and rollbacks work
- [ ] Production version visible
- [ ] Decisions work
- [ ] Documentation works
- [ ] Completeness works
- [ ] Secret warnings work

## Phase summary

Critical project knowledge is preserved instead of remaining only in memory or chat history.

---

# Phase 19 — Alerts and Notifications

## Purpose

Notify users when action is required while preventing duplicate and noisy alerts.

## Dependencies and prerequisites

- Phases 14, 15, 17, and 18 completed
- Background jobs available
- Email provider selected

## Tasks

### Rules and models

- [ ] **Create NotificationRule, NotificationEvent, NotificationDelivery, and preferences** — Separate detection, alert state, delivery attempts, and user settings.
- [ ] **Implement downtime, deployment, blocker, milestone, workflow, inactivity, renewal, documentation, tracker, and recovery alert types** — Cover the highest-value conditions first.

### Lifecycle and delivery

- [ ] **Support triggered, acknowledged, resolved, and suppressed states** — Track alerts from discovery through completion.
- [ ] **Deduplicate by application, alert type, and affected resource** — Prevent repeated active alerts.
- [ ] **Escalate existing alerts and resolve on recovery** — Maintain one accurate incident thread.
- [ ] **Deliver in-app and email notifications with retry and backoff** — Provide reliable delivery without blocking the main API.

### Frontend and preferences

- [ ] **Build notification center, unread count, active and resolved views, acknowledgment, resolution, and suppression** — Let users manage alerts.
- [ ] **Build threshold, channel, severity, quiet-hours, and test-notification settings** — Reduce alert fatigue.

## Expected outcome

Urgent operational, development, and financial problems surface automatically through useful, deduplicated notifications.

## Risks and important considerations

- Alert fatigue
- False positives
- Delivery failure
- Duplicate alerts
- Time-zone errors
- Wrong recovery association

## Progress milestone

### Important Problems Delivered

- [ ] Rules and deduplication work
- [ ] Escalation and recovery work
- [ ] In-app and email work
- [ ] Retries and quiet hours work
- [ ] Preferences respected

## Phase summary

Users no longer need to manually inspect every application to discover urgent issues.

---

# Phase 20 — AI Portfolio Assistant

## Purpose

Provide natural-language answers about the portfolio using verified structured data.

## Dependencies and prerequisites

- Reliable records from earlier phases
- Workspace authorization stable
- AI provider and usage limits selected
- Secret redaction available

## Tasks

### Read-only scope

- [ ] **Support portfolio and application summaries** — Give quick status explanations.
- [ ] **Support blocker, progress, health, deployment, repository, cost, documentation, comparison, weekly-review, and next-work intents** — Cover practical portfolio questions.
- [ ] **Explicitly block task completion, status changes, blocker resolution, deployments, deletions, publishing, and financial changes** — Keep the first version safe and reviewable.

### Retrieval and evidence

- [ ] **Authenticate, resolve workspace, classify intent, select applications, query records, calculate facts, redact data, and then call the model** — Make structured data—not the model—the source of truth.
- [ ] **Return evidence, timestamps, missing information, confidence, and record references** — Make answers traceable.
- [ ] **Create conversation, message, query-log, reference, and token-usage records** — Support history, debugging, and cost controls.

### Safety and frontend

- [ ] **Defend against prompt injection in stored documents** — Treat user content as untrusted.
- [ ] **Limit context, label stale data, calculate numbers in code, and enforce usage limits** — Reduce hallucination and cost.
- [ ] **Build assistant panel, application-specific assistant, suggested questions, history, evidence links, freshness, warnings, copy, and feedback** — Make AI answers understandable and reviewable.

## Expected outcome

Users can ask portfolio questions and receive evidence-backed answers based on real stored records.

## Risks and important considerations

- Confident answers from incomplete data
- Prompt injection
- High model cost
- Stale records
- Users confusing summaries with verified completion
- Secret exposure

## Progress milestone

### AI Answers from Real Data

- [ ] Intent and retrieval work
- [ ] Evidence and timestamps work
- [ ] Missing and stale data labeled
- [ ] Secrets removed
- [ ] Read-only rules pass
- [ ] Usage limits work

## Phase summary

The AI assistant becomes a conversational interface over the portfolio database, not an independent source of truth.

---

# Phase 21 — Testing, Security, and Quality

## Purpose

Verify the complete product before production deployment.

## Dependencies and prerequisites

- Core product phases implemented
- Staging environment available
- Representative test data available

## Tasks

### Automated testing

- [ ] **Add unit tests for calculations and validation** — Protect progress, analytics, health, priority, cost, renewal, and alert logic.
- [ ] **Add integration tests for ownership and module workflows** — Verify database and service behavior together.
- [ ] **Add API end-to-end tests** — Test realistic backend journeys.
- [ ] **Add Playwright critical-user flows** — Verify the product in a real browser.

### Security review

- [ ] **Review password, token, workspace, role, CORS, CSP, rate, webhook, secret, Markdown, file, dependency, log, deletion, and AI-context security** — Find cross-cutting vulnerabilities before launch.

### Accessibility and performance

- [ ] **Test keyboard, focus, form errors, contrast, screen readers, charts, zoom, reduced motion, and Lighthouse** — Make the dashboard broadly usable.
- [ ] **Load test applications, tasks, activities, analytics events, ingestion, dashboards, sockets, health jobs, webhooks, and portfolio queries** — Confirm acceptable performance at realistic scale.

## Expected outcome

The release candidate is functionally correct, secure, accessible, and performant enough for real use.

## Risks and important considerations

- Unit tests passing while browser flows fail
- Ownership gaps
- Slow portfolio queries
- Socket scaling issues
- Unrealistic test data

## Progress milestone

### Release Candidate Approved

- [ ] Unit, integration, and browser tests pass
- [ ] Security review passes
- [ ] Accessibility baseline passes
- [ ] Performance targets pass
- [ ] Staging acceptance passes

## Phase summary

The product is proven ready for production rather than merely appearing complete in local development.

---

# Phase 22 — Production Deployment and Operations

## Purpose

Deploy the platform with backups, monitoring, documentation, and real application data.

## Dependencies and prerequisites

- Phase 21 completed
- Hosting, domain, database, email, and monitoring providers selected

## Tasks

### Infrastructure and configuration

- [ ] **Deploy web, API, PostgreSQL, tracker assets, and background workers** — Run every required component in production.
- [ ] **Add Redis and object storage only when required** — Avoid unnecessary infrastructure.
- [ ] **Configure domain, HTTPS, reverse proxy, CORS, cookies, CSP, rate limits, and secrets** — Secure production networking and access.

### Database and monitoring

- [ ] **Back up, migrate, verify, automate backups, and test restore** — Protect production data.
- [ ] **Configure connection pools, indexes, and retention jobs** — Keep the database stable.
- [ ] **Monitor frontend, backend, database, jobs, uptime, sockets, integrations, email, AI usage, and costs** — Detect production failures early.

### Documentation, data, and smoke tests

- [ ] **Document setup, deployment, migration, backup, integrations, incident response, releases, and rollback** — Make operations repeatable.
- [ ] **Enter real applications, milestones, websites, deployments, repositories, subscriptions, releases, and documents** — Make the platform immediately useful.
- [ ] **Run complete production smoke tests** — Verify the deployed system end to end.

## Expected outcome

The platform is live, secure, monitored, backed up, documented, and populated with real portfolio data.

## Risks and important considerations

- Incorrect environment variables
- CORS or cookie failures
- WebSocket proxy failures
- Migration failure
- Missing backups
- Unmonitored jobs
- Provider limits

## Progress milestone

### Production Launch

- [ ] Production components work
- [ ] Migrations and backups work
- [ ] Restore tested
- [ ] Monitoring and alerts work
- [ ] Smoke tests pass
- [ ] Documentation complete
- [ ] Real data entered

## Phase summary

The project becomes a dependable daily-use product rather than a local development prototype.

---

# Recommended Release Groups

Do not wait until every phase is finished before using the platform.

## Release 1 — Project Visibility MVP

Build Phases 0–7 and a basic version of Phase 15.

This release provides:

- Authentication and workspaces
- SaaS application registry
- Activity history
- Milestones, tasks, and blockers
- Automatic progress
- Basic portfolio dashboard and work queue

It directly solves the original problem of forgetting where each project stopped.

## Release 2 — Website Analytics

Build Phases 8–12.

This adds website management, the tracker, event ingestion, aggregation, reports, and real-time visitors.

## Release 3 — Operations

Build Phases 13–15 and the operational portions of Phase 19.

This adds environments, deployments, health monitoring, incidents, and operational prioritization.

## Release 4 — Integrations and Finance

Build Phases 16–18.

This adds GitHub, costs, renewals, releases, technical decisions, and documentation.

## Release 5 — AI Assistant

Build Phase 20 only after the portfolio records are reliable and current.

---

# Progress Milestones

| Milestone | Outcome |
|---|---|
| 0 | Product Blueprint Approved |
| 1 | Development Workspace Ready |
| 2 | API Foundation Stable |
| 3 | Database Foundation Ready |
| 4 | Secure Workspace Access |
| 5 | All Applications Registered |
| 6 | Project History Available |
| 7 | Development Status Visible |
| 8 | Websites Connected |
| 9 | Real Tracking Working |
| 10 | Analytics Engine Accurate |
| 11 | Analytics Reports Usable |
| 12 | Live Visitors Visible |
| 13 | Deployment State Visible |
| 14 | Production Health Visible |
| 15 | Command Center Usable |
| 16 | Repositories Connected |
| 17 | Operating Costs Visible |
| 18 | Project Knowledge Preserved |
| 19 | Important Problems Delivered |
| 20 | AI Answers from Real Data |
| 21 | Release Candidate Approved |
| 22 | Production Launch |

## Recommended task statuses

```text
NOT_STARTED
IN_PROGRESS
BLOCKED
IN_REVIEW
COMPLETED
SKIPPED
```

## Phase completion checklist

Use this at the end of every implementation phase:

- [ ] Requirements reviewed
- [ ] Database model reviewed
- [ ] Migration applied to a clean database
- [ ] Backend implementation complete
- [ ] Frontend implementation complete
- [ ] Workspace authorization tested
- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] Critical browser flow tested
- [ ] Lint passes
- [ ] Type checking passes
- [ ] Production builds pass
- [ ] Documentation updated
- [ ] Acceptance criteria verified

---

# Final Definition of Done

The full project is complete when a user can:

- [ ] Register, log in, refresh a session, and log out securely
- [ ] Work only inside authorized workspaces
- [ ] Register every SaaS application
- [ ] Add technologies and important links
- [ ] Track milestones, tasks, blockers, due dates, and progress
- [ ] Review complete application activity history
- [ ] Connect multiple websites to an application
- [ ] Install a lightweight tracker
- [ ] Collect and aggregate visitors, sessions, page views, and custom events
- [ ] View analytics reports and real-time visitors
- [ ] Create environments and services
- [ ] Record deployments, failures, and rollbacks
- [ ] Monitor health and manage incidents
- [ ] Open one portfolio Command Center
- [ ] View prioritized next actions with evidence
- [ ] Connect multiple GitHub repositories
- [ ] View commits, pull requests, issues, workflows, and releases
- [ ] Track costs, subscriptions, and renewals
- [ ] Manage releases and known issues
- [ ] Record technical decisions
- [ ] Maintain required documentation without storing secrets
- [ ] Receive useful deduplicated alerts
- [ ] Ask read-only AI questions based on real records
- [ ] Run the platform securely in production
- [ ] Restore the database from a tested backup
- [ ] Follow documented deployment and rollback procedures

## Minimum useful product

The first practical release should contain:

```text
Authentication
+ Workspaces
+ SaaS Application Registry
+ Activity History
+ Milestones
+ Tasks
+ Blockers
+ Automatic Progress
+ Basic Portfolio Command Center
```

That release answers the core question:

> Where does every SaaS application currently stand, what is unfinished or blocked, and what should be worked on next?
