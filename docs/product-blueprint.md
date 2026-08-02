# Product Blueprint — Project Visibility MVP

## Problem statement

A developer managing several SaaS products lacks one reliable place to see each product's current state, unfinished work, blockers, recent activity, and next priority. Information is split across repositories, notes, deployments, and memory. The first release must create structured portfolio records before analytics, automation, integrations, or AI are introduced.

## First target user

The first version is designed for one developer managing multiple SaaS applications. The data model still uses workspaces and memberships so small teams can be supported without redesigning ownership later.

## MVP outcome

The MVP must answer:

1. Which SaaS applications exist?
2. What is the status and priority of each application?
3. What work is complete, unfinished, overdue, blocked, or skipped?
4. What changed recently?
5. Which application should receive attention next, and why?

## MVP modules

1. Authentication and secure sessions
2. Workspaces and role-based membership
3. SaaS application registry
4. Application technologies and important links
5. Activity and audit history
6. Milestones
7. Tasks
8. Blockers
9. Automatic progress calculation
10. Basic Portfolio Command Center

## Roles

| Role | Intended authority |
|---|---|
| OWNER | Full workspace control, ownership transfer, and permanent deletion |
| ADMIN | Manage members and application data except owner-only actions |
| DEVELOPER | Manage application development records |
| VIEWER | Read-only access |

Authorization must be enforced in the backend. Hiding frontend controls is not authorization.

## Core entities

- User
- Workspace
- WorkspaceMember
- AuthSession
- SaasApplication
- ApplicationTechnology
- ApplicationLink
- ApplicationActivity
- ApplicationMilestone
- ApplicationTask
- ApplicationBlocker

## Core relationships

```text
User
└── WorkspaceMember
    └── Workspace
        └── SaasApplication
            ├── ApplicationTechnology
            ├── ApplicationLink
            ├── ApplicationActivity
            ├── ApplicationMilestone
            │   └── ApplicationTask
            └── ApplicationBlocker
```

A workspace may contain many applications. An application may later contain many websites, repositories, environments, and services. The MVP must not encode one-to-one assumptions for those future resources.

## Status vocabulary

### Task status

```text
NOT_STARTED
IN_PROGRESS
BLOCKED
IN_REVIEW
COMPLETED
SKIPPED
```

### Application priority

```text
LOW
MEDIUM
HIGH
CRITICAL
```

Application lifecycle status will be finalized before the application-registry migration. It must distinguish active development, maintenance, paused, completed, and archived records without treating archive as ordinary progress.

## Progress rules

- Task and milestone records are the source of truth.
- Progress is calculated by the backend.
- Skipped work is excluded and requires a reason.
- Moving, reopening, deleting, skipping, or reweighting work recalculates progress.
- Every returned percentage must include enough factors to explain its result.

## Explicit non-goals for Release 1

- Website analytics
- Tracking SDK
- Event ingestion
- Real-time visitors
- GitHub integration
- Environments and deployment monitoring
- Health checks and incidents
- Costs and renewals
- Notifications
- AI assistant
- Microservices
- Redis or BullMQ

## Architecture decisions

- pnpm workspaces monorepo
- NestJS modular monolith backend
- Next.js App Router frontend
- PostgreSQL database
- Prisma ORM
- JWT access tokens with hashed rotating refresh tokens and reuse detection
- Swagger API documentation
- Docker Compose for local PostgreSQL
- Shared packages contain browser-safe contracts, validation, UI, and tooling only
- The backend remains the source of truth for authorization and calculations

## Release 1 acceptance boundary

Release 1 is complete when a user can securely access an authorized workspace, register SaaS applications, maintain milestones/tasks/blockers, inspect activity history, see automatically calculated progress, and view an evidence-based basic portfolio work queue.
