import type { INestApplication } from '@nestjs/common';

import request from 'supertest';

import { createTestApplication } from './helpers/create-test-application';

describe('Phase 18 webhooks', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const testApplication = await createTestApplication();

    app = testApplication.app;

    /*
     * Create:
     * - workspace
     * - owner token
     * - viewer token
     * - second workspace
     */
  });

  afterAll(async () => {
    await app.close();
  });

  it('blocks unsafe destinations', async () => {
    await request(app.getHttpServer())
      .post(`/api/v1/workspaces/${workspaceId}/integrations/webhooks`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        name: 'Unsafe webhook',

        url: 'http://127.0.0.1:4000/internal',

        eventTypes: ['DEPLOYMENT_FAILED'],
      })
      .expect(400);
  });

  it('returns a secret only on creation', async () => {
    const created = await request(app.getHttpServer())
      .post(`/api/v1/workspaces/${workspaceId}/integrations/webhooks`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        name: 'Production automation',

        url: publicWebhookUrl,

        eventTypes: ['DEPLOYMENT_FAILED'],
      })
      .expect(201);

    expect(created.body.secret).toEqual(expect.any(String));

    const list = await request(app.getHttpServer())
      .get(`/api/v1/workspaces/${workspaceId}/integrations/webhooks`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(200);

    expect(JSON.stringify(list.body)).not.toContain(created.body.secret);

    expect(JSON.stringify(list.body)).not.toContain('secretCiphertext');
  });

  it('keeps viewers read-only', async () => {
    await request(app.getHttpServer())
      .get(`/api/v1/workspaces/${workspaceId}/integrations/webhooks`)
      .set('Authorization', `Bearer ${viewerToken}`)
      .expect(200);

    await request(app.getHttpServer())
      .post(`/api/v1/workspaces/${workspaceId}/integrations/webhooks`)
      .set('Authorization', `Bearer ${viewerToken}`)
      .send({
        name: 'Blocked webhook',

        url: publicWebhookUrl,

        eventTypes: ['DEPLOYMENT_FAILED'],
      })
      .expect(403);
  });

  it('prevents cross-workspace access', async () => {
    await request(app.getHttpServer())
      .get(`/api/v1/workspaces/${otherWorkspaceId}/integrations/webhooks`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(403);
  });
});
