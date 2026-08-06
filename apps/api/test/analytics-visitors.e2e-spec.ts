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
  AnalyticsProcessingService,
} from 'src/modules/analytics-engine/services/analytics-processing.service';

import {
  buildTrackerEvent,
  collectEvents,
  createTrackedWebsite,
  expectCollectionAccepted,
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
  'Analytics Visitors E2E',
  () => {
    let app:
      INestApplication;

    let prisma:
      PrismaService;

    let processingService:
      AnalyticsProcessingService;

    beforeEach(
      async () => {
        app =
          await createTestApp();

        prisma =
          app.get(
            PrismaService,
          );

        processingService =
          app.get(
            AnalyticsProcessingService,
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
      'creates one visitor per website and external visitor ID',
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

        expectCollectionAccepted(
          await collectEvents(
            app,
            trackedWebsite,
            [
              buildTrackerEvent(
                trackedWebsite.origin,
                {
                  visitorId,
                  sessionId:
                    uniqueTrackerId(
                      'session_a',
                    ),
                },
              ),
              buildTrackerEvent(
                trackedWebsite.origin,
                {
                  visitorId,
                  sessionId:
                    uniqueTrackerId(
                      'session_b',
                    ),
                },
              ),
            ],
          ),
          2,
        );

        await processingService
          .processForWorkspace(
            owner.workspaceId,
            trackedWebsite.id,
            owner.userId,
            100,
          );

        const visitors =
          await prisma.analyticsVisitor
            .findMany({
              where: {
                websiteId:
                  trackedWebsite.id,
              },
            });

        expect(
          visitors,
        ).toHaveLength(1);

        expect(
          visitors[0]?.externalVisitorId,
        ).toBe(
          visitorId,
        );

        expect(
          visitors[0]?.sessionCount,
        ).toBe(2);

        expect(
          visitors[0]?.pageViewCount,
        ).toBe(2);

        expect(
          visitors[0]?.eventCount,
        ).toBe(2);
      },
    );

    it(
      'isolates the same external visitor ID between websites',
      async () => {
        const owner =
          await registerWorkspaceTestUser(
            app,
            prisma,
          );

        const websiteA =
          await createTrackedWebsite(
            owner,
          );

        const websiteB =
          await createTrackedWebsite(
            owner,
          );

        const visitorId =
          uniqueTrackerId(
            'shared_visitor',
          );

        for (
          const website of [
            websiteA,
            websiteB,
          ]
        ) {
          expectCollectionAccepted(
            await collectEvents(
              app,
              website,
              [
                buildTrackerEvent(
                  website.origin,
                  {
                    visitorId,
                    sessionId:
                      uniqueTrackerId(
                        'session',
                      ),
                  },
                ),
              ],
            ),
            1,
          );

          await processingService
            .processForWorkspace(
              owner.workspaceId,
              website.id,
              owner.userId,
              100,
            );
        }

        const visitors =
          await prisma.analyticsVisitor
            .findMany({
              where: {
                externalVisitorId:
                  visitorId,
              },
              orderBy: {
                websiteId:
                  'asc',
              },
            });

        expect(
          visitors,
        ).toHaveLength(2);

        expect(
          new Set(
            visitors.map(
              (visitor) =>
                visitor.websiteId,
            ),
          ),
        ).toEqual(
          new Set([
            websiteA.id,
            websiteB.id,
          ]),
        );
      },
    );

    it(
      'rebuilds firstSeenAt and lastSeenAt from out-of-order events',
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

        const earlier =
          new Date(
            Date.now() -
            120_000,
          );

        const later =
          new Date(
            earlier.getTime() +
            60_000,
          );

        expectCollectionAccepted(
          await collectEvents(
            app,
            trackedWebsite,
            [
              buildTrackerEvent(
                trackedWebsite.origin,
                {
                  type:
                    RawAnalyticsEventType.CUSTOM,
                  eventName:
                    'later_event',
                  visitorId,
                  sessionId,
                  timestamp:
                    later.toISOString(),
                },
              ),
              buildTrackerEvent(
                trackedWebsite.origin,
                {
                  type:
                    RawAnalyticsEventType.PAGE_VIEW,
                  visitorId,
                  sessionId,
                  timestamp:
                    earlier.toISOString(),
                },
              ),
            ],
          ),
          2,
        );

        await processingService
          .processForWorkspace(
            owner.workspaceId,
            trackedWebsite.id,
            owner.userId,
            100,
          );

        const visitor =
          await prisma.analyticsVisitor
            .findFirstOrThrow({
              where: {
                websiteId:
                  trackedWebsite.id,
                externalVisitorId:
                  visitorId,
              },
            });

        expect(
          visitor.firstSeenAt.toISOString(),
        ).toBe(
          earlier.toISOString(),
        );

        expect(
          visitor.lastSeenAt.toISOString(),
        ).toBe(
          later.toISOString(),
        );
      },
    );

    it(
      'keeps visitor counts idempotent across repeated processing runs',
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

        expectCollectionAccepted(
          await collectEvents(
            app,
            trackedWebsite,
            [
              buildTrackerEvent(
                trackedWebsite.origin,
                {
                  visitorId,
                  sessionId,
                },
              ),
              buildTrackerEvent(
                trackedWebsite.origin,
                {
                  type:
                    RawAnalyticsEventType.CUSTOM,
                  eventName:
                    'cta_clicked',
                  visitorId,
                  sessionId,
                },
              ),
            ],
          ),
          2,
        );

        await processingService
          .processForWorkspace(
            owner.workspaceId,
            trackedWebsite.id,
            owner.userId,
            100,
          );

        await processingService
          .processForWorkspace(
            owner.workspaceId,
            trackedWebsite.id,
            owner.userId,
            100,
          );

        const visitor =
          await prisma.analyticsVisitor
            .findFirstOrThrow({
              where: {
                websiteId:
                  trackedWebsite.id,
                externalVisitorId:
                  visitorId,
              },
            });

        expect(
          visitor.sessionCount,
        ).toBe(1);

        expect(
          visitor.pageViewCount,
        ).toBe(1);

        expect(
          visitor.eventCount,
        ).toBe(2);

        expect(
          await prisma.analyticsVisitor.count({
            where: {
              websiteId:
                trackedWebsite.id,
            },
          }),
        ).toBe(1);
      },
    );
  },
);
