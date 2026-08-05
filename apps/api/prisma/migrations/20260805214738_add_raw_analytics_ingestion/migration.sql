-- CreateEnum
CREATE TYPE "MilestoneStatus" AS ENUM ('PLANNED', 'IN_PROGRESS', 'COMPLETED', 'SKIPPED');

-- CreateEnum
CREATE TYPE "ApplicationTaskStatus" AS ENUM ('TODO', 'IN_PROGRESS', 'BLOCKED', 'COMPLETED', 'SKIPPED');

-- CreateEnum
CREATE TYPE "WorkItemPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "BlockerStatus" AS ENUM ('OPEN', 'RESOLVED');

-- CreateEnum
CREATE TYPE "DevelopmentTemplateType" AS ENUM ('STANDARD_SAAS', 'AI_SAAS', 'MOBILE', 'API', 'ECOMMERCE');

-- CreateEnum
CREATE TYPE "RawAnalyticsEventType" AS ENUM ('PAGE_VIEW', 'HEARTBEAT', 'CUSTOM');

-- AlterTable
ALTER TABLE "saas_applications" ADD COLUMN     "development_template" "DevelopmentTemplateType",
ADD COLUMN     "progress_percent" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "progress_updated_at" TIMESTAMP(3),
ADD COLUMN     "template_applied_at" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "application_milestones" (
    "id" UUID NOT NULL,
    "application_id" UUID NOT NULL,
    "title" VARCHAR(160) NOT NULL,
    "description" TEXT,
    "status" "MilestoneStatus" NOT NULL DEFAULT 'PLANNED',
    "weight" INTEGER NOT NULL DEFAULT 1,
    "position" INTEGER NOT NULL DEFAULT 0,
    "progress_percent" INTEGER NOT NULL DEFAULT 0,
    "starts_at" TIMESTAMP(3),
    "due_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "skipped_at" TIMESTAMP(3),
    "skip_reason" VARCHAR(500),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "application_milestones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "application_tasks" (
    "id" UUID NOT NULL,
    "milestone_id" UUID NOT NULL,
    "assignee_user_id" UUID,
    "title" VARCHAR(200) NOT NULL,
    "description" TEXT,
    "status" "ApplicationTaskStatus" NOT NULL DEFAULT 'TODO',
    "priority" "WorkItemPriority" NOT NULL DEFAULT 'MEDIUM',
    "weight" INTEGER NOT NULL DEFAULT 1,
    "position" INTEGER NOT NULL DEFAULT 0,
    "due_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "skipped_at" TIMESTAMP(3),
    "skip_reason" VARCHAR(500),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "application_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "application_blockers" (
    "id" UUID NOT NULL,
    "application_id" UUID NOT NULL,
    "milestone_id" UUID,
    "task_id" UUID,
    "created_by_user_id" UUID,
    "resolved_by_user_id" UUID,
    "title" VARCHAR(200) NOT NULL,
    "description" TEXT,
    "severity" "WorkItemPriority" NOT NULL DEFAULT 'HIGH',
    "status" "BlockerStatus" NOT NULL DEFAULT 'OPEN',
    "opened_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolved_at" TIMESTAMP(3),
    "resolution" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "application_blockers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "raw_analytics_events" (
    "id" UUID NOT NULL,
    "website_id" UUID NOT NULL,
    "event_id" VARCHAR(80) NOT NULL,
    "type" "RawAnalyticsEventType" NOT NULL,
    "visitor_id" VARCHAR(80) NOT NULL,
    "session_id" VARCHAR(80) NOT NULL,
    "occurred_at" TIMESTAMP(3) NOT NULL,
    "received_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "page_url" VARCHAR(2048) NOT NULL,
    "page_path" VARCHAR(2048) NOT NULL,
    "page_title" VARCHAR(512),
    "referrer_url" VARCHAR(2048),
    "event_name" VARCHAR(100),
    "properties" JSONB,
    "screen_width" INTEGER,
    "screen_height" INTEGER,
    "viewport_width" INTEGER,
    "viewport_height" INTEGER,
    "language" VARCHAR(35),
    "client_time_zone" VARCHAR(64),
    "duration_ms" INTEGER,
    "origin" VARCHAR(512) NOT NULL,
    "user_agent" VARCHAR(512),
    "ip_hash" VARCHAR(64),
    "sdk_version" VARCHAR(32) NOT NULL,

    CONSTRAINT "raw_analytics_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "application_milestones_application_id_position_idx" ON "application_milestones"("application_id", "position");

-- CreateIndex
CREATE INDEX "application_milestones_application_id_status_idx" ON "application_milestones"("application_id", "status");

-- CreateIndex
CREATE INDEX "application_milestones_application_id_due_at_idx" ON "application_milestones"("application_id", "due_at");

-- CreateIndex
CREATE INDEX "application_tasks_milestone_id_position_idx" ON "application_tasks"("milestone_id", "position");

-- CreateIndex
CREATE INDEX "application_tasks_milestone_id_status_idx" ON "application_tasks"("milestone_id", "status");

-- CreateIndex
CREATE INDEX "application_tasks_assignee_user_id_idx" ON "application_tasks"("assignee_user_id");

-- CreateIndex
CREATE INDEX "application_tasks_due_at_status_idx" ON "application_tasks"("due_at", "status");

-- CreateIndex
CREATE INDEX "application_blockers_application_id_status_idx" ON "application_blockers"("application_id", "status");

-- CreateIndex
CREATE INDEX "application_blockers_application_id_severity_idx" ON "application_blockers"("application_id", "severity");

-- CreateIndex
CREATE INDEX "application_blockers_milestone_id_idx" ON "application_blockers"("milestone_id");

-- CreateIndex
CREATE INDEX "application_blockers_task_id_idx" ON "application_blockers"("task_id");

-- CreateIndex
CREATE INDEX "application_blockers_opened_at_idx" ON "application_blockers"("opened_at");

-- CreateIndex
CREATE INDEX "raw_analytics_events_website_id_received_at_idx" ON "raw_analytics_events"("website_id", "received_at");

-- CreateIndex
CREATE INDEX "raw_analytics_events_website_id_occurred_at_idx" ON "raw_analytics_events"("website_id", "occurred_at");

-- CreateIndex
CREATE INDEX "raw_analytics_events_website_id_type_occurred_at_idx" ON "raw_analytics_events"("website_id", "type", "occurred_at");

-- CreateIndex
CREATE INDEX "raw_analytics_events_website_id_visitor_id_occurred_at_idx" ON "raw_analytics_events"("website_id", "visitor_id", "occurred_at");

-- CreateIndex
CREATE INDEX "raw_analytics_events_website_id_session_id_occurred_at_idx" ON "raw_analytics_events"("website_id", "session_id", "occurred_at");

-- CreateIndex
CREATE INDEX "raw_analytics_events_event_name_idx" ON "raw_analytics_events"("event_name");

-- CreateIndex
CREATE UNIQUE INDEX "raw_analytics_events_website_id_event_id_key" ON "raw_analytics_events"("website_id", "event_id");

-- AddForeignKey
ALTER TABLE "application_milestones" ADD CONSTRAINT "application_milestones_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "saas_applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "application_tasks" ADD CONSTRAINT "application_tasks_milestone_id_fkey" FOREIGN KEY ("milestone_id") REFERENCES "application_milestones"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "application_tasks" ADD CONSTRAINT "application_tasks_assignee_user_id_fkey" FOREIGN KEY ("assignee_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "application_blockers" ADD CONSTRAINT "application_blockers_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "saas_applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "application_blockers" ADD CONSTRAINT "application_blockers_milestone_id_fkey" FOREIGN KEY ("milestone_id") REFERENCES "application_milestones"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "application_blockers" ADD CONSTRAINT "application_blockers_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "application_tasks"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "application_blockers" ADD CONSTRAINT "application_blockers_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "application_blockers" ADD CONSTRAINT "application_blockers_resolved_by_user_id_fkey" FOREIGN KEY ("resolved_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "raw_analytics_events" ADD CONSTRAINT "raw_analytics_events_website_id_fkey" FOREIGN KEY ("website_id") REFERENCES "websites"("id") ON DELETE CASCADE ON UPDATE CASCADE;
