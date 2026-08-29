-- Reconcile a partially-created onboarding table whose identifiers
-- were originally created as TEXT instead of PostgreSQL UUID.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "workspace_onboarding_sessions"
    WHERE "id" IS NOT NULL
      AND "id"::text !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
  ) THEN
    RAISE EXCEPTION
      'workspace_onboarding_sessions.id contains a non-UUID value';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM "workspace_onboarding_sessions"
    WHERE "userId" IS NOT NULL
      AND "userId"::text !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
  ) THEN
    RAISE EXCEPTION
      'workspace_onboarding_sessions.userId contains a non-UUID value';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM "workspace_onboarding_sessions"
    WHERE "workspaceId" IS NOT NULL
      AND "workspaceId"::text !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
  ) THEN
    RAISE EXCEPTION
      'workspace_onboarding_sessions.workspaceId contains a non-UUID value';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM "workspace_onboarding_sessions"
    WHERE "idempotencyKey" IS NOT NULL
      AND "idempotencyKey"::text !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
  ) THEN
    RAISE EXCEPTION
      'workspace_onboarding_sessions.idempotencyKey contains a non-UUID value';
  END IF;
END
$$;

ALTER TABLE "workspace_onboarding_sessions"
  DROP CONSTRAINT IF EXISTS
    "workspace_onboarding_sessions_userId_fkey",
  DROP CONSTRAINT IF EXISTS
    "workspace_onboarding_sessions_workspaceId_fkey";

ALTER TABLE "workspace_onboarding_sessions"
  ALTER COLUMN "id" DROP DEFAULT;

ALTER TABLE "workspace_onboarding_sessions"
  ALTER COLUMN "id"
    TYPE UUID USING "id"::UUID,
  ALTER COLUMN "userId"
    TYPE UUID USING "userId"::UUID,
  ALTER COLUMN "workspaceId"
    TYPE UUID USING "workspaceId"::UUID,
  ALTER COLUMN "idempotencyKey"
    TYPE UUID USING "idempotencyKey"::UUID;

ALTER TABLE "workspace_onboarding_sessions"
  ALTER COLUMN "id" SET DEFAULT gen_random_uuid();

ALTER TABLE "workspace_onboarding_sessions"
  ADD COLUMN IF NOT EXISTS "blueprintRevision"
    INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "blueprintHash"
    CHAR(64);

CREATE UNIQUE INDEX IF NOT EXISTS
  "workspace_onboarding_sessions_workspaceId_key"
  ON "workspace_onboarding_sessions"("workspaceId");

CREATE UNIQUE INDEX IF NOT EXISTS
  "workspace_onboarding_sessions_idempotencyKey_key"
  ON "workspace_onboarding_sessions"("idempotencyKey");

CREATE INDEX IF NOT EXISTS
  "workspace_onboarding_sessions_userId_status_idx"
  ON "workspace_onboarding_sessions"("userId", "status");

CREATE INDEX IF NOT EXISTS
  "workspace_onboarding_sessions_expiresAt_idx"
  ON "workspace_onboarding_sessions"("expiresAt");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname =
      'workspace_onboarding_sessions_userId_fkey'
  ) THEN
    ALTER TABLE "workspace_onboarding_sessions"
      ADD CONSTRAINT
        "workspace_onboarding_sessions_userId_fkey"
      FOREIGN KEY ("userId")
      REFERENCES "users"("id")
      ON DELETE CASCADE
      ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname =
      'workspace_onboarding_sessions_workspaceId_fkey'
  ) THEN
    ALTER TABLE "workspace_onboarding_sessions"
      ADD CONSTRAINT
        "workspace_onboarding_sessions_workspaceId_fkey"
      FOREIGN KEY ("workspaceId")
      REFERENCES "workspaces"("id")
      ON DELETE SET NULL
      ON UPDATE CASCADE;
  END IF;
END
$$;