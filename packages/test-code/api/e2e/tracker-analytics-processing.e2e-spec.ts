import { processAnalytics } from '../helpers/analytics-engine-old';
import { buildCollectPayload, buildTrackerEvent, createTrackedWebsite, uniqueTrackerId } from '../helpers/analytics-ingestion';
import { resetDatabase } from '../helpers/database';
import { registerWorkspaceTestUser } from '../helpers/workspace';
import { AppModule } from 'src/app.module';
import { configureApplication } from 'src/bootstrap/configure-application';
import type { INestApplication } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { PrismaService } from 'src/database/prisma.service';
import { AnalyticsProcessingStatus, RawAnalyticsEventType } from 'src/generated/prisma/enums';
import request from 'supertest';

describe('Tracker -> Analytics Processing E2E', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeEach(async () => {
    app = await NestFactory.create(AppModule, {
      bodyParser: false,
      logger: false,
    });

    configureApplication(app, {
      enableSwagger: false,
    });

    await app.init();

    prisma = app.get(PrismaService);

    await resetDatabase(prisma);
  });

  afterEach(async () => {
    await app.close();
  });

  it('processes a Tracker-compatible PAGE_VIEW, HEARTBEAT, and CUSTOM batch into analytics records', async () => {
    const owner = await registerWorkspaceTestUser(app, prisma);

    const trackedWebsite = await createTrackedWebsite(owner);

    const visitorId = uniqueTrackerId('tracker_visitor');
    const sessionId = uniqueTrackerId('tracker_session');

    const startedAt = new Date(Date.now() - 60_000);
    const heartbeatAt = new Date(startedAt.getTime() + 15_000);
    const customEventAt = new Date(startedAt.getTime() + 20_000);

    const pageView = buildTrackerEvent(trackedWebsite.origin, {
      type: RawAnalyticsEventType.PAGE_VIEW,
      visitorId,
      sessionId,
      timestamp: startedAt.toISOString(),
      url: `${trackedWebsite.origin}/tracker-integration?z=9&utm_source=test&a=1#section`,
      title: 'Tracker Integration',
    });

    const heartbeat = buildTrackerEvent(trackedWebsite.origin, {
      type: RawAnalyticsEventType.HEARTBEAT,
      visitorId,
      sessionId,
      timestamp: heartbeatAt.toISOString(),
      url: `${trackedWebsite.origin}/tracker-integration`,
      durationMs: 15_000,
    });

    const customEvent = buildTrackerEvent(trackedWebsite.origin, {
      type: RawAnalyticsEventType.CUSTOM,
      visitorId,
      sessionId,
      timestamp: customEventAt.toISOString(),
      url: `${trackedWebsite.origin}/tracker-integration`,
      eventName: 'checkout_started',
      properties: {
        plan: 'pro',
        source: 'tracker-e2e',
      },
    });

    const payload = buildCollectPayload(trackedWebsite, [pageView, heartbeat, customEvent], {
      sdkVersion: '1.0.0',
    });

    const collectResponse = await request(app.getHttpServer())
      .post('/api/v1/collect')
      .set('Origin', trackedWebsite.origin)
      .set('User-Agent', 'CommandCenter-Tracker/1.0.0')
      .set('Content-Type', 'text/plain;charset=UTF-8')
      .send(JSON.stringify(payload));

    expect(collectResponse.status).toBe(202);

    expect(collectResponse.body).toMatchObject({
      accepted: 3,
      duplicates: 0,
    });

    const rawBeforeProcessing = await prisma.rawAnalyticsEvent.findMany({
      where: {
        websiteId: trackedWebsite.id,
      },
    });

    expect(rawBeforeProcessing).toHaveLength(3);

    expect(rawBeforeProcessing.every((event) => event.processedAt === null)).toBe(true);

    expect(new Set(rawBeforeProcessing.map((event) => event.type))).toEqual(
      new Set([RawAnalyticsEventType.PAGE_VIEW, RawAnalyticsEventType.HEARTBEAT, RawAnalyticsEventType.CUSTOM]),
    );

    expect(rawBeforeProcessing.every((event) => event.visitorId === visitorId && event.sessionId === sessionId && event.sdkVersion === '1.0.0')).toBe(true);

    const processResponse = await processAnalytics(owner, owner.workspaceId, trackedWebsite.id, {
      maxEvents: 100,
    });

    expect(processResponse.status).toBe(201);

    expect(processResponse.body.run).toMatchObject({
      status: AnalyticsProcessingStatus.COMPLETED,
      rawEventsProcessed: 3,
    });

    const rawAfterProcessing = await prisma.rawAnalyticsEvent.findMany({
      where: {
        websiteId: trackedWebsite.id,
      },
    });

    expect(rawAfterProcessing).toHaveLength(3);

    expect(rawAfterProcessing.every((event) => event.processedAt !== null)).toBe(true);

    expect(
      await prisma.analyticsEvent.count({
        where: {
          websiteId: trackedWebsite.id,
        },
      }),
    ).toBe(3);

    const visitor = await prisma.analyticsVisitor.findFirstOrThrow({
      where: {
        websiteId: trackedWebsite.id,
        externalVisitorId: visitorId,
      },
    });

    expect(visitor.sessionCount).toBe(1);
    expect(visitor.pageViewCount).toBe(1);
    expect(visitor.eventCount).toBe(3);

    const session = await prisma.analyticsSession.findFirstOrThrow({
      where: {
        websiteId: trackedWebsite.id,
        externalSessionId: sessionId,
      },
    });

    expect(session.visitorId).toBe(visitor.id);
    expect(session.pageViewCount).toBe(1);
    expect(session.customEventCount).toBe(1);
    expect(session.engagedDurationMs).toBe(15_000);
    expect(session.bounced).toBe(false);

    const normalizedPageView = await prisma.analyticsPageView.findFirstOrThrow({
      where: {
        websiteId: trackedWebsite.id,
      },
    });

    expect(normalizedPageView.normalizedPath).toBe('/tracker-integration?a=1&z=9');

    expect(normalizedPageView.pageUrl).not.toContain('utm_source');
    expect(normalizedPageView.pageUrl).not.toContain('#');

    expect(normalizedPageView.isEntry).toBe(true);
    expect(normalizedPageView.isExit).toBe(true);

    const normalizedCustomEvent = await prisma.analyticsEvent.findFirstOrThrow({
      where: {
        websiteId: trackedWebsite.id,
        sourceEventId: customEvent.eventId,
      },
    });

    expect(normalizedCustomEvent.eventName).toBe('checkout_started');
  });
});
