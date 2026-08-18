import { buildTrackerEvent, collectEvents, createTrackedWebsite, expectCollectionAccepted, uniqueTrackerId } from '../helpers/analytics-ingestion';
import { createTestApp } from '../helpers/create-test-app';
import { resetDatabase } from '../helpers/database';
import { registerWorkspaceTestUser } from '../helpers/workspace';
import type { INestApplication } from '@nestjs/common';
import { PrismaService } from 'src/database/prisma.service';
import { AnalyticsSourceType, RawAnalyticsEventType } from 'src/generated/prisma/enums';
import { AnalyticsProcessingService } from 'src/modules/analytics-engine/services/analytics-processing.service';

describe('Analytics Page Views E2E', () => {
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

  it('normalizes paths, removes tracking parameters, and sorts retained query parameters', async () => {
    const owner = await registerWorkspaceTestUser(app, prisma);

    const trackedWebsite = await createTrackedWebsite(owner);

    expectCollectionAccepted(
      await collectEvents(app, trackedWebsite, [
        buildTrackerEvent(trackedWebsite.origin, {
          url: `${trackedWebsite.origin}/products//phones/?utm_source=newsletter&z=9&a=1#section`,
        }),
      ]),
      1,
    );

    await processingService.processForWorkspace(owner.workspaceId, trackedWebsite.id, owner.userId, 100);

    const pageView = await prisma.analyticsPageView.findFirstOrThrow({
      where: {
        websiteId: trackedWebsite.id,
      },
    });

    expect(pageView.normalizedPath).toBe('/products/phones?a=1&z=9');

    expect(pageView.pageUrl).not.toContain('utm_source');

    expect(pageView.pageUrl).not.toContain('#');
  });

  it('marks one page as both entry and exit', async () => {
    const owner = await registerWorkspaceTestUser(app, prisma);

    const trackedWebsite = await createTrackedWebsite(owner);

    expectCollectionAccepted(
      await collectEvents(app, trackedWebsite, [
        buildTrackerEvent(trackedWebsite.origin, {
          url: `${trackedWebsite.origin}/landing`,
        }),
      ]),
      1,
    );

    await processingService.processForWorkspace(owner.workspaceId, trackedWebsite.id, owner.userId, 100);

    const pageView = await prisma.analyticsPageView.findFirstOrThrow({
      where: {
        websiteId: trackedWebsite.id,
      },
    });

    expect(pageView.isEntry).toBe(true);

    expect(pageView.isExit).toBe(true);
  });

  it('derives direct, internal, search, social, and referral sources', async () => {
    const owner = await registerWorkspaceTestUser(app, prisma);

    const trackedWebsite = await createTrackedWebsite(owner);

    const cases = [
      {
        referrer: undefined,
        expected: AnalyticsSourceType.DIRECT,
      },
      {
        referrer: `${trackedWebsite.origin}/previous`,
        expected: AnalyticsSourceType.INTERNAL,
      },
      {
        referrer: 'https://www.google.com/search?q=analytics',
        expected: AnalyticsSourceType.SEARCH,
      },
      {
        referrer: 'https://www.linkedin.com/feed/',
        expected: AnalyticsSourceType.SOCIAL,
      },
      {
        referrer: 'https://partner.example.org/article',
        expected: AnalyticsSourceType.REFERRAL,
      },
    ];

    const events = cases.map((item, index) => {
      const event = buildTrackerEvent(trackedWebsite.origin, {
        visitorId: uniqueTrackerId(`visitor_${index}`),
        sessionId: uniqueTrackerId(`session_${index}`),
        url: `${trackedWebsite.origin}/source-${index}`,
      });

      if (item.referrer === undefined) {
        delete event.referrer;
      } else {
        event.referrer = item.referrer;
      }

      return event;
    });

    expectCollectionAccepted(await collectEvents(app, trackedWebsite, events), events.length);

    await processingService.processForWorkspace(owner.workspaceId, trackedWebsite.id, owner.userId, 100);

    const pageViews = await prisma.analyticsPageView.findMany({
      where: {
        websiteId: trackedWebsite.id,
      },
      orderBy: {
        normalizedPath: 'asc',
      },
    });

    const sourceTypes = new Set(pageViews.map((pageView) => pageView.sourceType));

    for (const item of cases) {
      expect(sourceTypes.has(item.expected)).toBe(true);
    }
  });

  it('creates page views only for PAGE_VIEW events', async () => {
    const owner = await registerWorkspaceTestUser(app, prisma);

    const trackedWebsite = await createTrackedWebsite(owner);

    const visitorId = uniqueTrackerId('visitor');

    const sessionId = uniqueTrackerId('session');

    expectCollectionAccepted(
      await collectEvents(app, trackedWebsite, [
        buildTrackerEvent(trackedWebsite.origin, {
          visitorId,
          sessionId,
          type: RawAnalyticsEventType.PAGE_VIEW,
        }),
        buildTrackerEvent(trackedWebsite.origin, {
          visitorId,
          sessionId,
          type: RawAnalyticsEventType.HEARTBEAT,
          durationMs: 5_000,
        }),
        buildTrackerEvent(trackedWebsite.origin, {
          visitorId,
          sessionId,
          type: RawAnalyticsEventType.CUSTOM,
          eventName: 'cta_clicked',
        }),
      ]),
      3,
    );

    await processingService.processForWorkspace(owner.workspaceId, trackedWebsite.id, owner.userId, 100);

    expect(
      await prisma.analyticsEvent.count({
        where: {
          websiteId: trackedWebsite.id,
        },
      }),
    ).toBe(3);

    expect(
      await prisma.analyticsPageView.count({
        where: {
          websiteId: trackedWebsite.id,
        },
      }),
    ).toBe(1);
  });

  it('does not duplicate normalized events or page views on repeated processing', async () => {
    const owner = await registerWorkspaceTestUser(app, prisma);

    const trackedWebsite = await createTrackedWebsite(owner);

    const event = buildTrackerEvent(trackedWebsite.origin);

    expectCollectionAccepted(await collectEvents(app, trackedWebsite, [event]), 1);

    await processingService.processForWorkspace(owner.workspaceId, trackedWebsite.id, owner.userId, 100);

    await processingService.processForWorkspace(owner.workspaceId, trackedWebsite.id, owner.userId, 100);

    expect(
      await prisma.analyticsEvent.count({
        where: {
          websiteId: trackedWebsite.id,
          sourceEventId: event.eventId,
        },
      }),
    ).toBe(1);

    expect(
      await prisma.analyticsPageView.count({
        where: {
          websiteId: trackedWebsite.id,
        },
      }),
    ).toBe(1);
  });

  it('keeps normalized event IDs isolated between websites', async () => {
    const owner = await registerWorkspaceTestUser(app, prisma);

    const websiteA = await createTrackedWebsite(owner);

    const websiteB = await createTrackedWebsite(owner);

    const sharedEventId = uniqueTrackerId('shared_event');

    for (const website of [websiteA, websiteB]) {
      expectCollectionAccepted(
        await collectEvents(app, website, [
          buildTrackerEvent(website.origin, {
            eventId: sharedEventId,
          }),
        ]),
        1,
      );

      await processingService.processForWorkspace(owner.workspaceId, website.id, owner.userId, 100);
    }

    expect(
      await prisma.analyticsEvent.count({
        where: {
          sourceEventId: sharedEventId,
        },
      }),
    ).toBe(2);
  });
});
