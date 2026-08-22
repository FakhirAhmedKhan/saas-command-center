-- CreateEnum
CREATE TYPE "ApplicationType" AS ENUM ('WEB', 'API', 'MOBILE', 'WORKER', 'OTHER');

-- CreateEnum
CREATE TYPE "MobilePlatform" AS ENUM ('ANDROID', 'IOS', 'CROSS_PLATFORM');

-- CreateEnum
CREATE TYPE "MobileFramework" AS ENUM ('ANDROID_NATIVE', 'IOS_NATIVE', 'FLUTTER', 'REACT_NATIVE', 'KMP', 'OTHER');

-- AlterTable
ALTER TABLE "saas_applications" ADD COLUMN     "type" "ApplicationType" NOT NULL DEFAULT 'OTHER';

-- CreateTable
CREATE TABLE "mobile_applications" (
    "id" UUID NOT NULL,
    "application_id" UUID NOT NULL,
    "platform" "MobilePlatform" NOT NULL,
    "framework" "MobileFramework" NOT NULL,
    "package_id" VARCHAR(255),
    "bundle_id" VARCHAR(255),
    "min_os_version" VARCHAR(64),
    "target_os_version" VARCHAR(64),
    "current_version" VARCHAR(64),
    "current_build_number" VARCHAR(64),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mobile_applications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "mobile_applications_application_id_key" ON "mobile_applications"("application_id");

-- CreateIndex
CREATE INDEX "mobile_applications_platform_idx" ON "mobile_applications"("platform");

-- CreateIndex
CREATE INDEX "mobile_applications_framework_idx" ON "mobile_applications"("framework");

-- CreateIndex
CREATE INDEX "saas_applications_workspace_id_type_idx" ON "saas_applications"("workspace_id", "type");

-- AddForeignKey
ALTER TABLE "mobile_applications" ADD CONSTRAINT "mobile_applications_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "saas_applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;
