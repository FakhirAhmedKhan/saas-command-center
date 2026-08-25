-- CreateEnum
CREATE TYPE "DesktopPlatform" AS ENUM ('WINDOWS', 'MACOS', 'LINUX', 'CROSS_PLATFORM');

-- CreateEnum
CREATE TYPE "DesktopFramework" AS ENUM ('ELECTRON', 'TAURI', 'DOTNET', 'QT', 'JAVA', 'NATIVE_WINDOWS', 'NATIVE_MACOS', 'OTHER');

-- CreateEnum
CREATE TYPE "DesktopArchitecture" AS ENUM ('X64', 'ARM64', 'X86', 'UNIVERSAL');

-- CreateEnum
CREATE TYPE "DesktopAnalysisAction" AS ENUM ('BUILD_FAILURE', 'CRASH_INCREASE', 'PERFORMANCE_REGRESSION', 'RELEASE_HEALTH', 'CUSTOM');

-- CreateEnum
CREATE TYPE "DesktopAnalysisConfidence" AS ENUM ('LIMITED', 'SUPPORTED');

-- CreateEnum
CREATE TYPE "DesktopAlertRuleType" AS ENUM ('BUILD_FAILED', 'CRASH_RATE', 'STARTUP', 'MEMORY', 'CPU', 'RELEASE_REGRESSION', 'SIGNING_FAILURE', 'TELEMETRY_UNAVAILABLE');

-- CreateEnum
CREATE TYPE "DesktopAlertOperator" AS ENUM ('GT', 'GTE');

-- CreateEnum
CREATE TYPE "DesktopAlertIncidentStatus" AS ENUM ('OPEN', 'RESOLVED');

-- CreateEnum
CREATE TYPE "DesktopBuildArtifactType" AS ENUM ('EXE', 'MSI', 'MSIX', 'DMG', 'PKG', 'APP', 'APPIMAGE', 'DEB', 'RPM', 'ZIP', 'OTHER');

-- CreateEnum
CREATE TYPE "DesktopBuildSource" AS ENUM ('GITHUB_ACTIONS');

-- CreateEnum
CREATE TYPE "DesktopBuildStatus" AS ENUM ('QUEUED', 'BUILDING', 'SUCCESS', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "DesktopReleaseChannel" AS ENUM ('DEV', 'ALPHA', 'BETA', 'STABLE', 'LTS');

-- CreateEnum
CREATE TYPE "DesktopReleaseStatus" AS ENUM ('DRAFT', 'READY', 'PUBLISHED', 'FAILED', 'ROLLED_BACK');

-- CreateEnum
CREATE TYPE "DesktopPerformanceMetricType" AS ENUM ('CRASH_FREE_USERS_PERCENT', 'CRASH_FREE_SESSIONS_PERCENT', 'STARTUP_MS', 'MEMORY_MB', 'CPU_PERCENT', 'HANG_RATE_PERCENT', 'NETWORK_LATENCY_MS', 'API_FAILURE_RATE_PERCENT', 'VERSION_ADOPTION_PERCENT');

-- CreateEnum
CREATE TYPE "DesktopDependencyEcosystem" AS ENUM ('NPM', 'CARGO', 'NUGET', 'MAVEN', 'GRADLE', 'CMAKE', 'CONAN', 'VCPKG', 'OTHER');

-- CreateEnum
CREATE TYPE "DesktopDependencyRiskStatus" AS ENUM ('CURRENT', 'UPDATE_AVAILABLE', 'VULNERABLE', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "DesktopSecuritySeverity" AS ENUM ('INFO', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "DesktopSecurityCheckType" AS ENUM ('WINDOWS_SIGNING', 'MACOS_SIGNING', 'MACOS_NOTARIZATION', 'PACKAGING_CONFIGURATION', 'DEPENDENCY_VULNERABILITY');

-- CreateEnum
CREATE TYPE "DesktopSecurityCheckStatus" AS ENUM ('PASS', 'WARN', 'FAIL', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "DesktopTelemetryProvider" AS ENUM ('SENTRY', 'DATADOG', 'NEW_RELIC', 'OPENTELEMETRY', 'CUSTOM');

-- CreateEnum
CREATE TYPE "DesktopTelemetryIntegrationStatus" AS ENUM ('CONNECTED', 'ERROR', 'DISCONNECTED');

-- CreateEnum
CREATE TYPE "DesktopTestType" AS ENUM ('UNIT', 'INTEGRATION', 'UI', 'E2E', 'INSTALLER', 'OTHER');

-- CreateEnum
CREATE TYPE "DesktopTestStatus" AS ENUM ('PENDING', 'RUNNING', 'PASSED', 'FAILED', 'SKIPPED', 'CANCELLED');

-- AlterEnum
ALTER TYPE "ApplicationType" ADD VALUE 'DESKTOP';

-- CreateTable
CREATE TABLE "desktop_ai_analyses" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "desktop_app_id" UUID NOT NULL,
    "created_by_user_id" UUID NOT NULL,
    "action" "DesktopAnalysisAction" NOT NULL,
    "question" TEXT,
    "answer" TEXT NOT NULL,
    "confidence" "DesktopAnalysisConfidence" NOT NULL,
    "evidence" JSONB NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "desktop_ai_analyses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "desktop_alert_rules" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "desktop_app_id" UUID NOT NULL,
    "name" VARCHAR(160) NOT NULL,
    "type" "DesktopAlertRuleType" NOT NULL,
    "operator" "DesktopAlertOperator" NOT NULL DEFAULT 'GT',
    "threshold" DOUBLE PRECISION,
    "cooldown_minutes" INTEGER NOT NULL DEFAULT 60,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "desktop_alert_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "desktop_alert_incidents" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "desktop_app_id" UUID NOT NULL,
    "rule_id" UUID NOT NULL,
    "status" "DesktopAlertIncidentStatus" NOT NULL DEFAULT 'OPEN',
    "title" VARCHAR(255) NOT NULL,
    "message" TEXT NOT NULL,
    "actual_value" DOUBLE PRECISION,
    "threshold" DOUBLE PRECISION,
    "version" VARCHAR(64),
    "build_id" UUID,
    "active_key" VARCHAR(255),
    "evidence" JSONB NOT NULL DEFAULT '{}',
    "triggered_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_triggered_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolved_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "desktop_alert_incidents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "desktop_applications" (
    "id" UUID NOT NULL,
    "application_id" UUID NOT NULL,
    "platform" "DesktopPlatform" NOT NULL,
    "framework" "DesktopFramework" NOT NULL,
    "architecture" "DesktopArchitecture" NOT NULL,
    "package_name" VARCHAR(255),
    "current_version" VARCHAR(64),
    "current_build_number" VARCHAR(64),
    "minimum_os_version" VARCHAR(64),
    "update_channel" VARCHAR(64),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "desktop_applications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "desktop_build_artifacts" (
    "id" UUID NOT NULL,
    "build_id" UUID NOT NULL,
    "provider_artifact_id" VARCHAR(255) NOT NULL,
    "platform" "DesktopPlatform" NOT NULL,
    "architecture" "DesktopArchitecture" NOT NULL,
    "type" "DesktopBuildArtifactType" NOT NULL,
    "file_name" VARCHAR(1024) NOT NULL,
    "size_bytes" BIGINT,
    "checksum" VARCHAR(255),
    "external_url" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "desktop_build_artifacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "desktop_builds" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "desktop_app_id" UUID NOT NULL,
    "repository_id" UUID NOT NULL,
    "workflow_run_id" VARCHAR(128) NOT NULL,
    "source" "DesktopBuildSource" NOT NULL DEFAULT 'GITHUB_ACTIONS',
    "commit_sha" VARCHAR(64) NOT NULL,
    "branch" VARCHAR(255) NOT NULL,
    "version" VARCHAR(64),
    "build_number" VARCHAR(64),
    "platform" "DesktopPlatform" NOT NULL,
    "architecture" "DesktopArchitecture" NOT NULL,
    "status" "DesktopBuildStatus" NOT NULL DEFAULT 'QUEUED',
    "started_at" TIMESTAMPTZ(6),
    "completed_at" TIMESTAMPTZ(6),
    "duration_ms" INTEGER,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "desktop_builds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "desktop_releases" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "desktop_app_id" UUID NOT NULL,
    "build_id" UUID NOT NULL,
    "version" VARCHAR(64) NOT NULL,
    "build_number" VARCHAR(64) NOT NULL,
    "channel" "DesktopReleaseChannel" NOT NULL,
    "platform" "DesktopPlatform" NOT NULL,
    "architecture" "DesktopArchitecture" NOT NULL,
    "status" "DesktopReleaseStatus" NOT NULL DEFAULT 'DRAFT',
    "release_notes" TEXT,
    "released_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "desktop_releases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "desktop_metrics" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "desktop_app_id" UUID NOT NULL,
    "telemetry_integration_id" UUID NOT NULL,
    "external_id" VARCHAR(255) NOT NULL,
    "type" "DesktopPerformanceMetricType" NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "unit" VARCHAR(32) NOT NULL,
    "version" VARCHAR(64),
    "platform" "DesktopPlatform",
    "architecture" "DesktopArchitecture",
    "channel" "DesktopReleaseChannel",
    "recorded_at" TIMESTAMPTZ(6) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "desktop_metrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "desktop_crashes" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "desktop_app_id" UUID NOT NULL,
    "telemetry_integration_id" UUID NOT NULL,
    "external_id" VARCHAR(255) NOT NULL,
    "fingerprint" VARCHAR(512) NOT NULL,
    "message" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 1,
    "affected_users" INTEGER NOT NULL DEFAULT 0,
    "version" VARCHAR(64),
    "platform" "DesktopPlatform",
    "architecture" "DesktopArchitecture",
    "channel" "DesktopReleaseChannel",
    "first_seen_at" TIMESTAMPTZ(6) NOT NULL,
    "last_seen_at" TIMESTAMPTZ(6) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "desktop_crashes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "desktop_dependencies" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "desktop_app_id" UUID NOT NULL,
    "ecosystem" "DesktopDependencyEcosystem" NOT NULL,
    "manifest_path" VARCHAR(1024) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "current_version" VARCHAR(255) NOT NULL,
    "latest_version" VARCHAR(255),
    "direct" BOOLEAN NOT NULL DEFAULT true,
    "risk_status" "DesktopDependencyRiskStatus" NOT NULL DEFAULT 'UNKNOWN',
    "severity" "DesktopSecuritySeverity",
    "advisory_ids" JSONB NOT NULL DEFAULT '[]',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "desktop_dependencies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "desktop_security_findings" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "desktop_app_id" UUID NOT NULL,
    "finding_key" VARCHAR(255) NOT NULL,
    "type" "DesktopSecurityCheckType" NOT NULL,
    "status" "DesktopSecurityCheckStatus" NOT NULL,
    "severity" "DesktopSecuritySeverity" NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "message" TEXT NOT NULL,
    "source_path" VARCHAR(1024),
    "evidence" JSONB NOT NULL DEFAULT '[]',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "desktop_security_findings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "desktop_telemetry_integrations" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "desktop_app_id" UUID NOT NULL,
    "provider" "DesktopTelemetryProvider" NOT NULL,
    "status" "DesktopTelemetryIntegrationStatus" NOT NULL DEFAULT 'CONNECTED',
    "external_project_id" VARCHAR(255) NOT NULL,
    "endpoint_url" VARCHAR(2048) NOT NULL,
    "secret_ciphertext" TEXT NOT NULL,
    "configured_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_synced_at" TIMESTAMPTZ(6),
    "last_error" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "desktop_telemetry_integrations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "desktop_test_runs" (
    "id" UUID NOT NULL,
    "build_id" UUID NOT NULL,
    "type" "DesktopTestType" NOT NULL,
    "status" "DesktopTestStatus" NOT NULL DEFAULT 'PENDING',
    "passed" INTEGER NOT NULL DEFAULT 0,
    "failed" INTEGER NOT NULL DEFAULT 0,
    "skipped" INTEGER NOT NULL DEFAULT 0,
    "total" INTEGER NOT NULL DEFAULT 0,
    "duration_ms" INTEGER,
    "started_at" TIMESTAMPTZ(6),
    "completed_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "desktop_test_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "desktop_test_failures" (
    "id" UUID NOT NULL,
    "test_run_id" UUID NOT NULL,
    "suite" VARCHAR(500),
    "test_name" VARCHAR(500),
    "message" TEXT,
    "file" VARCHAR(2048),
    "line" INTEGER,
    "stack_trace" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "desktop_test_failures_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "desktop_ai_analyses_workspace_id_desktop_app_id_created_at_idx" ON "desktop_ai_analyses"("workspace_id", "desktop_app_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "desktop_ai_analyses_created_by_user_id_created_at_idx" ON "desktop_ai_analyses"("created_by_user_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "desktop_alert_rules_workspace_id_desktop_app_id_idx" ON "desktop_alert_rules"("workspace_id", "desktop_app_id");

-- CreateIndex
CREATE INDEX "desktop_alert_rules_desktop_app_id_enabled_idx" ON "desktop_alert_rules"("desktop_app_id", "enabled");

-- CreateIndex
CREATE INDEX "desktop_alert_rules_desktop_app_id_type_idx" ON "desktop_alert_rules"("desktop_app_id", "type");

-- CreateIndex
CREATE UNIQUE INDEX "desktop_alert_incidents_active_key_key" ON "desktop_alert_incidents"("active_key");

-- CreateIndex
CREATE INDEX "desktop_alert_incidents_workspace_id_desktop_app_id_idx" ON "desktop_alert_incidents"("workspace_id", "desktop_app_id");

-- CreateIndex
CREATE INDEX "desktop_alert_incidents_desktop_app_id_status_triggered_at_idx" ON "desktop_alert_incidents"("desktop_app_id", "status", "triggered_at" DESC);

-- CreateIndex
CREATE INDEX "desktop_alert_incidents_rule_id_status_idx" ON "desktop_alert_incidents"("rule_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "desktop_applications_application_id_key" ON "desktop_applications"("application_id");

-- CreateIndex
CREATE INDEX "desktop_applications_platform_idx" ON "desktop_applications"("platform");

-- CreateIndex
CREATE INDEX "desktop_applications_framework_idx" ON "desktop_applications"("framework");

-- CreateIndex
CREATE INDEX "desktop_applications_architecture_idx" ON "desktop_applications"("architecture");

-- CreateIndex
CREATE INDEX "desktop_applications_platform_framework_idx" ON "desktop_applications"("platform", "framework");

-- CreateIndex
CREATE INDEX "desktop_build_artifacts_build_id_idx" ON "desktop_build_artifacts"("build_id");

-- CreateIndex
CREATE INDEX "desktop_build_artifacts_platform_architecture_idx" ON "desktop_build_artifacts"("platform", "architecture");

-- CreateIndex
CREATE INDEX "desktop_build_artifacts_type_idx" ON "desktop_build_artifacts"("type");

-- CreateIndex
CREATE UNIQUE INDEX "desktop_build_artifacts_build_id_provider_artifact_id_key" ON "desktop_build_artifacts"("build_id", "provider_artifact_id");

-- CreateIndex
CREATE INDEX "desktop_builds_workspace_id_desktop_app_id_idx" ON "desktop_builds"("workspace_id", "desktop_app_id");

-- CreateIndex
CREATE INDEX "desktop_builds_desktop_app_id_created_at_idx" ON "desktop_builds"("desktop_app_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "desktop_builds_repository_id_created_at_idx" ON "desktop_builds"("repository_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "desktop_builds_status_idx" ON "desktop_builds"("status");

-- CreateIndex
CREATE INDEX "desktop_builds_platform_architecture_idx" ON "desktop_builds"("platform", "architecture");

-- CreateIndex
CREATE UNIQUE INDEX "desktop_builds_repository_id_workflow_run_id_platform_archi_key" ON "desktop_builds"("repository_id", "workflow_run_id", "platform", "architecture");

-- CreateIndex
CREATE INDEX "desktop_releases_workspace_id_desktop_app_id_created_at_idx" ON "desktop_releases"("workspace_id", "desktop_app_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "desktop_releases_desktop_app_id_channel_created_at_idx" ON "desktop_releases"("desktop_app_id", "channel", "created_at" DESC);

-- CreateIndex
CREATE INDEX "desktop_releases_desktop_app_id_status_created_at_idx" ON "desktop_releases"("desktop_app_id", "status", "created_at" DESC);

-- CreateIndex
CREATE INDEX "desktop_releases_platform_architecture_idx" ON "desktop_releases"("platform", "architecture");

-- CreateIndex
CREATE UNIQUE INDEX "desktop_releases_build_id_channel_key" ON "desktop_releases"("build_id", "channel");

-- CreateIndex
CREATE INDEX "desktop_metrics_workspace_id_desktop_app_id_recorded_at_idx" ON "desktop_metrics"("workspace_id", "desktop_app_id", "recorded_at" DESC);

-- CreateIndex
CREATE INDEX "desktop_metrics_desktop_app_id_type_recorded_at_idx" ON "desktop_metrics"("desktop_app_id", "type", "recorded_at" DESC);

-- CreateIndex
CREATE INDEX "desktop_metrics_desktop_app_id_version_platform_architectur_idx" ON "desktop_metrics"("desktop_app_id", "version", "platform", "architecture");

-- CreateIndex
CREATE UNIQUE INDEX "desktop_metrics_telemetry_integration_id_external_id_key" ON "desktop_metrics"("telemetry_integration_id", "external_id");

-- CreateIndex
CREATE INDEX "desktop_crashes_workspace_id_desktop_app_id_last_seen_at_idx" ON "desktop_crashes"("workspace_id", "desktop_app_id", "last_seen_at" DESC);

-- CreateIndex
CREATE INDEX "desktop_crashes_desktop_app_id_version_platform_architectur_idx" ON "desktop_crashes"("desktop_app_id", "version", "platform", "architecture");

-- CreateIndex
CREATE INDEX "desktop_crashes_desktop_app_id_fingerprint_idx" ON "desktop_crashes"("desktop_app_id", "fingerprint");

-- CreateIndex
CREATE UNIQUE INDEX "desktop_crashes_telemetry_integration_id_external_id_key" ON "desktop_crashes"("telemetry_integration_id", "external_id");

-- CreateIndex
CREATE INDEX "desktop_dependencies_workspace_id_desktop_app_id_idx" ON "desktop_dependencies"("workspace_id", "desktop_app_id");

-- CreateIndex
CREATE INDEX "desktop_dependencies_desktop_app_id_risk_status_idx" ON "desktop_dependencies"("desktop_app_id", "risk_status");

-- CreateIndex
CREATE INDEX "desktop_dependencies_desktop_app_id_ecosystem_idx" ON "desktop_dependencies"("desktop_app_id", "ecosystem");

-- CreateIndex
CREATE UNIQUE INDEX "desktop_dependencies_desktop_app_id_manifest_path_name_key" ON "desktop_dependencies"("desktop_app_id", "manifest_path", "name");

-- CreateIndex
CREATE INDEX "desktop_security_findings_workspace_id_desktop_app_id_idx" ON "desktop_security_findings"("workspace_id", "desktop_app_id");

-- CreateIndex
CREATE INDEX "desktop_security_findings_desktop_app_id_status_severity_idx" ON "desktop_security_findings"("desktop_app_id", "status", "severity");

-- CreateIndex
CREATE INDEX "desktop_security_findings_desktop_app_id_type_idx" ON "desktop_security_findings"("desktop_app_id", "type");

-- CreateIndex
CREATE UNIQUE INDEX "desktop_security_findings_desktop_app_id_finding_key_key" ON "desktop_security_findings"("desktop_app_id", "finding_key");

-- CreateIndex
CREATE INDEX "desktop_telemetry_integrations_workspace_id_desktop_app_id_idx" ON "desktop_telemetry_integrations"("workspace_id", "desktop_app_id");

-- CreateIndex
CREATE INDEX "desktop_telemetry_integrations_desktop_app_id_status_idx" ON "desktop_telemetry_integrations"("desktop_app_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "desktop_telemetry_integrations_desktop_app_id_provider_key" ON "desktop_telemetry_integrations"("desktop_app_id", "provider");

-- CreateIndex
CREATE INDEX "desktop_test_runs_build_id_idx" ON "desktop_test_runs"("build_id");

-- CreateIndex
CREATE INDEX "desktop_test_runs_status_idx" ON "desktop_test_runs"("status");

-- CreateIndex
CREATE UNIQUE INDEX "desktop_test_runs_build_id_type_key" ON "desktop_test_runs"("build_id", "type");

-- CreateIndex
CREATE INDEX "desktop_test_failures_test_run_id_idx" ON "desktop_test_failures"("test_run_id");

-- AddForeignKey
ALTER TABLE "desktop_ai_analyses" ADD CONSTRAINT "desktop_ai_analyses_desktop_app_id_fkey" FOREIGN KEY ("desktop_app_id") REFERENCES "desktop_applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "desktop_alert_rules" ADD CONSTRAINT "desktop_alert_rules_desktop_app_id_fkey" FOREIGN KEY ("desktop_app_id") REFERENCES "desktop_applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "desktop_alert_incidents" ADD CONSTRAINT "desktop_alert_incidents_rule_id_fkey" FOREIGN KEY ("rule_id") REFERENCES "desktop_alert_rules"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "desktop_alert_incidents" ADD CONSTRAINT "desktop_alert_incidents_desktop_app_id_fkey" FOREIGN KEY ("desktop_app_id") REFERENCES "desktop_applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "desktop_applications" ADD CONSTRAINT "desktop_applications_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "saas_applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "desktop_build_artifacts" ADD CONSTRAINT "desktop_build_artifacts_build_id_fkey" FOREIGN KEY ("build_id") REFERENCES "desktop_builds"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "desktop_builds" ADD CONSTRAINT "desktop_builds_desktop_app_id_fkey" FOREIGN KEY ("desktop_app_id") REFERENCES "desktop_applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "desktop_builds" ADD CONSTRAINT "desktop_builds_repository_id_fkey" FOREIGN KEY ("repository_id") REFERENCES "repository_connections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "desktop_releases" ADD CONSTRAINT "desktop_releases_desktop_app_id_fkey" FOREIGN KEY ("desktop_app_id") REFERENCES "desktop_applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "desktop_releases" ADD CONSTRAINT "desktop_releases_build_id_fkey" FOREIGN KEY ("build_id") REFERENCES "desktop_builds"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "desktop_metrics" ADD CONSTRAINT "desktop_metrics_desktop_app_id_fkey" FOREIGN KEY ("desktop_app_id") REFERENCES "desktop_applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "desktop_metrics" ADD CONSTRAINT "desktop_metrics_telemetry_integration_id_fkey" FOREIGN KEY ("telemetry_integration_id") REFERENCES "desktop_telemetry_integrations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "desktop_crashes" ADD CONSTRAINT "desktop_crashes_desktop_app_id_fkey" FOREIGN KEY ("desktop_app_id") REFERENCES "desktop_applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "desktop_crashes" ADD CONSTRAINT "desktop_crashes_telemetry_integration_id_fkey" FOREIGN KEY ("telemetry_integration_id") REFERENCES "desktop_telemetry_integrations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "desktop_dependencies" ADD CONSTRAINT "desktop_dependencies_desktop_app_id_fkey" FOREIGN KEY ("desktop_app_id") REFERENCES "desktop_applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "desktop_security_findings" ADD CONSTRAINT "desktop_security_findings_desktop_app_id_fkey" FOREIGN KEY ("desktop_app_id") REFERENCES "desktop_applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "desktop_telemetry_integrations" ADD CONSTRAINT "desktop_telemetry_integrations_desktop_app_id_fkey" FOREIGN KEY ("desktop_app_id") REFERENCES "desktop_applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "desktop_test_runs" ADD CONSTRAINT "desktop_test_runs_build_id_fkey" FOREIGN KEY ("build_id") REFERENCES "desktop_builds"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "desktop_test_failures" ADD CONSTRAINT "desktop_test_failures_test_run_id_fkey" FOREIGN KEY ("test_run_id") REFERENCES "desktop_test_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

