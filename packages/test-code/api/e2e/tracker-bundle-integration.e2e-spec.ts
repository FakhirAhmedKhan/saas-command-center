import { processAnalytics } from '../helpers/analytics-engine-old';
import { createTrackedWebsite } from '../helpers/analytics-ingestion';
import { resetDatabase } from '../helpers/database';
import { registerWorkspaceTestUser } from '../helpers/workspace';
import { AppModule } from 'src/app.module';
import { configureApplication } from 'src/bootstrap/configure-application';
import type { INestApplication } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { PrismaService } from 'src/database/prisma.service';
import { AnalyticsProcessingStatus, RawAnalyticsEventType } from 'src/generated/prisma/enums';
import request from 'supertest';

interface CapturedTrackerRequest {
  url: string;
  method: string;
  mode: string;
  keepalive: boolean;
  headers: Record<string, string>;
  body: string;
}

interface TrackerPayload {
  websiteId: string;
  trackingKey: string;
  sdkVersion: string;
  sentAt: string;
  events: Array<{
    eventId: string;
    type: RawAnalyticsEventType;
    visitorId: string;
    sessionId: string;
    timestamp: string;
    url: string;
    title?: string;
    eventName?: string;
    properties?: Record<string, unknown>;
    durationMs?: number;
  }>;
}

describe('Actual Tracker Bundle -> API -> Analytics E2E', () => {
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

  it('executes the built Tracker bundle and processes its real HTTP payload end to end', async () => {
    const owner = await registerWorkspaceTestUser(app, prisma);

    const trackedWebsite = await createTrackedWebsite(owner);

    const captureScript = resolve(__dirname, '../test-support/tracker-bundle-capture.mjs');

    const captureResult = spawnSync(process.execPath, [captureScript, trackedWebsite.id, trackedWebsite.trackingKey, trackedWebsite.origin], {
      cwd: process.cwd(),
      encoding: 'utf8',
    });

    expect(captureResult.status).toBe(0);
    expect(captureResult.stderr).toBe('');

    const capturedRequests = JSON.parse(captureResult.stdout) as CapturedTrackerRequest[];

    expect(capturedRequests.length).toBeGreaterThanOrEqual(2);

    const payloads = capturedRequests.map((captured) => JSON.parse(captured.body) as TrackerPayload);

    const trackerEvents = payloads.flatMap((payload) => payload.events);

    expect(trackerEvents).toHaveLength(3);

    expect(new Set(trackerEvents.map((event) => event.type))).toEqual(
      new Set([RawAnalyticsEventType.PAGE_VIEW, RawAnalyticsEventType.HEARTBEAT, RawAnalyticsEventType.CUSTOM]),
    );

    for (const payload of payloads) {
      expect(payload.websiteId).toBe(trackedWebsite.id);
      expect(payload.trackingKey).toBe(trackedWebsite.trackingKey);
      expect(payload.sdkVersion).toBe('1.0.0');

      expect(Number.isNaN(Date.parse(payload.sentAt))).toBe(false);
    }

    for (const [requestIndex, captured] of capturedRequests.entries()) {
      expect(captured.method).toBe('POST');
      expect(captured.mode).toBe('no-cors');
      expect(captured.keepalive).toBe(true);

      expect(captured.headers['Content-Type']!).toBe('text/plain;charset=UTF-8');

      const response = await request(app.getHttpServer())
        .post('/api/v1/collect')
        .set('Origin', trackedWebsite.origin)
        .set('User-Agent', 'Actual-CommandCenter-Tracker/1.0.0')
        .set('Content-Type', captured.headers['Content-Type']!)
        .send(captured.body);

      if (response.status !== 202) {
        console.error(
          'ACTUAL_TRACKER_API_DIAGNOSTIC',
          JSON.stringify(
            {
              requestIndex,
              status: response.status,
              responseBody: response.body,
              responseText: response.text,
              capturedRequest: {
                url: captured.url,
                method: captured.method,
                mode: captured.mode,
                keepalive: captured.keepalive,
                headers: captured.headers,
              },
              payload: JSON.parse(captured.body),
            },
            null,
            2,
          ),
        );
      }

      expect(response.status).toBe(202);
    }

    expect(
      await prisma.rawAnalyticsEvent.count({
        where: {
          websiteId: trackedWebsite.id,
        },
      }),
    ).toBe(3);

    const rawEvents = await prisma.rawAnalyticsEvent.findMany({
      where: {
        websiteId: trackedWebsite.id,
      },
      orderBy: {
        occurredAt: 'asc',
      },
    });

    expect(new Set(rawEvents.map((event) => event.type))).toEqual(
      new Set([RawAnalyticsEventType.PAGE_VIEW, RawAnalyticsEventType.HEARTBEAT, RawAnalyticsEventType.CUSTOM]),
    );

    const rawPageView = rawEvents.find((event) => event.type === RawAnalyticsEventType.PAGE_VIEW);

    const rawHeartbeat = rawEvents.find((event) => event.type === RawAnalyticsEventType.HEARTBEAT);

    const rawCustomEvent = rawEvents.find((event) => event.type === RawAnalyticsEventType.CUSTOM);

    expect(rawPageView).toBeDefined();
    expect(rawHeartbeat).toBeDefined();
    expect(rawCustomEvent).toBeDefined();

    expect(rawPageView?.pageUrl).toBe(`${trackedWebsite.origin}/bundle-integration?a=1&utm_source=bundle&z=9`);

    expect(rawPageView?.pageUrl).not.toContain('#');

    expect(rawHeartbeat?.durationMs).toBe(15_000);

    expect(rawCustomEvent?.eventName).toBe('checkout_started');

    expect(rawCustomEvent?.properties).toMatchObject({
      plan: 'pro',
      source: 'actual-bundle',
    });

    const visitorIds = new Set(rawEvents.map((event) => event.visitorId));
    const sessionIds = new Set(rawEvents.map((event) => event.sessionId));

    expect(visitorIds.size).toBe(1);
    expect(sessionIds.size).toBe(1);

    const [externalVisitorId] = [...visitorIds];
    const [externalSessionId] = [...sessionIds];

    const processResponse = await processAnalytics(owner, owner.workspaceId, trackedWebsite.id, {
      maxEvents: 100,
    });

    expect(processResponse.status).toBe(201);

    expect(processResponse.body.run).toMatchObject({
      status: AnalyticsProcessingStatus.COMPLETED,
      rawEventsProcessed: 3,
    });

    expect(
      await prisma.rawAnalyticsEvent.count({
        where: {
          websiteId: trackedWebsite.id,
          processedAt: null,
        },
      }),
    ).toBe(0);

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
        externalVisitorId,
      },
    });

    expect(visitor.sessionCount).toBe(1);
    expect(visitor.pageViewCount).toBe(1);
    expect(visitor.eventCount).toBe(3);

    const session = await prisma.analyticsSession.findFirstOrThrow({
      where: {
        websiteId: trackedWebsite.id,
        externalSessionId,
      },
    });

    expect(session.visitorId).toBe(visitor.id);
    expect(session.pageViewCount).toBe(1);
    expect(session.customEventCount).toBe(1);
    expect(session.engagedDurationMs).toBe(15_000);
    expect(session.bounced).toBe(false);

    const pageView = await prisma.analyticsPageView.findFirstOrThrow({
      where: {
        websiteId: trackedWebsite.id,
      },
    });

    expect(pageView.normalizedPath).toBe('/bundle-integration?a=1&z=9');

    expect(pageView.isEntry).toBe(true);
    expect(pageView.isExit).toBe(true);

    const customEvent = await prisma.analyticsEvent.findFirstOrThrow({
      where: {
        websiteId: trackedWebsite.id,
        eventName: 'checkout_started',
      },
    });

    expect(customEvent.properties).toMatchObject({
      plan: 'pro',
      source: 'actual-bundle',
    });
  });
});
