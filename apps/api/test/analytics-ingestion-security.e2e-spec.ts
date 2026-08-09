/* eslint-disable @typescript-eslint/no-unsafe-argument */

import type { INestApplication } from '@nestjs/common';

import request from 'supertest';

import { RawAnalyticsEventType } from 'src/generated/prisma/enums';

import { PrismaService } from 'src/database/prisma.service';

import {
  analyticsIngestionRoutes,
  buildCollectPayload,
  buildTrackerEvent,
  collectEvents,
  createTrackedWebsite,
  expectCollectionAccepted,
} from './helpers/analytics-ingestion';

import { createTestApp } from './helpers/create-test-app';

import { resetDatabase } from './helpers/database';

import { registerWorkspaceTestUser } from './helpers/workspace';

import { archiveWebsite, disableWebsite, expectWebsiteSuccess } from './helpers/website';

describe('Analytics Ingestion Security E2E', () => {
  let app: INestApplication;

  let prisma: PrismaService;

  let originalAllowOriginless: string | undefined;

  beforeEach(async () => {
    originalAllowOriginless = process.env.ANALYTICS_ALLOW_ORIGINLESS;

    process.env.ANALYTICS_ALLOW_ORIGINLESS = 'false';

    app = await createTestApp();

    prisma = app.get(PrismaService);

    await resetDatabase(prisma);
  });

  afterEach(async () => {
    await app.close();

    if (originalAllowOriginless === undefined) {
      delete process.env.ANALYTICS_ALLOW_ORIGINLESS;
    } else {
      process.env.ANALYTICS_ALLOW_ORIGINLESS = originalAllowOriginless;
    }
  });

  it('rejects invalid, malformed, and mismatched tracking credentials', async () => {
    const owner = await registerWorkspaceTestUser(app, prisma);

    const firstWebsite = await createTrackedWebsite(owner);

    const secondWebsite = await createTrackedWebsite(owner);

    const event = buildTrackerEvent(firstWebsite.origin);

    const malformed = await collectEvents(app, firstWebsite, [event], {
      trackingKey: 'invalid-key',
    });

    expect(malformed.status).toBe(401);

    const mismatched = await collectEvents(app, firstWebsite, [event], {
      trackingKey: secondWebsite.trackingKey,
    });

    expect(mismatched.status).toBe(401);

    const unknownWebsite = await collectEvents(app, firstWebsite, [event], {
      websiteId: '11111111-1111-4111-8111-111111111111',
    });

    expect(unknownWebsite.status).toBe(401);
  });

  it('requires an allowed HTTP or HTTPS Origin header', async () => {
    const owner = await registerWorkspaceTestUser(app, prisma);

    const trackedWebsite = await createTrackedWebsite(owner);

    const event = buildTrackerEvent(trackedWebsite.origin);

    const missingOrigin = await collectEvents(app, trackedWebsite, [event], {
      origin: null,
    });

    expect(missingOrigin.status).toBe(403);

    const nullOrigin = await collectEvents(app, trackedWebsite, [event], {
      origin: 'null',
    });

    expect(nullOrigin.status).toBe(403);

    const invalidOrigin = await collectEvents(app, trackedWebsite, [event], {
      origin: 'not-a-url',
    });

    expect(invalidOrigin.status).toBe(400);

    const disallowedOrigin = await collectEvents(app, trackedWebsite, [event], {
      origin: 'https://evil.example.test',
    });

    expect(disallowedOrigin.status).toBe(403);

    const nonHttpOrigin = await collectEvents(app, trackedWebsite, [event], {
      origin: 'file://local',
    });

    expect(nonHttpOrigin.status).toBe(400);
  });

  it('rejects collection for disabled and archived websites', async () => {
    const owner = await registerWorkspaceTestUser(app, prisma);

    const disabledWebsite = await createTrackedWebsite(owner);

    expectWebsiteSuccess(await disableWebsite(owner, disabledWebsite.id));

    const disabledResponse = await collectEvents(app, disabledWebsite, [buildTrackerEvent(disabledWebsite.origin)]);

    expect(disabledResponse.status).toBe(403);

    const archivedWebsite = await createTrackedWebsite(owner);

    expectWebsiteSuccess(await archiveWebsite(owner, archivedWebsite.id));

    const archivedResponse = await collectEvents(app, archivedWebsite, [buildTrackerEvent(archivedWebsite.origin)]);

    expect(archivedResponse.status).toBe(403);
  });

  it('rejects tracked URLs that are invalid, unsafe, or from another origin', async () => {
    const owner = await registerWorkspaceTestUser(app, prisma);

    const trackedWebsite = await createTrackedWebsite(owner);

    const invalidUrl = await collectEvents(app, trackedWebsite, [
      buildTrackerEvent(trackedWebsite.origin, {
        url: 'not-a-url',
      }),
    ]);

    expect(invalidUrl.status).toBe(400);

    const nonHttpUrl = await collectEvents(app, trackedWebsite, [
      buildTrackerEvent(trackedWebsite.origin, {
        url: 'file:///tmp/page',
      }),
    ]);

    expect(nonHttpUrl.status).toBe(400);

    const foreignUrl = await collectEvents(app, trackedWebsite, [
      buildTrackerEvent(trackedWebsite.origin, {
        url: 'https://other.example.test/page',
      }),
    ]);

    expect(foreignUrl.status).toBe(400);
  });

  it('validates timestamps and custom-event names', async () => {
    const owner = await registerWorkspaceTestUser(app, prisma);

    const trackedWebsite = await createTrackedWebsite(owner);

    const tooOld = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString();

    const tooFarFuture = new Date(Date.now() + 6 * 60 * 1000).toISOString();

    expect(
      (
        await collectEvents(app, trackedWebsite, [
          buildTrackerEvent(trackedWebsite.origin, {
            timestamp: tooOld,
          }),
        ])
      ).status,
    ).toBe(400);

    expect(
      (
        await collectEvents(app, trackedWebsite, [
          buildTrackerEvent(trackedWebsite.origin, {
            timestamp: tooFarFuture,
          }),
        ])
      ).status,
    ).toBe(400);

    const customWithoutName = buildTrackerEvent(trackedWebsite.origin, {
      type: RawAnalyticsEventType.CUSTOM,

      eventName: 'temporary_name',
    });

    delete customWithoutName.eventName;

    expect((await collectEvents(app, trackedWebsite, [customWithoutName])).status).toBe(400);

    expect(
      (
        await collectEvents(app, trackedWebsite, [
          buildTrackerEvent(trackedWebsite.origin, {
            type: RawAnalyticsEventType.PAGE_VIEW,

            eventName: 'not_allowed',
          }),
        ])
      ).status,
    ).toBe(400);
  });

  it('rejects invalid payload shapes, oversized batches, and oversized bodies', async () => {
    const owner = await registerWorkspaceTestUser(app, prisma);

    const trackedWebsite = await createTrackedWebsite(owner);

    const emptyObject = await request(app.getHttpServer()).post(analyticsIngestionRoutes.collect()).set('Origin', trackedWebsite.origin).send({});

    expect(emptyObject.status).toBe(400);

    const emptyEvents = await request(app.getHttpServer())
      .post(analyticsIngestionRoutes.collect())
      .set('Origin', trackedWebsite.origin)
      .send(buildCollectPayload(trackedWebsite, []));

    expect(emptyEvents.status).toBe(400);

    const tooManyEvents = Array.from(
      {
        length: 26,
      },
      () => buildTrackerEvent(trackedWebsite.origin),
    );

    expect((await collectEvents(app, trackedWebsite, tooManyEvents)).status).toBe(400);

    const oversizedBody = buildCollectPayload(trackedWebsite, [buildTrackerEvent(trackedWebsite.origin)]) as unknown as Record<string, unknown>;

    oversizedBody.padding = 'x'.repeat(70_000);

    const oversizedResponse = await request(app.getHttpServer())
      .post(analyticsIngestionRoutes.collect())
      .set('Origin', trackedWebsite.origin)
      .send(oversizedBody);

    expect(oversizedResponse.status).toBe(413);
  });

  it('sanitizes tracked URLs, referrers, properties, time zones, and IP addresses', async () => {
    const owner = await registerWorkspaceTestUser(app, prisma);

    const trackedWebsite = await createTrackedWebsite(owner);

    const event = buildTrackerEvent(trackedWebsite.origin, {
      url: `${trackedWebsite.origin}/checkout?token=secret&safe=value&a=1#private`,

      referrer: 'https://referrer.example.test/page?password=secret&campaign=summer#hidden',

      properties: {
        password: 'must-be-removed',

        email: 'person@example.test',

        apiKey: 'must-be-removed',

        plan: 'enterprise',

        seats: 12,

        active: true,

        tags: ['analytics', 'saas'],

        nested: {
          ignored: true,
        },
      },

      timeZone: 'Invalid/Timezone',
    });

    expectCollectionAccepted(await collectEvents(app, trackedWebsite, [event]), 1);

    const stored = await prisma.rawAnalyticsEvent.findFirstOrThrow({
      where: {
        websiteId: trackedWebsite.id,

        eventId: event.eventId,
      },
    });

    expect(stored.pageUrl).toContain('safe=value');

    expect(stored.pageUrl).not.toContain('token=');

    expect(stored.pageUrl).not.toContain('#private');

    expect(stored.referrerUrl).toContain('campaign=summer');

    expect(stored.referrerUrl).not.toContain('password=');

    expect(stored.referrerUrl).not.toContain('#hidden');

    expect(stored.clientTimeZone).toBeNull();

    expect(stored.ipHash).toMatch(/^[a-f0-9]{64}$/);

    expect(stored.ipHash).not.toContain('127.0.0.1');

    const properties = stored.properties as Record<string, unknown>;

    expect(properties.plan).toBe('enterprise');

    expect(properties.seats).toBe(12);

    expect(properties.active).toBe(true);

    expect(properties.tags).toEqual(['analytics', 'saas']);

    expect(properties.password).toBeUndefined();

    expect(properties.email).toBeUndefined();

    expect(properties.apiKey).toBeUndefined();

    expect(properties.nested).toBeUndefined();
  });
});
