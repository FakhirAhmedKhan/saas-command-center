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

-- AddForeignKey
ALTER TABLE "saas_applications" ADD CONSTRAINT "saas_applications_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "application_technologies" ADD CONSTRAINT "application_technologies_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "saas_applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "application_links" ADD CONSTRAINT "application_links_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "saas_applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;
