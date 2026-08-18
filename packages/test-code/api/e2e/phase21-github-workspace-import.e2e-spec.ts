import { AppModule } from 'src/app.module';
import { createAgent, createTestUser, registerUser, withBearer } from '../helpers/auth';
import { resetDatabase } from '../helpers/database';
import { readAccessToken } from '../helpers/response';
import { PrismaService } from 'src/database/prisma.service';
import { GithubAppService, type GithubImportableRepository, type GithubInstallation } from 'src/modules/repositories/services/github-app.service';
import { GithubCodeService, type GithubRepositoryContent, type GithubRepositoryTree } from 'src/modules/repositories/services/github-code.service';
import { ValidationPipe, type INestApplication } from '@nestjs/common';
import { type NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import { json, urlencoded } from 'express';
import request, { type Response } from 'supertest';

const API_PREFIX = '/api/v1';

interface Identity {
  token: string;
  userId: string;
  email: string;
}

const DEFAULT_INSTALLATION_ID = '930001';

const DEFAULT_OWNER = 'phase21-org';

function githubAppMockFactory() {
  return {
    buildInstallationUrl: jest.fn((state: string): string => `https://github.test/apps/command-center/installations/new?state=${encodeURIComponent(state)}`),

    buildUserAuthorizationUrl: jest.fn((state: string, codeChallenge: string): string => {
      const url = new URL('https://github.test/login/oauth/authorize');
      url.searchParams.set('state', state);
      url.searchParams.set('code_challenge', codeChallenge);
      return url.toString();
    }),

    exchangeUserCode: jest.fn(async (): Promise<string> => 'ghu_phase21_test_user_token'),

    getInstallation: jest.fn(async (installationId: string): Promise<GithubInstallation> => ({
      id: installationId,
      accountLogin: DEFAULT_OWNER,
      accountType: 'Organization',
    })),

    userCanAccessInstallation: jest.fn(async (): Promise<boolean> => true),

    listImportableInstallationRepositories: jest.fn(async (): Promise<GithubImportableRepository[]> => []),

    listInstallationRepositories: jest.fn(async () => []),

    getInstallationAccessToken: jest.fn(async (): Promise<string> => 'ghs_phase21_test_installation_token'),

    getWebhookSecret: jest.fn((): string => 'phase21-e2e-webhook-secret'),
  };
}

function githubCodeMockFactory() {
  return {
    listBranches: jest.fn(),

    getTree: jest.fn(async (): Promise<GithubRepositoryTree> => ({
      sha: 'tree-sha',
      truncated: false,
      entries: [],
    })),

    getFile: jest.fn(async (): Promise<GithubRepositoryContent | null> => null),
  };
}

function encodePackageJson(value: Record<string, unknown>): string {
  return Buffer.from(JSON.stringify(value), 'utf8').toString('base64');
}

function repositoryFixture(overrides: Partial<GithubImportableRepository> = {}): GithubImportableRepository {
  return {
    id: 940001,
    name: 'demo-app',
    fullName: `${DEFAULT_OWNER}/demo-app`,
    description: 'A demo application',
    isPrivate: true,
    defaultBranch: 'main',
    htmlUrl: `https://github.com/${DEFAULT_OWNER}/demo-app`,
    updatedAt: '2026-08-09T12:00:00.000Z',

    owner: {
      login: DEFAULT_OWNER,
      avatarUrl: 'https://avatars.githubusercontent.com/u/1',
    },

    ...overrides,
  };
}

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`Expected an object, received: ${JSON.stringify(value)}`);
  }

  return value as Record<string, unknown>;
}

function responseRecord(response: Response): Record<string, unknown> {
  return asRecord(response.body as unknown);
}

function requireString(record: Record<string, unknown>, key: string): string {
  const value = record[key];

  if (typeof value !== 'string' || value.length === 0) {
    throw new Error(`Expected response field "${key}" to be a non-empty string.`);
  }

  return value;
}

function queryParameter(urlValue: string, key: string): string {
  const value = new URL(urlValue).searchParams.get(key);

  if (!value) {
    throw new Error(`Expected ${key} query parameter in ${urlValue}`);
  }

  return value;
}

async function createTestApp(): Promise<{
  app: INestApplication;
  githubAppMock: ReturnType<typeof githubAppMockFactory>;
  githubCodeMock: ReturnType<typeof githubCodeMockFactory>;
}> {
  const githubAppMock = githubAppMockFactory();
  const githubCodeMock = githubCodeMockFactory();

  const testingModule = await Test.createTestingModule({
    imports: [AppModule],
  })
    .overrideProvider(GithubAppService)
    .useValue(githubAppMock)
    .overrideProvider(GithubCodeService)
    .useValue(githubCodeMock)
    .compile();

  const app = testingModule.createNestApplication<NestExpressApplication>({
    bodyParser: false,
  });

  const expressInstance = app.getHttpAdapter().getInstance();
  expressInstance.set('trust proxy', 1);

  app.use(cookieParser());
  app.use(json({ limit: '1mb' }));
  app.use(urlencoded({ extended: true, limit: '1mb' }));

  app.setGlobalPrefix('api/v1');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  await app.init();

  return { app, githubAppMock, githubCodeMock };
}

async function registerIdentity(app: INestApplication, label: string): Promise<Identity> {
  const userInput = createTestUser({
    name: `${label} User`,
    workspaceName: `${label} Workspace`,
  });

  const response = await registerUser(createAgent(app), userInput);

  expect(response.status).toBe(201);

  const token = readAccessToken(response);

  const prisma = app.get(PrismaService);

  const user = await prisma.user.findUnique({
    where: { email: userInput.email },
    select: { id: true },
  });

  if (!user) {
    throw new Error(`Registered user ${userInput.email} was not persisted.`);
  }

  return { token, userId: user.id, email: userInput.email };
}

async function connectPersonalGithub(app: INestApplication, identity: Identity, installationId: string = DEFAULT_INSTALLATION_ID): Promise<void> {
  const beginResponse = await request(app.getHttpServer()).post(`${API_PREFIX}/repositories/github/personal/connect`).set(withBearer(identity.token));

  expect(beginResponse.status).toBe(201);

  const installationUrl = requireString(responseRecord(beginResponse), 'installationUrl');
  const installState = queryParameter(installationUrl, 'state');

  const setupResponse = await request(app.getHttpServer())
    .post(`${API_PREFIX}/repositories/github/personal/setup`)
    .set(withBearer(identity.token))
    .send({ installState, installationId });

  expect(setupResponse.status).toBe(201);

  const authorizationUrl = requireString(responseRecord(setupResponse), 'authorizationUrl');
  const oauthState = queryParameter(authorizationUrl, 'state');

  const callbackResponse = await request(app.getHttpServer())
    .post(`${API_PREFIX}/repositories/github/personal/callback`)
    .set(withBearer(identity.token))
    .send({ code: 'phase21-oauth-code', state: oauthState });

  expect(callbackResponse.status).toBe(201);
}

describe('Phase 21 - GitHub Workspace Import E2E', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let githubAppMock: ReturnType<typeof githubAppMockFactory>;
  let githubCodeMock: ReturnType<typeof githubCodeMockFactory>;

  beforeAll(async () => {
    const created = await createTestApp();
    app = created.app;
    githubAppMock = created.githubAppMock;
    githubCodeMock = created.githubCodeMock;
    prisma = app.get(PrismaService);
  });

  beforeEach(async () => {
    jest.clearAllMocks();
    githubAppMock.getInstallation.mockResolvedValue({
      id: DEFAULT_INSTALLATION_ID,
      accountLogin: DEFAULT_OWNER,
      accountType: 'Organization',
    });
    githubAppMock.userCanAccessInstallation.mockResolvedValue(true);
    githubAppMock.exchangeUserCode.mockResolvedValue('ghu_phase21_test_user_token');
    githubAppMock.listImportableInstallationRepositories.mockResolvedValue([repositoryFixture()]);
    await resetDatabase(prisma);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Personal GitHub connect authorization', () => {
    it('rejects an anonymous connect attempt', async () => {
      const response = await request(app.getHttpServer()).post(`${API_PREFIX}/repositories/github/personal/connect`);

      expect(response.status).toBe(401);
    });

    it('allows any authenticated user to begin a personal connect without an existing workspace', async () => {
      const identity = await registerIdentity(app, 'Personal Connect');

      const response = await request(app.getHttpServer()).post(`${API_PREFIX}/repositories/github/personal/connect`).set(withBearer(identity.token));

      expect(response.status).toBe(201);

      const intent = await prisma.personalGithubConnectIntent.findFirst({
        where: { userId: identity.userId },
      });

      expect(intent).not.toBeNull();
    });

    it('rejects the callback when the GitHub user cannot access the installation', async () => {
      const identity = await registerIdentity(app, 'Denied Personal Connect');

      const beginResponse = await request(app.getHttpServer()).post(`${API_PREFIX}/repositories/github/personal/connect`).set(withBearer(identity.token));

      const installState = queryParameter(requireString(responseRecord(beginResponse), 'installationUrl'), 'state');

      const setupResponse = await request(app.getHttpServer())
        .post(`${API_PREFIX}/repositories/github/personal/setup`)
        .set(withBearer(identity.token))
        .send({ installState, installationId: DEFAULT_INSTALLATION_ID });

      const oauthState = queryParameter(requireString(responseRecord(setupResponse), 'authorizationUrl'), 'state');

      githubAppMock.userCanAccessInstallation.mockResolvedValueOnce(false);

      const callbackResponse = await request(app.getHttpServer())
        .post(`${API_PREFIX}/repositories/github/personal/callback`)
        .set(withBearer(identity.token))
        .send({ code: 'denied-code', state: oauthState });

      expect(callbackResponse.status).toBe(403);
    });

    it('never persists a raw GitHub user token', async () => {
      const identity = await registerIdentity(app, 'Token Leak Check');

      await connectPersonalGithub(app, identity);

      const intents = await prisma.personalGithubConnectIntent.findMany({
        where: { userId: identity.userId },
      });

      expect(JSON.stringify(intents)).not.toContain('ghu_phase21_test_user_token');
    });
  });

  describe('Repository listing', () => {
    it('rejects listing repositories before GitHub is connected', async () => {
      const identity = await registerIdentity(app, 'No Repos Yet');

      const response = await request(app.getHttpServer()).get(`${API_PREFIX}/repositories/github/personal`).set(withBearer(identity.token));

      expect(response.status).toBe(200);
      expect(responseRecord(response)).toEqual({
        installations: [],
        repositories: [],
      });
    });

    it('lists repositories once the user has connected an installation', async () => {
      const identity = await registerIdentity(app, 'List Repos');

      await connectPersonalGithub(app, identity);

      const response = await request(app.getHttpServer()).get(`${API_PREFIX}/repositories/github/personal`).set(withBearer(identity.token));

      expect(response.status).toBe(200);

      const body = responseRecord(response);
      const repositories = body.repositories as unknown[];

      expect(repositories).toHaveLength(1);
      expect(JSON.stringify(repositories)).toContain('demo-app');
      expect(JSON.stringify(body)).not.toContain('ghu_phase21_test_user_token');
      expect(JSON.stringify(body)).not.toContain('ghs_phase21_test_installation_token');
    });
  });

  describe('Repository analysis', () => {
    it('rejects analyzing a repository the user has not connected', async () => {
      const identity = await registerIdentity(app, 'Unauthorized Analyze');

      const response = await request(app.getHttpServer())
        .post(`${API_PREFIX}/repositories/github/personal/analyze`)
        .set(withBearer(identity.token))
        .send({ repositoryId: 940001 });

      expect(response.status).toBe(403);
    });

    it('rejects analyzing a repository ID belonging to another installation the caller never connected', async () => {
      const identity = await registerIdentity(app, 'Cross Repo Analyze');
      await connectPersonalGithub(app, identity);

      const response = await request(app.getHttpServer())
        .post(`${API_PREFIX}/repositories/github/personal/analyze`)
        .set(withBearer(identity.token))
        .send({ repositoryId: 999999 });

      expect(response.status).toBe(403);
    });

    it('detects a single-app Next.js repository', async () => {
      const identity = await registerIdentity(app, 'Single App Analyze');
      await connectPersonalGithub(app, identity);

      githubCodeMock.getTree.mockResolvedValueOnce({
        sha: 'tree-sha',
        truncated: false,
        entries: [
          { path: 'package.json', type: 'file', sha: 's1', size: 200 },
          { path: 'tsconfig.json', type: 'file', sha: 's2', size: 50 },
          { path: 'src/index.tsx', type: 'file', sha: 's3', size: 500 },
        ],
      });

      githubCodeMock.getFile.mockImplementation(async (_installationId: string, _owner: string, _repo: string, path: string) => {
        if (path === 'package.json') {
          return {
            name: 'package.json',
            path: 'package.json',
            sha: 's1',
            size: 200,
            encoding: 'base64',
            content: encodePackageJson({
              name: 'demo-app',
              dependencies: { next: '^15.0.0', react: '^19.0.0' },
              scripts: { dev: 'next dev', build: 'next build', start: 'next start' },
            }),
          };
        }

        return null;
      });

      const response = await request(app.getHttpServer())
        .post(`${API_PREFIX}/repositories/github/personal/analyze`)
        .set(withBearer(identity.token))
        .send({ repositoryId: 940001 });

      expect(response.status).toBe(201);

      const body = responseRecord(response);

      expect(body.repositoryType).toBe('single-app');
      expect(body.packageManager).toBe('unknown');

      const applications = body.applications as Array<Record<string, unknown>>;

      expect(applications).toHaveLength(1);
      expect(applications[0]?.framework).toBe('Next.js');
      expect(applications[0]?.runnable).toBe(true);
    });

    it('detects a monorepo with an app and a library, and does not mark the library runnable', async () => {
      const identity = await registerIdentity(app, 'Monorepo Analyze');
      await connectPersonalGithub(app, identity);

      githubCodeMock.getTree.mockResolvedValueOnce({
        sha: 'tree-sha',
        truncated: false,
        entries: [
          { path: 'package.json', type: 'file', sha: 'r1', size: 100 },
          { path: 'pnpm-workspace.yaml', type: 'file', sha: 'r2', size: 60 },
          { path: 'pnpm-lock.yaml', type: 'file', sha: 'r3', size: 1000 },
          { path: 'apps/api/package.json', type: 'file', sha: 'a1', size: 200 },
          { path: 'packages/shared-types/package.json', type: 'file', sha: 'p1', size: 80 },
        ],
      });

      githubCodeMock.getFile.mockImplementation(async (_installationId: string, _owner: string, _repo: string, path: string) => {
        const files: Record<string, { content: string } | undefined> = {
          'pnpm-workspace.yaml': {
            content: Buffer.from("packages:\n  - 'apps/*'\n  - 'packages/*'\n", 'utf8').toString('base64'),
          },

          'package.json': {
            content: encodePackageJson({ name: 'root', private: true }),
          },

          'apps/api/package.json': {
            content: encodePackageJson({
              name: '@acme/api',
              dependencies: { '@nestjs/core': '^11.0.0' },
              scripts: { 'start:dev': 'nest start --watch', build: 'nest build' },
            }),
          },

          'packages/shared-types/package.json': {
            content: encodePackageJson({
              name: '@acme/shared-types',
              scripts: { build: 'tsc' },
            }),
          },
        };

        const match = files[path];

        if (!match) {
          return null;
        }

        return {
          name: path.split('/').pop() ?? path,
          path,
          sha: 'sha',
          size: 100,
          encoding: 'base64',
          content: match.content,
        };
      });

      const response = await request(app.getHttpServer())
        .post(`${API_PREFIX}/repositories/github/personal/analyze`)
        .set(withBearer(identity.token))
        .send({ repositoryId: 940001 });

      expect(response.status).toBe(201);

      const body = responseRecord(response);

      expect(body.repositoryType).toBe('monorepo');
      expect(body.packageManager).toBe('pnpm');

      const applications = body.applications as Array<Record<string, unknown>>;

      const api = applications.find((application) => application.rootDirectory === 'apps/api');
      const sharedTypes = applications.find((application) => application.rootDirectory === 'packages/shared-types');

      expect(api?.runnable).toBe(true);
      expect(api?.framework).toBe('NestJS');
      expect(sharedTypes?.runnable).toBe(false);
    });

    it('rejects a repository with no package.json', async () => {
      const identity = await registerIdentity(app, 'No Package Json');
      await connectPersonalGithub(app, identity);

      githubCodeMock.getTree.mockResolvedValueOnce({
        sha: 'tree-sha',
        truncated: false,
        entries: [{ path: 'README.md', type: 'file', sha: 'r1', size: 10 }],
      });

      const response = await request(app.getHttpServer())
        .post(`${API_PREFIX}/repositories/github/personal/analyze`)
        .set(withBearer(identity.token))
        .send({ repositoryId: 940001 });

      expect(response.status).toBe(422);
    });

    it('tolerates a malformed package.json in a nested package while still analyzing the rest', async () => {
      const identity = await registerIdentity(app, 'Malformed Package Json');
      await connectPersonalGithub(app, identity);

      githubCodeMock.getTree.mockResolvedValueOnce({
        sha: 'tree-sha',
        truncated: false,
        entries: [
          { path: 'package.json', type: 'file', sha: 'r1', size: 100 },
          { path: 'apps/broken/package.json', type: 'file', sha: 'b1', size: 40 },
        ],
      });

      githubCodeMock.getFile.mockImplementation(async (_installationId: string, _owner: string, _repo: string, path: string) => {
        if (path === 'package.json') {
          return {
            name: 'package.json',
            path,
            sha: 'r1',
            size: 100,
            encoding: 'base64',
            content: encodePackageJson({
              name: 'root-app',
              scripts: { start: 'node index.js' },
            }),
          };
        }

        if (path === 'apps/broken/package.json') {
          return {
            name: 'package.json',
            path,
            sha: 'b1',
            size: 40,
            encoding: 'base64',
            content: Buffer.from('{ this is not valid json', 'utf8').toString('base64'),
          };
        }

        return null;
      });

      const response = await request(app.getHttpServer())
        .post(`${API_PREFIX}/repositories/github/personal/analyze`)
        .set(withBearer(identity.token))
        .send({ repositoryId: 940001 });

      expect(response.status).toBe(201);

      const body = responseRecord(response);
      const applications = body.applications as Array<Record<string, unknown>>;

      expect(applications).toHaveLength(1);
      expect(applications[0]?.rootDirectory).toBe('.');
    });
  });

  describe('Workspace import transaction', () => {
    async function analyzedApplications(app_: INestApplication, identity: Identity) {
      githubCodeMock.getTree.mockResolvedValueOnce({
        sha: 'tree-sha',
        truncated: false,
        entries: [{ path: 'package.json', type: 'file', sha: 'r1', size: 100 }],
      });

      githubCodeMock.getFile.mockResolvedValueOnce({
        name: 'package.json',
        path: 'package.json',
        sha: 'r1',
        size: 100,
        encoding: 'base64',
        content: encodePackageJson({
          name: 'demo-app',
          dependencies: { next: '^15.0.0' },
          scripts: { dev: 'next dev', build: 'next build', start: 'next start' },
        }),
      });

      const response = await request(app_.getHttpServer())
        .post(`${API_PREFIX}/repositories/github/personal/analyze`)
        .set(withBearer(identity.token))
        .send({ repositoryId: 940001 });

      return responseRecord(response);
    }

    it('rejects importing a repository through an installation the user never connected', async () => {
      const identity = await registerIdentity(app, 'Unauthorized Import');

      const response = await request(app.getHttpServer())
        .post(`${API_PREFIX}/workspaces/import/github`)
        .set(withBearer(identity.token))
        .send({
          installationId: DEFAULT_INSTALLATION_ID,
          repositoryId: 940001,
          workspace: { name: 'Demo Workspace' },
          applications: [{ name: 'Demo App', rootDirectory: '.' }],
        });

      expect(response.status).toBe(403);
    });

    it('creates a workspace, application, and repository connection atomically', async () => {
      const identity = await registerIdentity(app, 'Successful Import');
      await connectPersonalGithub(app, identity);

      const analysis = await analyzedApplications(app, identity);

      const response = await request(app.getHttpServer())
        .post(`${API_PREFIX}/workspaces/import/github`)
        .set(withBearer(identity.token))
        .send({
          installationId: DEFAULT_INSTALLATION_ID,
          repositoryId: 940001,
          workspace: {
            name: 'Demo Workspace',
            description: 'Imported from GitHub',
          },
          applications: [
            {
              name: 'Demo App',
              rootDirectory: '.',
              framework: 'Next.js',
              technologies: ['TypeScript'],
            },
          ],
        });

      expect(response.status).toBe(201);
      expect(analysis.repositoryType).toBe('single-app');

      const body = responseRecord(response);
      const workspaceId = requireString(body, 'workspaceId');

      const workspace = await prisma.workspace.findUnique({ where: { id: workspaceId } });
      expect(workspace).not.toBeNull();

      const member = await prisma.workspaceMember.findFirst({
        where: { workspaceId, userId: identity.userId, role: 'OWNER' },
      });
      expect(member).not.toBeNull();

      const application = await prisma.saasApplication.findFirst({ where: { workspaceId } });
      expect(application?.name).toBe('Demo App');

      const connection = await prisma.repositoryConnection.findFirst({ where: { workspaceId } });
      expect(connection?.fullName).toBe(`${DEFAULT_OWNER}/demo-app`);
      expect(connection?.applicationId).toBe(application?.id);
    });

    it('creates a separate workspace when the same repository is imported twice, avoiding silent duplicate application collisions', async () => {
      const identity = await registerIdentity(app, 'Duplicate Import');
      await connectPersonalGithub(app, identity);

      const importPayload = {
        installationId: DEFAULT_INSTALLATION_ID,
        repositoryId: 940001,
        workspace: { name: 'Duplicate Workspace' },
        applications: [{ name: 'Duplicate App', rootDirectory: '.' }],
      };

      const first = await request(app.getHttpServer()).post(`${API_PREFIX}/workspaces/import/github`).set(withBearer(identity.token)).send(importPayload);

      expect(first.status).toBe(201);

      const second = await request(app.getHttpServer()).post(`${API_PREFIX}/workspaces/import/github`).set(withBearer(identity.token)).send(importPayload);

      expect(second.status).toBe(201);

      const firstWorkspaceId = requireString(responseRecord(first), 'workspaceId');
      const secondWorkspaceId = requireString(responseRecord(second), 'workspaceId');

      expect(firstWorkspaceId).not.toBe(secondWorkspaceId);

      const firstWorkspace = await prisma.workspace.findUnique({ where: { id: firstWorkspaceId } });
      const secondWorkspace = await prisma.workspace.findUnique({ where: { id: secondWorkspaceId } });

      expect(firstWorkspace?.slug).not.toBe(secondWorkspace?.slug);
    });

    it('rejects an import request with no selected applications', async () => {
      const identity = await registerIdentity(app, 'Empty Applications Import');
      await connectPersonalGithub(app, identity);

      const response = await request(app.getHttpServer())
        .post(`${API_PREFIX}/workspaces/import/github`)
        .set(withBearer(identity.token))
        .send({
          installationId: DEFAULT_INSTALLATION_ID,
          repositoryId: 940001,
          workspace: { name: 'No Apps Workspace' },
          applications: [],
        });

      expect(response.status).toBe(400);
    });

    it('rolls back and creates nothing when the repository is no longer accessible mid-import', async () => {
      const identity = await registerIdentity(app, 'Rollback Import');
      await connectPersonalGithub(app, identity);

      githubAppMock.listImportableInstallationRepositories.mockResolvedValueOnce([]);

      const response = await request(app.getHttpServer())
        .post(`${API_PREFIX}/workspaces/import/github`)
        .set(withBearer(identity.token))
        .send({
          installationId: DEFAULT_INSTALLATION_ID,
          repositoryId: 940001,
          workspace: { name: 'Rollback Workspace' },
          applications: [{ name: 'Rollback App', rootDirectory: '.' }],
        });

      expect(response.status).toBe(403);

      const workspace = await prisma.workspace.findFirst({ where: { name: 'Rollback Workspace' } });
      expect(workspace).toBeNull();
    });
  });
});
