import { buildCollectPayload, buildTrackerEvent, createTrackedWebsite } from '../helpers/analytics-ingestion';
import { resetDatabase } from '../helpers/database';
import { registerWorkspaceTestUser } from '../helpers/workspace';
import { AppModule } from 'src/app.module';
import { configureApplication } from 'src/bootstrap/configure-application';
import type { INestApplication } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { PrismaService } from 'src/database/prisma.service';
import request from 'supertest';

describe('Tracker -> Production HTTP Bootstrap E2E', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeEach(async () => {
    app = await NestFactory.create(AppModule, {
      bodyParser: false,
      logger: false,
    });

    configureApplication(app, {
      enableSwagger: false,
    });

    await app.init();

    prisma = app.get(PrismaService);

    await resetDatabase(prisma);
  });

  afterEach(async () => {
    await app.close();
  });

  it('accepts a real Tracker text/plain request through the production HTTP pipeline', async () => {
    const owner = await registerWorkspaceTestUser(app, prisma);

    const trackedWebsite = await createTrackedWebsite(owner);

    const event = buildTrackerEvent(trackedWebsite.origin, {
      url: `${trackedWebsite.origin}/production-bootstrap`,
      title: 'Production Bootstrap Tracker Test',
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

    /*
     * The real tracker uses mode: 'no-cors', so the collector does not need
     * to expose its response cross-origin.
     */
    expect(response.headers['access-control-allow-origin']).toBeUndefined();

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
    });
  });

  it('rejects Tracker requests whose Origin is not allowed for the website', async () => {
    const owner = await registerWorkspaceTestUser(app, prisma);

    const trackedWebsite = await createTrackedWebsite(owner);

    const event = buildTrackerEvent(trackedWebsite.origin);

    const payload = buildCollectPayload(trackedWebsite, [event], {
      sdkVersion: '1.0.0',
    });

    const response = await request(app.getHttpServer())
      .post('/api/v1/collect')
      .set('Origin', 'https://untrusted-tracker-origin.example.test')
      .set('User-Agent', 'CommandCenter-Tracker/1.0.0')
      .set('Content-Type', 'text/plain;charset=UTF-8')
      .send(JSON.stringify(payload));

    expect(response.status).toBe(403);

    expect(response.headers['access-control-allow-origin']).toBeUndefined();

    expect(
      await prisma.rawAnalyticsEvent.count({
        where: {
          websiteId: trackedWebsite.id,
          eventId: event.eventId,
        },
      }),
    ).toBe(0);
  });

  it('does not expose normal API responses to arbitrary browser origins', async () => {
    const response = await request(app.getHttpServer()).get('/api/v1/version').set('Origin', 'https://untrusted-dashboard-origin.example.test');

    expect(response.headers['access-control-allow-origin']).toBeUndefined();
  });
});
