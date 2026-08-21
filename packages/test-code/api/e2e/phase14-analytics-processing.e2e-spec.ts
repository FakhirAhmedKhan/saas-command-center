import { createAgent, createTestUser, registerUser, withBearer } from '../helpers/auth';
import { createTestApp } from '../helpers/create-test-app';
import { resetDatabase } from '../helpers/database';
import { readAccessToken } from '../helpers/response';
import { PrismaService } from 'src/database/prisma.service';
import { AnalyticsProcessingStatus, AnalyticsProcessingTrigger, RawAnalyticsEventType, WorkspaceRole } from 'src/generated/prisma/enums';
import { AnalyticsProcessingWorkerService } from 'src/modules/analytics-processing/services/analytics-processing-worker.service';
import type { INestApplication } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import request, { type Response } from 'supertest';

/**
 * Phase 14 ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â Analytics Processing E2E
 *
 * Real routes (apps/api/src/modules/analytics-processing/controllers/analytics-processing.controller.ts):
 *   GET  /api/v1/workspaces/:workspaceId/websites/:websiteId/analytics/processing/status
 *   POST /api/v1/workspaces/:workspaceId/websites/:websiteId/analytics/processing/reprocess
 *   POST /api/v1/workspaces/:workspaceId/websites/:websiteId/analytics/processing/runs/:runId/retry
 *
 * Guards: JwtAuthGuard + WorkspaceAccessGuard (class-level). No WorkspaceRolesGuard ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â role
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
 * PageViewRebuilderService.rebuildRange, AnalyticsAggregationService.rebuildRange ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â all four of
 * which are unimplemented stubs that unconditionally `throw new Error('Method not implemented.')`
 * (confirmed by direct source read). Therefore ANY run that reaches AnalyticsProcessingWorkerService
 * processing will deterministically fail at the visitors.rebuildRange step on every attempt, and
 * after exhausting `maxRetries` (default 3) will land in DEAD_LETTERED with a corresponding
 * AnalyticsProcessingDeadLetter row. The tests below assert this REAL, current behavior ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â they do
 * not assert that reprocessing "succeeds", because it does not. This is intentional: weakening
 * these assertions to a passing status would hide a Critical production bug. See the retry-related
 * tests further down for the resulting availability impact.
 *
 * A second known gap: ScheduleModule.forRoot() is not registered anywhere in AppModule, so the
 * worker's @Interval(5_000) tick() never fires automatically in the running application (and
 * would not fire during this Jest process either). To exercise the worker deterministically and
 * synchronously in this suite (instead of asserting on a timer that will never elapse), tests
 * resolve the real AnalyticsProcessingWorkerService from the Nest DI container and invoke its
 * public tick() method directly. This is not a mock ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â it runs the exact same production code path
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
  async function seedDeadLetteredRun(targetWorkspaceId = workspaceId, targetWebsiteId = websiteId): Promise<string> {
    const rangeStart = new Date('2026-08-27T00:00:00.000Z');
    const rangeEnd = new Date('2026-08-28T00:00:00.000Z');
    const lockKey = `phase14-dead-letter-${randomUUID()}`;

    const run = await prisma.analyticsProcessingRun.create({
      data: {
        workspaceId: targetWorkspaceId,
        websiteId: targetWebsiteId,
        trigger: AnalyticsProcessingTrigger.MANUAL,
        status: AnalyticsProcessingStatus.DEAD_LETTERED,
        rangeStart,
        rangeEnd,
        lockKey,
        retryCount: 4,
        maxRetries: 3,
        errorMessage: 'Synthetic Phase 14 dead-letter fixture.',
      },
    });

    await prisma.analyticsProcessingDeadLetter.create({
      data: {
        runId: run.id,
        workspaceId: targetWorkspaceId,
        websiteId: targetWebsiteId,
        rangeStart,
        rangeEnd,
        retryCount: 4,
        errorMessage: 'Synthetic Phase 14 dead-letter fixture.',
      },
    });

    return run.id;
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

    const ownerWorkspaceResponse = await request(app.getHttpServer()).post(`${API_PREFIX}/workspaces`).set(withBearer(ownerAccessToken)).send({
      name: owner.workspaceName,
    });

    expect(ownerWorkspaceResponse.status).toBe(201);

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

    const outsiderWorkspaceResponse = await request(app.getHttpServer()).post(`${API_PREFIX}/workspaces`).set(withBearer(outsiderAccessToken)).send({
      name: outsider.workspaceName,
    });

    expect(outsiderWorkspaceResponse.status).toBe(201);

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
  // C. Processing execution (manual trigger) ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â validation
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
  // C (cont). Processing execution ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â valid trigger creates a real, persisted run
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
  // D. Idempotency ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â enqueueing the same range twice must not create duplicate runs
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
  // E/F. Processing execution
  // ---------------------------------------------------------------------------------------

  it('claims and successfully processes a queued analytics run', async () => {
    const from = '2026-08-20T00:00:00.000Z';
    const to = '2026-08-21T00:00:00.000Z';

    const queueResponse = await request(app.getHttpServer()).post(reprocessUrl()).set(withBearer(ownerAccessToken)).send({ from, to });

    expect(queueResponse.status).toBe(201);

    const runId = body(queueResponse).id as string;

    for (let attempt = 0; attempt < 10; attempt += 1) {
      await worker.tick();

      const currentRun = await prisma.analyticsProcessingRun.findUniqueOrThrow({
        where: { id: runId },
      });

      if (currentRun.status === AnalyticsProcessingStatus.SUCCEEDED) {
        break;
      }
    }

    const finalRun = await prisma.analyticsProcessingRun.findUniqueOrThrow({
      where: { id: runId },
    });

    expect(finalRun.status).toBe(AnalyticsProcessingStatus.SUCCEEDED);
    expect(finalRun.errorMessage).toBeNull();

    const deadLetter = await prisma.analyticsProcessingDeadLetter.findUnique({
      where: { runId },
    });

    expect(deadLetter).toBeNull();

    const statusResponse = await request(app.getHttpServer()).get(statusUrl()).set(withBearer(ownerAccessToken));

    expect(statusResponse.status).toBe(200);
  });

  // ---------------------------------------------------------------------------------------
  // G. Retry / recovery
  // ---------------------------------------------------------------------------------------

  it('rejects retry from a VIEWER (requires OWNER or ADMIN)', async () => {
    const runId = await seedDeadLetteredRun();

    const response = await request(app.getHttpServer()).post(retryUrl(runId)).set(withBearer(viewerAccessToken));

    expect(response.status).toBe(403);

    const deadLetter = await prisma.analyticsProcessingDeadLetter.findUniqueOrThrow({
      where: { runId },
    });

    expect(deadLetter.resolvedAt).toBeNull();
  });

  it('rejects retry for a run that is not dead-lettered', async () => {
    const run = await prisma.analyticsProcessingRun.create({
      data: {
        workspaceId,
        websiteId,
        trigger: AnalyticsProcessingTrigger.MANUAL,
        status: AnalyticsProcessingStatus.QUEUED,
        rangeStart: new Date('2026-08-29T00:00:00.000Z'),
        rangeEnd: new Date('2026-08-30T00:00:00.000Z'),
        lockKey: `phase14-queued-${randomUUID()}`,
        maxRetries: 3,
      },
    });

    const response = await request(app.getHttpServer()).post(retryUrl(run.id)).set(withBearer(ownerAccessToken));

    expect(response.status).toBe(404);
  });

  it('retries a dead-lettered run: creates a new QUEUED run and resolves the dead letter', async () => {
    const originalRunId = await seedDeadLetteredRun();

    const response = await request(app.getHttpServer()).post(retryUrl(originalRunId)).set(withBearer(ownerAccessToken));

    expect(response.status).toBe(201);

    const retryRun = body(response);

    expect(retryRun.trigger).toBe(AnalyticsProcessingTrigger.RETRY);
    expect(retryRun.status).toBe(AnalyticsProcessingStatus.QUEUED);
    expect(retryRun.id).not.toBe(originalRunId);

    const dbDeadLetter = await prisma.analyticsProcessingDeadLetter.findUniqueOrThrow({
      where: { runId: originalRunId },
    });

    expect(dbDeadLetter.resolvedAt).not.toBeNull();
    expect(dbDeadLetter.resolvedById).not.toBeNull();
  });

  it('prevents retrying a dead-lettered run from another workspace', async () => {
    const outsiderWebsite = await prisma.website.findUniqueOrThrow({
      where: { id: otherWorkspaceWebsiteId },
      select: { workspaceId: true },
    });

    const foreignRunId = await seedDeadLetteredRun(outsiderWebsite.workspaceId, otherWorkspaceWebsiteId);

    const response = await request(app.getHttpServer()).post(retryUrl(foreignRunId)).set(withBearer(ownerAccessToken));

    expect(response.status).toBe(404);

    const foreignDeadLetter = await prisma.analyticsProcessingDeadLetter.findUniqueOrThrow({
      where: { runId: foreignRunId },
    });

    expect(foreignDeadLetter.resolvedAt).toBeNull();
    expect(foreignDeadLetter.resolvedById).toBeNull();

    const foreignRun = await prisma.analyticsProcessingRun.findUniqueOrThrow({
      where: { id: foreignRunId },
    });

    expect(foreignRun.status).toBe(AnalyticsProcessingStatus.DEAD_LETTERED);
  });

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
