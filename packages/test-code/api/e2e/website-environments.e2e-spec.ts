import { createApplication } from '../helpers/application';
import { withBearer } from '../helpers/auth';
import { createTestApp } from '../helpers/create-test-app';
import { resetDatabase } from '../helpers/database';
import {
  archiveWebsite,
  connectWebsite,
  createWebsite,
  disableWebsite,
  disconnectWebsite,
  enableWebsite,
  expectWebsiteSuccess,
  findBooleanDeep,
  findRecordById,
  getWebsite,
  listWebsites,
  readTrackingKey,
  readWebsiteItems,
  restoreWebsite,
  rotateWebsiteKey,
  updateWebsite,
  websiteRoutes,
} from '../helpers/website';
import { expectBusinessRuleRejected, registerWorkspaceTestUser } from '../helpers/workspace';
import type { INestApplication } from '@nestjs/common';
import { PrismaService } from 'src/database/prisma.service';

describe('Website Operational State E2E', () => {
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

  it('disables and enables a website', async () => {
    const owner = await registerWorkspaceTestUser(app, prisma);
    const website = await createWebsite(owner);

    expectWebsiteSuccess(await disableWebsite(owner, website.id));

    let details = await getWebsite(owner, website.id);

    expect(findBooleanDeep(details.body, ['enabled', 'isEnabled'])).toBe(false);

    expectWebsiteSuccess(await enableWebsite(owner, website.id));

    details = await getWebsite(owner, website.id);

    expect(findBooleanDeep(details.body, ['enabled', 'isEnabled'])).toBe(true);
  });

  it('archives and restores a website', async () => {
    const owner = await registerWorkspaceTestUser(app, prisma);
    const website = await createWebsite(owner);

    expectWebsiteSuccess(await archiveWebsite(owner, website.id));

    const activeItems = readWebsiteItems(await listWebsites(owner));

    expect(findRecordById(activeItems, website.id)).toBeUndefined();

    const archivedItems = readWebsiteItems(
      await listWebsites(owner, {
        archived: true,
      }),
    );

    expect(findRecordById(archivedItems, website.id)).toBeDefined();

    expectWebsiteSuccess(await restoreWebsite(owner, website.id));

    const restoredItems = readWebsiteItems(await listWebsites(owner));

    expect(findRecordById(restoredItems, website.id)).toBeDefined();
  });

  it('rejects regular mutations while archived', async () => {
    const owner = await registerWorkspaceTestUser(app, prisma);
    const application = await createApplication(owner);
    const website = await createWebsite(owner);

    expectWebsiteSuccess(await archiveWebsite(owner, website.id));

    expectBusinessRuleRejected(
      await updateWebsite(owner, website.id, {
        name: 'Archived Update',
      }),
    );

    expectBusinessRuleRejected(await enableWebsite(owner, website.id));

    expectBusinessRuleRejected(await connectWebsite(owner, website.id, application.id));
  });

  it('rotates the tracking key and returns a new raw key', async () => {
    const owner = await registerWorkspaceTestUser(app, prisma);
    const website = await createWebsite(owner);
    const firstResponse = await rotateWebsiteKey(owner, website.id);

    expectWebsiteSuccess(firstResponse);

    const firstKey = readTrackingKey(firstResponse);
    const secondResponse = await rotateWebsiteKey(owner, website.id);

    expectWebsiteSuccess(secondResponse);

    const secondKey = readTrackingKey(secondResponse);

    expect(firstKey).not.toBe(secondKey);

    expect(firstKey.length).toBeGreaterThan(10);

    expect(secondKey.length).toBeGreaterThan(10);
  });

  it('connects and disconnects a website from an application', async () => {
    const owner = await registerWorkspaceTestUser(app, prisma);
    const application = await createApplication(owner);
    const website = await createWebsite(owner);

    expectWebsiteSuccess(await connectWebsite(owner, website.id, application.id));

    const connectedDetails = await getWebsite(owner, website.id);

    expect(JSON.stringify(connectedDetails.body)).toContain(application.id);

    const connectedItems = readWebsiteItems(
      await listWebsites(owner, {
        connected: true,
        applicationId: application.id,
      }),
    );

    expect(findRecordById(connectedItems, website.id)).toBeDefined();

    expectWebsiteSuccess(await disconnectWebsite(owner, website.id));

    const disconnectedDetails = await getWebsite(owner, website.id);

    expect(JSON.stringify(disconnectedDetails.body)).not.toContain(application.id);

    const disconnectedItems = readWebsiteItems(
      await listWebsites(owner, {
        connected: false,
      }),
    );

    expect(findRecordById(disconnectedItems, website.id)).toBeDefined();
  });

  it('rejects connection to a foreign or invalid application', async () => {
    const alphaOwner = await registerWorkspaceTestUser(app, prisma);
    const betaOwner = await registerWorkspaceTestUser(app, prisma);
    const website = await createWebsite(alphaOwner);
    const betaApplication = await createApplication(betaOwner);

    expectBusinessRuleRejected(await connectWebsite(alphaOwner, website.id, betaApplication.id));

    const malformed = await alphaOwner.agent.post(websiteRoutes.connect(alphaOwner.workspaceId, website.id)).set(withBearer(alphaOwner.accessToken)).send({
      applicationId: 'not-a-uuid',
    });

    expect(malformed.status).toBe(400);
  });
});
