-- AlterTable
ALTER TABLE "raw_analytics_events" ADD COLUMN     "country_code" CHAR(2);

-- CreateIndex
CREATE INDEX "raw_analytics_events_website_id_country_code_occurred_at_idx" ON "raw_analytics_events"("website_id", "country_code", "occurred_at");
