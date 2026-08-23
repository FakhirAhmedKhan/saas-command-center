-- CreateEnum
CREATE TYPE "MobileAnalysisAction" AS ENUM ('BUILD_FAILURE', 'PERFORMANCE_REGRESSION', 'RELEASE_HEALTH', 'CUSTOM');

-- CreateEnum
CREATE TYPE "MobileAnalysisConfidence" AS ENUM ('LIMITED', 'SUPPORTED');

-- CreateEnum
CREATE TYPE "MobileAlertRuleType" AS ENUM ('CRASH_RATE', 'ANR_HANG', 'STARTUP', 'API_FAILURE_RATE', 'BUILD_FAILED', 'RELEASE_REGRESSION');

-- CreateEnum
CREATE TYPE "MobileAlertOperator" AS ENUM ('GT', 'GTE');

-- CreateEnum
CREATE TYPE "MobileAlertIncidentStatus" AS ENUM ('OPEN', 'RESOLVED');

-- CreateEnum
CREATE TYPE "MobileBuildSource" AS ENUM ('GITHUB_ACTIONS');

-- CreateEnum
CREATE TYPE "MobileBuildStatus" AS ENUM ('QUEUED', 'BUILDING', 'SUCCESS', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "MobilePerformanceMetricType" AS ENUM ('CRASH_FREE_USERS_RATE', 'CRASH_RATE', 'CRASH_COUNT', 'ANR_COUNT', 'HANG_COUNT', 'COLD_STARTUP_MS', 'WARM_STARTUP_MS', 'MEMORY_MB', 'NETWORK_LATENCY_MS', 'API_FAILURE_RATE', 'VERSION_ADOPTION_RATE', 'SLOW_SCREEN_COUNT');

-- CreateEnum
CREATE TYPE "MobileReleaseEnvironment" AS ENUM ('DEVELOPMENT', 'QA', 'INTERNAL', 'BETA', 'PRODUCTION');

-- CreateEnum
CREATE TYPE "MobileReleaseStatus" AS ENUM ('DRAFT', 'READY', 'RELEASED', 'FAILED', 'ROLLED_BACK');

-- CreateEnum
CREATE TYPE "MobileTelemetryProvider" AS ENUM ('FIREBASE', 'SENTRY', 'DATADOG', 'NEW_RELIC', 'CUSTOM');

-- CreateEnum
CREATE TYPE "MobileTelemetryStatus" AS ENUM ('CONNECTED', 'ERROR', 'DISCONNECTED');

-- CreateEnum
CREATE TYPE "MobileTestType" AS ENUM ('UNIT', 'UI', 'INTEGRATION', 'INSTRUMENTATION', 'SNAPSHOT', 'OTHER');

-- CreateEnum
CREATE TYPE "MobileTestStatus" AS ENUM ('PENDING', 'RUNNING', 'PASSED', 'FAILED', 'SKIPPED', 'CANCELLED');

-- CreateTable
CREATE TABLE "mobile_ai_analyses" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "mobile_app_id" UUID NOT NULL,
    "created_by_user_id" UUID NOT NULL,
    "action" "MobileAnalysisAction" NOT NULL,
    "question" TEXT,
    "answer" TEXT NOT NULL,
    "confidence" "MobileAnalysisConfidence" NOT NULL,
    "evidence" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mobile_ai_analyses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mobile_alert_rules" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "mobile_app_id" UUID NOT NULL,
    "name" VARCHAR(160) NOT NULL,
    "type" "MobileAlertRuleType" NOT NULL,
    "operator" "MobileAlertOperator" NOT NULL DEFAULT 'GT',
    "threshold" DOUBLE PRECISION,
    "cooldown_minutes" INTEGER NOT NULL DEFAULT 60,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mobile_alert_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mobile_alert_incidents" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "mobile_app_id" UUID NOT NULL,
    "rule_id" UUID NOT NULL,
    "status" "MobileAlertIncidentStatus" NOT NULL DEFAULT 'OPEN',
    "title" VARCHAR(255) NOT NULL,
    "message" TEXT NOT NULL,
    "actual_value" DOUBLE PRECISION,
    "threshold" DOUBLE PRECISION,
    "version" VARCHAR(64),
    "build_id" UUID,
    "active_key" TEXT,
    "triggered_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolved_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mobile_alert_incidents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mobile_builds" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "mobile_app_id" UUID NOT NULL,
    "repository_id" UUID NOT NULL,
    "workflow_run_id" VARCHAR(128) NOT NULL,
    "source" "MobileBuildSource" NOT NULL DEFAULT 'GITHUB_ACTIONS',
    "commit_sha" VARCHAR(64) NOT NULL,
    "branch" VARCHAR(255) NOT NULL,
    "version" VARCHAR(64),
    "build_number" VARCHAR(64),
    "platform" "MobilePlatform" NOT NULL,
    "status" "MobileBuildStatus" NOT NULL DEFAULT 'QUEUED',
    "started_at" TIMESTAMPTZ(6),
    "completed_at" TIMESTAMPTZ(6),
    "duration_ms" INTEGER,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "mobile_builds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mobile_performance_metrics" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "mobile_app_id" UUID NOT NULL,
    "platform" "MobilePlatform" NOT NULL,
    "version" VARCHAR(64) NOT NULL,
    "build_number" VARCHAR(64),
    "period_start" TIMESTAMP(3),
    "period_end" TIMESTAMP(3),
    "collected_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metric" "MobilePerformanceMetricType" NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "mobile_performance_metrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mobile_releases" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "mobile_app_id" UUID NOT NULL,
    "build_id" UUID NOT NULL,
    "version" VARCHAR(64) NOT NULL,
    "build_number" VARCHAR(64) NOT NULL,
    "environment" "MobileReleaseEnvironment" NOT NULL,
    "status" "MobileReleaseStatus" NOT NULL DEFAULT 'DRAFT',
    "commit_sha" VARCHAR(64) NOT NULL,
    "release_notes" TEXT,
    "released_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mobile_releases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mobile_telemetry_integrations" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "mobile_app_id" UUID NOT NULL,
    "provider" "MobileTelemetryProvider" NOT NULL,
    "status" "MobileTelemetryStatus" NOT NULL DEFAULT 'CONNECTED',
    "external_project_id" VARCHAR(255) NOT NULL,
    "encrypted_config" TEXT,
    "configured_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_synced_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mobile_telemetry_integrations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mobile_test_runs" (
    "id" UUID NOT NULL,
    "build_id" UUID NOT NULL,
    "type" "MobileTestType" NOT NULL,
    "status" "MobileTestStatus" NOT NULL DEFAULT 'PENDING',
    "passed" INTEGER NOT NULL DEFAULT 0,
    "failed" INTEGER NOT NULL DEFAULT 0,
    "skipped" INTEGER NOT NULL DEFAULT 0,
    "total" INTEGER NOT NULL DEFAULT 0,
    "duration_ms" INTEGER,
    "started_at" TIMESTAMPTZ(6),
    "completed_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "mobile_test_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mobile_test_failures" (
    "id" UUID NOT NULL,
    "test_run_id" UUID NOT NULL,
    "suite" VARCHAR(500),
    "test_name" VARCHAR(500),
    "message" TEXT,
    "file" VARCHAR(2048),
    "line" INTEGER,
    "stack_trace" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mobile_test_failures_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "mobile_ai_analyses_workspace_id_mobile_app_id_idx" ON "mobile_ai_analyses"("workspace_id", "mobile_app_id");

-- CreateIndex
CREATE INDEX "mobile_ai_analyses_created_at_idx" ON "mobile_ai_analyses"("created_at");

-- CreateIndex
CREATE INDEX "mobile_alert_rules_workspace_id_mobile_app_id_idx" ON "mobile_alert_rules"("workspace_id", "mobile_app_id");

-- CreateIndex
CREATE INDEX "mobile_alert_rules_mobile_app_id_enabled_idx" ON "mobile_alert_rules"("mobile_app_id", "enabled");

-- CreateIndex
CREATE UNIQUE INDEX "mobile_alert_incidents_active_key_key" ON "mobile_alert_incidents"("active_key");

-- CreateIndex
CREATE INDEX "mobile_alert_incidents_workspace_id_mobile_app_id_idx" ON "mobile_alert_incidents"("workspace_id", "mobile_app_id");

-- CreateIndex
CREATE INDEX "mobile_alert_incidents_rule_id_status_idx" ON "mobile_alert_incidents"("rule_id", "status");

-- CreateIndex
CREATE INDEX "mobile_alert_incidents_triggered_at_idx" ON "mobile_alert_incidents"("triggered_at");

-- CreateIndex
CREATE INDEX "mobile_builds_workspace_id_mobile_app_id_idx" ON "mobile_builds"("workspace_id", "mobile_app_id");

-- CreateIndex
CREATE INDEX "mobile_builds_mobile_app_id_created_at_idx" ON "mobile_builds"("mobile_app_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "mobile_builds_repository_id_created_at_idx" ON "mobile_builds"("repository_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "mobile_builds_status_idx" ON "mobile_builds"("status");

-- CreateIndex
CREATE INDEX "mobile_builds_platform_idx" ON "mobile_builds"("platform");

-- CreateIndex
CREATE UNIQUE INDEX "mobile_builds_repository_id_workflow_run_id_key" ON "mobile_builds"("repository_id", "workflow_run_id");

-- CreateIndex
CREATE INDEX "mobile_performance_metrics_workspace_id_mobile_app_id_colle_idx" ON "mobile_performance_metrics"("workspace_id", "mobile_app_id", "collected_at");

-- CreateIndex
CREATE INDEX "mobile_performance_metrics_mobile_app_id_version_idx" ON "mobile_performance_metrics"("mobile_app_id", "version");

-- CreateIndex
CREATE INDEX "mobile_performance_metrics_mobile_app_id_metric_collected_a_idx" ON "mobile_performance_metrics"("mobile_app_id", "metric", "collected_at");

-- CreateIndex
CREATE INDEX "mobile_performance_metrics_platform_idx" ON "mobile_performance_metrics"("platform");

-- CreateIndex
CREATE INDEX "mobile_releases_workspace_id_mobile_app_id_idx" ON "mobile_releases"("workspace_id", "mobile_app_id");

-- CreateIndex
CREATE INDEX "mobile_releases_mobile_app_id_environment_idx" ON "mobile_releases"("mobile_app_id", "environment");

-- CreateIndex
CREATE INDEX "mobile_releases_mobile_app_id_status_idx" ON "mobile_releases"("mobile_app_id", "status");

-- CreateIndex
CREATE INDEX "mobile_releases_created_at_idx" ON "mobile_releases"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "mobile_releases_build_id_environment_key" ON "mobile_releases"("build_id", "environment");

-- CreateIndex
CREATE UNIQUE INDEX "mobile_telemetry_integrations_mobile_app_id_key" ON "mobile_telemetry_integrations"("mobile_app_id");

-- CreateIndex
CREATE INDEX "mobile_telemetry_integrations_workspace_id_idx" ON "mobile_telemetry_integrations"("workspace_id");

-- CreateIndex
CREATE INDEX "mobile_telemetry_integrations_workspace_id_status_idx" ON "mobile_telemetry_integrations"("workspace_id", "status");

-- CreateIndex
CREATE INDEX "mobile_telemetry_integrations_provider_idx" ON "mobile_telemetry_integrations"("provider");

-- CreateIndex
CREATE INDEX "mobile_test_runs_build_id_idx" ON "mobile_test_runs"("build_id");

-- CreateIndex
CREATE INDEX "mobile_test_runs_status_idx" ON "mobile_test_runs"("status");

-- CreateIndex
CREATE UNIQUE INDEX "mobile_test_runs_build_id_type_key" ON "mobile_test_runs"("build_id", "type");

-- CreateIndex
CREATE INDEX "mobile_test_failures_test_run_id_idx" ON "mobile_test_failures"("test_run_id");

-- AddForeignKey
ALTER TABLE "mobile_ai_analyses" ADD CONSTRAINT "mobile_ai_analyses_mobile_app_id_fkey" FOREIGN KEY ("mobile_app_id") REFERENCES "mobile_applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mobile_alert_rules" ADD CONSTRAINT "mobile_alert_rules_mobile_app_id_fkey" FOREIGN KEY ("mobile_app_id") REFERENCES "mobile_applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mobile_alert_incidents" ADD CONSTRAINT "mobile_alert_incidents_rule_id_fkey" FOREIGN KEY ("rule_id") REFERENCES "mobile_alert_rules"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mobile_builds" ADD CONSTRAINT "mobile_builds_mobile_app_id_fkey" FOREIGN KEY ("mobile_app_id") REFERENCES "mobile_applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mobile_builds" ADD CONSTRAINT "mobile_builds_repository_id_fkey" FOREIGN KEY ("repository_id") REFERENCES "repository_connections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mobile_performance_metrics" ADD CONSTRAINT "mobile_performance_metrics_mobile_app_id_fkey" FOREIGN KEY ("mobile_app_id") REFERENCES "mobile_applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mobile_releases" ADD CONSTRAINT "mobile_releases_mobile_app_id_fkey" FOREIGN KEY ("mobile_app_id") REFERENCES "mobile_applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mobile_releases" ADD CONSTRAINT "mobile_releases_build_id_fkey" FOREIGN KEY ("build_id") REFERENCES "mobile_builds"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mobile_telemetry_integrations" ADD CONSTRAINT "mobile_telemetry_integrations_mobile_app_id_fkey" FOREIGN KEY ("mobile_app_id") REFERENCES "mobile_applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mobile_test_runs" ADD CONSTRAINT "mobile_test_runs_build_id_fkey" FOREIGN KEY ("build_id") REFERENCES "mobile_builds"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mobile_test_failures" ADD CONSTRAINT "mobile_test_failures_test_run_id_fkey" FOREIGN KEY ("test_run_id") REFERENCES "mobile_test_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
