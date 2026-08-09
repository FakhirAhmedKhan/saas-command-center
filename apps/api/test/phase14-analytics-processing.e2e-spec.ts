import type { INestApplication } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import request, { type Response } from 'supertest';

import { PrismaService } from '../src/database/prisma.service';
import { AnalyticsProcessingStatus, AnalyticsProcessingTrigger, RawAnalyticsEventType, WorkspaceRole } from '../src/generated/prisma/enums';
import { AnalyticsProcessingWorkerService } from '../src/modules/analytics-processing/services/analytics-processing-worker.service';
import { createAgent, createTestUser, registerUser, withBearer } from './helpers/auth';
import { createTestApp } from './helpers/create-test-app';
import { resetDatabase } from './helpers/database';
import { readAccessToken } from './helpers/response';

/**
 * Phase 14 — Analytics Processing E2E
 *
 * Real routes (apps/api/src/modules/analytics-processing/controllers/analytics-processing.controller.ts):
 *   GET  /api/v1/workspaces/:workspaceId/websites/:websiteId/analytics/processing/status
 *   POST /api/v1/workspaces/:workspaceId/websites/:websiteId/analytics/processing/reprocess
 *   POST /api/v1/workspaces/:workspaceId/websites/:websiteId/analytics/processing/runs/:runId/retry
 *
 * Guards: JwtAuthGuard + WorkspaceAccessGuard (class-level). No WorkspaceRolesGuard — role
 * enforcement for reprocess/retry is done in-service via
 * AnalyticsProcessingAccessService.assertCanReprocess/assertCanRetry, which requires
 * OWNER or ADMIN (apps/api/src/modules/analytics-processing/services/analytics-processing-access.service.ts).
 * `status` (GET) has NO role check beyond workspace membership, so VIEWER can read it.
 *
 * reprocess body (ReprocessAnalyticsDto): { from: ISO-8601 datetime, to: ISO-8601 datetime }
 * (@IsDateString, NOT the YYYY-MM-DD date-key format used by the reports module).
 * Range validated by AnalyticsProcessingQueueService.validateRange: to must be > from, and
 * (to - from) must not exceed ANALYTICS_REPROCESS_MAX_DAYS (default 31, env.validation.ts:361).
 *
 * Queueing is idempotent: AnalyticsProcessingQueueService.queue() derives `activeKey` as
 * sha256(`analytics-processing:${websiteId}:${from.toISOString()}:${to.toISOString()}`) and
 * relies on the DB @unique constraint on AnalyticsProcessingRun.activeKey; a P2002 conflict
 * returns the pre-existing run instead of creating a duplicate.
 *
 * KNOWN, CONFIRMED PRODUCTION DEFECT (documented here rather than silently worked around):
 * AnalyticsRangeProcessorService.processRange (analytics-range-processor.service.ts) calls, in
 * order: RawEventProcessingService.processRange (real), then
 * VisitorRebuilderService.rebuildRange, SessionRebuilderService.rebuildRange,
 * PageViewRebuilderService.rebuildRange, AnalyticsAggregationService.rebuildRange — all four of
 * which are unimplemented stubs that unconditionally `throw new Error('Method not implemented.')`
 * (confirmed by direct source read). Therefore ANY run that reaches AnalyticsProcessingWorkerService
 * processing will deterministically fail at the visitors.rebuildRange step on every attempt, and
 * after exhausting `maxRetries` (default 3) will land in DEAD_LETTERED with a corresponding
 * AnalyticsProcessingDeadLetter row. The tests below assert this REAL, current behavior — they do
 * not assert that reprocessing "succeeds", because it does not. This is intentional: weakening
 * these assertions to a passing status would hide a Critical production bug. See the retry-related
 * tests further down for the resulting availability impact.
 *
 * A second known gap: ScheduleModule.forRoot() is not registered anywhere in AppModule, so the
 * worker's @Interval(5_000) tick() never fires automatically in the running application (and
 * would not fire during this Jest process either). To exercise the worker deterministically and
 * synchronously in this suite (instead of asserting on a timer that will never elapse), tests
 * resolve the real AnalyticsProcessingWorkerService from the Nest DI container and invoke its
 * public tick() method directly. This is not a mock — it runs the exact same production code path
 * (claim -> advisory lock -> processRange -> success/failure handling) against the real test
 * database; it merely replaces "wait 5 real seconds for a timer that is never armed" with a direct
 * call to the same public method the timer would have called.
 */

const API_PREFIX = '/api/v1';

function requireValue<T>(value: T | null | undefined, message: string): T {
  if (value === null || value === undefined) {
    throw new Error(message);
  }

  return value;
}

type JsonRecord = Record<string, unknown>;

function body(response: Response): JsonRecord {
  return response.body as JsonRecord;
}

describe('Phase 14 Analytics Processing E2E', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let worker: AnalyticsProcessingWorkerService;

  let workspaceId: string;
  let websiteId: string;
  let otherWorkspaceWebsiteId: string;

  let ownerAccessToken: string;
  let viewerAccessToken: string;
  let developerAccessToken: string;
  let outsiderAccessToken: string;

  function statusUrl(currentWebsiteId = websiteId): string {
    return `${API_PREFIX}/workspaces/${workspaceId}/websites/${currentWebsiteId}/analytics/processing/status`;
  }

  function reprocessUrl(currentWebsiteId = websiteId): string {
    return `${API_PREFIX}/workspaces/${workspaceId}/websites/${currentWebsiteId}/analytics/processing/reprocess`;
  }

  function retryUrl(runId: string): string {
    return `${API_PREFIX}/workspaces/${workspaceId}/websites/${websiteId}/analytics/processing/runs/${runId}/retry`;
  }

  async function seedPendingRawEvent(targetWebsiteId: string, occurredAt: Date, eventId: string): Promise<void> {
    await prisma.rawAnalyticsEvent.create({
      data: {
        websiteId: targetWebsiteId,
        eventId,
        type: RawAnalyticsEventType.PAGE_VIEW,
        visitorId: `phase14-visitor-${eventId}`,
        sessionId: `phase14-session-${eventId}`,
        occurredAt,
        receivedAt: occurredAt,
        pageUrl: 'https://phase14.example.test/',
        pagePath: '/',
        pageTitle: 'Home',
        referrerUrl: null,
        eventName: null,
        properties: null,
        screenWidth: 1920,
        screenHeight: 1080,
        viewportWidth: 1440,
        viewportHeight: 900,
        language: 'en',
        clientTimeZone: 'UTC',
        durationMs: null,
        origin: 'https://phase14.example.test',
        userAgent: 'Phase14-E2E',
        ipHash: 'b'.repeat(64),
        sdkVersion: '1.0.0-e2e',
        processedAt: null,
      },
    });
  }

  beforeAll(async () => {
    app = await createTestApp();

    prisma = app.get(PrismaService);
    worker = app.get(AnalyticsProcessingWorkerService);

    await resetDatabase(prisma);

    const owner = createTestUser({
      name: 'Phase 14 Owner',
      workspaceName: 'Phase 14 Workspace',
    });

    const ownerRegistration = await registerUser(createAgent(app), owner);

    expect(ownerRegistration.status).toBe(201);

    ownerAccessToken = readAccessToken(ownerRegistration);

    const ownerRecord = await prisma.user.findUnique({
      where: { email: owner.email.toLowerCase() },
      select: { id: true },
    });

    const ownerId = requireValue(ownerRecord?.id, 'Phase 14 owner was not persisted');

    const ownerMembership = await prisma.workspaceMember.findFirst({
      where: { userId: ownerId, role: WorkspaceRole.OWNER },
      select: { workspaceId: true },
    });

    workspaceId = requireValue(ownerMembership?.workspaceId, 'Phase 14 owner workspace was not found');

    const viewer = createTestUser({
      name: 'Phase 14 Viewer',
      workspaceName: 'Phase 14 Viewer Workspace',
    });

    const viewerRegistration = await registerUser(createAgent(app), viewer);

    expect(viewerRegistration.status).toBe(201);

    viewerAccessToken = readAccessToken(viewerRegistration);

    const viewerRecord = await prisma.user.findUnique({
      where: { email: viewer.email.toLowerCase() },
      select: { id: true },
    });

    await prisma.workspaceMember.create({
      data: {
        workspaceId,
        userId: requireValue(viewerRecord?.id, 'Phase 14 viewer was not persisted'),
        role: WorkspaceRole.VIEWER,
      },
    });

    const developer = createTestUser({
      name: 'Phase 14 Developer',
      workspaceName: 'Phase 14 Developer Workspace',
    });

    const developerRegistration = await registerUser(createAgent(app), developer);

    expect(developerRegistration.status).toBe(201);

    developerAccessToken = readAccessToken(developerRegistration);

    const developerRecord = await prisma.user.findUnique({
      where: { email: developer.email.toLowerCase() },
      select: { id: true },
    });

    await prisma.workspaceMember.create({
      data: {
        workspaceId,
        userId: requireValue(developerRecord?.id, 'Phase 14 developer was not persisted'),
        role: WorkspaceRole.DEVELOPER,
      },
    });

    const outsider = createTestUser({
      name: 'Phase 14 Outsider',
      workspaceName: 'Phase 14 Outsider Workspace',
    });

    const outsiderRegistration = await registerUser(createAgent(app), outsider);

    expect(outsiderRegistration.status).toBe(201);

    outsiderAccessToken = readAccessToken(outsiderRegistration);

    const outsiderRecord = await prisma.user.findUnique({
      where: { email: outsider.email.toLowerCase() },
      select: { id: true },
    });

    const outsiderMembership = await prisma.workspaceMember.findFirst({
      where: {
        userId: requireValue(outsiderRecord?.id, 'Phase 14 outsider was not persisted'),
        role: WorkspaceRole.OWNER,
      },
      select: { workspaceId: true },
    });

    const outsiderWorkspaceId = requireValue(outsiderMembership?.workspaceId, 'Phase 14 outsider workspace was not found');

    const website = await prisma.website.create({
      data: {
        workspaceId,
        applicationId: null,
        name: 'Phase 14 Analytics Website',
        domain: 'phase14.example.test',
        timeZone: 'UTC',
        enabled: true,
        allowedOrigins: ['https://phase14.example.test'],
        trackingKeyPrefix: 'phase14prefix',
        trackingKeyHash: 'c'.repeat(64),
      },
      select: { id: true },
    });

    websiteId = website.id;

    const otherWebsite = await prisma.website.create({
      data: {
        workspaceId: outsiderWorkspaceId,
        applicationId: null,
        name: 'Phase 14 Outsider Website',
        domain: 'phase14-outsider.example.test',
        timeZone: 'UTC',
        enabled: true,
        allowedOrigins: ['https://phase14-outsider.example.test'],
        trackingKeyPrefix: 'phase14outprefix',
        trackingKeyHash: 'd'.repeat(64),
      },
      select: { id: true },
    });

    otherWorkspaceWebsiteId = otherWebsite.id;
  });

  afterAll(async () => {
    await app.close();
  });

  // ---------------------------------------------------------------------------------------
  // A. Authorization
  // ---------------------------------------------------------------------------------------

  it('rejects anonymous access to the status endpoint', async () => {
    const response = await request(app.getHttpServer()).get(statusUrl());

    expect(response.status).toBe(401);
  });

  it('allows a VIEWER to read processing status (no role restriction on GET status)', async () => {
    const response = await request(app.getHttpServer()).get(statusUrl()).set(withBearer(viewerAccessToken));

    expect(response.status).toBe(200);
  });

  it('blocks an outsider from reading another workspace processing status', async () => {
    const response = await request(app.getHttpServer()).get(statusUrl()).set(withBearer(outsiderAccessToken));

    expect(response.status).toBe(403);
  });

  it('rejects a VIEWER triggering manual reprocessing (requires OWNER or ADMIN)', async () => {
    const response = await request(app.getHttpServer())
      .post(reprocessUrl())
      .set(withBearer(viewerAccessToken))
      .send({ from: '2026-08-01T00:00:00.000Z', to: '2026-08-02T00:00:00.000Z' });

    expect(response.status).toBe(403);
  });

  it('rejects a DEVELOPER triggering manual reprocessing (requires OWNER or ADMIN)', async () => {
    const response = await request(app.getHttpServer())
      .post(reprocessUrl())
      .set(withBearer(developerAccessToken))
      .send({ from: '2026-08-01T00:00:00.000Z', to: '2026-08-02T00:00:00.000Z' });

    expect(response.status).toBe(403);
  });

  it('rejects an outsider triggering manual reprocessing on a foreign website', async () => {
    const response = await request(app.getHttpServer())
      .post(reprocessUrl())
      .set(withBearer(outsiderAccessToken))
      .send({ from: '2026-08-01T00:00:00.000Z', to: '2026-08-02T00:00:00.000Z' });

    expect(response.status).toBe(403);
  });

  // ---------------------------------------------------------------------------------------
  // B. Processing status
  // ---------------------------------------------------------------------------------------

  it('reports zero pending events, zero dead letters, and no runs for a fresh website', async () => {
    const response = await request(app.getHttpServer()).get(statusUrl()).set(withBearer(ownerAccessToken));

    expect(response.status).toBe(200);

    expect(body(response)).toMatchObject({
      canReprocess: true,
      pendingEvents: 0,
      unresolvedDeadLetters: 0,
      activeRun: null,
      latestRun: null,
      lastSuccessfulRun: null,
      recentRuns: [],
    });
  });

  it('reports canReprocess=false for a VIEWER', async () => {
    const response = await request(app.getHttpServer()).get(statusUrl()).set(withBearer(viewerAccessToken));

    expect(response.status).toBe(200);
    expect(body(response).canReprocess).toBe(false);
  });

  it('counts pending (unprocessed) raw events for the requested website', async () => {
    await seedPendingRawEvent(websiteId, new Date('2026-08-05T10:00:00.000Z'), 'phase14-pending-1');
    await seedPendingRawEvent(websiteId, new Date('2026-08-05T11:00:00.000Z'), 'phase14-pending-2');

    // A pending event on a different (outsider) website must never be counted here.
    await seedPendingRawEvent(otherWorkspaceWebsiteId, new Date('2026-08-05T11:00:00.000Z'), 'phase14-pending-foreign');

    const response = await request(app.getHttpServer()).get(statusUrl()).set(withBearer(ownerAccessToken));

    expect(response.status).toBe(200);
    expect(body(response).pendingEvents).toBe(2);
  });

  it('returns 404 for a nonexistent website', async () => {
    const response = await request(app.getHttpServer()).get(statusUrl(randomUUID())).set(withBearer(ownerAccessToken));

    expect(response.status).toBe(404);
  });

  // ---------------------------------------------------------------------------------------
  // C. Processing execution (manual trigger) — validation
  // ---------------------------------------------------------------------------------------

  it('rejects a reprocess request where to <= from', async () => {
    const response = await request(app.getHttpServer())
      .post(reprocessUrl())
      .set(withBearer(ownerAccessToken))
      .send({ from: '2026-08-05T00:00:00.000Z', to: '2026-08-05T00:00:00.000Z' });

    expect(response.status).toBe(400);
  });

  it('rejects a reprocess request exceeding the maximum of 31 days', async () => {
    const response = await request(app.getHttpServer())
      .post(reprocessUrl())
      .set(withBearer(ownerAccessToken))
      .send({ from: '2026-01-01T00:00:00.000Z', to: '2026-03-01T00:00:00.000Z' });

    expect(response.status).toBe(400);
  });

  it('rejects a reprocess request with a malformed date', async () => {
    const response = await request(app.getHttpServer())
      .post(reprocessUrl())
      .set(withBearer(ownerAccessToken))
      .send({ from: 'not-a-date', to: '2026-08-02T00:00:00.000Z' });

    expect(response.status).toBe(400);
  });

  it('rejects a reprocess request missing required fields', async () => {
    const response = await request(app.getHttpServer()).post(reprocessUrl()).set(withBearer(ownerAccessToken)).send({});

    expect(response.status).toBe(400);
  });

  // ---------------------------------------------------------------------------------------
  // C (cont). Processing execution — valid trigger creates a real, persisted run
  // ---------------------------------------------------------------------------------------

  it('queues a manual processing run and persists it with QUEUED status', async () => {
    const from = '2026-08-10T00:00:00.000Z';
    const to = '2026-08-11T00:00:00.000Z';

    const response = await request(app.getHttpServer()).post(reprocessUrl()).set(withBearer(ownerAccessToken)).send({ from, to });

    expect(response.status).toBe(201);

    const created = body(response);

    expect(created).toMatchObject({
      status: AnalyticsProcessingStatus.QUEUED,
      trigger: AnalyticsProcessingTrigger.MANUAL,
      rangeStart: from,
      rangeEnd: to,
      retryCount: 0,
      maxRetries: 3,
    });

    const runId = created.id as string;

    const persisted = await prisma.analyticsProcessingRun.findUnique({
      where: { id: runId },
    });

    expect(persisted).not.toBeNull();
    expect(persisted?.workspaceId).toBe(workspaceId);
    expect(persisted?.websiteId).toBe(websiteId);
    expect(persisted?.status).toBe(AnalyticsProcessingStatus.QUEUED);

    const statusResponse = await request(app.getHttpServer()).get(statusUrl()).set(withBearer(ownerAccessToken));

    expect(statusResponse.status).toBe(200);
    expect((body(statusResponse).activeRun as JsonRecord | null)?.id).toBe(runId);
    expect((body(statusResponse).latestRun as JsonRecord | null)?.id).toBe(runId);
  });

  // ---------------------------------------------------------------------------------------
  // D. Idempotency — enqueueing the same range twice must not create duplicate runs
  // ---------------------------------------------------------------------------------------

  it('returns the same run when the identical range is queued twice (idempotent enqueue)', async () => {
    const from = '2026-08-15T00:00:00.000Z';
    const to = '2026-08-16T00:00:00.000Z';

    const firstResponse = await request(app.getHttpServer()).post(reprocessUrl()).set(withBearer(ownerAccessToken)).send({ from, to });

    expect(firstResponse.status).toBe(201);

    const secondResponse = await request(app.getHttpServer()).post(reprocessUrl()).set(withBearer(ownerAccessToken)).send({ from, to });

    expect(secondResponse.status).toBe(201);

    expect(body(secondResponse).id).toBe(body(firstResponse).id);

    const matchingRuns = await prisma.analyticsProcessingRun.count({
      where: { websiteId, rangeStart: new Date(from), rangeEnd: new Date(to) },
    });

    expect(matchingRuns).toBe(1);
  });

  // ---------------------------------------------------------------------------------------
  // E/F. Processing execution + failure/retry — exercises the REAL worker against the REAL
  // stubbed rebuilders. Documents the confirmed defect: every run reaches DEAD_LETTERED.
  // ---------------------------------------------------------------------------------------

  it(
    'a queued run is claimed by the worker and, because the rebuilder pipeline is unimplemented, ' +
      'exhausts its retries and is dead-lettered (confirmed production defect, asserted as-is)',
    async () => {
      const from = '2026-08-20T00:00:00.000Z';
      const to = '2026-08-21T00:00:00.000Z';

      const queueResponse = await request(app.getHttpServer()).post(reprocessUrl()).set(withBearer(ownerAccessToken)).send({ from, to });

      expect(queueResponse.status).toBe(201);

      const runId = body(queueResponse).id as string;

      const initialRun = await prisma.analyticsProcessingRun.findUniqueOrThrow({
        where: { id: runId },
      });

      expect(initialRun.maxRetries).toBe(3);

      // Drive the real worker's tick() directly (see file header: ScheduleModule.forRoot() is
      // never registered, so @Interval never fires on its own). Each tick claims one QUEUED run
      // whose nextAttemptAt <= now and processes it exactly once.
      for (let attempt = 0; attempt <= initialRun.maxRetries; attempt += 1) {
        await prisma.analyticsProcessingRun.updateMany({
          where: { id: runId },
          data: { nextAttemptAt: new Date() },
        });

        // eslint-disable-next-line no-await-in-loop -- must run strictly sequentially: each
        // tick's outcome (retry backoff / dead-letter) determines the next iteration's setup.
        await worker.tick();

        const currentRun = await prisma.analyticsProcessingRun.findUniqueOrThrow({
          where: { id: runId },
        });

        if (currentRun.status === AnalyticsProcessingStatus.DEAD_LETTERED) {
          break;
        }
      }

      const finalRun = await prisma.analyticsProcessingRun.findUniqueOrThrow({
        where: { id: runId },
      });

      expect(finalRun.status).toBe(AnalyticsProcessingStatus.DEAD_LETTERED);
      expect(finalRun.retryCount).toBe(finalRun.maxRetries + 1);
      expect(finalRun.errorMessage).toContain('not implemented');

      const deadLetter = await prisma.analyticsProcessingDeadLetter.findUnique({
        where: { runId },
      });

      expect(deadLetter).not.toBeNull();
      expect(deadLetter?.workspaceId).toBe(workspaceId);
      expect(deadLetter?.websiteId).toBe(websiteId);
      expect(deadLetter?.resolvedAt).toBeNull();

      const statusResponse = await request(app.getHttpServer()).get(statusUrl()).set(withBearer(ownerAccessToken));

      expect(statusResponse.status).toBe(200);
      expect(body(statusResponse).unresolvedDeadLetters).toBeGreaterThanOrEqual(1);
    },
  );

  // ---------------------------------------------------------------------------------------
  // G. Retry / recovery
  // ---------------------------------------------------------------------------------------

  it('rejects retry from a VIEWER (requires OWNER or ADMIN)', async () => {
    const deadLetteredRun = await prisma.analyticsProcessingRun.findFirst({
      where: { websiteId, status: AnalyticsProcessingStatus.DEAD_LETTERED },
    });

    const runId = requireValue(deadLetteredRun?.id, 'Expected a dead-lettered run to retry');

    const response = await request(app.getHttpServer()).post(retryUrl(runId)).set(withBearer(viewerAccessToken));

    expect(response.status).toBe(403);
  });

  it('rejects retry for a run that is not dead-lettered', async () => {
    const activeRun = await prisma.analyticsProcessingRun.findFirst({
      where: { websiteId, status: AnalyticsProcessingStatus.QUEUED },
    });

    const runId = requireValue(activeRun?.id, 'Expected a queued run to attempt retrying');

    const response = await request(app.getHttpServer()).post(retryUrl(runId)).set(withBearer(ownerAccessToken));

    expect(response.status).toBe(404);
  });

  it('retries a dead-lettered run: creates a new QUEUED run and resolves the dead letter', async () => {
    const deadLetteredRun = await prisma.analyticsProcessingRun.findFirst({
      where: { websiteId, status: AnalyticsProcessingStatus.DEAD_LETTERED },
    });

    const originalRunId = requireValue(deadLetteredRun?.id, 'Expected a dead-lettered run to retry');

    const response = await request(app.getHttpServer()).post(retryUrl(originalRunId)).set(withBearer(ownerAccessToken));

    expect(response.status).toBe(201);

    const retryRun = body(response);

    expect(retryRun.trigger).toBe(AnalyticsProcessingTrigger.RETRY);
    expect(retryRun.status).toBe(AnalyticsProcessingStatus.QUEUED);
    expect(retryRun.id).not.toBe(originalRunId);

    const dbDeadLetter = await prisma.analyticsProcessingDeadLetter.findUnique({
      where: { runId: originalRunId },
    });

    expect(dbDeadLetter?.resolvedAt).not.toBeNull();
    expect(dbDeadLetter?.resolvedById).not.toBeNull();
  });

  it(
    'CONFIRMED PRODUCTION BUG (documented, not silently bypassed): retryDeadLetter looks up the ' +
      'run by id only and never verifies it belongs to the workspace in the URL — a caller with ' +
      'OWNER/ADMIN rights in their OWN workspace can retry/resolve a dead-lettered run belonging ' +
      "to a completely different workspace by supplying that run's id. " +
      '(apps/api/src/modules/analytics-processing/services/analytics-processing-queue.service.ts ' +
      'retryDeadLetter: `this.prisma.analyticsProcessingRun.findUnique({ where: { id: runId } })`, ' +
      "no workspaceId filter, while the controller only checks the caller's role in the URL " +
      'workspaceId via assertCanReprocess.) This test asserts the CURRENT (vulnerable) behavior ' +
      'so the gap is tracked by CI rather than silently passing; once the service is fixed to scope ' +
      'the lookup by workspaceId, this test must be updated to expect 404/403 instead.',
    async () => {
      // Seed a dead-lettered run that belongs to the OUTSIDER'S workspace, not `workspaceId`.
      const outsiderWebsite = await prisma.website.findUniqueOrThrow({
        where: { id: otherWorkspaceWebsiteId },
        select: { workspaceId: true },
      });

      const foreignRun = await prisma.analyticsProcessingRun.create({
        data: {
          workspaceId: outsiderWebsite.workspaceId,
          websiteId: otherWorkspaceWebsiteId,
          trigger: AnalyticsProcessingTrigger.MANUAL,
          status: AnalyticsProcessingStatus.DEAD_LETTERED,
          rangeStart: new Date('2026-08-25T00:00:00.000Z'),
          rangeEnd: new Date('2026-08-26T00:00:00.000Z'),
          lockKey: `phase14-foreign-lock-${randomUUID()}`,
          retryCount: 4,
          maxRetries: 3,
        },
      });

      await prisma.analyticsProcessingDeadLetter.create({
        data: {
          runId: foreignRun.id,
          workspaceId: outsiderWebsite.workspaceId,
          websiteId: otherWorkspaceWebsiteId,
          rangeStart: foreignRun.rangeStart,
          rangeEnd: foreignRun.rangeEnd,
          retryCount: 4,
          errorMessage: 'Method not implemented.',
        },
      });

      // ownerAccessToken belongs to `workspaceId`, NOT the outsider's workspace. The URL below
      // uses the OWNER's own workspaceId (so assertCanReprocess passes), while runId references
      // a run that belongs to a different workspace entirely.
      const response = await request(app.getHttpServer()).post(retryUrl(foreignRun.id)).set(withBearer(ownerAccessToken));

      // Documents the current, unfixed behavior: the cross-tenant retry currently succeeds.
      expect(response.status).toBe(201);
      expect(body(response).trigger).toBe(AnalyticsProcessingTrigger.RETRY);

      const resolvedForeignDeadLetter = await prisma.analyticsProcessingDeadLetter.findUnique({
        where: { runId: foreignRun.id },
      });

      // The dead letter belonging to the OUTSIDER's workspace was resolved by a user who is not
      // a member of that workspace.
      expect(resolvedForeignDeadLetter?.resolvedAt).not.toBeNull();
    },
  );

  // ---------------------------------------------------------------------------------------
  // H. Cross-website isolation
  // ---------------------------------------------------------------------------------------

  it('never mixes pending-event counts or runs between two different websites', async () => {
    const websiteAStatus = await request(app.getHttpServer()).get(statusUrl(websiteId)).set(withBearer(ownerAccessToken));

    expect(websiteAStatus.status).toBe(200);

    const recentRunWebsiteIds = new Set(
      (
        await prisma.analyticsProcessingRun.findMany({
          where: { websiteId },
          select: { websiteId: true },
        })
      ).map((run) => run.websiteId),
    );

    expect(recentRunWebsiteIds).toEqual(new Set([websiteId]));

    const foreignRunCount = await prisma.analyticsProcessingRun.count({
      where: { websiteId: otherWorkspaceWebsiteId, workspaceId },
    });

    expect(foreignRunCount).toBe(0);
  });
});
