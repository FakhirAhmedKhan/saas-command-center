# SaaS Analytics and Portfolio Command Center

Phase 0–2 foundation for the Project Visibility MVP.

## Included

- pnpm monorepo
- NestJS API foundation
- Next.js dashboard foundation
- Browser-safe shared packages
- PostgreSQL development and test containers
- Environment validation
- Request IDs and consistent API errors
- Health, version, and Swagger endpoints
- CI workflow
- Product blueprint

## Requirements

- Node.js 22+
- Corepack
- Docker Desktop

## First run

### Windows quick setup

From the repository root in PowerShell:

```powershell
Set-ExecutionPolicy -Scope Process Bypass
.\scripts\setup.ps1
pnpm dev
```

The setup script enables pnpm, creates local environment files, installs dependencies, and starts both PostgreSQL containers.

### Manual setup

#### 1. Enable pnpm

```bash
corepack enable
corepack prepare pnpm@11.0.0 --activate
```

#### 2. Create environment files

PowerShell:

```powershell
Copy-Item .env.example .env
Copy-Item apps/web/.env.example apps/web/.env.local
```

Bash:

```bash
cp .env.example .env
cp apps/web/.env.example apps/web/.env.local
```

Replace the JWT secret placeholders before implementing authentication.

#### 3. Start PostgreSQL

```bash
pnpm db:up
```

Development PostgreSQL: `localhost:5432`

Test PostgreSQL: `localhost:5433`

#### 4. Install dependencies

```bash
pnpm install
```

#### 5. Start API and web together

```bash
pnpm dev
```

- Dashboard: http://localhost:3000
- API: http://localhost:4000/api/v1
- Swagger: http://localhost:4000/api/v1/docs
- Health: http://localhost:4000/api/v1/health
- Version: http://localhost:4000/api/v1/version

## Package names

- `@command-center/api`
- `@command-center/web`
- `@command-center/tracker`
- `@command-center/shared-types`
- `@command-center/validation`
- `@command-center/ui`
- `@command-center/tsconfig`
- `@command-center/eslint-config`

These names must remain unique so `pnpm --filter` commands resolve correctly.

## Current boundary

This foundation intentionally does not implement:

- Prisma models or migrations
- Authentication
- SaaS application CRUD
- Analytics ingestion
- GitHub integration
- Deployment monitoring
- AI features

The next implementation phase is the database foundation: Prisma, development/test database wiring, and the initial `User`, `Workspace`, `WorkspaceMember`, and `AuthSession` models.
