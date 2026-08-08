import type { INestApplication } from '@nestjs/common';

import { RawAnalyticsEventType } from 'src/generated/prisma/enums';

import { PrismaService } from 'src/database/prisma.service';

import { recordString } from './helpers/application';

import {
  buildTrackerEvent,
  collectEvents,
  createTrackedWebsite,
  expectCollectionAccepted,
  findRawEvent,
  listRawEvents,
  readRawEventList,
  uniqueTrackerId,
} from './helpers/analytics-ingestion';

import { createTestApp } from './helpers/create-test-app';

import { resetDatabase } from './helpers/database';

import { registerWorkspaceTestUser } from './helpers/workspace';

describe('Raw Events E2E', () => {
  let app: INestApplication;

  let prisma: PrismaService;

  beforeEach(async () => {
    app = await createTestApp();

    prisma = app.get(PrismaService);

    await resetDatabase(prisma);
  });

  afterEach(async () => {
    await app.close();
  });

  it('lists raw events with pagination metadata', async () => {
    const owner = await registerWorkspaceTestUser(app, prisma);

    const trackedWebsite = await createTrackedWebsite(owner);

    const events = Array.from(
      {
        length: 3,
      },
      (_, index) =>
        buildTrackerEvent(trackedWebsite.origin, {
          title: `Raw event ${index + 1}`,
        }),
    );

    expectCollectionAccepted(await collectEvents(app, trackedWebsite, events), 3);

    const firstPage = readRawEventList(
      await listRawEvents(owner, trackedWebsite.id, {
        page: 1,
        limit: 2,
      }),
    );

    expect(firstPage.data).toHaveLength(2);

    expect(firstPage.meta).toEqual({
      page: 1,
      limit: 2,
      total: 3,
      totalPages: 2,
      hasNextPage: true,
      hasPreviousPage: false,
    });

    const secondPage = readRawEventList(
      await listRawEvents(owner, trackedWebsite.id, {
        page: 2,
        limit: 2,
      }),
    );

    expect(secondPage.data).toHaveLength(1);

    expect(secondPage.meta.hasNextPage).toBe(false);

    expect(secondPage.meta.hasPreviousPage).toBe(true);
  });

  it('filters by type and case-insensitive custom event name', async () => {
    const owner = await registerWorkspaceTestUser(app, prisma);

    const trackedWebsite = await createTrackedWebsite(owner);

    const pageView = buildTrackerEvent(trackedWebsite.origin, {
      type: RawAnalyticsEventType.PAGE_VIEW,
    });

    const checkout = buildTrackerEvent(trackedWebsite.origin, {
      type: RawAnalyticsEventType.CUSTOM,

      eventName: 'Checkout_Completed',
    });

    const signup = buildTrackerEvent(trackedWebsite.origin, {
      type: RawAnalyticsEventType.CUSTOM,

      eventName: 'signup_completed',
    });

    expectCollectionAccepted(
      await collectEvents(app, trackedWebsite, [pageView, checkout, signup]),
      3,
    );

    const customList = readRawEventList(
      await listRawEvents(owner, trackedWebsite.id, {
        type: RawAnalyticsEventType.CUSTOM,
      }),
    );

    expect(customList.data).toHaveLength(2);

    expect(findRawEvent(customList.data, pageView.eventId)).toBeUndefined();

    const checkoutList = readRawEventList(
      await listRawEvents(owner, trackedWebsite.id, {
        eventName: 'checkout',
      }),
    );

    expect(checkoutList.data).toHaveLength(1);

    expect(recordString(checkoutList.data[0] ?? {}, 'eventId')).toBe(checkout.eventId);
  });

  it('filters by visitor and session identifiers', async () => {
    const owner = await registerWorkspaceTestUser(app, prisma);

    const trackedWebsite = await createTrackedWebsite(owner);

    const visitorA = uniqueTrackerId('visitor_a');

    const visitorB = uniqueTrackerId('visitor_b');

    const sessionA = uniqueTrackerId('session_a');

    const sessionB = uniqueTrackerId('session_b');

    const firstEvent = buildTrackerEvent(trackedWebsite.origin, {
      visitorId: visitorA,

      sessionId: sessionA,
    });

    const secondEvent = buildTrackerEvent(trackedWebsite.origin, {
      visitorId: visitorB,

      sessionId: sessionB,
    });

    expectCollectionAccepted(
      await collectEvents(app, trackedWebsite, [firstEvent, secondEvent]),
      2,
    );

    const visitorList = readRawEventList(
      await listRawEvents(owner, trackedWebsite.id, {
        visitorId: visitorA,
      }),
    );

    expect(visitorList.data).toHaveLength(1);

    expect(recordString(visitorList.data[0] ?? {}, 'eventId')).toBe(firstEvent.eventId);

    const sessionList = readRawEventList(
      await listRawEvents(owner, trackedWebsite.id, {
        sessionId: sessionB,
      }),
    );

    expect(sessionList.data).toHaveLength(1);

    expect(recordString(sessionList.data[0] ?? {}, 'eventId')).toBe(secondEvent.eventId);
  });

  it('filters by occurred-at date range', async () => {
    const owner = await registerWorkspaceTestUser(app, prisma);

    const trackedWebsite = await createTrackedWebsite(owner);

    const now = Date.now();

    const older = buildTrackerEvent(trackedWebsite.origin, {
      timestamp: new Date(now - 3 * 60 * 60 * 1000).toISOString(),
    });

    const newer = buildTrackerEvent(trackedWebsite.origin, {
      timestamp: new Date(now - 30 * 60 * 1000).toISOString(),
    });

    expectCollectionAccepted(await collectEvents(app, trackedWebsite, [older, newer]), 2);

    const ranged = readRawEventList(
      await listRawEvents(owner, trackedWebsite.id, {
        dateFrom: new Date(now - 60 * 60 * 1000).toISOString(),

        dateTo: new Date(now).toISOString(),
      }),
    );

    expect(ranged.data).toHaveLength(1);

    expect(recordString(ranged.data[0] ?? {}, 'eventId')).toBe(newer.eventId);
  });

  it('keeps raw events isolated between websites and workspaces', async () => {
    const alphaOwner = await registerWorkspaceTestUser(app, prisma);

    const betaOwner = await registerWorkspaceTestUser(app, prisma);

    const alphaWebsite = await createTrackedWebsite(alphaOwner);

    const secondAlphaWebsite = await createTrackedWebsite(alphaOwner);

    const betaWebsite = await createTrackedWebsite(betaOwner);

    const alphaEvent = buildTrackerEvent(alphaWebsite.origin);

    const secondAlphaEvent = buildTrackerEvent(secondAlphaWebsite.origin);

    const betaEvent = buildTrackerEvent(betaWebsite.origin);

    expectCollectionAccepted(await collectEvents(app, alphaWebsite, [alphaEvent]), 1);

    expectCollectionAccepted(await collectEvents(app, secondAlphaWebsite, [secondAlphaEvent]), 1);

    expectCollectionAccepted(await collectEvents(app, betaWebsite, [betaEvent]), 1);

    const alphaList = readRawEventList(await listRawEvents(alphaOwner, alphaWebsite.id));

    expect(alphaList.data).toHaveLength(1);

    expect(findRawEvent(alphaList.data, alphaEvent.eventId)).toBeDefined();

    expect(findRawEvent(alphaList.data, secondAlphaEvent.eventId)).toBeUndefined();

    expect(findRawEvent(alphaList.data, betaEvent.eventId)).toBeUndefined();

    const foreignResponse = await listRawEvents(alphaOwner, betaWebsite.id);

    expect(foreignResponse.status).toBe(404);
  });

  it('rejects invalid raw-event query parameters', async () => {
    const owner = await registerWorkspaceTestUser(app, prisma);

    const trackedWebsite = await createTrackedWebsite(owner);

    expect(
      (
        await listRawEvents(owner, trackedWebsite.id, {
          type: 'INVALID_TYPE',
        })
      ).status,
    ).toBe(400);

    expect(
      (
        await listRawEvents(owner, trackedWebsite.id, {
          page: 0,
        })
      ).status,
    ).toBe(400);

    expect(
      (
        await listRawEvents(owner, trackedWebsite.id, {
          limit: 101,
        })
      ).status,
    ).toBe(400);

    expect(
      (
        await listRawEvents(owner, trackedWebsite.id, {
          dateFrom: 'invalid-date',
        })
      ).status,
    ).toBe(400);
  });

  it('does not expose IP hashes, country codes, or user agents through the admin API', async () => {
    const owner = await registerWorkspaceTestUser(app, prisma);

    const trackedWebsite = await createTrackedWebsite(owner);

    const event = buildTrackerEvent(trackedWebsite.origin);

    expectCollectionAccepted(
      await collectEvents(app, trackedWebsite, [event], {
        userAgent: 'Sensitive-User-Agent/1.0',
      }),
      1,
    );

    const response = await listRawEvents(owner, trackedWebsite.id);

    const serialized = JSON.stringify(response.body).toLowerCase();

    expect(serialized).not.toContain('iphash');

    expect(serialized).not.toContain('countrycode');

    expect(serialized).not.toContain('useragent');

    expect(serialized).not.toContain('sensitive-user-agent');
  });
});
