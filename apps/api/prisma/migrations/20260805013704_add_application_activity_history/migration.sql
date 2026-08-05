-- CreateEnum
CREATE TYPE "ActivityActorType" AS ENUM ('USER', 'SYSTEM');

-- CreateEnum
CREATE TYPE "ActivityEntityType" AS ENUM ('APPLICATION', 'TECHNOLOGY', 'LINK');

-- CreateEnum
CREATE TYPE "ApplicationActivityType" AS ENUM ('APPLICATION_CREATED', 'APPLICATION_UPDATED', 'APPLICATION_STATUS_CHANGED', 'APPLICATION_PRIORITY_CHANGED', 'APPLICATION_ARCHIVED', 'APPLICATION_RESTORED', 'APPLICATION_DELETED', 'TECHNOLOGY_ADDED', 'TECHNOLOGY_UPDATED', 'TECHNOLOGY_REMOVED', 'LINK_ADDED', 'LINK_UPDATED', 'LINK_REMOVED');

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

-- AddForeignKey
ALTER TABLE "application_activities" ADD CONSTRAINT "application_activities_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "application_activities" ADD CONSTRAINT "application_activities_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "saas_applications"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "application_activities" ADD CONSTRAINT "application_activities_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
