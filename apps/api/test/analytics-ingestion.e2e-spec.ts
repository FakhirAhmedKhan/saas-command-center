 

import type {
  INestApplication,
} from '@nestjs/common';

import {
  RawAnalyticsEventType,
} from 'src/generated/prisma/enums';

import {
  PrismaService,
} from 'src/database/prisma.service';

import {
  collectEvents,
  createTrackedWebsite,
  expectCollectionAccepted,
  buildTrackerEvent,
  getTrackingStatus,
  readTrackingStatus,
  uniqueTrackerId,
} from './helpers/analytics-ingestion';

import {
  createTestApp,
} from './helpers/create-test-app';

import {
  resetDatabase,
} from './helpers/database';

import {
  registerWorkspaceTestUser,
} from './helpers/workspace';

describe(
  'Analytics Ingestion E2E',
  () => {
    let app:
      INestApplication;

    let prisma:
      PrismaService;

    beforeEach(
      async () => {
        app =
          await createTestApp();

        prisma =
          app.get(
            PrismaService,
          );

        await resetDatabase(
          prisma,
        );
      },
    );

    afterEach(
      async () => {
        await app.close();
      },
    );

    it(
      'accepts page-view, heartbeat, and custom events in one batch',
      async () => {
        const owner =
          await registerWorkspaceTestUser(
            app,
            prisma,
          );

        const trackedWebsite =
          await createTrackedWebsite(
            owner,
          );

        const visitorId =
          uniqueTrackerId(
            'visitor',
          );

        const sessionId =
          uniqueTrackerId(
            'session',
          );

        const events = [
          buildTrackerEvent(
            trackedWebsite.origin,
            {
              type:
                RawAnalyticsEventType.PAGE_VIEW,

              visitorId,

              sessionId,

              url:
                `${trackedWebsite.origin}/pricing`,

              title:
                'Pricing',
            },
          ),

          buildTrackerEvent(
            trackedWebsite.origin,
            {
              type:
                RawAnalyticsEventType.HEARTBEAT,

              visitorId,

              sessionId,

              url:
                `${trackedWebsite.origin}/pricing`,

              durationMs: 15_000,
            },
          ),

          buildTrackerEvent(
            trackedWebsite.origin,
            {
              type:
                RawAnalyticsEventType.CUSTOM,

              visitorId,

              sessionId,

              url:
                `${trackedWebsite.origin}/pricing`,

              eventName:
                'trial_started',

              properties: {
                plan:
                  'pro',
              },
            },
          ),
        ];

        const response =
          await collectEvents(
            app,
            trackedWebsite,
            events,
          );

        expectCollectionAccepted(
          response,
          3,
        );

        const stored =
          await prisma
            .rawAnalyticsEvent
            .findMany({
              where: {
                websiteId:
                  trackedWebsite.id,
              },

              orderBy: {
                occurredAt:
                  'asc',
              },
            });

        expect(
          stored,
        ).toHaveLength(3);

        expect(
          new Set(
            stored.map(
              (event) =>
                event.type,
            ),
          ),
        ).toEqual(
          new Set([
            RawAnalyticsEventType.PAGE_VIEW,
            RawAnalyticsEventType.HEARTBEAT,
            RawAnalyticsEventType.CUSTOM,
          ]),
        );

        expect(
          stored.every(
            (event) =>
              event.sdkVersion ===
              '1.0.0-e2e',
          ),
        ).toBe(true);
      },
    );

    it(
      'deduplicates repeated event IDs per website',
      async () => {
        const owner =
          await registerWorkspaceTestUser(
            app,
            prisma,
          );

        const trackedWebsite =
          await createTrackedWebsite(
            owner,
          );

        const event =
          buildTrackerEvent(
            trackedWebsite.origin,
          );

        expectCollectionAccepted(
          await collectEvents(
            app,
            trackedWebsite,
            [
              event,
            ],
          ),
          1,
        );

        expectCollectionAccepted(
          await collectEvents(
            app,
            trackedWebsite,
            [
              event,
            ],
          ),
          0,
          1,
        );

        expect(
          await prisma
            .rawAnalyticsEvent
            .count({
              where: {
                websiteId:
                  trackedWebsite.id,

                eventId:
                  event.eventId,
              },
            }),
        ).toBe(1);
      },
    );

    it(
      'allows the same event ID on different websites',
      async () => {
        const owner =
          await registerWorkspaceTestUser(
            app,
            prisma,
          );

        const firstWebsite =
          await createTrackedWebsite(
            owner,
          );

        const secondWebsite =
          await createTrackedWebsite(
            owner,
          );

        const sharedEventId =
          uniqueTrackerId(
            'shared_event',
          );

        expectCollectionAccepted(
          await collectEvents(
            app,
            firstWebsite,
            [
              buildTrackerEvent(
                firstWebsite.origin,
                {
                  eventId:
                    sharedEventId,
                },
              ),
            ],
          ),
          1,
        );

        expectCollectionAccepted(
          await collectEvents(
            app,
            secondWebsite,
            [
              buildTrackerEvent(
                secondWebsite.origin,
                {
                  eventId:
                    sharedEventId,
                },
              ),
            ],
          ),
          1,
        );

        expect(
          await prisma
            .rawAnalyticsEvent
            .count({
              where: {
                eventId:
                  sharedEventId,
              },
            }),
        ).toBe(2);
      },
    );

    it(
      'updates website lastEventAt and tracking status after collection',
      async () => {
        const owner =
          await registerWorkspaceTestUser(
            app,
            prisma,
          );

        const trackedWebsite =
          await createTrackedWebsite(
            owner,
          );

        const beforeResponse =
          await getTrackingStatus(
            owner,
            trackedWebsite.id,
          );

        expect(
          beforeResponse.status,
        ).toBe(200);

        const before =
          readTrackingStatus(
            beforeResponse,
          );

        expect(
          before.connected,
        ).toBe(false);

        expect(
          before.totalEvents,
        ).toBe(0);

        const events = [
          buildTrackerEvent(
            trackedWebsite.origin,
            {
              type:
                RawAnalyticsEventType.PAGE_VIEW,
            },
          ),

          buildTrackerEvent(
            trackedWebsite.origin,
            {
              type:
                RawAnalyticsEventType.CUSTOM,

              eventName:
                'checkout_started',
            },
          ),
        ];

        expectCollectionAccepted(
          await collectEvents(
            app,
            trackedWebsite,
            events,
          ),
          2,
        );

        const afterResponse =
          await getTrackingStatus(
            owner,
            trackedWebsite.id,
          );

        const after =
          readTrackingStatus(
            afterResponse,
          );

        expect(
          after.connected,
        ).toBe(true);

        expect(
          after.totalEvents,
        ).toBe(2);

        expect(
          after.counts.PAGE_VIEW,
        ).toBe(1);

        expect(
          after.counts.CUSTOM,
        ).toBe(1);

        expect(
          after.recentEvents,
        ).toHaveLength(2);

        const website =
          await prisma.website
            .findUnique({
              where: {
                id:
                  trackedWebsite.id,
              },
            });

        expect(
          website?.lastEventAt,
        ).not.toBeNull();
      },
    );

    it(
      'stores request metadata and optional event dimensions',
      async () => {
        const owner =
          await registerWorkspaceTestUser(
            app,
            prisma,
          );

        const trackedWebsite =
          await createTrackedWebsite(
            owner,
          );

        const event =
          buildTrackerEvent(
            trackedWebsite.origin,
            {
              screenWidth: 2560,
              screenHeight: 1440,
              viewportWidth: 1600,
              viewportHeight: 1000,
              language:
                'en-GB',
              timeZone:
                'Europe/London',
              durationMs: 45_000,
            },
          );

        expectCollectionAccepted(
          await collectEvents(
            app,
            trackedWebsite,
            [
              event,
            ],
            {
              userAgent:
                'Batch6-E2E-Browser/1.0',
            },
          ),
          1,
        );

        const stored =
          await prisma
            .rawAnalyticsEvent
            .findFirstOrThrow({
              where: {
                websiteId:
                  trackedWebsite.id,

                eventId:
                  event.eventId,
              },
            });

        expect(
          stored.origin,
        ).toBe(
          trackedWebsite.origin,
        );

        expect(
          stored.userAgent,
        ).toBe(
          'Batch6-E2E-Browser/1.0',
        );

        expect(
          stored.screenWidth,
        ).toBe(2560);

        expect(
          stored.screenHeight,
        ).toBe(1440);

        expect(
          stored.viewportWidth,
        ).toBe(1600);

        expect(
          stored.viewportHeight,
        ).toBe(1000);

        expect(
          stored.language,
        ).toBe(
          'en-GB',
        );

        expect(
          stored.clientTimeZone,
        ).toBe(
          'Europe/London',
        );

        expect(
          stored.durationMs,
        ).toBe(45_000);

        expect(
          stored.ipHash,
        ).toMatch(
          /^[a-f0-9]{64}$/,
        );
      },
    );
  },
);
