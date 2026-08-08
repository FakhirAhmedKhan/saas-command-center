import type { Server } from 'node:http';

import type { INestApplication } from '@nestjs/common';

import request from 'supertest';

import { WorkspaceRole } from 'src/generated/prisma/enums';

import { PrismaService } from 'src/database/prisma.service';

import { AnalyticsProcessingService } from 'src/modules/analytics-engine/services/analytics-processing.service';

import {
  analyticsEngineRoutes,
  createRawAnalyticsEvent,
  reprocessAnalytics,
} from './helpers/analytics-engine';

import { createTrackedWebsite, uniqueTrackerId } from './helpers/analytics-ingestion';

import { createTestApp } from './helpers/create-test-app';

import { resetDatabase } from './helpers/database';

import { archiveWebsite, disableWebsite, expectWebsiteSuccess } from './helpers/website';

import {
  addWorkspaceMember,
  expectAccessDenied,
  registerWorkspaceTestUser,
} from './helpers/workspace';

describe('Analytics Reprocessing E2E', () => {
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

  it('rebuilds only the selected range and preserves events outside it', async () => {
    const owner = await registerWorkspaceTestUser(app, prisma);

    const website = await createTrackedWebsite(owner);

    const inRangeId = uniqueTrackerId('in_range');

    const outsideId = uniqueTrackerId('outside_range');

    const inRangeRaw = await createRawAnalyticsEvent(prisma, website, {
      eventId: inRangeId,
      occurredAt: new Date('2026-08-01T10:00:00.000Z'),
      pageUrl: `${website.origin}/before`,
    });

    await createRawAnalyticsEvent(prisma, website, {
      eventId: outsideId,
      occurredAt: new Date('2026-08-03T10:00:00.000Z'),
      pageUrl: `${website.origin}/outside`,
    });

    await processingService.processForWorkspace(owner.workspaceId, website.id, owner.userId, 100);

    const outsideBefore = await prisma.analyticsEvent.findFirstOrThrow({
      where: {
        websiteId: website.id,
        sourceEventId: outsideId,
      },
    });

    await prisma.rawAnalyticsEvent.update({
      where: {
        id: inRangeRaw.id,
      },
      data: {
        pageUrl: `${website.origin}/after`,
        pagePath: '/after',
      },
    });

    const response = await reprocessAnalytics(owner, owner.workspaceId, website.id, {
      dateFrom: '2026-08-01T00:00:00.000Z',
      dateTo: '2026-08-02T00:00:00.000Z',
      maxEvents: 100,
    });

    expect(response.status).toBe(201);

    const rebuilt = await prisma.analyticsEvent.findFirstOrThrow({
      where: {
        websiteId: website.id,
        sourceEventId: inRangeId,
      },
    });

    expect(rebuilt.normalizedPath).toBe('/after');

    const outsideAfter = await prisma.analyticsEvent.findFirstOrThrow({
      where: {
        websiteId: website.id,
        sourceEventId: outsideId,
      },
    });

    expect(outsideAfter.id).toBe(outsideBefore.id);

    expect(outsideAfter.normalizedPath).toBe('/outside');
  });

  it('is idempotent across repeated reprocessing of the same range', async () => {
    const owner = await registerWorkspaceTestUser(app, prisma);

    const website = await createTrackedWebsite(owner);

    const visitorId = uniqueTrackerId('reprocess_visitor');

    const sessionId = uniqueTrackerId('reprocess_session');

    await createRawAnalyticsEvent(prisma, website, {
      visitorId,
      sessionId,
      occurredAt: new Date('2026-08-01T10:00:00.000Z'),
    });

    await processingService.processForWorkspace(owner.workspaceId, website.id, owner.userId, 100);

    const body = {
      dateFrom: '2026-08-01T00:00:00.000Z',
      dateTo: '2026-08-02T00:00:00.000Z',
      maxEvents: 100,
    };

    for (let index = 0; index < 2; index += 1) {
      expect((await reprocessAnalytics(owner, owner.workspaceId, website.id, body)).status).toBe(
        201,
      );
    }

    expect(
      await prisma.analyticsVisitor.count({
        where: {
          websiteId: website.id,
        },
      }),
    ).toBe(1);

    expect(
      await prisma.analyticsSession.count({
        where: {
          websiteId: website.id,
        },
      }),
    ).toBe(1);

    expect(
      await prisma.analyticsEvent.count({
        where: {
          websiteId: website.id,
        },
      }),
    ).toBe(1);

    expect(
      await prisma.analyticsPageView.count({
        where: {
          websiteId: website.id,
        },
      }),
    ).toBe(1);
  });

  it('rejects invalid and oversized date ranges', async () => {
    const owner = await registerWorkspaceTestUser(app, prisma);

    const website = await createTrackedWebsite(owner);

    const invalidBodies = [
      {
        dateFrom: 'not-a-date',
        dateTo: '2026-08-02T00:00:00.000Z',
      },
      {
        dateFrom: '2026-08-02T00:00:00.000Z',
        dateTo: '2026-08-02T00:00:00.000Z',
      },
      {
        dateFrom: '2026-08-03T00:00:00.000Z',
        dateTo: '2026-08-02T00:00:00.000Z',
      },
      {
        dateFrom: '2026-01-01T00:00:00.000Z',
        dateTo: '2026-02-02T00:00:00.000Z',
      },
    ];

    for (const body of invalidBodies) {
      expect((await reprocessAnalytics(owner, owner.workspaceId, website.id, body)).status).toBe(
        400,
      );
    }
  });

  it('rejects invalid maxEvents and a range larger than maxEvents', async () => {
    const owner = await registerWorkspaceTestUser(app, prisma);

    const website = await createTrackedWebsite(owner);

    await createRawAnalyticsEvent(prisma, website, {
      occurredAt: new Date('2026-08-01T10:00:00.000Z'),
    });

    await createRawAnalyticsEvent(prisma, website, {
      occurredAt: new Date('2026-08-01T11:00:00.000Z'),
    });

    for (const maxEvents of [0, -1, 1.5, 100_001]) {
      expect(
        (
          await reprocessAnalytics(owner, owner.workspaceId, website.id, {
            dateFrom: '2026-08-01T00:00:00.000Z',
            dateTo: '2026-08-02T00:00:00.000Z',
            maxEvents,
          })
        ).status,
      ).toBe(400);
    }

    expect(
      (
        await reprocessAnalytics(owner, owner.workspaceId, website.id, {
          dateFrom: '2026-08-01T00:00:00.000Z',
          dateTo: '2026-08-02T00:00:00.000Z',
          maxEvents: 1,
        })
      ).status,
    ).toBe(400);
  });

  it('allows OWNER and ADMIN but denies DEVELOPER and VIEWER', async () => {
    const owner = await registerWorkspaceTestUser(app, prisma);

    const admin = await registerWorkspaceTestUser(app, prisma);

    const developer = await registerWorkspaceTestUser(app, prisma);

    const viewer = await registerWorkspaceTestUser(app, prisma);

    const website = await createTrackedWebsite(owner);

    for (const [actor, role] of [
      [admin, WorkspaceRole.ADMIN],
      [developer, WorkspaceRole.DEVELOPER],
      [viewer, WorkspaceRole.VIEWER],
    ] as const) {
      expect([200, 201]).toContain((await addWorkspaceMember(owner, actor, role)).status);
    }

    const body = {
      dateFrom: '2026-08-01T00:00:00.000Z',
      dateTo: '2026-08-02T00:00:00.000Z',
      maxEvents: 100,
    };

    expect((await reprocessAnalytics(owner, owner.workspaceId, website.id, body)).status).toBe(201);

    expect((await reprocessAnalytics(admin, owner.workspaceId, website.id, body)).status).toBe(201);

    expectAccessDenied(await reprocessAnalytics(developer, owner.workspaceId, website.id, body));

    expectAccessDenied(await reprocessAnalytics(viewer, owner.workspaceId, website.id, body));
  });

  it('does not increment the processing total or move the normal cursor', async () => {
    const owner = await registerWorkspaceTestUser(app, prisma);

    const website = await createTrackedWebsite(owner);

    await createRawAnalyticsEvent(prisma, website, {
      occurredAt: new Date('2026-08-01T10:00:00.000Z'),
      receivedAt: new Date('2026-08-07T00:00:00.000Z'),
    });

    await processingService.processForWorkspace(owner.workspaceId, website.id, owner.userId, 100);

    const before = await prisma.analyticsProcessingState.findUniqueOrThrow({
      where: {
        websiteId: website.id,
      },
    });

    expect(
      (
        await reprocessAnalytics(owner, owner.workspaceId, website.id, {
          dateFrom: '2026-08-01T00:00:00.000Z',
          dateTo: '2026-08-02T00:00:00.000Z',
          maxEvents: 100,
        })
      ).status,
    ).toBe(201);

    const after = await prisma.analyticsProcessingState.findUniqueOrThrow({
      where: {
        websiteId: website.id,
      },
    });

    expect(after.totalRawEventsProcessed).toBe(before.totalRawEventsProcessed);

    expect(after.lastProcessedReceivedAt?.toISOString()).toBe(
      before.lastProcessedReceivedAt?.toISOString(),
    );
  });

  it('rejects disabled and archived websites without deleting valid normalized data', async () => {
    const owner = await registerWorkspaceTestUser(app, prisma);

    const websites = [await createTrackedWebsite(owner), await createTrackedWebsite(owner)];

    for (const website of websites) {
      await createRawAnalyticsEvent(prisma, website, {
        occurredAt: new Date('2026-08-01T10:00:00.000Z'),
      });

      await processingService.processForWorkspace(owner.workspaceId, website.id, owner.userId, 100);
    }

    expectWebsiteSuccess(await disableWebsite(owner, websites[0]!.id));

    expectWebsiteSuccess(await archiveWebsite(owner, websites[1]!.id));

    for (const website of websites) {
      const response = await reprocessAnalytics(owner, owner.workspaceId, website.id, {
        dateFrom: '2026-08-01T00:00:00.000Z',
        dateTo: '2026-08-02T00:00:00.000Z',
        maxEvents: 100,
      });

      expect([400, 403, 409]).toContain(response.status);

      expect(
        await prisma.analyticsEvent.count({
          where: {
            websiteId: website.id,
          },
        }),
      ).toBe(1);
    }
  });

  it('requires authentication and hides foreign websites', async () => {
    const owner = await registerWorkspaceTestUser(app, prisma);

    const foreignOwner = await registerWorkspaceTestUser(app, prisma);

    const website = await createTrackedWebsite(owner);

    const body = {
      dateFrom: '2026-08-01T00:00:00.000Z',
      dateTo: '2026-08-02T00:00:00.000Z',
      maxEvents: 100,
    };

    expectAccessDenied(await reprocessAnalytics(foreignOwner, owner.workspaceId, website.id, body));

    expect(
      (
        await request(app.getHttpServer() as Server)
          .post(analyticsEngineRoutes.reprocess(owner.workspaceId, website.id))
          .send(body)
      ).status,
    ).toBe(401);
  });
});
