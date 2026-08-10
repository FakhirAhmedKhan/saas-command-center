import { createRawAnalyticsEvent } from './helpers/analytics-engine';
import { createTrackedWebsite, uniqueTrackerId } from './helpers/analytics-ingestion';
import { createTestApp } from './helpers/create-test-app';
import { resetDatabase } from './helpers/database';
import { registerWorkspaceTestUser } from './helpers/workspace';
import type { INestApplication } from '@nestjs/common';
import { PrismaService } from 'src/database/prisma.service';
import { AnalyticsAggregateDimension, RawAnalyticsEventType } from 'src/generated/prisma/enums';
import { AnalyticsProcessingService } from 'src/modules/analytics-engine/services/analytics-processing.service';

describe('Analytics Late Events E2E', () => {
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

  it('moves the session start and entry page when an earlier page view arrives', async () => {
    const owner = await registerWorkspaceTestUser(app, prisma);

    const website = await createTrackedWebsite(owner);

    await prisma.website.update({
      where: {
        id: website.id,
      },
      data: {
        timeZone: 'UTC',
      },
    });

    const visitorId = uniqueTrackerId('late_visitor');

    const sessionId = uniqueTrackerId('late_session');

    const later = new Date('2026-08-06T12:10:00.000Z');

    const earlier = new Date('2026-08-06T10:10:00.000Z');

    await createRawAnalyticsEvent(prisma, website, {
      visitorId,
      sessionId,
      occurredAt: later,
      pageUrl: `${website.origin}/later`,
    });

    await processingService.processForWorkspace(owner.workspaceId, website.id, owner.userId, 100);

    await createRawAnalyticsEvent(prisma, website, {
      visitorId,
      sessionId,
      occurredAt: earlier,
      pageUrl: `${website.origin}/earlier`,
    });

    await processingService.processForWorkspace(owner.workspaceId, website.id, owner.userId, 100);

    const session = await prisma.analyticsSession.findFirstOrThrow({
      where: {
        websiteId: website.id,
        externalSessionId: sessionId,
      },
    });

    expect(session.startedAt.toISOString()).toBe(earlier.toISOString());

    expect(session.entryPath).toBe('/earlier');

    expect(session.exitPath).toBe('/later');

    const pageViews = await prisma.analyticsPageView.findMany({
      where: {
        sessionId: session.id,
      },
      orderBy: {
        occurredAt: 'asc',
      },
    });

    expect(pageViews[0]?.isEntry).toBe(true);

    expect(pageViews[1]?.isExit).toBe(true);
  });

  it('rebuilds both the previous and new session-start buckets', async () => {
    const owner = await registerWorkspaceTestUser(app, prisma);

    const website = await createTrackedWebsite(owner);

    await prisma.website.update({
      where: {
        id: website.id,
      },
      data: {
        timeZone: 'UTC',
      },
    });

    const visitorId = uniqueTrackerId('bucket_visitor');

    const sessionId = uniqueTrackerId('bucket_session');

    await createRawAnalyticsEvent(prisma, website, {
      visitorId,
      sessionId,
      occurredAt: new Date('2026-08-06T12:10:00.000Z'),
    });

    await processingService.processForWorkspace(owner.workspaceId, website.id, owner.userId, 100);

    await createRawAnalyticsEvent(prisma, website, {
      visitorId,
      sessionId,
      occurredAt: new Date('2026-08-06T10:10:00.000Z'),
    });

    await processingService.processForWorkspace(owner.workspaceId, website.id, owner.userId, 100);

    const overview = await prisma.analyticsHourlyAggregate.findMany({
      where: {
        websiteId: website.id,
        dimension: AnalyticsAggregateDimension.OVERVIEW,
      },
      orderBy: {
        bucketStart: 'asc',
      },
    });

    expect(overview).toHaveLength(2);

    expect(overview[0]?.bucketStart.toISOString()).toBe('2026-08-06T10:00:00.000Z');

    expect(overview[0]?.sessions).toBe(1);

    expect(overview[1]?.bucketStart.toISOString()).toBe('2026-08-06T12:00:00.000Z');

    expect(overview[1]?.sessions).toBe(0);
  });

  it('updates duration in the original session-start bucket when a later heartbeat arrives', async () => {
    const owner = await registerWorkspaceTestUser(app, prisma);

    const website = await createTrackedWebsite(owner);

    await prisma.website.update({
      where: {
        id: website.id,
      },
      data: {
        timeZone: 'UTC',
      },
    });

    const visitorId = uniqueTrackerId('duration_visitor');

    const sessionId = uniqueTrackerId('duration_session');

    await createRawAnalyticsEvent(prisma, website, {
      visitorId,
      sessionId,
      occurredAt: new Date('2026-08-06T10:10:00.000Z'),
    });

    await processingService.processForWorkspace(owner.workspaceId, website.id, owner.userId, 100);

    await createRawAnalyticsEvent(prisma, website, {
      type: RawAnalyticsEventType.HEARTBEAT,
      visitorId,
      sessionId,
      occurredAt: new Date('2026-08-06T12:10:00.000Z'),
      durationMs: 15_000,
    });

    await processingService.processForWorkspace(owner.workspaceId, website.id, owner.userId, 100);

    const startBucket = await prisma.analyticsHourlyAggregate.findFirstOrThrow({
      where: {
        websiteId: website.id,
        bucketStart: new Date('2026-08-06T10:00:00.000Z'),
        dimension: AnalyticsAggregateDimension.OVERVIEW,
      },
    });

    expect(startBucket.totalDurationMs).toBe(7_215_000n);
  });

  it('adds late custom-event aggregates without duplicating existing rows', async () => {
    const owner = await registerWorkspaceTestUser(app, prisma);

    const website = await createTrackedWebsite(owner);

    const visitorId = uniqueTrackerId('custom_visitor');

    const sessionId = uniqueTrackerId('custom_session');

    const occurredAt = new Date('2026-08-06T10:10:00.000Z');

    await createRawAnalyticsEvent(prisma, website, {
      visitorId,
      sessionId,
      occurredAt,
    });

    await processingService.processForWorkspace(owner.workspaceId, website.id, owner.userId, 100);

    await createRawAnalyticsEvent(prisma, website, {
      type: RawAnalyticsEventType.CUSTOM,
      eventName: 'late_conversion',
      visitorId,
      sessionId,
      occurredAt: new Date(occurredAt.getTime() + 5_000),
    });

    await processingService.processForWorkspace(owner.workspaceId, website.id, owner.userId, 100);

    await processingService.processForWorkspace(owner.workspaceId, website.id, owner.userId, 100);

    const custom = await prisma.analyticsDailyAggregate.findMany({
      where: {
        websiteId: website.id,
        dimension: AnalyticsAggregateDimension.CUSTOM_EVENT,
        dimensionValue: 'late_conversion',
      },
    });

    expect(custom).toHaveLength(1);

    expect(custom[0]?.customEvents).toBe(1);
  });

  it('does not rebuild unrelated daily buckets', async () => {
    const owner = await registerWorkspaceTestUser(app, prisma);

    const website = await createTrackedWebsite(owner);

    await prisma.website.update({
      where: {
        id: website.id,
      },
      data: {
        timeZone: 'UTC',
      },
    });

    const firstVisitor = uniqueTrackerId('first_visitor');

    const firstSession = uniqueTrackerId('first_session');

    await createRawAnalyticsEvent(prisma, website, {
      visitorId: firstVisitor,
      sessionId: firstSession,
      occurredAt: new Date('2026-08-05T10:00:00.000Z'),
    });

    await createRawAnalyticsEvent(prisma, website, {
      occurredAt: new Date('2026-08-06T10:00:00.000Z'),
    });

    await processingService.processForWorkspace(owner.workspaceId, website.id, owner.userId, 100);

    const unrelatedBefore = await prisma.analyticsDailyAggregate.findFirstOrThrow({
      where: {
        websiteId: website.id,
        bucketStart: new Date('2026-08-06T00:00:00.000Z'),
        dimension: AnalyticsAggregateDimension.OVERVIEW,
      },
    });

    await new Promise((resolve) => setTimeout(resolve, 10));

    await createRawAnalyticsEvent(prisma, website, {
      type: RawAnalyticsEventType.CUSTOM,
      eventName: 'late_day_one',
      visitorId: firstVisitor,
      sessionId: firstSession,
      occurredAt: new Date('2026-08-05T11:00:00.000Z'),
    });

    await processingService.processForWorkspace(owner.workspaceId, website.id, owner.userId, 100);

    const unrelatedAfter = await prisma.analyticsDailyAggregate.findFirstOrThrow({
      where: {
        id: unrelatedBefore.id,
      },
    });

    expect(unrelatedAfter.generatedAt.toISOString()).toBe(unrelatedBefore.generatedAt.toISOString());
  });
});
