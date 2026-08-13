import {
  analyticsIngestionRoutes,
  buildTrackerEvent,
  collectEvents,
  createTrackedWebsite,
  expectCollectionAccepted,
  getTrackingStatus,
  readTrackingStatus,
} from '../helpers/analytics-ingestion';
import { inWorkspace, recordString } from '../helpers/application';
import { createTestApp } from '../helpers/create-test-app';
import { resetDatabase } from '../helpers/database';
import { addWorkspaceMember, expectAccessDenied, registerWorkspaceTestUser } from '../helpers/workspace';
import type { INestApplication } from '@nestjs/common';
import { PrismaService } from 'src/database/prisma.service';
import { RawAnalyticsEventType, WorkspaceRole } from 'src/generated/prisma/enums';
import request from 'supertest';

describe('Tracking Admin E2E', () => {
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

  it('returns empty tracking status before the first event', async () => {
    const owner = await registerWorkspaceTestUser(app, prisma);

    const trackedWebsite = await createTrackedWebsite(owner);

    const response = await getTrackingStatus(owner, trackedWebsite.id);

    expect(response.status).toBe(200);

    const status = readTrackingStatus(response);

    expect(recordString(status.website, 'id')).toBe(trackedWebsite.id);

    expect(status.connected).toBe(false);

    expect(status.totalEvents).toBe(0);

    expect(status.counts).toEqual({
      PAGE_VIEW: 0,
      HEARTBEAT: 0,
      CUSTOM: 0,
    });

    expect(status.recentEvents).toEqual([]);
  });

  it('returns grouped counts and at most five recent events', async () => {
    const owner = await registerWorkspaceTestUser(app, prisma);

    const trackedWebsite = await createTrackedWebsite(owner);

    const events = [
      buildTrackerEvent(trackedWebsite.origin, {
        type: RawAnalyticsEventType.PAGE_VIEW,
      }),

      buildTrackerEvent(trackedWebsite.origin, {
        type: RawAnalyticsEventType.PAGE_VIEW,
      }),

      buildTrackerEvent(trackedWebsite.origin, {
        type: RawAnalyticsEventType.HEARTBEAT,
      }),

      buildTrackerEvent(trackedWebsite.origin, {
        type: RawAnalyticsEventType.CUSTOM,

        eventName: 'cta_clicked',
      }),

      buildTrackerEvent(trackedWebsite.origin, {
        type: RawAnalyticsEventType.CUSTOM,

        eventName: 'checkout_started',
      }),

      buildTrackerEvent(trackedWebsite.origin, {
        type: RawAnalyticsEventType.CUSTOM,

        eventName: 'checkout_completed',
      }),
    ];

    expectCollectionAccepted(await collectEvents(app, trackedWebsite, events), 6);

    const status = readTrackingStatus(await getTrackingStatus(owner, trackedWebsite.id));

    expect(status.connected).toBe(true);

    expect(status.totalEvents).toBe(6);

    expect(status.counts.PAGE_VIEW).toBe(2);

    expect(status.counts.HEARTBEAT).toBe(1);

    expect(status.counts.CUSTOM).toBe(3);

    expect(status.recentEvents).toHaveLength(5);
  });

  it('allows VIEWER to inspect tracking status', async () => {
    const owner = await registerWorkspaceTestUser(app, prisma);

    const rawViewer = await registerWorkspaceTestUser(app, prisma);

    const addResponse = await addWorkspaceMember(owner, rawViewer, WorkspaceRole.VIEWER);

    expect([200, 201]).toContain(addResponse.status);

    const viewer = inWorkspace(rawViewer, owner.workspaceId);

    const trackedWebsite = await createTrackedWebsite(owner);

    expect((await getTrackingStatus(viewer, trackedWebsite.id)).status).toBe(200);
  });

  it('prevents outsider and anonymous tracking-admin access', async () => {
    const owner = await registerWorkspaceTestUser(app, prisma);

    const outsider = await registerWorkspaceTestUser(app, prisma);

    const trackedWebsite = await createTrackedWebsite(owner);

    const outsiderResponse = await outsider.agent
      .get(analyticsIngestionRoutes.status(owner.workspaceId, trackedWebsite.id))
      .set('Authorization', `Bearer ${outsider.accessToken}`);

    expectAccessDenied(outsiderResponse);

    const anonymousResponse = await request(app.getHttpServer()).get(analyticsIngestionRoutes.status(owner.workspaceId, trackedWebsite.id));

    expect(anonymousResponse.status).toBe(401);
  });

  it('rejects malformed, unknown, and foreign website IDs', async () => {
    const alphaOwner = await registerWorkspaceTestUser(app, prisma);

    const betaOwner = await registerWorkspaceTestUser(app, prisma);

    const betaWebsite = await createTrackedWebsite(betaOwner);

    expect((await getTrackingStatus(alphaOwner, 'not-a-uuid')).status).toBe(400);

    expect((await getTrackingStatus(alphaOwner, '11111111-1111-4111-8111-111111111111')).status).toBe(404);

    expect((await getTrackingStatus(alphaOwner, betaWebsite.id)).status).toBe(404);
  });
});
