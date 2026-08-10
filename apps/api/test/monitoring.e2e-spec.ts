import { createTestApplication } from './helpers/create-test-application';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';

describe('Monitoring', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const testApplication = await createTestApplication();

    app = testApplication.app;

    /*
     * Create your normal workspace,
     * application, website, admin and
     * viewer fixtures here.
     */
  });

  afterAll(async () => {
    await app.close();
  });

  it('blocks private health-check destinations', async () => {
    await request(app.getHttpServer())
      .post(`/api/v1/workspaces/${workspaceId}/monitoring/checks`)
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .send({
        targetType: 'APPLICATION',

        applicationId,

        name: 'Unsafe monitor',

        url: 'http://127.0.0.1:4000/health',

        intervalSeconds: 300,

        timeoutMs: 10_000,

        expectedStatusMin: 200,

        expectedStatusMax: 399,

        degradedAfterMs: 1_500,

        failureThreshold: 3,

        enabled: true,
      })
      .expect(400);
  });

  it('blocks viewer configuration changes', async () => {
    await request(app.getHttpServer())
      .post(`/api/v1/workspaces/${workspaceId}/monitoring/checks`)
      .set('Authorization', `Bearer ${viewerAccessToken}`)
      .send({
        targetType: 'APPLICATION',

        applicationId,

        name: 'Viewer monitor',

        url: 'https://example.com/health',

        intervalSeconds: 300,

        timeoutMs: 10_000,

        expectedStatusMin: 200,

        expectedStatusMax: 399,

        degradedAfterMs: 1_500,

        failureThreshold: 3,

        enabled: true,
      })
      .expect(403);
  });

  it('allows viewers to read the monitoring summary', async () => {
    await request(app.getHttpServer())
      .get(`/api/v1/workspaces/${workspaceId}/monitoring/summary`)
      .set('Authorization', `Bearer ${viewerAccessToken}`)
      .expect(200);
  });

  it('rejects cross-workspace monitoring access', async () => {
    await request(app.getHttpServer())
      .get(`/api/v1/workspaces/${anotherWorkspaceId}/monitoring/checks`)
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .expect(403);
  });
});
