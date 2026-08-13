import {
  createRawAnalyticsEvent,
  findAggregate,
  getAnonymousAnalyticsAggregates,
  listAnalyticsAggregates,
  readAnalyticsAggregateList,
} from '../helpers/analytics-engine';
import { createTrackedWebsite, uniqueTrackerId } from '../helpers/analytics-ingestion';
import { createTestApp } from '../helpers/create-test-app';
import { resetDatabase } from '../helpers/database';
import { addWorkspaceMember, expectAccessDenied, registerWorkspaceTestUser } from '../helpers/workspace';
import type { INestApplication } from '@nestjs/common';
import { PrismaService } from 'src/database/prisma.service';
import { AnalyticsAggregateDimension, RawAnalyticsEventType, WorkspaceRole } from 'src/generated/prisma/enums';
import { AnalyticsProcessingService } from 'src/modules/analytics-engine/services/analytics-processing.service';

function readNumber(record: Record<string, unknown>, key: string): number {
  const value = record[key];

  if (typeof value !== 'number') {
    throw new Error(`Expected ${key} to be a number`);
  }

  return value;
}

function readString(record: Record<string, unknown>, key: string): string {
  const value = record[key];

  if (typeof value !== 'string') {
    throw new Error(`Expected ${key} to be a string`);
  }

  return value;
}

describe('Analytics Aggregates E2E', () => {
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

  it('builds correct hourly and daily overview totals', async () => {
    const owner = await registerWorkspaceTestUser(app, prisma);

    const website = await createTrackedWebsite(owner);

    const visitorId = uniqueTrackerId('aggregate_visitor');

    const sessionId = uniqueTrackerId('aggregate_session');

    const base = new Date(Date.now() - 6 * 60 * 60 * 1000);

    base.setUTCMinutes(10, 0, 0);

    await createRawAnalyticsEvent(prisma, website, {
      visitorId,
      sessionId,
      occurredAt: base,
      pageUrl: `${website.origin}/home`,
    });

    await createRawAnalyticsEvent(prisma, website, {
      type: RawAnalyticsEventType.CUSTOM,
      eventName: 'signup_completed',
      visitorId,
      sessionId,
      occurredAt: new Date(base.getTime() + 60_000),
    });

    await createRawAnalyticsEvent(prisma, website, {
      type: RawAnalyticsEventType.HEARTBEAT,
      visitorId,
      sessionId,
      occurredAt: new Date(base.getTime() + 120_000),
      durationMs: 15_000,
    });

    await processingService.processForWorkspace(owner.workspaceId, website.id, owner.userId, 100);

    for (const period of ['HOURLY', 'DAILY']) {
      const response = await listAnalyticsAggregates(owner, owner.workspaceId, website.id, {
        period,
        dimension: AnalyticsAggregateDimension.OVERVIEW,
        dateFrom: new Date(base.getTime() - 86_400_000).toISOString(),
        dateTo: new Date(base.getTime() + 86_400_000).toISOString(),
      });

      expect(response.status).toBe(200);

      const result = readAnalyticsAggregateList(response);

      expect(result.data).toHaveLength(1);

      const overview = result.data[0];

      expect(overview).toBeDefined();

      expect(readNumber(overview, 'visitors')).toBe(1);

      expect(readNumber(overview, 'sessions')).toBe(1);

      expect(readNumber(overview, 'pageViews')).toBe(1);

      expect(readNumber(overview, 'events')).toBe(3);

      expect(readNumber(overview, 'customEvents')).toBe(1);

      expect(readNumber(overview, 'bounces')).toBe(0);

      expect(readNumber(overview, 'totalDurationMs')).toBe(135_000);
    }
  });

  it('builds PAGE and CUSTOM_EVENT dimensions', async () => {
    const owner = await registerWorkspaceTestUser(app, prisma);

    const website = await createTrackedWebsite(owner);

    const visitorId = uniqueTrackerId('dimension_visitor');

    const sessionId = uniqueTrackerId('dimension_session');

    const occurredAt = new Date(Date.now() - 60_000);

    await createRawAnalyticsEvent(prisma, website, {
      visitorId,
      sessionId,
      occurredAt,
      pageUrl: `${website.origin}/pricing/?utm_source=test&b=2&a=1`,
      pageTitle: 'Pricing',
    });

    await createRawAnalyticsEvent(prisma, website, {
      type: RawAnalyticsEventType.CUSTOM,
      eventName: 'signup_completed',
      visitorId,
      sessionId,
      occurredAt: new Date(occurredAt.getTime() + 1_000),
    });

    await processingService.processForWorkspace(owner.workspaceId, website.id, owner.userId, 100);

    const pageResult = readAnalyticsAggregateList(
      await listAnalyticsAggregates(owner, owner.workspaceId, website.id, {
        period: 'DAILY',
        dimension: AnalyticsAggregateDimension.PAGE,
      }),
    );

    const page = findAggregate(pageResult.data, '/pricing?a=1&b=2');

    expect(page).toBeDefined();

    expect(readNumber(page, 'pageViews')).toBe(1);

    const customResult = readAnalyticsAggregateList(
      await listAnalyticsAggregates(owner, owner.workspaceId, website.id, {
        period: 'DAILY',
        dimension: AnalyticsAggregateDimension.CUSTOM_EVENT,
      }),
    );

    const custom = findAggregate(customResult.data, 'signup_completed');

    expect(custom).toBeDefined();

    expect(readNumber(custom, 'customEvents')).toBe(1);
  });

  it('builds SOURCE, COUNTRY, DEVICE, BROWSER, and OPERATING_SYSTEM dimensions', async () => {
    const owner = await registerWorkspaceTestUser(app, prisma);

    const website = await createTrackedWebsite(owner);

    const userAgent = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 Version/17.5 Mobile/15E148 Safari/604.1';

    await createRawAnalyticsEvent(prisma, website, {
      referrerUrl: 'https://www.google.com/search?q=command+center',
      countryCode: 'AE',
      userAgent,
    });

    await processingService.processForWorkspace(owner.workspaceId, website.id, owner.userId, 100);

    const expectations = [
      [AnalyticsAggregateDimension.SOURCE, 'Google'],
      [AnalyticsAggregateDimension.COUNTRY, 'AE'],
      [AnalyticsAggregateDimension.DEVICE, 'MOBILE'],
      [AnalyticsAggregateDimension.BROWSER, 'Safari'],
      [AnalyticsAggregateDimension.OPERATING_SYSTEM, 'iOS'],
    ] as const;

    for (const [dimension, value] of expectations) {
      const result = readAnalyticsAggregateList(
        await listAnalyticsAggregates(owner, owner.workspaceId, website.id, {
          period: 'DAILY',
          dimension,
        }),
      );

      expect(findAggregate(result.data, value)).toBeDefined();
    }
  });

  it('filters by period, dimension, date range, and limit', async () => {
    const owner = await registerWorkspaceTestUser(app, prisma);

    const website = await createTrackedWebsite(owner);

    const start = new Date('2026-08-01T00:00:00.000Z');

    await prisma.analyticsHourlyAggregate.createMany({
      data: Array.from(
        {
          length: 3,
        },
        (_, index) => ({
          websiteId: website.id,
          bucketStart: new Date(start.getTime() + index * 3_600_000),
          bucketEnd: new Date(start.getTime() + (index + 1) * 3_600_000),
          timeZone: 'UTC',
          dimension: AnalyticsAggregateDimension.OVERVIEW,
          dimensionKey: 'overview',
          dimensionValue: 'overview',
          dimensionLabel: 'Overview',
          visitors: index + 1,
          totalDurationMs: BigInt(index),
        }),
      ),
    });

    const response = await listAnalyticsAggregates(owner, owner.workspaceId, website.id, {
      period: 'HOURLY',
      dimension: AnalyticsAggregateDimension.OVERVIEW,
      dateFrom: start.toISOString(),
      dateTo: new Date(start.getTime() + 7_200_000).toISOString(),
      limit: 2,
    });

    expect(response.status).toBe(200);

    const result = readAnalyticsAggregateList(response);

    expect(result.period).toBe('HOURLY');

    expect(result.dimension).toBe(AnalyticsAggregateDimension.OVERVIEW);

    expect(result.data).toHaveLength(2);

    expect(readString(result.data[0], 'bucketStart')).toBe(start.toISOString());
  });

  it('rebuilds aggregates idempotently', async () => {
    const owner = await registerWorkspaceTestUser(app, prisma);

    const website = await createTrackedWebsite(owner);

    await createRawAnalyticsEvent(prisma, website);

    await processingService.processForWorkspace(owner.workspaceId, website.id, owner.userId, 100);

    const before = await prisma.analyticsDailyAggregate.findMany({
      where: {
        websiteId: website.id,
      },
      orderBy: {
        dimension: 'asc',
      },
    });

    await processingService.processForWorkspace(owner.workspaceId, website.id, owner.userId, 100);

    const after = await prisma.analyticsDailyAggregate.findMany({
      where: {
        websiteId: website.id,
      },
      orderBy: {
        dimension: 'asc',
      },
    });

    expect(
      after.map((item) => ({
        dimension: item.dimension,
        dimensionValue: item.dimensionValue,
        visitors: item.visitors,
        sessions: item.sessions,
        pageViews: item.pageViews,
        events: item.events,
      })),
    ).toEqual(
      before.map((item) => ({
        dimension: item.dimension,
        dimensionValue: item.dimensionValue,
        visitors: item.visitors,
        sessions: item.sessions,
        pageViews: item.pageViews,
        events: item.events,
      })),
    );
  });

  it('allows VIEWER reads and denies outsider and anonymous reads', async () => {
    const owner = await registerWorkspaceTestUser(app, prisma);

    const viewer = await registerWorkspaceTestUser(app, prisma);

    const outsider = await registerWorkspaceTestUser(app, prisma);

    const website = await createTrackedWebsite(owner);

    expect([200, 201]).toContain((await addWorkspaceMember(owner, viewer, WorkspaceRole.VIEWER)).status);

    expect((await listAnalyticsAggregates(viewer, owner.workspaceId, website.id)).status).toBe(200);

    expectAccessDenied(await listAnalyticsAggregates(outsider, owner.workspaceId, website.id));

    expect((await getAnonymousAnalyticsAggregates(app, owner.workspaceId, website.id)).status).toBe(401);
  });

  it('rejects malformed aggregate queries and hides foreign websites', async () => {
    const owner = await registerWorkspaceTestUser(app, prisma);

    const foreignOwner = await registerWorkspaceTestUser(app, prisma);

    const website = await createTrackedWebsite(owner);

    for (const query of [
      {
        period: 'WEEKLY',
      },
      {
        dimension: 'INVALID',
      },
      {
        limit: 0,
      },
      {
        limit: 2_001,
      },
      {
        dateFrom: 'not-a-date',
      },
      {
        dateFrom: '2026-08-02T00:00:00.000Z',
        dateTo: '2026-08-01T00:00:00.000Z',
      },
    ]) {
      expect((await listAnalyticsAggregates(owner, owner.workspaceId, website.id, query)).status).toBe(400);
    }

    const foreignResponse = await listAnalyticsAggregates(foreignOwner, owner.workspaceId, website.id);

    expectAccessDenied(foreignResponse);
  });

  it('serializes BigInt duration without precision loss', async () => {
    const owner = await registerWorkspaceTestUser(app, prisma);

    const website = await createTrackedWebsite(owner);

    const unsafeDuration = 9_007_199_254_740_993n;

    const bucketStart = new Date('2026-08-01T00:00:00.000Z');

    await prisma.analyticsDailyAggregate.create({
      data: {
        websiteId: website.id,
        bucketStart,
        bucketEnd: new Date('2026-08-02T00:00:00.000Z'),
        timeZone: 'UTC',
        dimension: AnalyticsAggregateDimension.OVERVIEW,
        dimensionKey: 'overview',
        dimensionValue: 'overview',
        dimensionLabel: 'Overview',
        totalDurationMs: unsafeDuration,
      },
    });

    const response = await listAnalyticsAggregates(owner, owner.workspaceId, website.id, {
      period: 'DAILY',
      dimension: AnalyticsAggregateDimension.OVERVIEW,
      dateFrom: bucketStart.toISOString(),
      dateTo: bucketStart.toISOString(),
    });

    expect(response.status).toBe(200);

    const result = readAnalyticsAggregateList(response);

    expect(result.data).toHaveLength(1);

    expect(result.data[0]?.totalDurationMs).toBe(unsafeDuration.toString());
  });
});
