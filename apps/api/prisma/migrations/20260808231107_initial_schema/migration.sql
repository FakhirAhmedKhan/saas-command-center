-- CreateEnum
CREATE TYPE "AnalyticsDeviceType" AS ENUM ('DESKTOP', 'MOBILE', 'TABLET', 'BOT', 'OTHER');

-- CreateEnum
CREATE TYPE "AnalyticsSourceType" AS ENUM ('DIRECT', 'INTERNAL', 'SEARCH', 'SOCIAL', 'REFERRAL', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "AnalyticsAggregateDimension" AS ENUM ('OVERVIEW', 'PAGE', 'SOURCE', 'COUNTRY', 'DEVICE', 'BROWSER', 'OPERATING_SYSTEM', 'CUSTOM_EVENT');

-- CreateEnum
CREATE TYPE "AnalyticsProcessingStatus" AS ENUM ('QUEUED', 'RUNNING', 'COMPLETED', 'SUCCEEDED', 'FAILED', 'DEAD_LETTERED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "AnalyticsProcessingTrigger" AS ENUM ('SCHEDULED', 'MANUAL', 'RETRY');

-- CreateEnum
CREATE TYPE "RawAnalyticsEventType" AS ENUM ('PAGE_VIEW', 'HEARTBEAT', 'CUSTOM');

-- CreateEnum
CREATE TYPE "ActivityActorType" AS ENUM ('USER', 'SYSTEM');

-- CreateEnum
CREATE TYPE "ActivityEntityType" AS ENUM ('APPLICATION', 'TECHNOLOGY', 'LINK', 'MILESTONE', 'TASK', 'BLOCKER', 'WEBSITE');

-- CreateEnum
CREATE TYPE "ApplicationActivityType" AS ENUM ('APPLICATION_CREATED', 'APPLICATION_UPDATED', 'APPLICATION_STATUS_CHANGED', 'APPLICATION_PRIORITY_CHANGED', 'APPLICATION_ARCHIVED', 'APPLICATION_RESTORED', 'APPLICATION_DELETED', 'TECHNOLOGY_ADDED', 'TECHNOLOGY_UPDATED', 'TECHNOLOGY_REMOVED', 'LINK_ADDED', 'LINK_UPDATED', 'LINK_REMOVED', 'MILESTONE_CREATED', 'MILESTONE_UPDATED', 'MILESTONE_COMPLETED', 'MILESTONE_REOPENED', 'MILESTONE_SKIPPED', 'MILESTONE_DELETED', 'MILESTONE_REORDERED', 'TASK_CREATED', 'TASK_UPDATED', 'TASK_STATUS_CHANGED', 'TASK_COMPLETED', 'TASK_REOPENED', 'TASK_SKIPPED', 'TASK_MOVED', 'TASK_DELETED', 'TASK_REORDERED', 'BLOCKER_CREATED', 'BLOCKER_UPDATED', 'BLOCKER_RESOLVED', 'BLOCKER_REOPENED', 'BLOCKER_DELETED', 'DEVELOPMENT_TEMPLATE_APPLIED', 'WEBSITE_CREATED', 'WEBSITE_UPDATED', 'WEBSITE_ENABLED', 'WEBSITE_DISABLED', 'WEBSITE_ARCHIVED', 'WEBSITE_RESTORED', 'WEBSITE_TRACKING_KEY_ROTATED', 'WEBSITE_CONNECTED', 'WEBSITE_DISCONNECTED');

-- CreateEnum
CREATE TYPE "MilestoneStatus" AS ENUM ('PLANNED', 'IN_PROGRESS', 'COMPLETED', 'SKIPPED');

-- CreateEnum
CREATE TYPE "ApplicationTaskStatus" AS ENUM ('TODO', 'IN_PROGRESS', 'BLOCKED', 'COMPLETED', 'SKIPPED');

-- CreateEnum
CREATE TYPE "WorkItemPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "BlockerStatus" AS ENUM ('OPEN', 'RESOLVED');

-- CreateEnum
CREATE TYPE "ApplicationStatus" AS ENUM ('IDEA', 'PLANNING', 'IN_DEVELOPMENT', 'TESTING', 'LIVE', 'MAINTENANCE', 'PAUSED');

-- CreateEnum
CREATE TYPE "ApplicationPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "ApplicationCategory" AS ENUM ('SAAS', 'AI', 'MOBILE', 'ECOMMERCE', 'API', 'INTERNAL_TOOL', 'OTHER');

-- CreateEnum
CREATE TYPE "TechnologyType" AS ENUM ('FRONTEND', 'BACKEND', 'DATABASE', 'MOBILE', 'AI', 'INFRASTRUCTURE', 'OTHER');

-- CreateEnum
CREATE TYPE "ApplicationLinkType" AS ENUM ('PRODUCTION', 'STAGING', 'REPOSITORY', 'DOCUMENTATION', 'DESIGN', 'API', 'OTHER');

-- CreateEnum
CREATE TYPE "DevelopmentTemplateType" AS ENUM ('STANDARD_SAAS', 'AI_SAAS', 'MOBILE', 'API', 'ECOMMERCE');

-- CreateEnum
CREATE TYPE "WorkspaceInvitationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED', 'REVOKED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "InvitationDeliveryStatus" AS ENUM ('NOT_REQUESTED', 'SENT', 'FAILED');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('WORKSPACE_INVITATION', 'WORKSPACE_INVITATION_ACCEPTED', 'ASSIGNMENT', 'DEPLOYMENT_FAILED', 'HEALTH_INCIDENT_OPENED', 'ANALYTICS_PROCESSING_FAILED', 'SYSTEM');

-- CreateEnum
CREATE TYPE "NotificationPriority" AS ENUM ('INFO', 'WARNING', 'CRITICAL');

-- CreateEnum
CREATE TYPE "ReleaseStatus" AS ENUM ('DRAFT', 'SCHEDULED', 'IN_PROGRESS', 'SUCCESSFUL', 'FAILED', 'ROLLED_BACK');

-- CreateEnum
CREATE TYPE "DeploymentStatus" AS ENUM ('DRAFT', 'SCHEDULED', 'IN_PROGRESS', 'SUCCESSFUL', 'FAILED', 'ROLLED_BACK');

-- CreateEnum
CREATE TYPE "DeploymentActivityAction" AS ENUM ('CREATED', 'UPDATED', 'STATUS_CHANGED', 'ROLLBACK_RECORDED', 'INCIDENT_LINKED', 'INCIDENT_UNLINKED');

-- CreateEnum
CREATE TYPE "HealthTargetType" AS ENUM ('APPLICATION', 'WEBSITE');

-- CreateEnum
CREATE TYPE "HealthCheckStatus" AS ENUM ('UNKNOWN', 'HEALTHY', 'DEGRADED', 'DOWN', 'DISABLED');

-- CreateEnum
CREATE TYPE "HealthIncidentStatus" AS ENUM ('OPEN', 'RESOLVED');

-- CreateEnum
CREATE TYPE "WebhookEventType" AS ENUM ('WEBHOOK_TEST', 'APPLICATION_CREATED', 'APPLICATION_UPDATED', 'DEPLOYMENT_STATUS_CHANGED', 'DEPLOYMENT_FAILED', 'HEALTH_INCIDENT_OPENED', 'HEALTH_INCIDENT_RESOLVED', 'ANALYTICS_PROCESSING_FAILED', 'WORKSPACE_ACTIVITY_CREATED');

-- CreateEnum
CREATE TYPE "WebhookDeliveryStatus" AS ENUM ('PENDING', 'PROCESSING', 'RETRY_SCHEDULED', 'SUCCEEDED', 'DEAD_LETTERED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "WebhookAttemptOutcome" AS ENUM ('SUCCEEDED', 'FAILED');

-- CreateEnum
CREATE TYPE "WorkspaceRole" AS ENUM ('OWNER', 'ADMIN', 'DEVELOPER', 'VIEWER');

-- CreateTable
CREATE TABLE "analytics_hourly_aggregates" (
    "id" UUID NOT NULL,
    "website_id" UUID NOT NULL,
    "bucket_start" TIMESTAMP(3) NOT NULL,
    "bucket_end" TIMESTAMP(3) NOT NULL,
    "time_zone" VARCHAR(64) NOT NULL,
    "dimension" "AnalyticsAggregateDimension" NOT NULL,
    "dimension_key" VARCHAR(64) NOT NULL,
    "dimension_value" VARCHAR(2048) NOT NULL,
    "dimension_label" VARCHAR(256) NOT NULL,
    "visitors" INTEGER NOT NULL DEFAULT 0,
    "sessions" INTEGER NOT NULL DEFAULT 0,
    "page_views" INTEGER NOT NULL DEFAULT 0,
    "events" INTEGER NOT NULL DEFAULT 0,
    "custom_events" INTEGER NOT NULL DEFAULT 0,
    "bounces" INTEGER NOT NULL DEFAULT 0,
    "total_duration_ms" BIGINT NOT NULL DEFAULT 0,
    "generated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "analytics_hourly_aggregates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "analytics_daily_aggregates" (
    "id" UUID NOT NULL,
    "website_id" UUID NOT NULL,
    "bucket_start" TIMESTAMP(3) NOT NULL,
    "bucket_end" TIMESTAMP(3) NOT NULL,
    "time_zone" VARCHAR(64) NOT NULL,
    "dimension" "AnalyticsAggregateDimension" NOT NULL,
    "dimension_key" VARCHAR(64) NOT NULL,
    "dimension_value" VARCHAR(2048) NOT NULL,
    "dimension_label" VARCHAR(256) NOT NULL,
    "visitors" INTEGER NOT NULL DEFAULT 0,
    "sessions" INTEGER NOT NULL DEFAULT 0,
    "page_views" INTEGER NOT NULL DEFAULT 0,
    "events" INTEGER NOT NULL DEFAULT 0,
    "custom_events" INTEGER NOT NULL DEFAULT 0,
    "bounces" INTEGER NOT NULL DEFAULT 0,
    "total_duration_ms" BIGINT NOT NULL DEFAULT 0,
    "generated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "analytics_daily_aggregates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "analytics_visitors" (
    "id" UUID NOT NULL,
    "website_id" UUID NOT NULL,
    "external_visitor_id" VARCHAR(80) NOT NULL,
    "first_seen_at" TIMESTAMP(3) NOT NULL,
    "last_seen_at" TIMESTAMP(3) NOT NULL,
    "session_count" INTEGER NOT NULL DEFAULT 0,
    "page_view_count" INTEGER NOT NULL DEFAULT 0,
    "event_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "analytics_visitors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "analytics_sessions" (
    "id" UUID NOT NULL,
    "website_id" UUID NOT NULL,
    "visitor_id" UUID NOT NULL,
    "external_session_id" VARCHAR(80) NOT NULL,
    "started_at" TIMESTAMP(3) NOT NULL,
    "ended_at" TIMESTAMP(3) NOT NULL,
    "last_event_at" TIMESTAMP(3) NOT NULL,
    "duration_ms" INTEGER NOT NULL DEFAULT 0,
    "engaged_duration_ms" INTEGER NOT NULL DEFAULT 0,
    "page_view_count" INTEGER NOT NULL DEFAULT 0,
    "event_count" INTEGER NOT NULL DEFAULT 0,
    "custom_event_count" INTEGER NOT NULL DEFAULT 0,
    "bounced" BOOLEAN NOT NULL DEFAULT true,
    "entry_path" VARCHAR(2048),
    "exit_path" VARCHAR(2048),
    "entry_title" VARCHAR(512),
    "exit_title" VARCHAR(512),
    "referrer_url" VARCHAR(2048),
    "source_type" "AnalyticsSourceType" NOT NULL DEFAULT 'UNKNOWN',
    "source_name" VARCHAR(160) NOT NULL DEFAULT 'Unknown',
    "source_domain" VARCHAR(253),
    "country_code" CHAR(2),
    "device_type" "AnalyticsDeviceType" NOT NULL DEFAULT 'OTHER',
    "browser_name" VARCHAR(100) NOT NULL DEFAULT 'Unknown',
    "browser_version" VARCHAR(50),
    "operating_system" VARCHAR(100) NOT NULL DEFAULT 'Unknown',
    "operating_system_version" VARCHAR(50),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "analytics_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "analytics_events" (
    "id" UUID NOT NULL,
    "website_id" UUID NOT NULL,
    "visitor_id" UUID NOT NULL,
    "session_id" UUID NOT NULL,
    "raw_event_id" UUID,
    "source_event_id" VARCHAR(80) NOT NULL,
    "type" "RawAnalyticsEventType" NOT NULL,
    "event_name" VARCHAR(100),
    "occurred_at" TIMESTAMP(3) NOT NULL,
    "received_at" TIMESTAMP(3) NOT NULL,
    "page_url" VARCHAR(2048) NOT NULL,
    "normalized_path" VARCHAR(2048) NOT NULL,
    "page_title" VARCHAR(512),
    "referrer_url" VARCHAR(2048),
    "properties" JSONB,
    "duration_ms" INTEGER,
    "source_type" "AnalyticsSourceType" NOT NULL DEFAULT 'UNKNOWN',
    "source_name" VARCHAR(160) NOT NULL DEFAULT 'Unknown',
    "source_domain" VARCHAR(253),
    "country_code" CHAR(2),
    "device_type" "AnalyticsDeviceType" NOT NULL DEFAULT 'OTHER',
    "browser_name" VARCHAR(100) NOT NULL DEFAULT 'Unknown',
    "browser_version" VARCHAR(50),
    "operating_system" VARCHAR(100) NOT NULL DEFAULT 'Unknown',
    "operating_system_version" VARCHAR(50),
    "processed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "analytics_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "analytics_page_views" (
    "id" UUID NOT NULL,
    "website_id" UUID NOT NULL,
    "visitor_id" UUID NOT NULL,
    "session_id" UUID NOT NULL,
    "analytics_event_id" UUID NOT NULL,
    "occurred_at" TIMESTAMP(3) NOT NULL,
    "page_url" VARCHAR(2048) NOT NULL,
    "normalized_path" VARCHAR(2048) NOT NULL,
    "title" VARCHAR(512),
    "referrer_url" VARCHAR(2048),
    "source_type" "AnalyticsSourceType" NOT NULL DEFAULT 'UNKNOWN',
    "source_name" VARCHAR(160) NOT NULL DEFAULT 'Unknown',
    "source_domain" VARCHAR(253),
    "country_code" CHAR(2),
    "device_type" "AnalyticsDeviceType" NOT NULL DEFAULT 'OTHER',
    "browser_name" VARCHAR(100) NOT NULL DEFAULT 'Unknown',
    "operating_system" VARCHAR(100) NOT NULL DEFAULT 'Unknown',
    "is_entry" BOOLEAN NOT NULL DEFAULT false,
    "is_exit" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "analytics_page_views_pkey" PRIMARY KEY ("id")
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
    "processed_at" TIMESTAMPTZ(6),
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
    "country_code" CHAR(2),
    "sdk_version" VARCHAR(32) NOT NULL,

    CONSTRAINT "raw_analytics_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "analytics_processing_states" (
    "website_id" UUID NOT NULL,
    "status" "AnalyticsProcessingStatus" NOT NULL DEFAULT 'COMPLETED',
    "last_started_at" TIMESTAMP(3),
    "last_completed_at" TIMESTAMP(3),
    "last_failed_at" TIMESTAMP(3),
    "last_processed_received_at" TIMESTAMP(3),
    "last_error" TEXT,
    "total_raw_events_processed" BIGINT NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "analytics_processing_states_pkey" PRIMARY KEY ("website_id")
);

-- CreateTable
CREATE TABLE "analytics_processing_runs" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "website_id" UUID NOT NULL,
    "initiated_by_user_id" UUID,
    "trigger" "AnalyticsProcessingTrigger" NOT NULL DEFAULT 'MANUAL',
    "status" "AnalyticsProcessingStatus" NOT NULL DEFAULT 'RUNNING',
    "range_start" TIMESTAMPTZ(6) NOT NULL,
    "range_end" TIMESTAMPTZ(6) NOT NULL,
    "active_key" TEXT,
    "lock_key" TEXT NOT NULL,
    "retry_count" INTEGER NOT NULL DEFAULT 0,
    "max_retries" INTEGER NOT NULL DEFAULT 3,
    "next_attempt_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "pending_events_at_start" INTEGER NOT NULL DEFAULT 0,
    "raw_events_processed" INTEGER NOT NULL DEFAULT 0,
    "sessions_rebuilt" INTEGER NOT NULL DEFAULT 0,
    "hourly_buckets" INTEGER NOT NULL DEFAULT 0,
    "daily_buckets" INTEGER NOT NULL DEFAULT 0,
    "failed_events" INTEGER NOT NULL DEFAULT 0,
    "error_code" TEXT,
    "error_message" TEXT,
    "started_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "heartbeat_at" TIMESTAMPTZ(6),
    "completed_at" TIMESTAMPTZ(6),
    "failed_at" TIMESTAMPTZ(6),
    "finished_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "analytics_processing_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "analytics_processing_dead_letters" (
    "id" UUID NOT NULL,
    "run_id" UUID NOT NULL,
    "workspace_id" UUID,
    "website_id" UUID NOT NULL,
    "range_start" TIMESTAMPTZ(6) NOT NULL,
    "range_end" TIMESTAMPTZ(6) NOT NULL,
    "retry_count" INTEGER NOT NULL,
    "error_code" TEXT,
    "error_message" TEXT NOT NULL,
    "resolved_at" TIMESTAMPTZ(6),
    "resolved_by_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "analytics_processing_dead_letters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "application_activities" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "application_id" UUID,
    "application_name" VARCHAR(160) NOT NULL,
    "actor_user_id" UUID,
    "actor_type" "ActivityActorType" NOT NULL DEFAULT 'USER',
    "activity_type" "ApplicationActivityType" NOT NULL,
    "entity_type" "ActivityEntityType" NOT NULL,
    "entity_id" UUID,
    "title" VARCHAR(180) NOT NULL,
    "description" VARCHAR(500),
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "application_activities_pkey" PRIMARY KEY ("id")
);

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
CREATE TABLE "application_environments" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "application_id" UUID NOT NULL,
    "name" VARCHAR(80) NOT NULL,
    "slug" VARCHAR(80) NOT NULL,
    "description" VARCHAR(280),
    "url" VARCHAR(2048),
    "is_production" BOOLEAN NOT NULL DEFAULT false,
    "archived_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "application_environments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "saas_applications" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "name" VARCHAR(160) NOT NULL,
    "slug" VARCHAR(160) NOT NULL,
    "short_description" VARCHAR(280),
    "long_description" TEXT,
    "category" "ApplicationCategory" NOT NULL DEFAULT 'SAAS',
    "status" "ApplicationStatus" NOT NULL DEFAULT 'IDEA',
    "priority" "ApplicationPriority" NOT NULL DEFAULT 'MEDIUM',
    "started_at" TIMESTAMP(3),
    "target_launch_at" TIMESTAMP(3),
    "launched_at" TIMESTAMP(3),
    "last_activity_at" TIMESTAMP(3),
    "archived_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "progress_percent" INTEGER NOT NULL DEFAULT 0,
    "progress_updated_at" TIMESTAMP(3),
    "development_template" "DevelopmentTemplateType",
    "template_applied_at" TIMESTAMP(3),

    CONSTRAINT "saas_applications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "application_technologies" (
    "id" UUID NOT NULL,
    "application_id" UUID NOT NULL,
    "name" VARCHAR(80) NOT NULL,
    "type" "TechnologyType" NOT NULL,
    "version" VARCHAR(50),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "application_technologies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "application_links" (
    "id" UUID NOT NULL,
    "application_id" UUID NOT NULL,
    "label" VARCHAR(80) NOT NULL,
    "type" "ApplicationLinkType" NOT NULL,
    "url" VARCHAR(2048) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "application_links_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workspace_invitations" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "invited_by_id" UUID NOT NULL,
    "accepted_by_id" UUID,
    "email" TEXT NOT NULL,
    "role" "WorkspaceRole" NOT NULL,
    "token_hash" TEXT NOT NULL,
    "status" "WorkspaceInvitationStatus" NOT NULL DEFAULT 'PENDING',
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "accepted_at" TIMESTAMPTZ(6),
    "declined_at" TIMESTAMPTZ(6),
    "revoked_at" TIMESTAMPTZ(6),
    "last_sent_at" TIMESTAMPTZ(6),
    "send_count" INTEGER NOT NULL DEFAULT 0,
    "delivery_status" "InvitationDeliveryStatus" NOT NULL DEFAULT 'NOT_REQUESTED',
    "delivery_error" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "workspace_invitations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "application_id" UUID,
    "type" "NotificationType" NOT NULL,
    "priority" "NotificationPriority" NOT NULL DEFAULT 'INFO',
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "resource_type" TEXT,
    "resource_id" UUID,
    "action_url" TEXT,
    "payload" JSONB,
    "dedupe_key" TEXT,
    "read_at" TIMESTAMPTZ(6),
    "expires_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "health_checks" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "target_type" "HealthTargetType" NOT NULL,
    "application_id" UUID,
    "website_id" UUID,
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "interval_seconds" INTEGER NOT NULL DEFAULT 300,
    "timeout_ms" INTEGER NOT NULL DEFAULT 10000,
    "expected_status_min" INTEGER NOT NULL DEFAULT 200,
    "expected_status_max" INTEGER NOT NULL DEFAULT 399,
    "degraded_after_ms" INTEGER NOT NULL DEFAULT 1500,
    "failure_threshold" INTEGER NOT NULL DEFAULT 3,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "latest_status" "HealthCheckStatus" NOT NULL DEFAULT 'UNKNOWN',
    "last_status_code" INTEGER,
    "last_response_time_ms" INTEGER,
    "last_failure_reason" TEXT,
    "consecutive_failures" INTEGER NOT NULL DEFAULT 0,
    "last_checked_at" TIMESTAMPTZ(6),
    "last_successful_at" TIMESTAMPTZ(6),
    "next_run_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by_id" UUID NOT NULL,
    "updated_by_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "health_checks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "health_check_history" (
    "id" UUID NOT NULL,
    "health_check_id" UUID NOT NULL,
    "status" "HealthCheckStatus" NOT NULL,
    "status_code" INTEGER,
    "response_time_ms" INTEGER,
    "failure_reason" TEXT,
    "checked_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "health_check_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "health_incidents" (
    "id" UUID NOT NULL,
    "health_check_id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "status" "HealthIncidentStatus" NOT NULL DEFAULT 'OPEN',
    "active_key" TEXT,
    "summary" TEXT NOT NULL,
    "failure_count" INTEGER NOT NULL DEFAULT 1,
    "first_failure_at" TIMESTAMPTZ(6) NOT NULL,
    "last_failure_at" TIMESTAMPTZ(6) NOT NULL,
    "started_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolved_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "health_incidents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "email" VARCHAR(320) NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "display_name" VARCHAR(120),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "email_verified_at" TIMESTAMP(3),
    "last_login_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auth_sessions" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "family_id" UUID NOT NULL,
    "refresh_token_hash" VARCHAR(128) NOT NULL,
    "parent_session_id" UUID,
    "user_agent" VARCHAR(512),
    "ip_address" VARCHAR(64),
    "expires_at" TIMESTAMP(3) NOT NULL,
    "last_used_at" TIMESTAMP(3),
    "revoked_at" TIMESTAMP(3),
    "revoke_reason" VARCHAR(120),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "auth_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "releases" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "application_id" UUID NOT NULL,
    "version" TEXT NOT NULL,
    "name" TEXT,
    "notes" TEXT,
    "commit_ref" TEXT,
    "repository_url" TEXT,
    "status" "ReleaseStatus" NOT NULL DEFAULT 'DRAFT',
    "scheduled_at" TIMESTAMPTZ(6),
    "released_at" TIMESTAMPTZ(6),
    "created_by_id" UUID NOT NULL,
    "updated_by_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "releases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "deployments" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "application_id" UUID NOT NULL,
    "environment_id" UUID NOT NULL,
    "release_id" UUID NOT NULL,
    "attempt" INTEGER NOT NULL DEFAULT 1,
    "status" "DeploymentStatus" NOT NULL DEFAULT 'DRAFT',
    "commit_ref" TEXT,
    "repository_url" TEXT,
    "ci_job_url" TEXT,
    "live_url" TEXT,
    "deployment_notes" TEXT,
    "failure_reason" TEXT,
    "scheduled_at" TIMESTAMPTZ(6),
    "started_at" TIMESTAMPTZ(6),
    "finished_at" TIMESTAMPTZ(6),
    "duration_ms" INTEGER,
    "status_changed_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deployed_by_id" UUID,
    "created_by_id" UUID NOT NULL,
    "updated_by_id" UUID NOT NULL,
    "rollback_to_deployment_id" UUID,
    "health_incident_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "deployments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "deployment_activities" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "deployment_id" UUID NOT NULL,
    "actor_id" UUID NOT NULL,
    "action" "DeploymentActivityAction" NOT NULL,
    "from_status" "DeploymentStatus",
    "to_status" "DeploymentStatus",
    "message" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "deployment_activities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "webhook_endpoints" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "event_types" "WebhookEventType"[],
    "payload_version" TEXT NOT NULL DEFAULT '2026-08-01',
    "secret_ciphertext" TEXT NOT NULL,
    "secret_iv" TEXT NOT NULL,
    "secret_auth_tag" TEXT NOT NULL,
    "secret_key_version" INTEGER NOT NULL DEFAULT 1,
    "timeout_ms" INTEGER NOT NULL DEFAULT 10000,
    "max_attempts" INTEGER NOT NULL DEFAULT 5,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "last_delivery_at" TIMESTAMPTZ(6),
    "last_success_at" TIMESTAMPTZ(6),
    "last_failure_at" TIMESTAMPTZ(6),
    "created_by_id" UUID NOT NULL,
    "updated_by_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "webhook_endpoints_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "webhook_events" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "type" "WebhookEventType" NOT NULL,
    "payload_version" TEXT NOT NULL DEFAULT '2026-08-01',
    "resource_type" TEXT,
    "resource_id" UUID,
    "payload" JSONB NOT NULL,
    "occurred_at" TIMESTAMPTZ(6) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "webhook_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "webhook_deliveries" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "endpoint_id" UUID NOT NULL,
    "event_id" UUID NOT NULL,
    "status" "WebhookDeliveryStatus" NOT NULL DEFAULT 'PENDING',
    "attempt_count" INTEGER NOT NULL DEFAULT 0,
    "max_attempts" INTEGER NOT NULL DEFAULT 5,
    "next_attempt_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "response_status" INTEGER,
    "response_duration_ms" INTEGER,
    "failure_code" TEXT,
    "failure_reason" TEXT,
    "started_at" TIMESTAMPTZ(6),
    "finished_at" TIMESTAMPTZ(6),
    "delivered_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "webhook_deliveries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "webhook_delivery_attempts" (
    "id" UUID NOT NULL,
    "delivery_id" UUID NOT NULL,
    "attempt_number" INTEGER NOT NULL,
    "outcome" "WebhookAttemptOutcome" NOT NULL,
    "response_status" INTEGER,
    "duration_ms" INTEGER NOT NULL,
    "error_code" TEXT,
    "error_message" TEXT,
    "started_at" TIMESTAMPTZ(6) NOT NULL,
    "finished_at" TIMESTAMPTZ(6) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "webhook_delivery_attempts_pkey" PRIMARY KEY ("id")
);

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

-- CreateTable
CREATE TABLE "workspaces" (
    "id" UUID NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "slug" VARCHAR(120) NOT NULL,
    "owner_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "workspaces_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workspace_members" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "role" "WorkspaceRole" NOT NULL DEFAULT 'VIEWER',
    "joined_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workspace_members_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "analytics_hourly_aggregates_website_id_dimension_bucket_sta_idx" ON "analytics_hourly_aggregates"("website_id", "dimension", "bucket_start");

-- CreateIndex
CREATE INDEX "analytics_hourly_aggregates_website_id_bucket_start_idx" ON "analytics_hourly_aggregates"("website_id", "bucket_start");

-- CreateIndex
CREATE UNIQUE INDEX "analytics_hourly_aggregates_website_id_bucket_start_dimensi_key" ON "analytics_hourly_aggregates"("website_id", "bucket_start", "dimension", "dimension_key");

-- CreateIndex
CREATE INDEX "analytics_daily_aggregates_website_id_dimension_bucket_star_idx" ON "analytics_daily_aggregates"("website_id", "dimension", "bucket_start");

-- CreateIndex
CREATE INDEX "analytics_daily_aggregates_website_id_bucket_start_idx" ON "analytics_daily_aggregates"("website_id", "bucket_start");

-- CreateIndex
CREATE UNIQUE INDEX "analytics_daily_aggregates_website_id_bucket_start_dimensio_key" ON "analytics_daily_aggregates"("website_id", "bucket_start", "dimension", "dimension_key");

-- CreateIndex
CREATE INDEX "analytics_visitors_website_id_first_seen_at_idx" ON "analytics_visitors"("website_id", "first_seen_at");

-- CreateIndex
CREATE INDEX "analytics_visitors_website_id_last_seen_at_idx" ON "analytics_visitors"("website_id", "last_seen_at");

-- CreateIndex
CREATE UNIQUE INDEX "analytics_visitors_website_id_external_visitor_id_key" ON "analytics_visitors"("website_id", "external_visitor_id");

-- CreateIndex
CREATE INDEX "analytics_sessions_website_id_started_at_idx" ON "analytics_sessions"("website_id", "started_at");

-- CreateIndex
CREATE INDEX "analytics_sessions_website_id_ended_at_idx" ON "analytics_sessions"("website_id", "ended_at");

-- CreateIndex
CREATE INDEX "analytics_sessions_website_id_bounced_started_at_idx" ON "analytics_sessions"("website_id", "bounced", "started_at");

-- CreateIndex
CREATE INDEX "analytics_sessions_website_id_source_type_started_at_idx" ON "analytics_sessions"("website_id", "source_type", "started_at");

-- CreateIndex
CREATE INDEX "analytics_sessions_website_id_country_code_started_at_idx" ON "analytics_sessions"("website_id", "country_code", "started_at");

-- CreateIndex
CREATE INDEX "analytics_sessions_website_id_device_type_started_at_idx" ON "analytics_sessions"("website_id", "device_type", "started_at");

-- CreateIndex
CREATE INDEX "analytics_sessions_visitor_id_started_at_idx" ON "analytics_sessions"("visitor_id", "started_at");

-- CreateIndex
CREATE UNIQUE INDEX "analytics_sessions_website_id_external_session_id_key" ON "analytics_sessions"("website_id", "external_session_id");

-- CreateIndex
CREATE UNIQUE INDEX "analytics_events_raw_event_id_key" ON "analytics_events"("raw_event_id");

-- CreateIndex
CREATE INDEX "analytics_events_website_id_occurred_at_idx" ON "analytics_events"("website_id", "occurred_at");

-- CreateIndex
CREATE INDEX "analytics_events_website_id_type_occurred_at_idx" ON "analytics_events"("website_id", "type", "occurred_at");

-- CreateIndex
CREATE INDEX "analytics_events_website_id_event_name_occurred_at_idx" ON "analytics_events"("website_id", "event_name", "occurred_at");

-- CreateIndex
CREATE INDEX "analytics_events_session_id_occurred_at_idx" ON "analytics_events"("session_id", "occurred_at");

-- CreateIndex
CREATE INDEX "analytics_events_visitor_id_occurred_at_idx" ON "analytics_events"("visitor_id", "occurred_at");

-- CreateIndex
CREATE UNIQUE INDEX "analytics_events_website_id_source_event_id_key" ON "analytics_events"("website_id", "source_event_id");

-- CreateIndex
CREATE UNIQUE INDEX "analytics_page_views_analytics_event_id_key" ON "analytics_page_views"("analytics_event_id");

-- CreateIndex
CREATE INDEX "analytics_page_views_website_id_occurred_at_idx" ON "analytics_page_views"("website_id", "occurred_at");

-- CreateIndex
CREATE INDEX "analytics_page_views_website_id_normalized_path_occurred_at_idx" ON "analytics_page_views"("website_id", "normalized_path", "occurred_at");

-- CreateIndex
CREATE INDEX "analytics_page_views_website_id_source_type_occurred_at_idx" ON "analytics_page_views"("website_id", "source_type", "occurred_at");

-- CreateIndex
CREATE INDEX "analytics_page_views_website_id_country_code_occurred_at_idx" ON "analytics_page_views"("website_id", "country_code", "occurred_at");

-- CreateIndex
CREATE INDEX "analytics_page_views_session_id_occurred_at_idx" ON "analytics_page_views"("session_id", "occurred_at");

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
CREATE INDEX "raw_analytics_events_website_id_country_code_occurred_at_idx" ON "raw_analytics_events"("website_id", "country_code", "occurred_at");

-- CreateIndex
CREATE INDEX "raw_analytics_events_event_name_idx" ON "raw_analytics_events"("event_name");

-- CreateIndex
CREATE UNIQUE INDEX "raw_analytics_events_website_id_event_id_key" ON "raw_analytics_events"("website_id", "event_id");

-- CreateIndex
CREATE UNIQUE INDEX "analytics_processing_runs_active_key_key" ON "analytics_processing_runs"("active_key");

-- CreateIndex
CREATE INDEX "analytics_processing_runs_workspace_id_website_id_created_a_idx" ON "analytics_processing_runs"("workspace_id", "website_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "analytics_processing_runs_status_next_attempt_at_idx" ON "analytics_processing_runs"("status", "next_attempt_at");

-- CreateIndex
CREATE INDEX "analytics_processing_runs_website_id_status_idx" ON "analytics_processing_runs"("website_id", "status");

-- CreateIndex
CREATE INDEX "analytics_processing_runs_website_id_started_at_idx" ON "analytics_processing_runs"("website_id", "started_at");

-- CreateIndex
CREATE UNIQUE INDEX "analytics_processing_dead_letters_run_id_key" ON "analytics_processing_dead_letters"("run_id");

-- CreateIndex
CREATE INDEX "analytics_processing_dead_letters_website_id_resolved_at_cr_idx" ON "analytics_processing_dead_letters"("website_id", "resolved_at", "created_at" DESC);

-- CreateIndex
CREATE INDEX "analytics_processing_dead_letters_workspace_id_created_at_idx" ON "analytics_processing_dead_letters"("workspace_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "application_activities_workspace_id_created_at_idx" ON "application_activities"("workspace_id", "created_at");

-- CreateIndex
CREATE INDEX "application_activities_application_id_created_at_idx" ON "application_activities"("application_id", "created_at");

-- CreateIndex
CREATE INDEX "application_activities_actor_user_id_created_at_idx" ON "application_activities"("actor_user_id", "created_at");

-- CreateIndex
CREATE INDEX "application_activities_workspace_id_activity_type_created_a_idx" ON "application_activities"("workspace_id", "activity_type", "created_at");

-- CreateIndex
CREATE INDEX "application_activities_workspace_id_entity_type_created_at_idx" ON "application_activities"("workspace_id", "entity_type", "created_at");

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
CREATE INDEX "application_environments_workspace_id_application_id_idx" ON "application_environments"("workspace_id", "application_id");

-- CreateIndex
CREATE INDEX "application_environments_application_id_archived_at_idx" ON "application_environments"("application_id", "archived_at");

-- CreateIndex
CREATE UNIQUE INDEX "application_environments_application_id_slug_key" ON "application_environments"("application_id", "slug");

-- CreateIndex
CREATE INDEX "saas_applications_workspace_id_archived_at_idx" ON "saas_applications"("workspace_id", "archived_at");

-- CreateIndex
CREATE INDEX "saas_applications_workspace_id_status_idx" ON "saas_applications"("workspace_id", "status");

-- CreateIndex
CREATE INDEX "saas_applications_workspace_id_priority_idx" ON "saas_applications"("workspace_id", "priority");

-- CreateIndex
CREATE INDEX "saas_applications_workspace_id_category_idx" ON "saas_applications"("workspace_id", "category");

-- CreateIndex
CREATE INDEX "saas_applications_workspace_id_updated_at_idx" ON "saas_applications"("workspace_id", "updated_at");

-- CreateIndex
CREATE UNIQUE INDEX "saas_applications_workspace_id_slug_key" ON "saas_applications"("workspace_id", "slug");

-- CreateIndex
CREATE INDEX "application_technologies_application_id_type_idx" ON "application_technologies"("application_id", "type");

-- CreateIndex
CREATE UNIQUE INDEX "application_technologies_application_id_name_type_key" ON "application_technologies"("application_id", "name", "type");

-- CreateIndex
CREATE INDEX "application_links_application_id_type_idx" ON "application_links"("application_id", "type");

-- CreateIndex
CREATE UNIQUE INDEX "application_links_application_id_url_key" ON "application_links"("application_id", "url");

-- CreateIndex
CREATE UNIQUE INDEX "workspace_invitations_token_hash_key" ON "workspace_invitations"("token_hash");

-- CreateIndex
CREATE INDEX "workspace_invitations_workspace_id_status_created_at_idx" ON "workspace_invitations"("workspace_id", "status", "created_at" DESC);

-- CreateIndex
CREATE INDEX "workspace_invitations_email_status_idx" ON "workspace_invitations"("email", "status");

-- CreateIndex
CREATE INDEX "workspace_invitations_expires_at_idx" ON "workspace_invitations"("expires_at");

-- CreateIndex
CREATE INDEX "notifications_user_id_read_at_created_at_idx" ON "notifications"("user_id", "read_at", "created_at" DESC);

-- CreateIndex
CREATE INDEX "notifications_workspace_id_created_at_idx" ON "notifications"("workspace_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "notifications_expires_at_idx" ON "notifications"("expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "notifications_user_id_dedupe_key_key" ON "notifications"("user_id", "dedupe_key");

-- CreateIndex
CREATE INDEX "health_checks_workspace_id_latest_status_idx" ON "health_checks"("workspace_id", "latest_status");

-- CreateIndex
CREATE INDEX "health_checks_workspace_id_enabled_idx" ON "health_checks"("workspace_id", "enabled");

-- CreateIndex
CREATE INDEX "health_checks_enabled_next_run_at_idx" ON "health_checks"("enabled", "next_run_at");

-- CreateIndex
CREATE INDEX "health_checks_application_id_idx" ON "health_checks"("application_id");

-- CreateIndex
CREATE INDEX "health_checks_website_id_idx" ON "health_checks"("website_id");

-- CreateIndex
CREATE INDEX "health_check_history_health_check_id_checked_at_idx" ON "health_check_history"("health_check_id", "checked_at" DESC);

-- CreateIndex
CREATE INDEX "health_check_history_checked_at_idx" ON "health_check_history"("checked_at");

-- CreateIndex
CREATE UNIQUE INDEX "health_incidents_active_key_key" ON "health_incidents"("active_key");

-- CreateIndex
CREATE INDEX "health_incidents_workspace_id_status_started_at_idx" ON "health_incidents"("workspace_id", "status", "started_at" DESC);

-- CreateIndex
CREATE INDEX "health_incidents_health_check_id_status_idx" ON "health_incidents"("health_check_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_deleted_at_idx" ON "users"("deleted_at");

-- CreateIndex
CREATE INDEX "users_is_active_idx" ON "users"("is_active");

-- CreateIndex
CREATE UNIQUE INDEX "auth_sessions_refresh_token_hash_key" ON "auth_sessions"("refresh_token_hash");

-- CreateIndex
CREATE UNIQUE INDEX "auth_sessions_parent_session_id_key" ON "auth_sessions"("parent_session_id");

-- CreateIndex
CREATE INDEX "auth_sessions_user_id_revoked_at_idx" ON "auth_sessions"("user_id", "revoked_at");

-- CreateIndex
CREATE INDEX "auth_sessions_family_id_idx" ON "auth_sessions"("family_id");

-- CreateIndex
CREATE INDEX "auth_sessions_expires_at_idx" ON "auth_sessions"("expires_at");

-- CreateIndex
CREATE INDEX "releases_workspace_id_application_id_created_at_idx" ON "releases"("workspace_id", "application_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "releases_application_id_status_idx" ON "releases"("application_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "releases_application_id_version_key" ON "releases"("application_id", "version");

-- CreateIndex
CREATE INDEX "deployments_workspace_id_application_id_created_at_idx" ON "deployments"("workspace_id", "application_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "deployments_environment_id_status_changed_at_idx" ON "deployments"("environment_id", "status_changed_at" DESC);

-- CreateIndex
CREATE INDEX "deployments_application_id_status_idx" ON "deployments"("application_id", "status");

-- CreateIndex
CREATE INDEX "deployments_health_incident_id_idx" ON "deployments"("health_incident_id");

-- CreateIndex
CREATE UNIQUE INDEX "deployments_release_id_environment_id_attempt_key" ON "deployments"("release_id", "environment_id", "attempt");

-- CreateIndex
CREATE INDEX "deployment_activities_deployment_id_created_at_idx" ON "deployment_activities"("deployment_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "deployment_activities_workspace_id_created_at_idx" ON "deployment_activities"("workspace_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "webhook_endpoints_workspace_id_enabled_idx" ON "webhook_endpoints"("workspace_id", "enabled");

-- CreateIndex
CREATE UNIQUE INDEX "webhook_endpoints_workspace_id_name_key" ON "webhook_endpoints"("workspace_id", "name");

-- CreateIndex
CREATE INDEX "webhook_events_workspace_id_type_occurred_at_idx" ON "webhook_events"("workspace_id", "type", "occurred_at" DESC);

-- CreateIndex
CREATE INDEX "webhook_events_resource_type_resource_id_idx" ON "webhook_events"("resource_type", "resource_id");

-- CreateIndex
CREATE INDEX "webhook_deliveries_status_next_attempt_at_idx" ON "webhook_deliveries"("status", "next_attempt_at");

-- CreateIndex
CREATE INDEX "webhook_deliveries_workspace_id_created_at_idx" ON "webhook_deliveries"("workspace_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "webhook_deliveries_endpoint_id_created_at_idx" ON "webhook_deliveries"("endpoint_id", "created_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "webhook_deliveries_endpoint_id_event_id_key" ON "webhook_deliveries"("endpoint_id", "event_id");

-- CreateIndex
CREATE INDEX "webhook_delivery_attempts_delivery_id_created_at_idx" ON "webhook_delivery_attempts"("delivery_id", "created_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "webhook_delivery_attempts_delivery_id_attempt_number_key" ON "webhook_delivery_attempts"("delivery_id", "attempt_number");

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

-- CreateIndex
CREATE UNIQUE INDEX "workspaces_slug_key" ON "workspaces"("slug");

-- CreateIndex
CREATE INDEX "workspaces_owner_id_idx" ON "workspaces"("owner_id");

-- CreateIndex
CREATE INDEX "workspaces_deleted_at_idx" ON "workspaces"("deleted_at");

-- CreateIndex
CREATE INDEX "workspace_members_user_id_idx" ON "workspace_members"("user_id");

-- CreateIndex
CREATE INDEX "workspace_members_workspace_id_role_idx" ON "workspace_members"("workspace_id", "role");

-- CreateIndex
CREATE UNIQUE INDEX "workspace_members_workspace_id_user_id_key" ON "workspace_members"("workspace_id", "user_id");

-- AddForeignKey
ALTER TABLE "analytics_hourly_aggregates" ADD CONSTRAINT "analytics_hourly_aggregates_website_id_fkey" FOREIGN KEY ("website_id") REFERENCES "websites"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "analytics_daily_aggregates" ADD CONSTRAINT "analytics_daily_aggregates_website_id_fkey" FOREIGN KEY ("website_id") REFERENCES "websites"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "analytics_visitors" ADD CONSTRAINT "analytics_visitors_website_id_fkey" FOREIGN KEY ("website_id") REFERENCES "websites"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "analytics_sessions" ADD CONSTRAINT "analytics_sessions_website_id_fkey" FOREIGN KEY ("website_id") REFERENCES "websites"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "analytics_sessions" ADD CONSTRAINT "analytics_sessions_visitor_id_fkey" FOREIGN KEY ("visitor_id") REFERENCES "analytics_visitors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "analytics_events" ADD CONSTRAINT "analytics_events_website_id_fkey" FOREIGN KEY ("website_id") REFERENCES "websites"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "analytics_events" ADD CONSTRAINT "analytics_events_visitor_id_fkey" FOREIGN KEY ("visitor_id") REFERENCES "analytics_visitors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "analytics_events" ADD CONSTRAINT "analytics_events_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "analytics_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "analytics_events" ADD CONSTRAINT "analytics_events_raw_event_id_fkey" FOREIGN KEY ("raw_event_id") REFERENCES "raw_analytics_events"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "analytics_page_views" ADD CONSTRAINT "analytics_page_views_website_id_fkey" FOREIGN KEY ("website_id") REFERENCES "websites"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "analytics_page_views" ADD CONSTRAINT "analytics_page_views_visitor_id_fkey" FOREIGN KEY ("visitor_id") REFERENCES "analytics_visitors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "analytics_page_views" ADD CONSTRAINT "analytics_page_views_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "analytics_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "analytics_page_views" ADD CONSTRAINT "analytics_page_views_analytics_event_id_fkey" FOREIGN KEY ("analytics_event_id") REFERENCES "analytics_events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "raw_analytics_events" ADD CONSTRAINT "raw_analytics_events_website_id_fkey" FOREIGN KEY ("website_id") REFERENCES "websites"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "analytics_processing_states" ADD CONSTRAINT "analytics_processing_states_website_id_fkey" FOREIGN KEY ("website_id") REFERENCES "websites"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "analytics_processing_runs" ADD CONSTRAINT "analytics_processing_runs_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "analytics_processing_runs" ADD CONSTRAINT "analytics_processing_runs_website_id_fkey" FOREIGN KEY ("website_id") REFERENCES "websites"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "analytics_processing_runs" ADD CONSTRAINT "analytics_processing_runs_initiated_by_user_id_fkey" FOREIGN KEY ("initiated_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "analytics_processing_dead_letters" ADD CONSTRAINT "analytics_processing_dead_letters_run_id_fkey" FOREIGN KEY ("run_id") REFERENCES "analytics_processing_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "analytics_processing_dead_letters" ADD CONSTRAINT "analytics_processing_dead_letters_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "analytics_processing_dead_letters" ADD CONSTRAINT "analytics_processing_dead_letters_website_id_fkey" FOREIGN KEY ("website_id") REFERENCES "websites"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "analytics_processing_dead_letters" ADD CONSTRAINT "analytics_processing_dead_letters_resolved_by_id_fkey" FOREIGN KEY ("resolved_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "application_activities" ADD CONSTRAINT "application_activities_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "application_activities" ADD CONSTRAINT "application_activities_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "saas_applications"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "application_activities" ADD CONSTRAINT "application_activities_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

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
ALTER TABLE "application_environments" ADD CONSTRAINT "application_environments_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "application_environments" ADD CONSTRAINT "application_environments_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "saas_applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saas_applications" ADD CONSTRAINT "saas_applications_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "application_technologies" ADD CONSTRAINT "application_technologies_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "saas_applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "application_links" ADD CONSTRAINT "application_links_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "saas_applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workspace_invitations" ADD CONSTRAINT "workspace_invitations_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workspace_invitations" ADD CONSTRAINT "workspace_invitations_invited_by_id_fkey" FOREIGN KEY ("invited_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workspace_invitations" ADD CONSTRAINT "workspace_invitations_accepted_by_id_fkey" FOREIGN KEY ("accepted_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "saas_applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "health_checks" ADD CONSTRAINT "health_checks_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "health_checks" ADD CONSTRAINT "health_checks_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "saas_applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "health_checks" ADD CONSTRAINT "health_checks_website_id_fkey" FOREIGN KEY ("website_id") REFERENCES "websites"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "health_checks" ADD CONSTRAINT "health_checks_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "health_checks" ADD CONSTRAINT "health_checks_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "health_check_history" ADD CONSTRAINT "health_check_history_health_check_id_fkey" FOREIGN KEY ("health_check_id") REFERENCES "health_checks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "health_incidents" ADD CONSTRAINT "health_incidents_health_check_id_fkey" FOREIGN KEY ("health_check_id") REFERENCES "health_checks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "health_incidents" ADD CONSTRAINT "health_incidents_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auth_sessions" ADD CONSTRAINT "auth_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auth_sessions" ADD CONSTRAINT "auth_sessions_parent_session_id_fkey" FOREIGN KEY ("parent_session_id") REFERENCES "auth_sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "releases" ADD CONSTRAINT "releases_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "releases" ADD CONSTRAINT "releases_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "saas_applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "releases" ADD CONSTRAINT "releases_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "releases" ADD CONSTRAINT "releases_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deployments" ADD CONSTRAINT "deployments_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deployments" ADD CONSTRAINT "deployments_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "saas_applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deployments" ADD CONSTRAINT "deployments_environment_id_fkey" FOREIGN KEY ("environment_id") REFERENCES "application_environments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deployments" ADD CONSTRAINT "deployments_release_id_fkey" FOREIGN KEY ("release_id") REFERENCES "releases"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deployments" ADD CONSTRAINT "deployments_deployed_by_id_fkey" FOREIGN KEY ("deployed_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deployments" ADD CONSTRAINT "deployments_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deployments" ADD CONSTRAINT "deployments_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deployments" ADD CONSTRAINT "deployments_rollback_to_deployment_id_fkey" FOREIGN KEY ("rollback_to_deployment_id") REFERENCES "deployments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deployments" ADD CONSTRAINT "deployments_health_incident_id_fkey" FOREIGN KEY ("health_incident_id") REFERENCES "health_incidents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deployment_activities" ADD CONSTRAINT "deployment_activities_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deployment_activities" ADD CONSTRAINT "deployment_activities_deployment_id_fkey" FOREIGN KEY ("deployment_id") REFERENCES "deployments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deployment_activities" ADD CONSTRAINT "deployment_activities_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "webhook_endpoints" ADD CONSTRAINT "webhook_endpoints_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "webhook_endpoints" ADD CONSTRAINT "webhook_endpoints_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "webhook_endpoints" ADD CONSTRAINT "webhook_endpoints_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "webhook_events" ADD CONSTRAINT "webhook_events_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "webhook_deliveries" ADD CONSTRAINT "webhook_deliveries_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "webhook_deliveries" ADD CONSTRAINT "webhook_deliveries_endpoint_id_fkey" FOREIGN KEY ("endpoint_id") REFERENCES "webhook_endpoints"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "webhook_deliveries" ADD CONSTRAINT "webhook_deliveries_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "webhook_events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "webhook_delivery_attempts" ADD CONSTRAINT "webhook_delivery_attempts_delivery_id_fkey" FOREIGN KEY ("delivery_id") REFERENCES "webhook_deliveries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "websites" ADD CONSTRAINT "websites_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "websites" ADD CONSTRAINT "websites_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "saas_applications"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workspaces" ADD CONSTRAINT "workspaces_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workspace_members" ADD CONSTRAINT "workspace_members_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workspace_members" ADD CONSTRAINT "workspace_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
