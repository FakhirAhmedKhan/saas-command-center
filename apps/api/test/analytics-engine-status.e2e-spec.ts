import type { INestApplication } from '@nestjs/common';

import { WorkspaceRole, RawAnalyticsEventType } from 'src/generated/prisma/enums';

import { PrismaService } from 'src/database/prisma.service';

import { AnalyticsProcessingService } from 'src/modules/analytics-engine/services/analytics-processing.service';

import { recordString } from './helpers/application';

import {
  analyticsEngineRoutes,
  getAnalyticsEngineStatus,
  getAnonymousAnalyticsEngineStatus,
  readAnalyticsEngineStatus,
} from './helpers/analytics-engine-old';

import {
  buildTrackerEvent,
  collectEvents,
  createTrackedWebsite,
  expectCollectionAccepted,
  uniqueTrackerId,
} from './helpers/analytics-ingestion';

import { createTestApp } from './helpers/create-test-app';

import { resetDatabase } from './helpers/database';

import {
  addWorkspaceMember,
  expectAccessDenied,
  registerWorkspaceTestUser,
} from './helpers/workspace';

describe('Analytics Engine Status E2E', () => {
  let app: INestApplication;

  let prisma: PrismaService;

  let processingService: AnalyticsProcessingService;

  beforeEach(async () => {
    app = await createTestApp();

    prisma = app.get(PrismaService);

    processingService = app.get(AnalyticsProcessingService);

    await resetDatabase(prisma);
  });

  afterEach(async () => {
    await app.close();
  });

  it('returns an empty status before analytics processing', async () => {
    const owner = await registerWorkspaceTestUser(app, prisma);

    const trackedWebsite = await createTrackedWebsite(owner);

    const response = await getAnalyticsEngineStatus(owner, owner.workspaceId, trackedWebsite.id);

    expect(response.status).toBe(200);

    const status = readAnalyticsEngineStatus(response);

    expect(recordString(status.website, 'id')).toBe(trackedWebsite.id);

    expect(status.counts).toEqual({
      rawEvents: 0,
      pendingRawEvents: 0,
      visitors: 0,
      sessions: 0,
      normalizedEvents: 0,
      pageViews: 0,
      hourlyAggregates: 0,
      dailyAggregates: 0,
    });

    expect(status.processingState).toBeNull();

    expect(status.latestRun).toBeNull();

    expect(status.recentSessions).toEqual([]);
  });

  it('returns processed counts, latest run, and recent sessions', async () => {
    const owner = await registerWorkspaceTestUser(app, prisma);

    const trackedWebsite = await createTrackedWebsite(owner);

    const visitorId = uniqueTrackerId('visitor');

    const sessionId = uniqueTrackerId('session');

    expectCollectionAccepted(
      await collectEvents(app, trackedWebsite, [
        buildTrackerEvent(trackedWebsite.origin, {
          type: RawAnalyticsEventType.PAGE_VIEW,
          visitorId,
          sessionId,
        }),
      ]),
      1,
    );

    await processingService.processForWorkspace(
      owner.workspaceId,
      trackedWebsite.id,
      owner.userId,
      100,
    );

    const response = await getAnalyticsEngineStatus(owner, owner.workspaceId, trackedWebsite.id);

    expect(response.status).toBe(200);

    const status = readAnalyticsEngineStatus(response);

    expect(status.counts.rawEvents).toBe(1);

    expect(status.counts.pendingRawEvents).toBe(0);

    expect(status.counts.visitors).toBe(1);

    expect(status.counts.sessions).toBe(1);

    expect(status.counts.normalizedEvents).toBe(1);

    expect(status.counts.pageViews).toBe(1);

    expect(status.processingState).not.toBeNull();

    expect(status.latestRun).not.toBeNull();

    expect(status.recentSessions).toHaveLength(1);
  });

  it('allows a VIEWER to read analytics-engine status', async () => {
    const owner = await registerWorkspaceTestUser(app, prisma);

    const viewer = await registerWorkspaceTestUser(app, prisma);

    const trackedWebsite = await createTrackedWebsite(owner);

    expect([200, 201]).toContain(
      (await addWorkspaceMember(owner, viewer, WorkspaceRole.VIEWER)).status,
    );

    const response = await getAnalyticsEngineStatus(viewer, owner.workspaceId, trackedWebsite.id);

    expect(response.status).toBe(200);
  });

  it('prevents outsider and anonymous access', async () => {
    const owner = await registerWorkspaceTestUser(app, prisma);

    const outsider = await registerWorkspaceTestUser(app, prisma);

    const trackedWebsite = await createTrackedWebsite(owner);

    expectAccessDenied(
      await getAnalyticsEngineStatus(outsider, owner.workspaceId, trackedWebsite.id),
    );

    expect(
      (await getAnonymousAnalyticsEngineStatus(app, owner.workspaceId, trackedWebsite.id)).status,
    ).toBe(401);
  });

  it('rejects malformed IDs and hides a foreign website', async () => {
    const alpha = await registerWorkspaceTestUser(app, prisma);

    const beta = await registerWorkspaceTestUser(app, prisma);

    const betaWebsite = await createTrackedWebsite(beta);

    expect(
      (
        await alpha.agent
          .get(analyticsEngineRoutes.status('not-a-uuid', betaWebsite.id))
          .set('Authorization', `Bearer ${alpha.accessToken}`)
      ).status,
    ).toBe(400);

    const foreignResponse = await getAnalyticsEngineStatus(
      alpha,
      alpha.workspaceId,
      betaWebsite.id,
    );

    expect(foreignResponse.status).toBe(404);
  });
});
