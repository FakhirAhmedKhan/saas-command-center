import { buildCollectPayload, buildTrackerEvent, createTrackedWebsite } from '../helpers/analytics-ingestion';
import { createTestApp } from '../helpers/create-test-app';
import { resetDatabase } from '../helpers/database';
import { registerWorkspaceTestUser } from '../helpers/workspace';
import type { INestApplication } from '@nestjs/common';
import { PrismaService } from 'src/database/prisma.service';
import request from 'supertest';

describe('Tracker -> API Transport E2E', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
  });

  beforeEach(async () => {
    await resetDatabase(prisma);
  });

  afterAll(async () => {
    await app.close();
  });

  it('accepts the Tracker text/plain wire format and persists the event', async () => {
    const owner = await registerWorkspaceTestUser(app, prisma);

    const trackedWebsite = await createTrackedWebsite(owner);

    const event = buildTrackerEvent(trackedWebsite.origin, {
      url: `${trackedWebsite.origin}/tracker-transport`,
      title: 'Tracker Transport Test',
    });

    const payload = buildCollectPayload(trackedWebsite, [event], {
      sdkVersion: '1.0.0',
    });

    const response = await request(app.getHttpServer())
      .post('/api/v1/collect')
      .set('Origin', trackedWebsite.origin)
      .set('User-Agent', 'CommandCenter-Tracker/1.0.0')
      .set('Content-Type', 'text/plain;charset=UTF-8')
      .send(JSON.stringify(payload));

    expect(response.status).toBe(202);

    expect(response.body).toMatchObject({
      accepted: 1,
      duplicates: 0,
    });

    const stored = await prisma.rawAnalyticsEvent.findUnique({
      where: {
        websiteId_eventId: {
          websiteId: trackedWebsite.id,
          eventId: event.eventId,
        },
      },
    });

    expect(stored).not.toBeNull();

    expect(stored).toMatchObject({
      websiteId: trackedWebsite.id,
      eventId: event.eventId,
      visitorId: event.visitorId,
      sessionId: event.sessionId,
      sdkVersion: '1.0.0',
      pageUrl: `${trackedWebsite.origin}/tracker-transport`,
    });
  });
});
