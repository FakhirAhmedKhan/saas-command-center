import type { INestApplication } from '@nestjs/common';
import { PrismaService } from 'src/database/prisma.service';
import { GithubCodeService } from 'src/modules/repositories/services/github-code.service';
import { createTestApp } from '../helpers/create-test-app';
import { resetDatabase } from '../helpers/database';
import { createLinkedDesktopFixture, detectPath } from './helpers/desktop-test-fixtures';

describe('Desktop Project Detection E2E', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let githubCode: GithubCodeService;

  beforeEach(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
    githubCode = app.get(GithubCodeService);
  });

  afterEach(async () => {
    jest.restoreAllMocks();
    await resetDatabase(prisma);
    await app.close();
  });

  it('detects Electron from the linked repository', async () => {
    const fixture = await createLinkedDesktopFixture(app, prisma);

    jest.spyOn(githubCode, 'getTree').mockResolvedValue({
      sha: 'tree-1',
      truncated: false,
      entries: [
        {
          path: 'package.json',
          type: 'file',
          sha: 'file-1',
          size: 200,
        },
      ],
    } as never);

    jest.spyOn(githubCode, 'getFile').mockResolvedValue({
      path: 'package.json',
      sha: 'file-1',
      size: 200,
      content: JSON.stringify({
        name: 'desktop-electron',
        version: '2.0.0',
        devDependencies: {
          electron: '^40.0.0',
          'electron-builder': '^26.0.0',
        },
      }),
      encoding: 'base64',
    } as never);

    const response = await fixture.owner.agent
      .post(detectPath(fixture.owner.workspaceId, fixture.desktopApp.id))
      .set('Authorization', `Bearer ${fixture.owner.accessToken}`);

    expect(response.status).toBe(201);
    expect(response.body.primary).toMatchObject({
      framework: 'ELECTRON',
      packageName: 'desktop-electron',
      version: '2.0.0',
    });
  });

  it('returns safe empty detection for a non-desktop repository', async () => {
    const fixture = await createLinkedDesktopFixture(app, prisma);

    jest.spyOn(githubCode, 'getTree').mockResolvedValue({
      sha: 'tree-web',
      truncated: false,
      entries: [
        {
          path: 'package.json',
          type: 'file',
          sha: 'file-web',
          size: 100,
        },
      ],
    } as never);

    jest.spyOn(githubCode, 'getFile').mockResolvedValue({
      path: 'package.json',
      sha: 'file-web',
      size: 100,
      content: JSON.stringify({
        name: 'website',
        dependencies: {
          next: '^16.0.0',
        },
      }),
      encoding: 'base64',
    } as never);

    const response = await fixture.owner.agent
      .post(detectPath(fixture.owner.workspaceId, fixture.desktopApp.id))
      .set('Authorization', `Bearer ${fixture.owner.accessToken}`);

    expect(response.status).toBe(201);
    expect(response.body.primary).toBeNull();
    expect(response.body.candidates).toEqual([]);
  });

  it('does not fail the detection pass when one metadata file disappears', async () => {
    const fixture = await createLinkedDesktopFixture(app, prisma);

    jest.spyOn(githubCode, 'getTree').mockResolvedValue({
      sha: 'tree-missing',
      truncated: false,
      entries: [
        {
          path: 'apps/a/package.json',
          type: 'file',
          sha: '1',
          size: 100,
        },
        {
          path: 'apps/b/package.json',
          type: 'file',
          sha: '2',
          size: 100,
        },
      ],
    } as never);

    jest
      .spyOn(githubCode, 'getFile')
      .mockRejectedValueOnce(new Error('404'))
      .mockResolvedValueOnce({
        path: 'apps/b/package.json',
        sha: '2',
        size: 100,
        content: JSON.stringify({
          name: 'working-electron',
          devDependencies: {
            electron: '^40.0.0',
          },
        }),
        encoding: 'base64',
      } as never);

    const response = await fixture.owner.agent
      .post(detectPath(fixture.owner.workspaceId, fixture.desktopApp.id))
      .set('Authorization', `Bearer ${fixture.owner.accessToken}`);

    expect(response.status).toBe(201);
    expect(response.body.primary.framework).toBe('ELECTRON');
  });

  it('requires authentication', async () => {
    const fixture = await createLinkedDesktopFixture(app, prisma);

    const response = await fixture.owner.agent.post(detectPath(fixture.owner.workspaceId, fixture.desktopApp.id));

    expect(response.status).toBe(401);
  });

  it('rejects cross-workspace desktop application access', async () => {
    const fixture = await createLinkedDesktopFixture(app, prisma);
    const attacker = await (await import('../helpers/workspace')).registerWorkspaceTestUser(app, prisma);

    const response = await attacker.agent
      .post(detectPath(fixture.owner.workspaceId, fixture.desktopApp.id))
      .set('Authorization', `Bearer ${attacker.accessToken}`);

    expect(response.status).toBe(403);
  });
});
