import type { INestApplication } from '@nestjs/common';
import { PrismaService } from 'src/database/prisma.service';
import { createTestApp } from '../helpers/create-test-app';
import { resetDatabase } from '../helpers/database';
import { registerWorkspaceTestUser } from '../helpers/workspace';
import { createLinkedDesktopFixture, overviewPath } from './helpers/desktop-test-fixtures';

describe('Desktop Overview E2E', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeEach(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
  });

  afterEach(async () => {
    await resetDatabase(prisma);
    await app.close();
  });

  it('returns desktop metadata and linked repository', async () => {
    const fixture = await createLinkedDesktopFixture(app, prisma);

    const response = await fixture.owner.agent
      .get(overviewPath(fixture.owner.workspaceId, fixture.desktopApp.id))
      .set('Authorization', `Bearer ${fixture.owner.accessToken}`);

    expect(response.status).toBe(200);

    expect(response.body.desktopApp.id).toBe(fixture.desktopApp.id);

    expect(response.body.repository.id).toBe(fixture.repository.id);

    expect(response.body.repository.defaultBranch).toBe('main');
  });

  it('returns null optional overview sections safely', async () => {
    const fixture = await createLinkedDesktopFixture(app, prisma);

    const response = await fixture.owner.agent
      .get(overviewPath(fixture.owner.workspaceId, fixture.desktopApp.id))
      .set('Authorization', `Bearer ${fixture.owner.accessToken}`);

    expect(response.status).toBe(200);
    expect(response.body.latestRelease).toBeNull();
    expect(response.body.latestPerformance).toBeNull();
  });

  it('rejects cross-workspace overview access', async () => {
    const fixture = await createLinkedDesktopFixture(app, prisma);
    const outsider = await registerWorkspaceTestUser(app, prisma);

    const response = await outsider.agent
      .get(overviewPath(fixture.owner.workspaceId, fixture.desktopApp.id))
      .set('Authorization', `Bearer ${outsider.accessToken}`);

    expect(response.status).toBe(403);
  });
});
