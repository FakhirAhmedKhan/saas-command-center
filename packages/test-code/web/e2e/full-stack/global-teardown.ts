import { fullStackStateDirectory, fullStackStatePath, readFullStackState, type FullStackState } from './fixtures/state';
import { existsSync, rmSync } from 'node:fs';
import { Client } from 'pg';

/**
 * Mirrors fixtures/database.ts's connection string -- this runs outside the
 * Playwright test context (plain Node), so it can't reuse that helper's
 * request-scoped client pool.
 */
const FULL_STACK_DATABASE_URL = process.env.FULLSTACK_DATABASE_URL ?? 'postgresql://command_center_full_e2e:command_center_full_e2e@127.0.0.1:5435/command_center_full_e2e?schema=public';

/**
 * Deletes only the records this run's global-setup created (identified by
 * `state.runId`, embedded in every seeded email/slug/domain), never a broad
 * reset of the dedicated full-stack database. Tolerates a state file that
 * doesn't exist (setup never ran or failed before writing it) and tolerates
 * rows that are already gone (a test may have deleted/renamed them) so the
 * teardown is safe to run after a partial or failed setup, and safe to run
 * more than once.
 */
async function globalTeardown(): Promise<void> {
  if (!existsSync(fullStackStatePath())) {
    return;
  }

  let state: FullStackState;

  try {
    state = readFullStackState();
  } catch (error) {
    console.warn(`[full-stack teardown] Could not read seed state, skipping DB cleanup: ${String(error)}`);

    return;
  }

  const client = new Client({
    connectionString: FULL_STACK_DATABASE_URL,
  });

  try {
    await client.connect();

    // Every seeded/test user contains this runId in its email. Remove every
    // workspace owned by those users first because Workspace.ownerId uses
    // ON DELETE RESTRICT. Workspace dependants cascade from there.
    const runEmailPattern = `%${state.runId}%`;

    await client.query(
      `DELETE FROM workspaces
       WHERE owner_id IN (
         SELECT id
         FROM users
         WHERE email LIKE $1
       )`,
      [runEmailPattern],
    );

    await client.query('DELETE FROM users WHERE email LIKE $1', [runEmailPattern]);

    console.log(`[full-stack teardown] Removed seed data for run ${state.runId}`);
  } catch (error) {
    console.warn(`[full-stack teardown] Cleanup did not fully complete for run ${state.runId}: ${String(error)}`);
  } finally {
    await client.end();
  }

  try {
    rmSync(fullStackStateDirectory(), {
      recursive: true,
      force: true,
    });
  } catch (error) {
    console.warn(`[full-stack teardown] Could not remove state directory: ${String(error)}`);
  }
}

export default globalTeardown;
