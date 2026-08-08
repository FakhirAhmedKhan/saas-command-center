import type { INestApplication } from '@nestjs/common';

import { AnalyticsDeviceType, RawAnalyticsEventType } from 'src/generated/prisma/enums';

import { PrismaService } from 'src/database/prisma.service';

import { AnalyticsProcessingService } from 'src/modules/analytics-engine/services/analytics-processing.service';

import {
  buildTrackerEvent,
  collectEvents,
  createTrackedWebsite,
  expectCollectionAccepted,
  uniqueTrackerId,
} from './helpers/analytics-ingestion';

import { createTestApp } from './helpers/create-test-app';

import { resetDatabase } from './helpers/database';

import { registerWorkspaceTestUser } from './helpers/workspace';

describe('Analytics Sessions E2E', () => {
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

  async function processSession(
    events: ReturnType<typeof buildTrackerEvent>[],
    options: {
      userAgent?: string;
    } = {},
  ) {
    const owner = await registerWorkspaceTestUser(app, prisma);

    const trackedWebsite = await createTrackedWebsite(owner);

    expectCollectionAccepted(
      await collectEvents(
        app,
        trackedWebsite,
        events.map((event) => ({
          ...event,
          url: event.url.replace(/^https:\/\/[^/]+/, trackedWebsite.origin),
        })),
        {
          userAgent: options.userAgent,
        },
      ),
      events.length,
    );

    await processingService.processForWorkspace(
      owner.workspaceId,
      trackedWebsite.id,
      owner.userId,
      100,
    );

    const session = await prisma.analyticsSession.findFirstOrThrow({
      where: {
        websiteId: trackedWebsite.id,
      },
    });

    return {
      owner,
      trackedWebsite,
      session,
    };
  }

  it('marks a single unengaged page view as a bounce', async () => {
    const visitorId = uniqueTrackerId('visitor');

    const sessionId = uniqueTrackerId('session');

    const origin = 'https://placeholder.example.test';

    const result = await processSession([
      buildTrackerEvent(origin, {
        visitorId,
        sessionId,
        type: RawAnalyticsEventType.PAGE_VIEW,
      }),
    ]);

    expect(result.session.bounced).toBe(true);

    expect(result.session.pageViewCount).toBe(1);

    expect(result.session.customEventCount).toBe(0);

    expect(result.session.engagedDurationMs).toBe(0);
  });

  it('marks a page view plus ten seconds of engagement as not bounced', async () => {
    const visitorId = uniqueTrackerId('visitor');

    const sessionId = uniqueTrackerId('session');

    const origin = 'https://placeholder.example.test';

    const timestamp = new Date(Date.now() - 60_000).toISOString();

    const result = await processSession([
      buildTrackerEvent(origin, {
        visitorId,
        sessionId,
        timestamp,
        type: RawAnalyticsEventType.PAGE_VIEW,
      }),
      buildTrackerEvent(origin, {
        visitorId,
        sessionId,
        timestamp,
        type: RawAnalyticsEventType.HEARTBEAT,
        durationMs: 10_000,
      }),
    ]);

    expect(result.session.bounced).toBe(false);

    expect(result.session.engagedDurationMs).toBe(10_000);

    expect(result.session.durationMs).toBe(10_000);
  });

  it('marks two page views as not bounced and sets entry and exit paths', async () => {
    const visitorId = uniqueTrackerId('visitor');

    const sessionId = uniqueTrackerId('session');

    const origin = 'https://placeholder.example.test';

    const first = new Date(Date.now() - 120_000);

    const second = new Date(first.getTime() + 30_000);

    const result = await processSession([
      buildTrackerEvent(origin, {
        visitorId,
        sessionId,
        timestamp: first.toISOString(),
        url: `${origin}/first`,
        title: 'First',
      }),
      buildTrackerEvent(origin, {
        visitorId,
        sessionId,
        timestamp: second.toISOString(),
        url: `${origin}/second`,
        title: 'Second',
      }),
    ]);

    expect(result.session.bounced).toBe(false);

    expect(result.session.pageViewCount).toBe(2);

    expect(result.session.entryPath).toBe('/first');

    expect(result.session.exitPath).toBe('/second');
  });

  it('supports a custom-event-only session with null entry and exit', async () => {
    const origin = 'https://placeholder.example.test';

    const result = await processSession([
      buildTrackerEvent(origin, {
        type: RawAnalyticsEventType.CUSTOM,
        eventName: 'purchase_completed',
      }),
    ]);

    expect(result.session.pageViewCount).toBe(0);

    expect(result.session.customEventCount).toBe(1);

    expect(result.session.bounced).toBe(false);

    expect(result.session.entryPath).toBeNull();

    expect(result.session.exitPath).toBeNull();
  });

  it('rebuilds session start and end when late events arrive', async () => {
    const owner = await registerWorkspaceTestUser(app, prisma);

    const trackedWebsite = await createTrackedWebsite(owner);

    const visitorId = uniqueTrackerId('visitor');

    const sessionId = uniqueTrackerId('session');

    const middle = new Date(Date.now() - 120_000);

    expectCollectionAccepted(
      await collectEvents(app, trackedWebsite, [
        buildTrackerEvent(trackedWebsite.origin, {
          visitorId,
          sessionId,
          timestamp: middle.toISOString(),
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

    const earlier = new Date(middle.getTime() - 30_000);

    const later = new Date(middle.getTime() + 45_000);

    expectCollectionAccepted(
      await collectEvents(app, trackedWebsite, [
        buildTrackerEvent(trackedWebsite.origin, {
          visitorId,
          sessionId,
          timestamp: earlier.toISOString(),
          url: `${trackedWebsite.origin}/entry`,
        }),
        buildTrackerEvent(trackedWebsite.origin, {
          type: RawAnalyticsEventType.HEARTBEAT,
          visitorId,
          sessionId,
          timestamp: later.toISOString(),
          durationMs: 5_000,
        }),
      ]),
      2,
    );

    await processingService.processForWorkspace(
      owner.workspaceId,
      trackedWebsite.id,
      owner.userId,
      100,
    );

    const session = await prisma.analyticsSession.findFirstOrThrow({
      where: {
        websiteId: trackedWebsite.id,
        externalSessionId: sessionId,
      },
    });

    expect(session.startedAt.toISOString()).toBe(earlier.toISOString());

    expect(session.endedAt.toISOString()).toBe(new Date(later.getTime() + 5_000).toISOString());

    expect(session.entryPath).toBe('/entry');
  });

  it('caps overlapping engagement at the session wall duration', async () => {
    const visitorId = uniqueTrackerId('visitor');

    const sessionId = uniqueTrackerId('session');

    const origin = 'https://placeholder.example.test';

    const start = new Date(Date.now() - 120_000);

    const result = await processSession([
      buildTrackerEvent(origin, {
        visitorId,
        sessionId,
        timestamp: start.toISOString(),
        type: RawAnalyticsEventType.HEARTBEAT,
        durationMs: 10_000,
      }),
      buildTrackerEvent(origin, {
        visitorId,
        sessionId,
        timestamp: new Date(start.getTime() + 5_000).toISOString(),
        type: RawAnalyticsEventType.HEARTBEAT,
        durationMs: 10_000,
      }),
    ]);

    expect(result.session.durationMs).toBe(15_000);

    expect(result.session.engagedDurationMs).toBe(15_000);
  });

  it('classifies bot user agents', async () => {
    const origin = 'https://placeholder.example.test';

    const result = await processSession([buildTrackerEvent(origin)], {
      userAgent: 'Googlebot/2.1 (+http://www.google.com/bot.html)',
    });

    expect(result.session.deviceType).toBe(AnalyticsDeviceType.BOT);

    expect(result.session.browserName).toBe('Bot');
  });
});
