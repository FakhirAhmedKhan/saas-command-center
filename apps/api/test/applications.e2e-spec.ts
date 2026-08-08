import type { INestApplication } from '@nestjs/common';

import {
  ApplicationCategory,
  ApplicationPriority,
  ApplicationStatus,
} from 'src/generated/prisma/enums';

import { PrismaService } from 'src/database/prisma.service';

import { withBearer } from './helpers/auth';

import {
  applicationRoutes,
  archiveApplication,
  createApplication,
  enumValue,
  expectMutationSuccess,
  getApplication,
  listApplications,
  permanentlyDeleteApplication,
  readApiItems,
  readApiRecord,
  recordString,
  restoreApplication,
  updateApplication,
} from './helpers/application';

import { createTestApp } from './helpers/create-test-app';

import { resetDatabase } from './helpers/database';

import {
  expectAccessDenied,
  expectBusinessRuleRejected,
  registerWorkspaceTestUser,
} from './helpers/workspace';

describe('Applications E2E', () => {
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

  it('creates an application with all supported fields', async () => {
    const owner = await registerWorkspaceTestUser(app, prisma);

    const created = await createApplication(owner, {
      name: 'Complete Batch 3 App',

      slug: 'complete-batch-3-app',
    });

    expect(created.id).toEqual(expect.any(String));

    expect(recordString(created.record, 'name')).toBe('Complete Batch 3 App');

    const detailsResponse = await getApplication(owner, created.id);

    expect(detailsResponse.status).toBe(200);

    const details = readApiRecord(detailsResponse, ['application']);

    expect(recordString(details, 'id')).toBe(created.id);

    expect(recordString(details, 'slug')).toBe('complete-batch-3-app');
  });

  it('creates an application using only required fields', async () => {
    const owner = await registerWorkspaceTestUser(app, prisma);

    const response = await owner.agent
      .post(applicationRoutes.root(owner.workspaceId))
      .set(withBearer(owner.accessToken))
      .send({
        name: 'Minimal Application',
      });

    expectMutationSuccess(response);

    const record = readApiRecord(response, ['application']);

    expect(recordString(record, 'name')).toBe('Minimal Application');

    expect(recordString(record, 'status')).toEqual(expect.any(String));

    expect(recordString(record, 'priority')).toEqual(expect.any(String));

    expect(recordString(record, 'category')).toEqual(expect.any(String));
  });

  it('rejects invalid application payloads', async () => {
    const owner = await registerWorkspaceTestUser(app, prisma);

    const invalidName = await owner.agent
      .post(applicationRoutes.root(owner.workspaceId))
      .set(withBearer(owner.accessToken))
      .send({
        name: '',
      });

    expect(invalidName.status).toBe(400);

    const invalidSlug = await owner.agent
      .post(applicationRoutes.root(owner.workspaceId))
      .set(withBearer(owner.accessToken))
      .send({
        name: 'Invalid Slug',

        slug: 'Invalid Slug!',
      });

    expect(invalidSlug.status).toBe(400);

    const invalidEnums = await owner.agent
      .post(applicationRoutes.root(owner.workspaceId))
      .set(withBearer(owner.accessToken))
      .send({
        name: 'Invalid Enums',

        status: 'INVALID_STATUS',

        priority: 'INVALID_PRIORITY',

        category: 'INVALID_CATEGORY',
      });

    expect(invalidEnums.status).toBe(400);

    const unknownField = await owner.agent
      .post(applicationRoutes.root(owner.workspaceId))
      .set(withBearer(owner.accessToken))
      .send({
        name: 'Unknown Field',

        ownerId: owner.userId,
      });

    expect(unknownField.status).toBe(400);
  });

  it('updates application fields', async () => {
    const owner = await registerWorkspaceTestUser(app, prisma);

    const created = await createApplication(owner);

    const status = enumValue(ApplicationStatus, 1);

    const priority = enumValue(ApplicationPriority, 1);

    const response = await updateApplication(owner, created.id, {
      name: 'Updated Application',

      shortDescription: 'Updated description',

      status,
      priority,
    });

    expect(response.status).toBe(200);

    const detailsResponse = await getApplication(owner, created.id);

    const details = readApiRecord(detailsResponse, ['application']);

    expect(recordString(details, 'name')).toBe('Updated Application');

    expect(recordString(details, 'status')).toBe(status);

    expect(recordString(details, 'priority')).toBe(priority);
  });

  it('supports search and filters', async () => {
    const owner = await registerWorkspaceTestUser(app, prisma);

    const statusOne = enumValue(ApplicationStatus);

    const statusTwo = enumValue(ApplicationStatus, 1);

    const priorityOne = enumValue(ApplicationPriority);

    const priorityTwo = enumValue(ApplicationPriority, 1);

    const category = enumValue(ApplicationCategory);

    const alpha = await createApplication(owner, {
      name: 'Alpha Search Product',

      slug: 'alpha-search-product',

      status: statusOne,

      priority: priorityOne,

      category,
    });

    const beta = await createApplication(owner, {
      name: 'Beta Search Product',

      slug: 'beta-search-product',

      status: statusTwo,

      priority: priorityTwo,

      category,
    });

    const searchResponse = await listApplications(owner, {
      search: 'Alpha',
    });

    expect(searchResponse.status).toBe(200);

    const searchItems = readApiItems(searchResponse, ['applications']);

    expect(searchItems.some((item) => recordString(item, 'id') === alpha.id)).toBe(true);

    expect(searchItems.some((item) => recordString(item, 'id') === beta.id)).toBe(false);

    const filterResponse = await listApplications(owner, {
      status: statusTwo,

      priority: priorityTwo,

      category,
    });

    const filteredItems = readApiItems(filterResponse, ['applications']);

    expect(filteredItems.some((item) => recordString(item, 'id') === beta.id)).toBe(true);
  });

  it('supports sorting and pagination', async () => {
    const owner = await registerWorkspaceTestUser(app, prisma);

    await createApplication(owner, {
      name: 'Alpha Pagination',

      slug: 'alpha-pagination',
    });

    await createApplication(owner, {
      name: 'Beta Pagination',

      slug: 'beta-pagination',
    });

    const pageOneResponse = await listApplications(owner, {
      sortBy: 'name',
      sortOrder: 'asc',
      page: 1,
      limit: 1,
    });

    const pageTwoResponse = await listApplications(owner, {
      sortBy: 'name',
      sortOrder: 'asc',
      page: 2,
      limit: 1,
    });

    const pageOne = readApiItems(pageOneResponse, ['applications']);

    const pageTwo = readApiItems(pageTwoResponse, ['applications']);

    expect(pageOne).toHaveLength(1);

    expect(pageTwo).toHaveLength(1);

    expect(recordString(pageOne[0], 'id')).not.toBe(recordString(pageTwo[0], 'id'));

    const invalidPage = await listApplications(owner, {
      page: 0,
    });

    expect(invalidPage.status).toBe(400);

    const invalidLimit = await listApplications(owner, {
      limit: 101,
    });

    expect(invalidLimit.status).toBe(400);
  });

  it('archives and restores an application', async () => {
    const owner = await registerWorkspaceTestUser(app, prisma);

    const created = await createApplication(owner);

    expect((await archiveApplication(owner, created.id)).status).toBe(200);

    const activeResponse = await listApplications(owner);

    const activeItems = readApiItems(activeResponse, ['applications']);

    expect(activeItems.some((item) => recordString(item, 'id') === created.id)).toBe(false);

    const archivedResponse = await listApplications(owner, {
      archived: true,
    });

    const archivedItems = readApiItems(archivedResponse, ['applications']);

    expect(archivedItems.some((item) => recordString(item, 'id') === created.id)).toBe(true);

    expect((await restoreApplication(owner, created.id)).status).toBe(200);
  });

  it('rejects changes to an archived application', async () => {
    const owner = await registerWorkspaceTestUser(app, prisma);

    const created = await createApplication(owner);

    expect((await archiveApplication(owner, created.id)).status).toBe(200);

    const response = await updateApplication(owner, created.id, {
      name: 'Must Not Update',
    });

    expectBusinessRuleRejected(response);
  });

  it('permanently deletes an archived application', async () => {
    const owner = await registerWorkspaceTestUser(app, prisma);

    const created = await createApplication(owner);

    expect((await archiveApplication(owner, created.id)).status).toBe(200);

    const response = await permanentlyDeleteApplication(owner, created.id);

    expect(response.status).toBe(200);

    expect(response.body).toEqual({
      message: 'SaaS application permanently deleted',
    });

    expect((await getApplication(owner, created.id)).status).toBe(404);
  });

  it('prevents cross-workspace access', async () => {
    const alphaOwner = await registerWorkspaceTestUser(app, prisma);

    const betaOwner = await registerWorkspaceTestUser(app, prisma);

    const alphaApp = await createApplication(alphaOwner);

    const response = await betaOwner.agent
      .get(applicationRoutes.details(alphaOwner.workspaceId, alphaApp.id))
      .set(withBearer(betaOwner.accessToken));

    expectAccessDenied(response);
  });

  it('rejects malformed application UUID', async () => {
    const owner = await registerWorkspaceTestUser(app, prisma);

    const response = await getApplication(owner, 'not-a-uuid');

    expect(response.status).toBe(400);
  });
});
