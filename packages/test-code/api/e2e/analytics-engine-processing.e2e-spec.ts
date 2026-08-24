import { processAnalytics } from '../helpers/analytics-engine-old';
import { buildEventBatch, buildTrackerEvent, collectEvents, createTrackedWebsite, expectCollectionAccepted, uniqueTrackerId } from '../helpers/analytics-ingestion';
import { createTestApp } from '../helpers/create-test-app';
import { resetDatabase } from '../helpers/database';
import { archiveWebsite, disableWebsite, expectWebsiteSuccess } from '../helpers/website';
import { addWorkspaceMember, expectAccessDenied, registerWorkspaceTestUser } from '../helpers/workspace';
import type { INestApplication } from '@nestjs/common';
import { PrismaService } from 'src/database/prisma.service';
import { AnalyticsProcessingStatus, RawAnalyticsEventType, WorkspaceRole } from 'src/generated/prisma/enums';
import { AnalyticsProcessingService } from 'src/modules/analytics-engine/services/analytics-processing.service';

describe('Analytics Engine Processing E2E', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let processingService: AnalyticsProcessingService;

  beforeAll(async () => {
    app = await createTestApp();

    prisma = app.get(PrismaService);

    processingService = app.get(AnalyticsProcessingService);
  });

  beforeEach(async () => {
    await resetDatabase(prisma);
  });

  afterAll(async () => {
    await app.close();
  });

  it('processes pending raw events through the protected endpoint', async () => {
    const owner = await registerWorkspaceTestUser(app, prisma);
    const trackedWebsite = await createTrackedWebsite(owner);

    expectCollectionAccepted(await collectEvents(app, trackedWebsite, buildEventBatch(trackedWebsite.origin, 3)), 3);

    const response = await processAnalytics(owner, owner.workspaceId, trackedWebsite.id, {
      maxEvents: 100,
    });

    expect(response.status).toBe(201);

    expect(
      await prisma.analyticsEvent.count({
        where: {
          websiteId: trackedWebsite.id,
        },
      }),
    ).toBe(3);

    expect(
      await prisma.rawAnalyticsEvent.count({
        where: {
          websiteId: trackedWebsite.id,
          analyticsEvent: null,
        },
      }),
    ).toBe(0);
  });

  it('honors maxEvents and leaves the remaining raw events pending', async () => {
    const owner = await registerWorkspaceTestUser(app, prisma);
    const trackedWebsite = await createTrackedWebsite(owner);

    expectCollectionAccepted(await collectEvents(app, trackedWebsite, buildEventBatch(trackedWebsite.origin, 5)), 5);

    const run = await processingService.processForWorkspace(owner.workspaceId, trackedWebsite.id, owner.userId, 2);

    expect(run.status).toBe(AnalyticsProcessingStatus.COMPLETED);

    expect(run.rawEventsProcessed).toBe(2);

    expect(
      await prisma.analyticsEvent.count({
        where: {
          websiteId: trackedWebsite.id,
        },
      }),
    ).toBe(2);

    expect(
      await prisma.rawAnalyticsEvent.count({
        where: {
          websiteId: trackedWebsite.id,
          analyticsEvent: null,
        },
      }),
    ).toBe(3);
  });

  it('creates a completed zero-work run when no events are pending', async () => {
    const owner = await registerWorkspaceTestUser(app, prisma);
    const trackedWebsite = await createTrackedWebsite(owner);
    const run = await processingService.processForWorkspace(owner.workspaceId, trackedWebsite.id, owner.userId, 100);

    expect(run.status).toBe(AnalyticsProcessingStatus.COMPLETED);

    expect(run.rawEventsProcessed).toBe(0);

    const state = await prisma.analyticsProcessingState.findUnique({
      where: {
        websiteId: trackedWebsite.id,
      },
    });

    expect(state?.status).toBe(AnalyticsProcessingStatus.COMPLETED);
  });

  it('validates maxEvents boundaries', async () => {
    const owner = await registerWorkspaceTestUser(app, prisma);
    const trackedWebsite = await createTrackedWebsite(owner);

    for (const invalidValue of [0, -1, 1.5, 50_001, 'not-a-number']) {
      const response = await processAnalytics(owner, owner.workspaceId, trackedWebsite.id, {
        maxEvents: invalidValue,
      });

      expect(response.status).toBe(400);
    }
  });

  it('allows DEVELOPER processing but denies VIEWER processing', async () => {
    const owner = await registerWorkspaceTestUser(app, prisma);
    const developer = await registerWorkspaceTestUser(app, prisma);
    const viewer = await registerWorkspaceTestUser(app, prisma);
    const trackedWebsite = await createTrackedWebsite(owner);

    expect([200, 201]).toContain((await addWorkspaceMember(owner, developer, WorkspaceRole.DEVELOPER)).status);

    expect([200, 201]).toContain((await addWorkspaceMember(owner, viewer, WorkspaceRole.VIEWER)).status);

    expectCollectionAccepted(
      await collectEvents(app, trackedWebsite, [
        buildTrackerEvent(trackedWebsite.origin, {
          type: RawAnalyticsEventType.CUSTOM,
          eventName: 'developer_process',
        }),
      ]),
      1,
    );

    expect(
      (
        await processAnalytics(developer, owner.workspaceId, trackedWebsite.id, {
          maxEvents: 10,
        })
      ).status,
    ).toBe(201);

    expectAccessDenied(
      await processAnalytics(viewer, owner.workspaceId, trackedWebsite.id, {
        maxEvents: 10,
      }),
    );
  });

  it('rejects processing for disabled and archived websites', async () => {
    const owner = await registerWorkspaceTestUser(app, prisma);
    const disabledWebsite = await createTrackedWebsite(owner);

    expectWebsiteSuccess(await disableWebsite(owner, disabledWebsite.id));

    const disabledResponse = await processAnalytics(owner, owner.workspaceId, disabledWebsite.id, {
      maxEvents: 10,
    });

    expect([400, 403, 409]).toContain(disabledResponse.status);

    const archivedWebsite = await createTrackedWebsite(owner);

    expectWebsiteSuccess(await archiveWebsite(owner, archivedWebsite.id));

    const archivedResponse = await processAnalytics(owner, owner.workspaceId, archivedWebsite.id, {
      maxEvents: 10,
    });

    expect([400, 403, 409]).toContain(archivedResponse.status);
  });

  it('marks the run and processing state as FAILED when a session ID is reused by another visitor', async () => {
    const owner = await registerWorkspaceTestUser(app, prisma);
    const trackedWebsite = await createTrackedWebsite(owner);
    const sessionId = uniqueTrackerId('shared_session');

    expectCollectionAccepted(
      await collectEvents(app, trackedWebsite, [
        buildTrackerEvent(trackedWebsite.origin, {
          visitorId: uniqueTrackerId('visitor_a'),
          sessionId,
        }),
        buildTrackerEvent(trackedWebsite.origin, {
          visitorId: uniqueTrackerId('visitor_b'),
          sessionId,
        }),
      ]),
      2,
    );

    await expect(processingService.processForWorkspace(owner.workspaceId, trackedWebsite.id, owner.userId, 100)).rejects.toThrow('A session identifier cannot belong to multiple visitors');

    const state = await prisma.analyticsProcessingState.findUnique({
      where: {
        websiteId: trackedWebsite.id,
      },
    });
    const run = await prisma.analyticsProcessingRun.findFirst({
      where: {
        websiteId: trackedWebsite.id,
      },
      orderBy: {
        startedAt: 'desc',
      },
    });

    expect(state?.status).toBe(AnalyticsProcessingStatus.FAILED);

    expect(run?.status).toBe(AnalyticsProcessingStatus.FAILED);

    expect(
      await prisma.analyticsEvent.count({
        where: {
          websiteId: trackedWebsite.id,
        },
      }),
    ).toBe(0);
  });
});
