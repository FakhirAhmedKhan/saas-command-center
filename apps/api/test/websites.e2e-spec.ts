import { recordString } from './helpers/application';
import { withBearer } from './helpers/auth';
import { createTestApp } from './helpers/create-test-app';
import { resetDatabase } from './helpers/database';
import { findRecordById } from './helpers/development';
import { createWebsite, getWebsite, readWebsiteRecord, websiteRoutes, updateWebsite, listWebsites, readWebsiteItems } from './helpers/website';
import { expectAccessDenied, expectBusinessRuleRejected, registerWorkspaceTestUser } from './helpers/workspace';
import type { INestApplication } from '@nestjs/common';
import { PrismaService } from 'src/database/prisma.service';

describe('Websites E2E', () => {
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

  it('creates a website and normalizes its domain', async () => {
    const owner = await registerWorkspaceTestUser(app, prisma);

    const website = await createWebsite(owner, {
      name: 'Command Center Website',

      domain: 'https://Command-Center.Example.com',

      timeZone: 'Asia/Dubai',

      allowedOrigins: ['https://command-center.example.com', 'http://localhost:3000'],
    });

    expect(website.id).toEqual(expect.any(String));

    expect(recordString(website.record, 'name')).toBe('Command Center Website');

    expect(recordString(website.record, 'domain')).toBe('command-center.example.com');

    const detailsResponse = await getWebsite(owner, website.id);

    expect(detailsResponse.status).toBe(200);

    const details = readWebsiteRecord(detailsResponse);

    expect(recordString(details, 'id')).toBe(website.id);
  });

  it('creates a website using only required fields and applies defaults', async () => {
    const owner = await registerWorkspaceTestUser(app, prisma);

    const response = await owner.agent.post(websiteRoutes.root(owner.workspaceId)).set(withBearer(owner.accessToken)).send({
      name: 'Minimal Website',

      domain: 'minimal.example.test',
    });

    expect([200, 201]).toContain(response.status);

    const website = readWebsiteRecord(response);

    expect(recordString(website, 'name')).toBe('Minimal Website');

    expect(recordString(website, 'timeZone', 'timezone')).toBe('UTC');
  });

  it('rejects invalid domains and invalid DTO fields', async () => {
    const owner = await registerWorkspaceTestUser(app, prisma);

    const invalidDomains = ['', '*.example.com', 'https://user:pass@example.com', 'example.com/path', 'example.com?query=true', 'example.com#fragment'];

    for (const domain of invalidDomains) {
      const response = await owner.agent.post(websiteRoutes.root(owner.workspaceId)).set(withBearer(owner.accessToken)).send({
        name: 'Invalid Domain Website',

        domain,
      });

      expect(response.status).toBe(400);
    }

    const invalidOrigins = await owner.agent
      .post(websiteRoutes.root(owner.workspaceId))
      .set(withBearer(owner.accessToken))
      .send({
        name: 'Invalid Origins',

        domain: 'invalid-origins.example.test',

        allowedOrigins: Array.from(
          {
            length: 21,
          },
          (_, index) => `https://${index}.example.test`,
        ),
      });

    expect(invalidOrigins.status).toBe(400);

    const invalidApplication = await owner.agent.post(websiteRoutes.root(owner.workspaceId)).set(withBearer(owner.accessToken)).send({
      name: 'Invalid App Website',

      domain: 'invalid-app.example.test',

      applicationId: 'not-a-uuid',
    });

    expect(invalidApplication.status).toBe(400);

    const unknownField = await owner.agent.post(websiteRoutes.root(owner.workspaceId)).set(withBearer(owner.accessToken)).send({
      name: 'Unknown Field Website',

      domain: 'unknown-field.example.test',

      trackingKey: 'injected-key',
    });

    expect(unknownField.status).toBe(400);
  });

  it('rejects duplicate domains within a workspace but allows them across workspaces', async () => {
    const alphaOwner = await registerWorkspaceTestUser(app, prisma);

    const betaOwner = await registerWorkspaceTestUser(app, prisma);

    const domain = 'shared-domain.example.test';

    await createWebsite(alphaOwner, {
      domain,
    });

    const duplicateResponse = await alphaOwner.agent
      .post(websiteRoutes.root(alphaOwner.workspaceId))
      .set(withBearer(alphaOwner.accessToken))
      .send({
        name: 'Duplicate Website',

        domain: `https://${domain}`,
      });

    expectBusinessRuleRejected(duplicateResponse);

    const betaWebsite = await createWebsite(betaOwner, {
      domain,
    });

    expect(betaWebsite.id).toEqual(expect.any(String));
  });

  it('updates website configuration', async () => {
    const owner = await registerWorkspaceTestUser(app, prisma);

    const website = await createWebsite(owner);

    const response = await updateWebsite(owner, website.id, {
      name: 'Updated Website',

      domain: 'updated.example.test',

      timeZone: 'UTC',

      allowedOrigins: ['https://updated.example.test'],
    });

    expect(response.status).toBe(200);

    const updated = readWebsiteRecord(response);

    expect(recordString(updated, 'name')).toBe('Updated Website');

    expect(recordString(updated, 'domain')).toBe('updated.example.test');

    const databaseWebsite = await prisma.website.findUnique({
      where: {
        id: website.id,
      },
    });

    expect(databaseWebsite?.domain).toBe('updated.example.test');
  });

  it('supports search, enabled filtering, and pagination', async () => {
    const owner = await registerWorkspaceTestUser(app, prisma);

    const alpha = await createWebsite(owner, {
      name: 'Alpha Analytics',

      domain: 'alpha-analytics.example.test',

      enabled: true,
    });

    const beta = await createWebsite(owner, {
      name: 'Beta Storefront',

      domain: 'beta-storefront.example.test',

      enabled: false,
    });

    const searchResponse = await listWebsites(owner, {
      search: 'Alpha',
    });

    expect(searchResponse.status).toBe(200);

    const searched = readWebsiteItems(searchResponse);

    expect(findRecordById(searched, alpha.id)).toBeDefined();

    expect(findRecordById(searched, beta.id)).toBeUndefined();

    const disabledResponse = await listWebsites(owner, {
      enabled: false,
    });

    expect(findRecordById(readWebsiteItems(disabledResponse), beta.id)).toBeDefined();

    const firstPage = readWebsiteItems(
      await listWebsites(owner, {
        page: 1,
        limit: 1,
      }),
    );

    const secondPage = readWebsiteItems(
      await listWebsites(owner, {
        page: 2,
        limit: 1,
      }),
    );

    expect(firstPage).toHaveLength(1);

    expect(secondPage).toHaveLength(1);

    expect(recordString(firstPage[0] ?? {}, 'id')).not.toBe(recordString(secondPage[0] ?? {}, 'id'));

    expect(
      (
        await listWebsites(owner, {
          page: 0,
        })
      ).status,
    ).toBe(400);

    expect(
      (
        await listWebsites(owner, {
          limit: 101,
        })
      ).status,
    ).toBe(400);
  });

  it('prevents cross-workspace website access', async () => {
    const alphaOwner = await registerWorkspaceTestUser(app, prisma);

    const betaOwner = await registerWorkspaceTestUser(app, prisma);

    const website = await createWebsite(alphaOwner);

    const response = await betaOwner.agent.get(websiteRoutes.details(alphaOwner.workspaceId, website.id)).set(withBearer(betaOwner.accessToken));

    expectAccessDenied(response);
  });

  it('rejects malformed and unknown website IDs', async () => {
    const owner = await registerWorkspaceTestUser(app, prisma);

    const malformed = await getWebsite(owner, 'not-a-uuid');

    expect(malformed.status).toBe(400);

    const unknown = await getWebsite(owner, '11111111-1111-4111-8111-111111111111');

    expect(unknown.status).toBe(404);
  });
});
