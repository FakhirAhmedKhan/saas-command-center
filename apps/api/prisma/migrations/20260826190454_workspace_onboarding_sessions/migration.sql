-- CreateEnum
CREATE TYPE "WorkspaceOnboardingStatus" AS ENUM (
    'IN_PROGRESS',
    'BLUEPRINT_READY',
    'CREATING',
    'COMPLETED',
    'FAILED',
    'EXPIRED'
);

-- CreateTable
CREATE TABLE "workspace_onboarding_sessions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "userId" UUID NOT NULL,
    "status" "WorkspaceOnboardingStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "currentStep" TEXT,
    "answers" JSONB NOT NULL,
    "blueprint" JSONB,
    "blueprintRevision" INTEGER NOT NULL DEFAULT 0,
    "blueprintHash" CHAR(64),
    "schemaVersion" INTEGER NOT NULL DEFAULT 1,
    "ruleSetVersion" TEXT,
    "generatorProvider" TEXT NOT NULL DEFAULT 'rules',
    "workspaceId" UUID,
    "idempotencyKey" UUID,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workspace_onboarding_sessions_pkey"
      PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX
  "workspace_onboarding_sessions_workspaceId_key"
  ON "workspace_onboarding_sessions"("workspaceId");

CREATE UNIQUE INDEX
  "workspace_onboarding_sessions_idempotencyKey_key"
  ON "workspace_onboarding_sessions"("idempotencyKey");

CREATE INDEX
  "workspace_onboarding_sessions_userId_status_idx"
  ON "workspace_onboarding_sessions"("userId", "status");

CREATE INDEX
  "workspace_onboarding_sessions_expiresAt_idx"
  ON "workspace_onboarding_sessions"("expiresAt");

ALTER TABLE "workspace_onboarding_sessions"
  ADD CONSTRAINT "workspace_onboarding_sessions_userId_fkey"
  FOREIGN KEY ("userId")
  REFERENCES "users"("id")
  ON DELETE CASCADE
  ON UPDATE CASCADE;

ALTER TABLE "workspace_onboarding_sessions"
  ADD CONSTRAINT "workspace_onboarding_sessions_workspaceId_fkey"
  FOREIGN KEY ("workspaceId")
  REFERENCES "workspaces"("id")
  ON DELETE SET NULL
  ON UPDATE CASCADE;