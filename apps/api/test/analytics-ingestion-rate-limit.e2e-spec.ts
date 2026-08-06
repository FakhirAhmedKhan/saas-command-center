/* eslint-disable @typescript-eslint/no-unsafe-argument */

import type {
  INestApplication,
} from '@nestjs/common';

import {
  PrismaService,
} from 'src/database/prisma.service';

import {
  buildEventBatch,
  buildTrackerEvent,
  collectEvents,
  createTrackedWebsite,
  expectCollectionAccepted,
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
  'Analytics Ingestion Rate Limit E2E',
  () => {
    let app:
      INestApplication;

    let prisma:
      PrismaService;

    let originalMaxEvents:
      string | undefined;

    let originalWindowMs:
      string | undefined;

    beforeEach(
      async () => {
        originalMaxEvents =
          process.env
            .ANALYTICS_RATE_MAX_EVENTS;

        originalWindowMs =
          process.env
            .ANALYTICS_RATE_WINDOW_MS;

        process.env
          .ANALYTICS_RATE_MAX_EVENTS =
          '5';

        process.env
          .ANALYTICS_RATE_WINDOW_MS =
          '60000';

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

        if (
          originalMaxEvents ===
          undefined
        ) {
          delete process.env
            .ANALYTICS_RATE_MAX_EVENTS;
        } else {
          process.env
            .ANALYTICS_RATE_MAX_EVENTS =
            originalMaxEvents;
        }

        if (
          originalWindowMs ===
          undefined
        ) {
          delete process.env
            .ANALYTICS_RATE_WINDOW_MS;
        } else {
          process.env
            .ANALYTICS_RATE_WINDOW_MS =
            originalWindowMs;
        }
      },
    );

    it(
      'accepts events up to the configured limit and rejects the next event',
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

        expectCollectionAccepted(
          await collectEvents(
            app,
            trackedWebsite,
            buildEventBatch(
              trackedWebsite.origin,
              3,
            ),
          ),
          3,
        );

        expectCollectionAccepted(
          await collectEvents(
            app,
            trackedWebsite,
            buildEventBatch(
              trackedWebsite.origin,
              2,
            ),
          ),
          2,
        );

        const rejected =
          await collectEvents(
            app,
            trackedWebsite,
            [
              buildTrackerEvent(
                trackedWebsite.origin,
              ),
            ],
          );

        expect(
          rejected.status,
        ).toBe(400);

        expect(
          JSON.stringify(
            rejected.body,
          ),
        ).toContain(
          'Tracking rate limit exceeded',
        );

        expect(
          await prisma
            .rawAnalyticsEvent
            .count({
              where: {
                websiteId:
                  trackedWebsite.id,
              },
            }),
        ).toBe(5);
      },
    );

    it(
      'rejects a single request whose event count exceeds the limit',
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

        const response =
          await collectEvents(
            app,
            trackedWebsite,
            buildEventBatch(
              trackedWebsite.origin,
              6,
            ),
          );

        /*
         * The current limiter starts a new bucket with the supplied count.
         * This test documents the intended safety contract: a first request
         * must not exceed the configured maximum.
         */
        expect(
          response.status,
        ).toBe(400);

        expect(
          await prisma
            .rawAnalyticsEvent
            .count({
              where: {
                websiteId:
                  trackedWebsite.id,
              },
            }),
        ).toBe(0);
      },
    );

    it(
      'maintains independent buckets for different websites',
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

        expectCollectionAccepted(
          await collectEvents(
            app,
            firstWebsite,
            buildEventBatch(
              firstWebsite.origin,
              5,
            ),
          ),
          5,
        );

        expectCollectionAccepted(
          await collectEvents(
            app,
            secondWebsite,
            buildEventBatch(
              secondWebsite.origin,
              5,
            ),
          ),
          5,
        );

        expect(
          (
            await collectEvents(
              app,
              firstWebsite,
              [
                buildTrackerEvent(
                  firstWebsite.origin,
                ),
              ],
            )
          ).status,
        ).toBe(400);

        expect(
          (
            await collectEvents(
              app,
              secondWebsite,
              [
                buildTrackerEvent(
                  secondWebsite.origin,
                ),
              ],
            )
          ).status,
        ).toBe(400);
      },
    );

    it(
      'counts duplicate submissions toward the request rate',
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

        const duplicateEvent =
          buildTrackerEvent(
            trackedWebsite.origin,
          );

        expectCollectionAccepted(
          await collectEvents(
            app,
            trackedWebsite,
            [
              duplicateEvent,
            ],
          ),
          1,
        );

        for (
          let index = 0;
          index < 4;
          index += 1
        ) {
          expectCollectionAccepted(
            await collectEvents(
              app,
              trackedWebsite,
              [
                duplicateEvent,
              ],
            ),
            0,
            1,
          );
        }

        expect(
          (
            await collectEvents(
              app,
              trackedWebsite,
              [
                duplicateEvent,
              ],
            )
          ).status,
        ).toBe(400);

        expect(
          await prisma
            .rawAnalyticsEvent
            .count({
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
