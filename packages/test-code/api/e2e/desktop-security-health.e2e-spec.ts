import type { INestApplication } from '@nestjs/common';
import { PrismaService } from 'src/database/prisma.service';
import { GithubCodeService } from 'src/modules/repositories/services/github-code.service';
import { createTestApp } from '../helpers/create-test-app';
import { resetDatabase } from '../helpers/database';
import { registerWorkspaceTestUser } from '../helpers/workspace';
import { API, createLinkedDesktopFixture } from './helpers/desktop-test-fixtures';

function base(workspaceId: string, desktopAppId: string) {
  return `${API}/workspaces/${workspaceId}/desktop-apps/${desktopAppId}`;
}

describe('Desktop Dependency and Security Health E2E', () => {
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

  function mockRepository() {
    jest.spyOn(githubCode, 'getTree').mockResolvedValue({
      sha: 'security-tree',
      truncated: false,
      entries: [
        { path: 'package.json', type: 'file', sha: '1', size: 300 },
        {
          path: 'electron-builder.yml',
          type: 'file',
          sha: '2',
          size: 400,
        },
        {
          path: 'npm-audit.json',
          type: 'file',
          sha: '3',
          size: 300,
        },
      ],
    } as never);

    jest.spyOn(githubCode, 'getFile').mockImplementation(async (_installation, _owner, _repo, path) => {
      if (path === 'package.json') {
        return {
          path,
          sha: '1',
          size: 300,
          encoding: 'base64',
          content: JSON.stringify({
            name: 'desktop-electron',
            dependencies: {
              electron: '31.2.0',
              react: '19.1.0',
            },
            devDependencies: {
              'electron-builder': '26.0.0',
            },
          }),
        } as never;
      }

      if (path === 'electron-builder.yml') {
        return {
          path,
          sha: '2',
          size: 400,
          encoding: 'base64',
          content: `
asar: true
win:
  certificateSubjectName: Command Center LLC
mac:
  identity: Developer ID Application
  hardenedRuntime: true
afterSign: scripts/notarize.js
`,
        } as never;
      }

      return {
        path,
        sha: '3',
        size: 300,
        encoding: 'base64',
        content: JSON.stringify({
          vulnerabilities: [
            {
              name: 'electron',
              id: 'GHSA-test-electron',
              severity: 'high',
            },
          ],
        }),
      } as never;
    });
  }

  it('scans dependency manifests and persists vulnerability metadata', async () => {
    const fixture = await createLinkedDesktopFixture(app, prisma);
    mockRepository();

    const response = await fixture.owner.agent
      .post(`${base(fixture.owner.workspaceId, fixture.desktopApp.id)}/dependencies/scan`)
      .set('Authorization', `Bearer ${fixture.owner.accessToken}`)
      .expect(201);

    expect(response.body).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: 'electron',
          ecosystem: 'NPM',
          currentVersion: '31.2.0',
          riskStatus: 'VULNERABLE',
          severity: 'HIGH',
        }),
        expect.objectContaining({
          name: 'react',
          ecosystem: 'NPM',
        }),
      ]),
    );
  });

  it('detects signing and notarization configuration without exposing secrets', async () => {
    const fixture = await createLinkedDesktopFixture(app, prisma);
    mockRepository();

    const response = await fixture.owner.agent
      .post(`${base(fixture.owner.workspaceId, fixture.desktopApp.id)}/security/scan`)
      .set('Authorization', `Bearer ${fixture.owner.accessToken}`)
      .expect(201);

    expect(response.body).toMatchObject({
      windowsSigning: 'PASS',
      macosSigning: 'PASS',
      notarization: 'PASS',
    });

    const serialized = JSON.stringify(response.body);
    expect(serialized).not.toContain('PRIVATE KEY');
    expect(serialized).not.toContain('provider-secret');
    expect(serialized).not.toContain('APPLE_APP_SPECIFIC_PASSWORD=');
  });

  it('handles malformed package.json without crashing the scan', async () => {
    const fixture = await createLinkedDesktopFixture(app, prisma);

    jest.spyOn(githubCode, 'getTree').mockResolvedValue({
      sha: 'malformed-tree',
      truncated: false,
      entries: [{ path: 'package.json', type: 'file', sha: '1', size: 50 }],
    } as never);

    jest.spyOn(githubCode, 'getFile').mockResolvedValue({
      path: 'package.json',
      sha: '1',
      size: 50,
      encoding: 'base64',
      content: '{ definitely not json',
    } as never);

    const response = await fixture.owner.agent
      .post(`${base(fixture.owner.workspaceId, fixture.desktopApp.id)}/dependencies/scan`)
      .set('Authorization', `Bearer ${fixture.owner.accessToken}`)
      .expect(201);

    expect(response.body).toEqual([]);
  });

  it('rejects cross-workspace security access', async () => {
    const fixture = await createLinkedDesktopFixture(app, prisma);
    const attacker = await registerWorkspaceTestUser(app, prisma);

    const response = await attacker.agent
      .get(`${base(fixture.owner.workspaceId, fixture.desktopApp.id)}/security`)
      .set('Authorization', `Bearer ${attacker.accessToken}`);

    expect(response.status).toBe(403);
  });
});
