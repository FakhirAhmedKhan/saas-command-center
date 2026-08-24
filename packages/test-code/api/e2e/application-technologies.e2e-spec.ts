import { addTechnology, archiveApplication, createApplication, enumValue, expectMutationSuccess, readApiRecord, readEntityId, recordString, removeTechnology, updateTechnology } from '../helpers/application';
import { createTestApp } from '../helpers/create-test-app';
import { resetDatabase } from '../helpers/database';
import { expectBusinessRuleRejected, registerWorkspaceTestUser } from '../helpers/workspace';
import type { INestApplication } from '@nestjs/common';
import { PrismaService } from 'src/database/prisma.service';
import { TechnologyType } from 'src/generated/prisma/enums';

describe('Application Technologies E2E', () => {
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

  it('adds, updates, and removes a technology', async () => {
    const owner = await registerWorkspaceTestUser(app, prisma);
    const application = await createApplication(owner);
    const addResponse = await addTechnology(owner, application.id, {
      name: 'Next.js',
      type: enumValue(TechnologyType),
      version: '16.2.12',
    });

    expectMutationSuccess(addResponse);

    const technologyId = readEntityId(addResponse, ['technology']);
    const updateResponse = await updateTechnology(owner, application.id, technologyId, {
      name: 'Next.js Updated',
      type: enumValue(TechnologyType, 1),
      version: '17.0.0',
    });

    expect(updateResponse.status).toBe(200);

    const updated = readApiRecord(updateResponse, ['technology']);

    expect(recordString(updated, 'name')).toBe('Next.js Updated');

    const deleteResponse = await removeTechnology(owner, application.id, technologyId);

    expect(deleteResponse.status).toBe(200);

    expect(deleteResponse.body).toEqual({
      message: 'Technology removed',
    });

    const stored = await prisma.applicationTechnology.findUnique({
      where: {
        id: technologyId,
      },
    });

    expect(stored).toBeNull();
  });

  it('rejects invalid technology payloads', async () => {
    const owner = await registerWorkspaceTestUser(app, prisma);
    const application = await createApplication(owner);
    const emptyName = await addTechnology(owner, application.id, {
      name: '',
    });

    expect(emptyName.status).toBe(400);

    const invalidType = await owner.agent.post(`/api/v1/workspaces/${owner.workspaceId}/applications/${application.id}/technologies`).set('Authorization', `Bearer ${owner.accessToken}`).send({
      name: 'Invalid Technology',
      type: 'INVALID_TECHNOLOGY',
    });

    expect(invalidType.status).toBe(400);
  });

  it('rejects technology ID from another application', async () => {
    const owner = await registerWorkspaceTestUser(app, prisma);
    const first = await createApplication(owner);
    const second = await createApplication(owner);
    const addResponse = await addTechnology(owner, first.id);
    const technologyId = readEntityId(addResponse, ['technology']);
    const response = await updateTechnology(owner, second.id, technologyId, {
      version: '99.0.0',
    });

    expectBusinessRuleRejected(response);

    const stored = await prisma.applicationTechnology.findUnique({
      where: {
        id: technologyId,
      },
    });

    expect(stored?.applicationId).toBe(first.id);
  });

  it('rejects technology changes on archived application', async () => {
    const owner = await registerWorkspaceTestUser(app, prisma);
    const application = await createApplication(owner);

    expect((await archiveApplication(owner, application.id)).status).toBe(200);

    const response = await addTechnology(owner, application.id);

    expectBusinessRuleRejected(response);
  });

  it('rejects malformed technology UUID', async () => {
    const owner = await registerWorkspaceTestUser(app, prisma);
    const application = await createApplication(owner);
    const response = await updateTechnology(owner, application.id, 'invalid-uuid', {
      version: '2.0.0',
    });

    expect(response.status).toBe(400);
  });
});
