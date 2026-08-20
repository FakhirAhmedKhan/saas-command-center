# Deployment Guide — SaaS Command Center

_Last verified against source: 2026-08-17. No secret values appear in this document._

This is the single deployment reference for the project. If you find another deployment doc, this one supersedes it.

---

## 1. Architecture

```
Browser
  │
  ▼
Frontend — Next.js 15 (apps/web)         hosted on Vercel
  │  fetch, credentials: include
  ▼
Backend — NestJS 11 (apps/api)           hosted on Render (native Node, no Docker)
  │
  ├─▶ PostgreSQL — Neon (via @prisma/adapter-pg)
  ├─▶ Redis — managed provider (via ioredis)     rate limiting, distributed locks
  └─▶ GitHub App API                              repository import/webhooks

Tracker SDK (apps/tracker) — static beacon.js, served from wherever
NEXT_PUBLIC_TRACKER_SCRIPT_URL points (CDN/static host — out of scope for
this guide's Render/Vercel/Neon focus, but its URL must be set correctly in
every environment).
```

Two fully separate environments are maintained: **staging** and **production** — separate Render services, separate Neon databases, separate Redis instances, and **separate GitHub Apps**. Never point staging at the production database, Redis instance, or GitHub App.

---

## 2. Prerequisites

- Node 22, pnpm `11.22.0` (pinned in root `package.json`'s `packageManager` field — Render/Vercel both auto-detect this via corepack).
- Accounts: Vercel, Render, Neon, a Redis provider (Upstash, Redis Cloud, or Render's own managed Redis all work — anything reachable via a `redis://`/`rediss://` URL that `ioredis` can connect to).
- Two GitHub Apps registered (one staging, one production) — see §8.
- Local: Docker (for `pnpm db:up`, dev-only), the repo cloned, `pnpm install` run once to confirm a clean install works.

---

## 3. Clean production build — verified sequence

**Finding (re-verified from the prior audit's CI-02):** `apps/web` depends on `@command-center/shared-types`, whose `package.json` resolves to `dist/index.js` — that directory does not exist until `packages/shared-types`'s own `build` script runs. `apps/web`'s own `build` script (`next build`) does **not** build it first. `next.config.ts`'s `transpilePackages` entry for `shared-types` does **not** change this — it only tells Next's bundler to compile the package through its own loader once resolved, it does not redirect module resolution away from the `package.json` `main`/`exports` fields. **This is still a real risk**, confirmed by reading current source, not assumed from the old audit.

(`@command-center/ui`, by contrast, points its `main`/`exports` directly at `src/index.ts` — no build step needed, `transpilePackages` alone is sufficient for it.)

The root `package.json` already defines the correct sequence:

```bash
pnpm install --frozen-lockfile
pnpm build:packages      # currently: builds @command-center/shared-types, then @command-center/validation
pnpm --filter @command-center/api exec prisma generate
pnpm --filter @command-center/api build     # nest build -> apps/api/dist/main.js
pnpm --filter @command-center/web build     # next build (needs build:packages already done)
pnpm --filter @command-center/tracker build # esbuild -> apps/tracker/dist
```

Root `pnpm build` already runs `build:packages` before `pnpm -r build`, so **running the root script is safe**. The risk is only when a platform is configured to build a single app in isolation (exactly what Vercel does by default with Root Directory set to `apps/web`) — that's what `apps/web/vercel.json` (added in this phase) fixes explicitly; see §6.

Verified locally this pass: `pnpm --filter @command-center/api typecheck`, `build` both pass cleanly from the current tree. A from-scratch clean-checkout build was not re-executed in this pass (would require discarding local `node_modules`/`dist`, which risks disrupting concurrent work on this machine) — the command sequence above is what CI now runs (see `.github/workflows/ci.yml`, confirmed already using this exact ordering), which is the strongest available substitute for a clean-machine verification.

---

## 4. Render — backend

### Why native Node, not Docker

NestJS builds to plain JS with `nest build`; there's no native binary, OS-level dependency, or non-Node runtime requirement. A Dockerfile would add build-time overhead (image layer caching, base-image maintenance) without a corresponding benefit for this service. `render.yaml` (added in this phase, repo root) declares two native Node web services: `command-center-api` (production, `main` branch) and `command-center-api-staging` (staging, `devlopment` branch).

### Configuration (from `render.yaml`)

| Field             | Value                                                                                                                                                        |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Runtime           | Node (native, no Docker)                                                                                                                                     |
| Build command     | `pnpm install --frozen-lockfile && pnpm build:packages && pnpm --filter @command-center/api exec prisma generate && pnpm --filter @command-center/api build` |
| Start command     | `node apps/api/dist/main.js` — **not** `pnpm dev`/`start:dev`                                                                                                |
| Health check path | `/api/v1/health`                                                                                                                                             |
| Port              | Reads `process.env.PORT`; `main.ts` calls `app.listen(port, '0.0.0.0')` — already correct for Render, no code change needed                                  |

### Health check — verified, with a real constraint

Two endpoints exist:

- `GET /api/v1/health` — **public** (`@Public()`), returns `{status:'ok', timestamp}` only. No DB/Redis check. Cheap — safe for Render's polling frequency.
- `GET /api/v1/health/readiness` — **requires a Bearer access token** (no `@Public()` decorator, so the global `JwtAuthGuard` applies), checks `SELECT 1` against Postgres.

**Render's health-check prober cannot authenticate**, so `/api/v1/health/readiness` cannot be used as the Render health-check path even though it's the more meaningful check. Use `/api/v1/health` (liveness only). This means Render's health check will report the service "up" even if the database is unreachable — the app still degrades that scenario safely (it fails closed on affected requests, and `assertStartupRequirements`/`RedisService.onApplicationBootstrap` both already refuse to finish booting at all if DB/Redis aren't reachable at startup), but a DB outage _after_ a successful boot won't flip Render's health check. If deeper external monitoring is wanted later, that's a product decision (exposing readiness publicly, or adding a separate metrics/monitoring integration) — not something changed in this pass.

### Migrations — explicit, not automatic

`buildCommand` intentionally does **not** run `prisma migrate deploy` (only `prisma generate`, which only needs the schema file, not a live DB connection, and is required for the TypeScript build to compile). Running `migrate deploy` automatically on every build would apply schema changes as a side effect of any deploy, including hotfixes unrelated to the schema — too much blast radius for a default. Run migrations as an explicit, reviewed step before deploying a release that includes new migrations:

```bash
# Point at the target environment's DATABASE_URL, then:
pnpm --filter @command-center/api exec prisma migrate status
pnpm --filter @command-center/api exec prisma migrate deploy
```

Never run `prisma migrate dev` or `prisma migrate reset` against staging or production — both are destructive/dev-only. Never use `prisma db push` as a substitute for the committed migration history.

---

## 5. Neon — PostgreSQL

- Create **two** Neon projects/branches: one for staging, one for production. Do not reuse an existing database that has unrelated migration history — the target database's migration table must start clean for this schema (verify with `prisma migrate status` before the first `migrate deploy`).
- `apps/api/prisma.config.ts` reads `DATABASE_URL` directly — any valid Postgres connection string works with `@prisma/adapter-pg`; no code change is needed for Neon specifically. Use Neon's pooled connection string (the one from their dashboard's "Pooled connection" tab, which routes through PgBouncer) for `DATABASE_URL`, since Render web services can scale to multiple instances and Neon's direct (unpooled) connection string has a much lower concurrent-connection ceiling.
- Neon's connection strings already include `sslmode=require` by default — do not strip it or add conflicting SSL params.
- `apps/api/.env.example`'s current `DATABASE_URL` placeholder is a plain local-Postgres example; when configuring Render, use the Neon-provided string as-is from Neon's dashboard rather than hand-constructing one.

---

## 6. Vercel — frontend

### Monorepo strategy: Root Directory = `apps/web`, with explicit command overrides

Set **Root Directory = `apps/web`** in the Vercel project settings (Vercel dashboard → Project → Settings → General → Root Directory). This keeps Next.js's own zero-config output detection working normally. The build-order risk this creates (§3) is closed by `apps/web/vercel.json` (added in this phase):

```json
{
  "installCommand": "cd ../.. && pnpm install --frozen-lockfile",
  "buildCommand": "cd ../.. && pnpm build:packages && pnpm --filter @command-center/web build"
}
```

This is Vercel's own documented pattern for pnpm-workspace monorepos: `cd ../..` moves the build context to the repo root so pnpm can see the full workspace, installs from there, builds the shared package's `dist/` output, then runs the web app's own build — while Vercel still looks for the build **output** at `apps/web/.next` (the default, relative to Root Directory), which this sequence produces correctly.

### Environment variables (set per Vercel Environment: Production / Preview / Staging)

| Variable                         | Staging example                                                  | Production example                              |
| -------------------------------- | ---------------------------------------------------------------- | ----------------------------------------------- |
| `NEXT_PUBLIC_API_URL`            | `https://command-center-api-staging.onrender.com/api/v1`         | `https://api.<yourdomain>/api/v1`               |
| `NEXT_PUBLIC_INGESTION_URL`      | `https://command-center-api-staging.onrender.com/api/v1/collect` | `https://api.<yourdomain>/api/v1/collect`       |
| `NEXT_PUBLIC_TRACKER_SCRIPT_URL` | wherever the staging tracker build is hosted                     | wherever the production tracker build is hosted |

**All three fall back to a `localhost` default if left unset** (`apps/web/src/components/api-health-card.tsx`, the installation-snippet page, and `features/lib/api/api-client.ts` all use `?? 'http://localhost:...'`). A missing Vercel env var therefore fails silently in the browser (network error calling `localhost` from a deployed site) rather than failing the build — **set all three explicitly in every Vercel environment**, don't rely on the fallback ever being reached.

**Note found in code:** `features/lib/api/api-client.ts` checks `NEXT_PUBLIC_API_BASE_URL` _before_ `NEXT_PUBLIC_API_URL`. Nothing else in the app reads `NEXT_PUBLIC_API_BASE_URL`, and it isn't in `.env.example`. Leave it unset (so `NEXT_PUBLIC_API_URL` is what actually takes effect everywhere) unless a future change deliberately consolidates on one name — not changed in this pass since it's not a deployment blocker, just worth knowing it exists.

---

## 7. Redis (production)

`RedisService` (`apps/api/src/infrastructure/redis/redis.service.ts`) already:

- connects lazily and `PING`s on `onApplicationBootstrap`, **throwing (and refusing to finish startup) if the ping fails** — the app will not silently run without Redis;
- retries with backoff (`Math.min(attempt * 250, 5000)` ms);
- logs connection errors (message + stack only — the `REDIS_URL` value itself is never logged, verified);
- disconnects gracefully in `onModuleDestroy`.

No code changes are needed for a managed provider — just supply a real `REDIS_URL`. Use the provider's TLS URL (`rediss://...`) if they offer one; `ioredis` supports both `redis://` and `rediss://` without extra config. **Do not use `localhost:6379` for any Render environment** — that only exists in `apps/api/.env.example`/local `docker-compose` for development. Do not expose the Redis instance publicly; use the provider's private networking option if Render and the provider support it (e.g., same-region private connectivity), otherwise restrict by IP allowlist/auth if the provider supports it.

Redis is used for: `SharedRateLimitService` (webhook/invitation/analytics-ingestion rate limits — Lua `INCR`+`PEXPIRE` script), and — once background jobs are confirmed running end-to-end in staging (Phase 1's remit, verify don't re-fix here) — the analytics/webhook/health worker locks.

---

## 8. GitHub App — staging and production must be separate Apps

**Do not hard-code an App slug.** `GITHUB_APP_SLUG` is read from the environment (`github-app.service.ts:93`, `this.required('GITHUB_APP_SLUG')`) — verified directly against current source. The earlier audit's finding (a hard-coded `saas-command-center-dev` fallback) is **confirmed fixed**; the literal string no longer appears anywhere in that file.

Actual routes, read directly from the controllers (not assumed):

| Purpose                               | Method + path                                                                                                                                            | Which domain                                        |
| ------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------- |
| GitHub App "Callback URL"             | Frontend page `GET /github/callback` → that page then calls backend `POST /api/v1/repositories/github/callback` (Bearer-authenticated, from the browser) | **Vercel** frontend domain                          |
| GitHub App "Setup URL"                | Frontend page `GET /github/setup` → calls backend `POST /api/v1/repositories/github/setup`                                                               | **Vercel** frontend domain                          |
| GitHub App "Webhook URL"              | `POST /api/v1/repositories/github/webhook` — hit directly by GitHub's servers, HMAC-signature verified                                                   | **Render** backend domain                           |
| Personal (pre-workspace) connect flow | `POST /api/v1/repositories/github/personal/{connect,setup,callback,analyze}`, `GET /api/v1/repositories/github/personal`                                 | Render backend, called from the same frontend pages |
| Import-as-new-workspace               | `POST /api/v1/workspaces/import/github`                                                                                                                  | Render backend                                      |

Example, filling in real domains:

```
Homepage URL:  https://app.<yourdomain>
Callback URL:  https://app.<yourdomain>/github/callback
Setup URL:     https://app.<yourdomain>/github/setup
Webhook URL:   https://api.<yourdomain>/api/v1/repositories/github/webhook
```

`GITHUB_APP_CALLBACK_URL` (the env var) should match the **frontend** callback route above — `apps/api/.env.example`'s current placeholder (`http://localhost:3000/github/callback`) already follows this exact shape; just swap the host per environment.

**Staging and production must each have their own GitHub App** — separate Client ID/Secret, separate private key, separate webhook secret, separate slug. A staging App pointed at production's callback (or vice versa) would let staging traffic complete OAuth against production's App registration, which is both a functional bug and a credential-scope mixing risk.

### Manual callback flow test (do this after both services are deployed to staging)

1. Log in → land on a workspace.
2. Click "Connect GitHub" → GitHub authorization/installation screen appears.
3. Approve → redirected back to `/github/callback` (or `/github/setup` for the App-install path) on the **frontend** domain, still logged in (no bounce to `/login`).
4. Repository list loads.
5. Import/select a repository → land back in the correct workspace, repository visible.
6. **Specifically check:** a full browser refresh (F5) at each step of this flow does not lose the session or redirect to `/login` — this exercises the refresh-cookie/session-restore path together with the GitHub flow, which is exactly the kind of interaction that breaks quietly if cookie `SameSite`/`Secure` is misconfigured (see §9).

---

## 9. Cookies — cross-site topology requires `SameSite=None`

The refresh token lives in an httpOnly cookie (`AuthCookieService`) — **never in localStorage**, unchanged by this phase.

**Vercel and Render are different sites** (different registrable domains, or even if both use a custom domain, they're still different hosts unless deliberately placed under a shared parent domain). Per the [Set-Cookie SameSite spec](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Set-Cookie#samesitesamesite-value), a cross-site `fetch(..., {credentials:'include'})` — which is exactly how the frontend calls the API — **will not send or accept the cookie under `SameSite=Lax` or `Strict`**. It requires:

```
COOKIE_SECURE=true
COOKIE_SAME_SITE=none
```

`apps/api/src/config/env.validation.ts` already enforces `COOKIE_SECURE=true` whenever `COOKIE_SAME_SITE=none` (throws at startup otherwise) — this is existing, unchanged validation, confirmed still present. `render.yaml` (this phase) sets both values correctly for both the production and staging Render services.

If a custom-domain setup later puts the frontend and API under a shared parent domain (e.g., `app.example.com` and `api.example.com` with `COOKIE_DOMAIN=.example.com`), `SameSite=Lax` would become viable — that's a future option, not the current provider-subdomain (`*.vercel.app`/`*.onrender.com`) setup. **Not changed here** since it would need a real shared domain to test against; this section documents the decision point.

### `COOKIE_DOMAIN`

Leave **unset** for both the `*.vercel.app`/`*.onrender.com` provider-subdomain topology — a host-only cookie is the only correct choice (you cannot set a cookie's `Domain` attribute to a suffix you don't control, like `.vercel.app` or `.onrender.com`; browsers reject that). If/when both apps move to a shared custom parent domain, set `COOKIE_DOMAIN` to that shared parent (e.g. `.example.com`) at that time.

---

## 10. `TRUST_PROXY`

Render terminates TLS and proxies through **one** hop before reaching the app. `render.yaml` sets `TRUST_PROXY=1` (numeric hop count) for both services — this tells Express to trust exactly the first `X-Forwarded-For` entry and nothing beyond it, which is what `parseTrustProxy()` (`apps/api/src/config/runtime-config.ts`, unchanged) is built to accept. **Do not set `TRUST_PROXY=true`** (trusts every hop unconditionally — a client could forge intermediate `X-Forwarded-For` entries) when a safer explicit numeric value is available and correct here.

This value affects `req.ip`, which feeds: the global Nest `ThrottlerGuard`'s default IP tracker, `SharedRateLimitGuard`'s IP fallback (for public/unauthenticated routes only, post-SEC-02), and the analytics IP-hashing pipeline. An incorrect `TRUST_PROXY` value would make all three trust a spoofable header — verify with a real request from staging that `req.ip` reflects the actual client IP, not Render's internal proxy IP, before production cutover.

---

## 11. Environment variable inventory

_No values are reproduced here — keys and purpose only._

### API — required in every environment

| Variable                                                                                                                                                       | Notes                                                                            |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| `DATABASE_URL`                                                                                                                                                 | Neon pooled connection string                                                    |
| `REDIS_URL`                                                                                                                                                    | Managed Redis provider URL                                                       |
| `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`                                                                                                                      | ≥32 chars, validated at startup, rejects placeholder patterns in production      |
| `INVITATION_TOKEN_PEPPER`                                                                                                                                      | Same validation as JWT secrets                                                   |
| `WEBHOOK_ENCRYPTION_KEY`                                                                                                                                       | Must be base64, decodes to exactly 32 bytes                                      |
| `ANALYTICS_IP_HASH_SALT`                                                                                                                                       | Required in production since Phase 3 (previously had a silent insecure fallback) |
| `FRONTEND_URL`, `CORS_ORIGINS`                                                                                                                                 | Exact origin(s), comma-separated if multiple — no wildcard                       |
| `COOKIE_SECURE`, `COOKIE_SAME_SITE`                                                                                                                            | `true` / `none` for this cross-site topology (§9)                                |
| `TRUST_PROXY`                                                                                                                                                  | `1` on Render (§10)                                                              |
| `GITHUB_APP_SLUG`, `GITHUB_APP_CLIENT_ID`, `GITHUB_APP_CLIENT_SECRET`, `GITHUB_APP_CALLBACK_URL`, `GITHUB_APP_WEBHOOK_SECRET`, `GITHUB_APP_PRIVATE_KEY_BASE64` | Separate values per environment (§8)                                             |
| `PORT`                                                                                                                                                         | Render supplies/reads this automatically; `4000` locally                         |

### API — optional (sensible code defaults, override only with a reason)

`NODE_ENV`, `COOKIE_NAME`, `COOKIE_DOMAIN`, `COOKIE_MAX_AGE_MS`, `BODY_LIMIT`, `SWAGGER_ENABLED`, `APP_VERSION`, `ANALYTICS_*` (worker/scheduler tuning), `HEALTH_*`, `WEBHOOK_*` (worker tuning), `INVITATION_TTL_HOURS`, `INVITATION_EMAIL_ENABLED`, `NOTIFICATION_*`, `AUTH_REGISTER_RATE_LIMIT`/`AUTH_LOGIN_RATE_LIMIT`/`AUTH_REFRESH_RATE_LIMIT` and their `*_WINDOW_MS` pairs (added Phase 3 — leave unset in every real environment so the strict production defaults apply; these exist so e2e test suites can relax them, not for production tuning).

### Web — required in every Vercel environment

`NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_INGESTION_URL`, `NEXT_PUBLIC_TRACKER_SCRIPT_URL` — see §6 for why these must be set explicitly rather than left to their localhost fallback.

### Test-only (never set outside CI/local test runs)

`TEST_DATABASE_URL`, `TEST_REDIS_URL`, `WEBHOOK_CREATE_RATE_LIMIT`, `AUTH_*_RATE_LIMIT` overrides in `apps/api/.env.test` — these intentionally relax production-safe defaults so large e2e suites don't self-throttle; confirm none of these are present in Render/Vercel's environment variable lists.

### Secret rotation — do before production

Any secret that has ever appeared in a chat transcript, screenshot, log output, or **git history** (even if later removed from the working tree) must be rotated before production use, not reused. Specifically: this repository's git history contains a commit (`e77f162`) where a real Neon `DATABASE_URL` was briefly committed to `apps/api/.env.example` before being corrected — **that specific Neon credential must be rotated** (a new database password issued) if it hasn't been already, regardless of the working-tree fix, since it remains readable in git history. Do not reuse any development-stage GitHub App private key for the production App — register the production App fresh and generate its own key.

---

## 12. Background jobs — verify, don't assume

Phase 1's remit was fixing `ScheduleModule.forRoot()` registration and resolving the duplicate analytics-pipeline finding — **this deployment phase re-verifies the observable effect in a real running environment, it does not re-do that fix.** After staging is deployed:

1. Check startup logs for scheduler registration (no crash, no missing-module errors).
2. Seed one analytics event via the tracker/collect endpoint, wait past one scheduler interval, confirm it moved from "raw" to "processed" in the database — not just that the API process is up.
3. Confirm exactly **one** analytics-processing pipeline is active (check for duplicate/competing scheduler log lines — this was the specific dual-pipeline risk from the original audit).
4. Create a webhook endpoint pointed at a test receiver (e.g. a temporary request-bin), trigger an event, confirm delivery.
5. Confirm health-monitoring checks (if any are configured) actually execute on schedule.

"The API process started" is not evidence any of this works — verify via logs/database state, not process status alone.

---

## 13. Deployment logging

Startup should show: API started + port, environment name, database connectivity confirmed (`assertStartupRequirements`'s "Database startup check passed" log line — already present, unchanged), Redis connection established (`RedisService`'s "Redis connection established" log line — already present, unchanged).

**Verified never logged:** `DATABASE_URL`, `REDIS_URL`, JWT secrets, GitHub secrets/private key, `WEBHOOK_ENCRYPTION_KEY`, `ANALYTICS_IP_HASH_SALT` — checked every log call site touching these values; none interpolate the raw value, only connection-success/failure messages. `AllExceptionsFilter` includes `requestId` in its error log line when available (unchanged, already correct).

---

## 14. Staging deployment sequence

```
[ ] Create staging Neon project/branch (separate from production)
[ ] Create staging Redis instance (separate from production)
[ ] Create command-center-api-staging on Render (render.yaml, devlopment branch)
[ ] Set staging env vars in Render dashboard (§11) — DATABASE_URL, REDIS_URL,
    JWT/INVITATION/WEBHOOK/ANALYTICS secrets, FRONTEND_URL, CORS_ORIGINS,
    GITHUB_APP_* (staging App)
[ ] prisma migrate status against staging DATABASE_URL
[ ] prisma migrate deploy against staging DATABASE_URL
[ ] Deploy API — confirm /api/v1/health returns 200
[ ] Create Vercel project, Root Directory = apps/web
[ ] Set Vercel staging env vars (§6, §11) — NEXT_PUBLIC_API_URL etc. pointed
    at the staging Render URL
[ ] Deploy frontend
[ ] Register staging GitHub App, set its callback/setup/webhook URLs to the
    staging frontend/backend domains (§8)
[ ] Set GITHUB_APP_* env vars on the staging Render service
[ ] Run the smoke tests in §15
```

Do not proceed to production until §15 passes.

---

## 15. Staging smoke tests

Manual walkthrough (automate later if desired — a truncating/reset-based E2E run must **never** point at staging, see the warning below):

- **Auth:** register → login → logout → full browser refresh mid-session (session restores, no bounce to `/login`) → refresh-token rotation (leave a tab open past the access-token TTL, confirm it silently refreshes).
- **Workspace:** create a workspace, open it, invite/role-check if practical with a second test account.
- **GitHub:** full flow in §8's manual test.
- **Applications:** create, list, view.
- **Analytics:** load the tracker script from a test page, confirm a raw event lands in the database, confirm it's processed after one scheduler interval, confirm the dashboard shows processed data.
- **Webhooks:** create an endpoint, trigger a test delivery, confirm it's recorded (success and a deliberate-failure/retry case if time allows).
- **Monitoring:** create a health check if that feature is in scope for this release, confirm it executes.
- **Security:** confirm a request from a disallowed Origin is rejected by CORS; confirm the refresh cookie has `Secure` and `SameSite=None` in the browser's dev tools; hit `/auth/login` 6 times with a wrong password and confirm the 6th is throttled (429); confirm one workspace's data is not visible to a second, unrelated test account.

### Do not run destructive E2E suites against staging

`packages/test-code/api/e2e/**` resets the database (`resetDatabase()` — `TRUNCATE ... CASCADE`) between tests and is guarded to refuse running against any database whose name doesn't contain `"test"`. **Never point `TEST_DATABASE_URL` at the staging database** — that guard is the only thing standing between an accidental `pnpm test:api` run and a wiped staging environment. Smoke-test data should instead be created with unique, identifiable names/emails (e.g. a `smoke-<timestamp>` prefix) and either left in place or cleaned up by deleting only those specific rows — never by truncating shared tables.

---

## 16. Production readiness checklist

```
[ ] Clean production build passes (§3)
[ ] Staging deployment passes every check in §15
[ ] Migrations verified via `prisma migrate status` against production, then `migrate deploy`
[ ] Health check passes on the production Render service
[ ] Redis connects on the production Render service
[ ] Production GitHub App configured with production URLs (separate from staging)
[ ] Cookies verified Secure + SameSite=None in a real browser against production domains
[ ] CORS verified against the real production frontend origin
[ ] Background jobs verified actually executing (§12), not just "API is up"
[ ] No known P0/P1 blocker open in the current audit trail (docs/monorepo-audit-2026-08-17.md)
[ ] All secrets are freshly generated per environment; anything ever exposed in
    chat/screenshots/git history is rotated (§11)
[ ] Rollback plan understood (§17) before the first production deploy
```

---

## 17. Rollback plan

**Backend (Render):** Render retains prior successful deploys — use "Rollback to this deploy" on the previous build from the service's Deploys tab. Safe as long as the rolled-back code version is compatible with the _current_ database schema — see the migration-compatibility note below.

**Frontend (Vercel):** Vercel keeps every deployment as an immutable, individually-addressable build — use "Promote to Production" on the previous deployment from the Deployments tab. No build step is re-run; it's an instant traffic switch.

**Database:** Migrations are the hard part of a rollback — code can roll back instantly, but a schema change generally cannot. Prefer an **expand/contract** approach for any migration that removes a column/table/constraint: (1) deploy a migration that _adds_ the new shape while the old shape still works, (2) deploy code that uses the new shape, (3) only once that's confirmed stable, deploy a later migration that removes the old shape. This keeps every individual deploy backward-compatible with the _previous_ deploy's expected schema, so a code rollback never lands on a schema that's missing something it needs. Never rely on `prisma migrate reset` as a rollback mechanism — it's destructive and inappropriate for any environment with real data.

---

## 18. Production deployment sequence

Only after §16 is fully checked.

```
1. Verify production environment variables are complete (§11) — do not skip
   any [ ] in §16
2. prisma migrate status against production DATABASE_URL
3. prisma migrate deploy against production DATABASE_URL (only if pending
   migrations exist)
4. Deploy backend (Render — command-center-api)
5. Verify /api/v1/health
6. Verify DB/Redis connectivity from startup logs
7. Deploy frontend (Vercel — production environment)
8. Verify frontend can reach the API (browser network tab, no CORS errors)
9. Verify login/session restore in a real browser
10. Verify the production GitHub App's callback flow end-to-end
11. Verify background jobs are executing (§12)
12. Verify one full critical workspace flow (create workspace → add
    application/website → view data)
13. Monitor logs/error rates for the first period after cutover
```

Do not begin a large refactor or cleanup pass immediately after a production deploy — let the deployment settle and be observed first.

---

## 19. Post-deployment verification

Watch for, in the first hours after cutover: elevated 401/403 rates (cookie or CORS misconfiguration), 502/503 (backend crash-looping — check Render logs), database connection-pool exhaustion (check Neon's connection dashboard), Redis reconnect-loop log spam, duplicate scheduler execution (the exact dual-pipeline risk from the original audit — watch for two sets of "processing analytics" log lines instead of one), GitHub webhook signature failures (usually a webhook-secret mismatch between the GitHub App config and `GITHUB_APP_WEBHOOK_SECRET`), and any 500 whose logged `requestId` you can't correlate back to a real user report (would indicate the request-id propagation itself regressed).
