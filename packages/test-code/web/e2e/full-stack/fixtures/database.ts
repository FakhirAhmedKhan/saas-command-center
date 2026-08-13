import { Client } from 'pg';

/**
 * Connection to the isolated full-stack PostgreSQL instance (port 5435).
 *
 * Mirrors the `databaseUrl` in playwright.fullstack.config.ts. Kept here rather
 * than in the seeded state file because these helpers assert against the raw
 * ingestion tables, which the API never exposes over HTTP.
 */
const FULL_STACK_DATABASE_URL =
  process.env.FULLSTACK_DATABASE_URL ?? 'postgresql://command_center_full_e2e:command_center_full_e2e@127.0.0.1:5435/command_center_full_e2e?schema=public';

export type RawEventType = 'PAGE_VIEW' | 'HEARTBEAT' | 'CUSTOM';

export interface RawEventRow {
  type: RawEventType;
  eventId: string;
  visitorId: string;
  sessionId: string;
  pageUrl: string;
  eventName: string | null;
  durationMs: number | null;
  sdkVersion: string;
  origin: string;
}

async function withClient<T>(run: (client: Client) => Promise<T>): Promise<T> {
  const client = new Client({
    connectionString: FULL_STACK_DATABASE_URL,
  });

  await client.connect();

  try {
    return await run(client);
  } finally {
    await client.end();
  }
}

/**
 * Every raw ingestion row for a website, oldest first.
 *
 * Reads `raw_analytics_events` — the table the collector writes to — so the
 * assertion proves the browser payload reached PostgreSQL rather than merely
 * rendering in the UI.
 */
export async function readRawEvents(websiteId: string): Promise<RawEventRow[]> {
  return withClient(async (client) => {
    const result = await client.query<RawEventRow>(
      `SELECT type,
              event_id     AS "eventId",
              visitor_id   AS "visitorId",
              session_id   AS "sessionId",
              page_url     AS "pageUrl",
              event_name   AS "eventName",
              duration_ms  AS "durationMs",
              sdk_version  AS "sdkVersion",
              origin
         FROM raw_analytics_events
        WHERE website_id = $1
        ORDER BY received_at ASC`,
      [websiteId],
    );

    return result.rows;
  });
}

/** Raw ingestion row counts for a website, keyed by event type. */
export async function readRawEventCounts(websiteId: string): Promise<Record<string, number>> {
  const rows = await readRawEvents(websiteId);

  return rows.reduce<Record<string, number>>((counts, row) => {
    counts[row.type] = (counts[row.type] ?? 0) + 1;

    return counts;
  }, {});
}
