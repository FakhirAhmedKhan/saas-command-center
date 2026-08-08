import type { INestApplication } from '@nestjs/common';

import { ApplicationLinkType } from 'src/generated/prisma/enums';

import { PrismaService } from 'src/database/prisma.service';

import {
  addLink,
  applicationRoutes,
  archiveApplication,
  createApplication,
  enumValue,
  expectMutationSuccess,
  readApiRecord,
  readEntityId,
  recordString,
  removeLink,
  updateLink,
} from './helpers/application';

import { createTestApp } from './helpers/create-test-app';

import { resetDatabase } from './helpers/database';

import { expectBusinessRuleRejected, registerWorkspaceTestUser } from './helpers/workspace';

describe('Application Links E2E', () => {
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

  it('adds, updates, and removes a link', async () => {
    const owner = await registerWorkspaceTestUser(app, prisma);

    const application = await createApplication(owner);

    const addResponse = await addLink(owner, application.id, {
      label: 'Production Website',

      type: enumValue(ApplicationLinkType),

      url: 'https://example.com',
    });

    expectMutationSuccess(addResponse);

    const linkId = readEntityId(addResponse, ['link']);

    const updateResponse = await updateLink(owner, application.id, linkId, {
      label: 'Updated Production',

      type: enumValue(ApplicationLinkType, 1),

      url: 'https://updated.example.com',
    });

    expect(updateResponse.status).toBe(200);

    const updated = readApiRecord(updateResponse, ['link']);

    expect(recordString(updated, 'label')).toBe('Updated Production');

    expect(recordString(updated, 'url')).toBe('https://updated.example.com');

    const deleteResponse = await removeLink(owner, application.id, linkId);

    expect(deleteResponse.status).toBe(200);

    expect(deleteResponse.body).toEqual({
      message: 'Application link removed',
    });

    const stored = await prisma.applicationLink.findUnique({
      where: {
        id: linkId,
      },
    });

    expect(stored).toBeNull();
  });

  it('rejects invalid and unsafe URLs', async () => {
    const owner = await registerWorkspaceTestUser(app, prisma);

    const application = await createApplication(owner);

    for (const url of ['example.com', 'javascript:alert(1)', 'data:text/html,test']) {
      const response = await owner.agent
        .post(applicationRoutes.links(owner.workspaceId, application.id))
        .set('Authorization', `Bearer ${owner.accessToken}`)
        .send({
          label: 'Unsafe Link',

          type: enumValue(ApplicationLinkType),

          url,
        });

      expect(response.status).toBe(400);
    }
  });

  it('rejects invalid link type and empty label', async () => {
    const owner = await registerWorkspaceTestUser(app, prisma);

    const application = await createApplication(owner);

    const response = await owner.agent
      .post(applicationRoutes.links(owner.workspaceId, application.id))
      .set('Authorization', `Bearer ${owner.accessToken}`)
      .send({
        label: '',
        type: 'INVALID_LINK_TYPE',
        url: 'https://example.com',
      });

    expect(response.status).toBe(400);
  });

  it('rejects link ID from another application', async () => {
    const owner = await registerWorkspaceTestUser(app, prisma);

    const first = await createApplication(owner);

    const second = await createApplication(owner);

    const addResponse = await addLink(owner, first.id);

    const linkId = readEntityId(addResponse, ['link']);

    const response = await updateLink(owner, second.id, linkId, {
      label: 'Wrong Application',
    });

    expectBusinessRuleRejected(response);

    const stored = await prisma.applicationLink.findUnique({
      where: {
        id: linkId,
      },
    });

    expect(stored?.applicationId).toBe(first.id);
  });

  it('rejects link changes on archived application', async () => {
    const owner = await registerWorkspaceTestUser(app, prisma);

    const application = await createApplication(owner);

    expect((await archiveApplication(owner, application.id)).status).toBe(200);

    const response = await addLink(owner, application.id);

    expectBusinessRuleRejected(response);
  });
});
