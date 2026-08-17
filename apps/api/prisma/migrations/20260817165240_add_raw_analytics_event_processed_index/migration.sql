-- CreateIndex
CREATE INDEX "raw_analytics_events_website_id_processed_at_occurred_at_idx" ON "raw_analytics_events"("website_id", "processed_at", "occurred_at");
