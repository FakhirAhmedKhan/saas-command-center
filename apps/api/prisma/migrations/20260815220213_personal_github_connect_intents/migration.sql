-- CreateTable
CREATE TABLE "personal_github_connect_intents" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "install_state_hash" VARCHAR(64) NOT NULL,
    "oauth_state_hash" VARCHAR(64),
    "pkce_verifier" VARCHAR(128),
    "installation_id" VARCHAR(32),
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "consumed_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "personal_github_connect_intents_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "personal_github_connect_intents_install_state_hash_key" ON "personal_github_connect_intents"("install_state_hash");

-- CreateIndex
CREATE UNIQUE INDEX "personal_github_connect_intents_oauth_state_hash_key" ON "personal_github_connect_intents"("oauth_state_hash");

-- CreateIndex
CREATE INDEX "personal_github_connect_intents_user_id_idx" ON "personal_github_connect_intents"("user_id");

-- CreateIndex
CREATE INDEX "personal_github_connect_intents_expires_at_idx" ON "personal_github_connect_intents"("expires_at");

-- AddForeignKey
ALTER TABLE "personal_github_connect_intents" ADD CONSTRAINT "personal_github_connect_intents_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
