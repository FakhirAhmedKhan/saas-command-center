-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "ActivityEntityType" ADD VALUE 'MILESTONE';
ALTER TYPE "ActivityEntityType" ADD VALUE 'TASK';
ALTER TYPE "ActivityEntityType" ADD VALUE 'BLOCKER';
ALTER TYPE "ActivityEntityType" ADD VALUE 'WEBSITE';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "ApplicationActivityType" ADD VALUE 'MILESTONE_CREATED';
ALTER TYPE "ApplicationActivityType" ADD VALUE 'MILESTONE_UPDATED';
ALTER TYPE "ApplicationActivityType" ADD VALUE 'MILESTONE_COMPLETED';
ALTER TYPE "ApplicationActivityType" ADD VALUE 'MILESTONE_REOPENED';
ALTER TYPE "ApplicationActivityType" ADD VALUE 'MILESTONE_SKIPPED';
ALTER TYPE "ApplicationActivityType" ADD VALUE 'MILESTONE_DELETED';
ALTER TYPE "ApplicationActivityType" ADD VALUE 'MILESTONE_REORDERED';
ALTER TYPE "ApplicationActivityType" ADD VALUE 'TASK_CREATED';
ALTER TYPE "ApplicationActivityType" ADD VALUE 'TASK_UPDATED';
ALTER TYPE "ApplicationActivityType" ADD VALUE 'TASK_STATUS_CHANGED';
ALTER TYPE "ApplicationActivityType" ADD VALUE 'TASK_COMPLETED';
ALTER TYPE "ApplicationActivityType" ADD VALUE 'TASK_REOPENED';
ALTER TYPE "ApplicationActivityType" ADD VALUE 'TASK_SKIPPED';
ALTER TYPE "ApplicationActivityType" ADD VALUE 'TASK_MOVED';
ALTER TYPE "ApplicationActivityType" ADD VALUE 'TASK_DELETED';
ALTER TYPE "ApplicationActivityType" ADD VALUE 'TASK_REORDERED';
ALTER TYPE "ApplicationActivityType" ADD VALUE 'BLOCKER_CREATED';
ALTER TYPE "ApplicationActivityType" ADD VALUE 'BLOCKER_UPDATED';
ALTER TYPE "ApplicationActivityType" ADD VALUE 'BLOCKER_RESOLVED';
ALTER TYPE "ApplicationActivityType" ADD VALUE 'BLOCKER_REOPENED';
ALTER TYPE "ApplicationActivityType" ADD VALUE 'BLOCKER_DELETED';
ALTER TYPE "ApplicationActivityType" ADD VALUE 'DEVELOPMENT_TEMPLATE_APPLIED';
ALTER TYPE "ApplicationActivityType" ADD VALUE 'WEBSITE_CREATED';
ALTER TYPE "ApplicationActivityType" ADD VALUE 'WEBSITE_UPDATED';
ALTER TYPE "ApplicationActivityType" ADD VALUE 'WEBSITE_ENABLED';
ALTER TYPE "ApplicationActivityType" ADD VALUE 'WEBSITE_DISABLED';
ALTER TYPE "ApplicationActivityType" ADD VALUE 'WEBSITE_ARCHIVED';
ALTER TYPE "ApplicationActivityType" ADD VALUE 'WEBSITE_RESTORED';
ALTER TYPE "ApplicationActivityType" ADD VALUE 'WEBSITE_TRACKING_KEY_ROTATED';
ALTER TYPE "ApplicationActivityType" ADD VALUE 'WEBSITE_CONNECTED';
ALTER TYPE "ApplicationActivityType" ADD VALUE 'WEBSITE_DISCONNECTED';

-- CreateTable
CREATE TABLE "websites" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "application_id" UUID,
    "name" VARCHAR(160) NOT NULL,
    "domain" VARCHAR(253) NOT NULL,
    "time_zone" VARCHAR(64) NOT NULL DEFAULT 'UTC',
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "allowed_origins" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "tracking_key_prefix" VARCHAR(32) NOT NULL,
    "tracking_key_hash" VARCHAR(64) NOT NULL,
    "tracking_key_rotated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_event_at" TIMESTAMP(3),
    "archived_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "websites_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "websites_tracking_key_prefix_key" ON "websites"("tracking_key_prefix");

-- CreateIndex
CREATE UNIQUE INDEX "websites_tracking_key_hash_key" ON "websites"("tracking_key_hash");

-- CreateIndex
CREATE INDEX "websites_workspace_id_archived_at_idx" ON "websites"("workspace_id", "archived_at");

-- CreateIndex
CREATE INDEX "websites_workspace_id_enabled_idx" ON "websites"("workspace_id", "enabled");

-- CreateIndex
CREATE INDEX "websites_workspace_id_application_id_idx" ON "websites"("workspace_id", "application_id");

-- CreateIndex
CREATE INDEX "websites_application_id_idx" ON "websites"("application_id");

-- CreateIndex
CREATE INDEX "websites_last_event_at_idx" ON "websites"("last_event_at");

-- CreateIndex
CREATE UNIQUE INDEX "websites_workspace_id_domain_key" ON "websites"("workspace_id", "domain");

-- AddForeignKey
ALTER TABLE "websites" ADD CONSTRAINT "websites_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "websites" ADD CONSTRAINT "websites_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "saas_applications"("id") ON DELETE SET NULL ON UPDATE CASCADE;
