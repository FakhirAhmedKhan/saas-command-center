import { createRawAnalyticsEvent } from '../helpers/analytics-engine';
import { createTrackedWebsite, uniqueTrackerId } from '../helpers/analytics-ingestion';
import { createTestApp } from '../helpers/create-test-app';
import { resetDatabase } from '../helpers/database';
import { registerWorkspaceTestUser } from '../helpers/workspace';
import type { INestApplication } from '@nestjs/common';
import { PrismaService } from 'src/database/prisma.service';
import { AnalyticsAggregateDimension } from 'src/generated/prisma/enums';
import { AnalyticsProcessingService } from 'src/modules/analytics-engine/services/analytics-processing.service';

describe('Analytics Time Zones E2E', () => {
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

  async function processOneEvent(timeZone: string, occurredAt: Date) {
    const owner = await registerWorkspaceTestUser(app, prisma);

    const website = await createTrackedWebsite(owner);

    await prisma.website.update({
      where: {
        id: website.id,
      },
      data: {
        timeZone,
      },
    });

    await createRawAnalyticsEvent(prisma, website, {
      occurredAt,
    });

    await processingService.processForWorkspace(owner.workspaceId, website.id, owner.userId, 100);

    return {
      owner,
      website,
    };
  }

  it('uses UTC midnight for UTC daily buckets', async () => {
    const { website } = await processOneEvent('UTC', new Date('2026-08-06T23:30:00.000Z'));

    const aggregate = await prisma.analyticsDailyAggregate.findFirstOrThrow({
      where: {
        websiteId: website.id,
        dimension: AnalyticsAggregateDimension.OVERVIEW,
      },
    });

    expect(aggregate.bucketStart.toISOString()).toBe('2026-08-06T00:00:00.000Z');

    expect(aggregate.bucketEnd.toISOString()).toBe('2026-08-07T00:00:00.000Z');
  });

  it('uses Asia/Dubai local midnight for daily buckets', async () => {
    const { website } = await processOneEvent('Asia/Dubai', new Date('2026-08-06T23:30:00.000Z'));

    const aggregate = await prisma.analyticsDailyAggregate.findFirstOrThrow({
      where: {
        websiteId: website.id,
        dimension: AnalyticsAggregateDimension.OVERVIEW,
      },
    });

    expect(aggregate.bucketStart.toISOString()).toBe('2026-08-06T20:00:00.000Z');

    expect(aggregate.bucketEnd.toISOString()).toBe('2026-08-07T20:00:00.000Z');
  });

  it('creates a 23-hour daily bucket across DST spring-forward', async () => {
    const { website } = await processOneEvent('America/New_York', new Date('2026-03-08T12:00:00.000Z'));

    const aggregate = await prisma.analyticsDailyAggregate.findFirstOrThrow({
      where: {
        websiteId: website.id,
        dimension: AnalyticsAggregateDimension.OVERVIEW,
      },
    });

    expect(aggregate.bucketStart.toISOString()).toBe('2026-03-08T05:00:00.000Z');

    expect(aggregate.bucketEnd.toISOString()).toBe('2026-03-09T04:00:00.000Z');

    expect(aggregate.bucketEnd.getTime() - aggregate.bucketStart.getTime()).toBe(23 * 60 * 60 * 1000);
  });

  it('creates a 25-hour daily bucket across DST fall-back', async () => {
    const { website } = await processOneEvent('America/New_York', new Date('2026-11-01T12:00:00.000Z'));

    const aggregate = await prisma.analyticsDailyAggregate.findFirstOrThrow({
      where: {
        websiteId: website.id,
        dimension: AnalyticsAggregateDimension.OVERVIEW,
      },
    });

    expect(aggregate.bucketStart.toISOString()).toBe('2026-11-01T04:00:00.000Z');

    expect(aggregate.bucketEnd.toISOString()).toBe('2026-11-02T05:00:00.000Z');

    expect(aggregate.bucketEnd.getTime() - aggregate.bucketStart.getTime()).toBe(25 * 60 * 60 * 1000);
  });

  it('splits events across Asia/Dubai local midnight', async () => {
    const owner = await registerWorkspaceTestUser(app, prisma);

    const website = await createTrackedWebsite(owner);

    await prisma.website.update({
      where: {
        id: website.id,
      },
      data: {
        timeZone: 'Asia/Dubai',
      },
    });

    await createRawAnalyticsEvent(prisma, website, {
      visitorId: uniqueTrackerId('visitor_before'),
      sessionId: uniqueTrackerId('session_before'),
      occurredAt: new Date('2026-08-06T19:59:00.000Z'),
    });

    await createRawAnalyticsEvent(prisma, website, {
      visitorId: uniqueTrackerId('visitor_after'),
      sessionId: uniqueTrackerId('session_after'),
      occurredAt: new Date('2026-08-06T20:01:00.000Z'),
    });

    await processingService.processForWorkspace(owner.workspaceId, website.id, owner.userId, 100);

    const overview = await prisma.analyticsDailyAggregate.findMany({
      where: {
        websiteId: website.id,
        dimension: AnalyticsAggregateDimension.OVERVIEW,
      },
      orderBy: {
        bucketStart: 'asc',
      },
    });

    expect(overview).toHaveLength(2);

    expect(overview.map((item) => item.bucketStart.toISOString())).toEqual(['2026-08-05T20:00:00.000Z', '2026-08-06T20:00:00.000Z']);
  });
});
