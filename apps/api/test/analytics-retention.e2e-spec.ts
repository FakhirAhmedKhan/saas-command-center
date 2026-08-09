import type { INestApplication } from '@nestjs/common';

import { AnalyticsAggregateDimension, WorkspaceRole } from 'src/generated/prisma/enums';

import { PrismaService } from 'src/database/prisma.service';

import { AnalyticsProcessingService } from 'src/modules/analytics-engine/services/analytics-processing.service';

import { createRawAnalyticsEvent, runAnalyticsRetention, runAnonymousAnalyticsRetention } from './helpers/analytics-engine';

import { createTrackedWebsite, uniqueTrackerId } from './helpers/analytics-ingestion';

import { createTestApp } from './helpers/create-test-app';

import { resetDatabase } from './helpers/database';

import { addWorkspaceMember, expectAccessDenied, registerWorkspaceTestUser } from './helpers/workspace';

function asNumber(value: unknown): number {
  if (typeof value !== 'number') {
    throw new Error('Expected a numeric retention result');
  }

  return value;
}

describe('Analytics Retention E2E', () => {
  let app: INestApplication;

  let prisma: PrismaService;

  let processingService: AnalyticsProcessingService;

  const previousEnvironment = {
    raw: process.env.ANALYTICS_RAW_RETENTION_DAYS,
    normalized: process.env.ANALYTICS_NORMALIZED_RETENTION_DAYS,
    aggregate: process.env.ANALYTICS_AGGREGATE_RETENTION_DAYS,
  };

  beforeEach(async () => {
    process.env.ANALYTICS_RAW_RETENTION_DAYS = '30';
    process.env.ANALYTICS_NORMALIZED_RETENTION_DAYS = '400';
    process.env.ANALYTICS_AGGREGATE_RETENTION_DAYS = '730';

    app = await createTestApp();

    prisma = app.get(PrismaService);

    processingService = app.get(AnalyticsProcessingService);

    await resetDatabase(prisma);
  });

  afterEach(async () => {
    await app.close();
  });

  afterAll(() => {
    if (previousEnvironment.raw === undefined) {
      delete process.env.ANALYTICS_RAW_RETENTION_DAYS;
    } else {
      process.env.ANALYTICS_RAW_RETENTION_DAYS = previousEnvironment.raw;
    }

    if (previousEnvironment.normalized === undefined) {
      delete process.env.ANALYTICS_NORMALIZED_RETENTION_DAYS;
    } else {
      process.env.ANALYTICS_NORMALIZED_RETENTION_DAYS = previousEnvironment.normalized;
    }

    if (previousEnvironment.aggregate === undefined) {
      delete process.env.ANALYTICS_AGGREGATE_RETENTION_DAYS;
    } else {
      process.env.ANALYTICS_AGGREGATE_RETENTION_DAYS = previousEnvironment.aggregate;
    }
  });

  it('deletes only processed raw events older than the raw cutoff', async () => {
    const owner = await registerWorkspaceTestUser(app, prisma);

    const website = await createTrackedWebsite(owner);

    const now = Date.now();

    const oldProcessed = await createRawAnalyticsEvent(prisma, website, {
      eventId: uniqueTrackerId('old_processed'),
      occurredAt: new Date(now - 2 * 86_400_000),
      receivedAt: new Date(now - 2 * 86_400_000),
    });

    const recentProcessed = await createRawAnalyticsEvent(prisma, website, {
      eventId: uniqueTrackerId('recent_processed'),
      occurredAt: new Date(now - 12 * 60 * 60 * 1000),
      receivedAt: new Date(now - 12 * 60 * 60 * 1000),
    });

    await processingService.processForWorkspace(owner.workspaceId, website.id, owner.userId, 100);

    const oldPending = await createRawAnalyticsEvent(prisma, website, {
      eventId: uniqueTrackerId('old_pending'),
      occurredAt: new Date(now - 2 * 86_400_000),
      receivedAt: new Date(now - 2 * 86_400_000),
    });

    process.env.ANALYTICS_RAW_RETENTION_DAYS = '1';
    process.env.ANALYTICS_NORMALIZED_RETENTION_DAYS = '30';
    process.env.ANALYTICS_AGGREGATE_RETENTION_DAYS = '30';

    const response = await runAnalyticsRetention(owner, owner.workspaceId, website.id);

    expect(response.status).toBe(201);

    expect(asNumber(response.body.rawEventsDeleted)).toBe(1);

    expect(
      await prisma.rawAnalyticsEvent.findUnique({
        where: {
          id: oldProcessed.id,
        },
      }),
    ).toBeNull();

    expect(
      await prisma.rawAnalyticsEvent.findUnique({
        where: {
          id: recentProcessed.id,
        },
      }),
    ).not.toBeNull();

    expect(
      await prisma.rawAnalyticsEvent.findUnique({
        where: {
          id: oldPending.id,
        },
      }),
    ).not.toBeNull();
  });

  it('deletes expired sessions and removes only orphaned visitors', async () => {
    const owner = await registerWorkspaceTestUser(app, prisma);

    const website = await createTrackedWebsite(owner);

    const now = Date.now();

    const oldVisitorId = uniqueTrackerId('old_visitor');

    const recentVisitorId = uniqueTrackerId('recent_visitor');

    await createRawAnalyticsEvent(prisma, website, {
      visitorId: oldVisitorId,
      sessionId: uniqueTrackerId('old_session'),
      occurredAt: new Date(now - 2 * 86_400_000),
      receivedAt: new Date(now - 2 * 86_400_000),
    });

    await createRawAnalyticsEvent(prisma, website, {
      visitorId: recentVisitorId,
      sessionId: uniqueTrackerId('recent_session'),
      occurredAt: new Date(now - 12 * 60 * 60 * 1000),
      receivedAt: new Date(now - 12 * 60 * 60 * 1000),
    });

    await processingService.processForWorkspace(owner.workspaceId, website.id, owner.userId, 100);

    process.env.ANALYTICS_RAW_RETENTION_DAYS = '30';
    process.env.ANALYTICS_NORMALIZED_RETENTION_DAYS = '1';
    process.env.ANALYTICS_AGGREGATE_RETENTION_DAYS = '30';

    const response = await runAnalyticsRetention(owner, owner.workspaceId, website.id);

    expect(response.status).toBe(201);

    expect(asNumber(response.body.sessionsDeleted)).toBe(1);

    expect(asNumber(response.body.visitorsDeleted)).toBe(1);

    expect(
      await prisma.analyticsVisitor.findFirst({
        where: {
          websiteId: website.id,
          externalVisitorId: oldVisitorId,
        },
      }),
    ).toBeNull();

    expect(
      await prisma.analyticsVisitor.findFirst({
        where: {
          websiteId: website.id,
          externalVisitorId: recentVisitorId,
        },
      }),
    ).not.toBeNull();
  });

  it('deletes expired hourly and daily aggregates while preserving recent buckets', async () => {
    const owner = await registerWorkspaceTestUser(app, prisma);

    const website = await createTrackedWebsite(owner);

    const now = Date.now();

    const oldStart = new Date(now - 2 * 86_400_000);

    const recentStart = new Date(now - 12 * 60 * 60 * 1000);

    for (const bucketStart of [oldStart, recentStart]) {
      await prisma.analyticsHourlyAggregate.create({
        data: {
          websiteId: website.id,
          bucketStart,
          bucketEnd: new Date(bucketStart.getTime() + 3_600_000),
          timeZone: 'UTC',
          dimension: AnalyticsAggregateDimension.OVERVIEW,
          dimensionKey: 'overview',
          dimensionValue: 'overview',
          dimensionLabel: 'Overview',
        },
      });

      await prisma.analyticsDailyAggregate.create({
        data: {
          websiteId: website.id,
          bucketStart,
          bucketEnd: new Date(bucketStart.getTime() + 86_400_000),
          timeZone: 'UTC',
          dimension: AnalyticsAggregateDimension.OVERVIEW,
          dimensionKey: 'overview',
          dimensionValue: 'overview',
          dimensionLabel: 'Overview',
        },
      });
    }

    process.env.ANALYTICS_AGGREGATE_RETENTION_DAYS = '1';

    const response = await runAnalyticsRetention(owner, owner.workspaceId, website.id);

    expect(response.status).toBe(201);

    expect(asNumber(response.body.hourlyAggregatesDeleted)).toBe(1);

    expect(asNumber(response.body.dailyAggregatesDeleted)).toBe(1);

    expect(
      await prisma.analyticsHourlyAggregate.count({
        where: {
          websiteId: website.id,
        },
      }),
    ).toBe(1);

    expect(
      await prisma.analyticsDailyAggregate.count({
        where: {
          websiteId: website.id,
        },
      }),
    ).toBe(1);
  });

  it('limits retention changes to the requested website', async () => {
    const owner = await registerWorkspaceTestUser(app, prisma);

    const websiteA = await createTrackedWebsite(owner);

    const websiteB = await createTrackedWebsite(owner);

    const oldStart = new Date(Date.now() - 2 * 86_400_000);

    for (const website of [websiteA, websiteB]) {
      await prisma.analyticsDailyAggregate.create({
        data: {
          websiteId: website.id,
          bucketStart: oldStart,
          bucketEnd: new Date(oldStart.getTime() + 86_400_000),
          timeZone: 'UTC',
          dimension: AnalyticsAggregateDimension.OVERVIEW,
          dimensionKey: 'overview',
          dimensionValue: 'overview',
          dimensionLabel: 'Overview',
        },
      });
    }

    process.env.ANALYTICS_AGGREGATE_RETENTION_DAYS = '1';

    expect((await runAnalyticsRetention(owner, owner.workspaceId, websiteA.id)).status).toBe(201);

    expect(
      await prisma.analyticsDailyAggregate.count({
        where: {
          websiteId: websiteA.id,
        },
      }),
    ).toBe(0);

    expect(
      await prisma.analyticsDailyAggregate.count({
        where: {
          websiteId: websiteB.id,
        },
      }),
    ).toBe(1);
  });

  it('allows OWNER and ADMIN but denies DEVELOPER and VIEWER', async () => {
    const owner = await registerWorkspaceTestUser(app, prisma);

    const admin = await registerWorkspaceTestUser(app, prisma);

    const developer = await registerWorkspaceTestUser(app, prisma);

    const viewer = await registerWorkspaceTestUser(app, prisma);

    const website = await createTrackedWebsite(owner);

    for (const [actor, role] of [
      [admin, WorkspaceRole.ADMIN],
      [developer, WorkspaceRole.DEVELOPER],
      [viewer, WorkspaceRole.VIEWER],
    ] as const) {
      expect([200, 201]).toContain((await addWorkspaceMember(owner, actor, role)).status);
    }

    expect((await runAnalyticsRetention(owner, owner.workspaceId, website.id)).status).toBe(201);

    expect((await runAnalyticsRetention(admin, owner.workspaceId, website.id)).status).toBe(201);

    expectAccessDenied(await runAnalyticsRetention(developer, owner.workspaceId, website.id));

    expectAccessDenied(await runAnalyticsRetention(viewer, owner.workspaceId, website.id));
  });

  it('requires authentication and hides foreign websites', async () => {
    const owner = await registerWorkspaceTestUser(app, prisma);

    const foreignOwner = await registerWorkspaceTestUser(app, prisma);

    const website = await createTrackedWebsite(owner);

    expectAccessDenied(await runAnalyticsRetention(foreignOwner, owner.workspaceId, website.id));

    expect((await runAnonymousAnalyticsRetention(app, owner.workspaceId, website.id)).status).toBe(401);
  });
});
