-- CreateEnum
CREATE TYPE "RepositoryProvider" AS ENUM ('GITHUB');

-- CreateTable
CREATE TABLE "repository_connect_intents" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "install_state_hash" VARCHAR(64) NOT NULL,
    "oauth_state_hash" VARCHAR(64),
    "pkce_verifier" VARCHAR(128),
    "installation_id" VARCHAR(32),
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "consumed_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "repository_connect_intents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "repository_installations" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "provider" "RepositoryProvider" NOT NULL DEFAULT 'GITHUB',
    "external_installation_id" VARCHAR(32) NOT NULL,
    "account_login" VARCHAR(255) NOT NULL,
    "account_type" VARCHAR(64) NOT NULL,
    "connected_by_id" UUID,
    "connected_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_synced_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "repository_installations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "repository_connections" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "installation_id" UUID NOT NULL,
    "application_id" UUID,
    "provider" "RepositoryProvider" NOT NULL DEFAULT 'GITHUB',
    "external_repo_id" VARCHAR(32) NOT NULL,
    "owner" VARCHAR(255) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "full_name" VARCHAR(512) NOT NULL,
    "default_branch" VARCHAR(255) NOT NULL,
    "is_private" BOOLEAN NOT NULL,
    "html_url" VARCHAR(2048) NOT NULL,
    "archived" BOOLEAN NOT NULL DEFAULT false,
    "is_available" BOOLEAN NOT NULL DEFAULT true,
    "last_synced_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "repository_connections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "repository_webhook_deliveries" (
    "id" UUID NOT NULL,
    "delivery_id" VARCHAR(100) NOT NULL,
    "event" VARCHAR(100) NOT NULL,
    "action" VARCHAR(100),
    "external_installation_id" VARCHAR(32),
    "external_repo_id" VARCHAR(32),
    "processed_at" TIMESTAMPTZ(6),
    "error_message" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "repository_webhook_deliveries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "repository_connect_intents_install_state_hash_key" ON "repository_connect_intents"("install_state_hash");

-- CreateIndex
CREATE UNIQUE INDEX "repository_connect_intents_oauth_state_hash_key" ON "repository_connect_intents"("oauth_state_hash");

-- CreateIndex
CREATE INDEX "repository_connect_intents_workspace_id_user_id_idx" ON "repository_connect_intents"("workspace_id", "user_id");

-- CreateIndex
CREATE INDEX "repository_connect_intents_expires_at_idx" ON "repository_connect_intents"("expires_at");

-- CreateIndex
CREATE INDEX "repository_installations_external_installation_id_idx" ON "repository_installations"("external_installation_id");

-- CreateIndex
CREATE INDEX "repository_installations_workspace_id_provider_idx" ON "repository_installations"("workspace_id", "provider");

-- CreateIndex
CREATE UNIQUE INDEX "repository_installations_workspace_id_provider_external_ins_key" ON "repository_installations"("workspace_id", "provider", "external_installation_id");

-- CreateIndex
CREATE INDEX "repository_connections_workspace_id_is_available_idx" ON "repository_connections"("workspace_id", "is_available");

-- CreateIndex
CREATE INDEX "repository_connections_installation_id_idx" ON "repository_connections"("installation_id");

-- CreateIndex
CREATE INDEX "repository_connections_workspace_id_application_id_idx" ON "repository_connections"("workspace_id", "application_id");

-- CreateIndex
CREATE UNIQUE INDEX "repository_connections_workspace_id_provider_external_repo__key" ON "repository_connections"("workspace_id", "provider", "external_repo_id");

-- CreateIndex
CREATE UNIQUE INDEX "repository_webhook_deliveries_delivery_id_key" ON "repository_webhook_deliveries"("delivery_id");

-- CreateIndex
CREATE INDEX "repository_webhook_deliveries_external_installation_id_idx" ON "repository_webhook_deliveries"("external_installation_id");

-- CreateIndex
CREATE INDEX "repository_webhook_deliveries_external_repo_id_idx" ON "repository_webhook_deliveries"("external_repo_id");

-- CreateIndex
CREATE INDEX "repository_webhook_deliveries_created_at_idx" ON "repository_webhook_deliveries"("created_at" DESC);

-- AddForeignKey
ALTER TABLE "repository_connect_intents" ADD CONSTRAINT "repository_connect_intents_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "repository_installations" ADD CONSTRAINT "repository_installations_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "repository_connections" ADD CONSTRAINT "repository_connections_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "repository_connections" ADD CONSTRAINT "repository_connections_installation_id_fkey" FOREIGN KEY ("installation_id") REFERENCES "repository_installations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "repository_connections" ADD CONSTRAINT "repository_connections_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "saas_applications"("id") ON DELETE SET NULL ON UPDATE CASCADE;

