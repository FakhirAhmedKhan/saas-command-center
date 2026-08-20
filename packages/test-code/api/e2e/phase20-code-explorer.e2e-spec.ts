import { AppModule } from 'src/app.module';
import { createAgent, createTestUser, registerUser, withBearer } from '../helpers/auth';
import { resetDatabase } from '../helpers/database';
import { readAccessToken } from '../helpers/response';
import { PrismaService } from 'src/database/prisma.service';
import { WorkspaceRole } from 'src/generated/prisma/enums';
import { GithubAppService } from 'src/modules/repositories/services/github-app.service';
import { GithubCodeService } from 'src/modules/repositories/services/github-code.service';
import { ValidationPipe, type INestApplication } from '@nestjs/common';
import { type NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import request, { type Response } from 'supertest';

const API_PREFIX = '/api/v1';

interface Identity {
  token: string;
  userId: string;
  workspaceId: string;
}

interface GithubFixture {
  installationId: string;
  repositoryId: string;
  owner: string;
  name: string;
  fullName: string;
}

interface GithubFileMock {
  name: string;
  path: string;
  sha: string;
  size: number;
  encoding: 'base64';
  content: string;
  type: 'file';
}

const DEFAULT_GITHUB_FIXTURE: GithubFixture = {
  installationId: '930001',
  repositoryId: '940001',
  owner: 'phase20-org',
  name: 'saas-command-center',
  fullName: 'phase20-org/saas-command-center',
};

const githubAppMock = {
  buildInstallationUrl: jest.fn((state: string): string => {
    return `https://github.test/apps/command-center/installations/new?state=${encodeURIComponent(state)}`;
  }),

  buildUserAuthorizationUrl: jest.fn((state: string, codeChallenge: string): string => {
    const url = new URL('https://github.test/login/oauth/authorize');
    url.searchParams.set('state', state);
    url.searchParams.set('code_challenge', codeChallenge);
    return url.toString();
  }),

  exchangeUserCode: jest.fn(async (_code: string, _codeVerifier: string): Promise<string> => {
    return 'ghu_phase20_test_user_token';
  }),

  getInstallation: jest.fn(async (installationId: string) => {
    return {
      id: installationId,
      externalInstallationId: installationId,
      accountLogin: DEFAULT_GITHUB_FIXTURE.owner,
      accountType: 'Organization',
      account: {
        login: DEFAULT_GITHUB_FIXTURE.owner,
        type: 'Organization',
      },
    };
  }),

  userCanAccessInstallation: jest.fn(async (_userAccessToken: string, _installationId: string): Promise<boolean> => true),

  listInstallationRepositories: jest.fn(async (_installationId: string) => {
    return [
      {
        id: DEFAULT_GITHUB_FIXTURE.repositoryId,
        externalRepoId: DEFAULT_GITHUB_FIXTURE.repositoryId,
        owner: DEFAULT_GITHUB_FIXTURE.owner,
        name: DEFAULT_GITHUB_FIXTURE.name,
        fullName: DEFAULT_GITHUB_FIXTURE.fullName,
        defaultBranch: 'main',
        private: true,
        isPrivate: true,
        htmlUrl: `https://github.com/${DEFAULT_GITHUB_FIXTURE.fullName}`,
        archived: false,
        pushedAt: '2026-08-09T12:00:00.000Z',
      },
    ];
  }),

  getInstallationAccessToken: jest.fn(async (_installationId: string): Promise<string> => {
    return 'ghs_phase20_test_installation_token';
  }),
};

const githubCodeMock = {
  listBranches: jest.fn(async (_installationId: string, _owner: string, _repository: string) => {
    return [
      {
        name: 'main',
        sha: 'sha-main',
        protected: true,
        isProtected: true,
      },
      {
        name: 'develop',
        sha: 'sha-develop',
        protected: false,
        isProtected: false,
      },
    ];
  }),

  getTree: jest.fn(async (_installationId: string, _owner: string, _repository: string, _branch: string) => {
    return {
      sha: 'tree-main',
      truncated: false,
      entries: [
        {
          path: 'README.md',
          type: 'file',
          sha: 'sha-readme',
          size: 120,
        },
        {
          path: 'src',
          type: 'directory',
          sha: 'sha-src',
          size: null,
        },
        {
          path: 'src/index.ts',
          type: 'file',
          sha: 'sha-index',
          size: 64,
        },
        {
          path: 'src/nested',
          type: 'directory',
          sha: 'sha-nested',
          size: null,
        },
        {
          path: 'src/nested/service.ts',
          type: 'file',
          sha: 'sha-service',
          size: 96,
        },
      ],
    };
  }),

  getFile: jest.fn(async (_installationId: string, _owner: string, _repository: string, path: string, ref: string): Promise<GithubFileMock | null> => {
    const text = `// ${ref}\nexport const filePath = '${path}';\n`;

    return {
      name: path.split('/').at(-1) ?? path,
      path,
      sha: `sha-${ref}-${path.replaceAll('/', '-')}`,
      size: Buffer.byteLength(text, 'utf8'),
      encoding: 'base64',
      content: Buffer.from(text, 'utf8').toString('base64'),
      type: 'file',
    };
  }),
};

function repositoriesRoute(workspaceId: string): string {
  return `${API_PREFIX}/workspaces/${workspaceId}/repositories`;
}

function codeRoute(workspaceId: string, repositoryId: string): string {
  return `${repositoriesRoute(workspaceId)}/${repositoryId}/code`;
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

function readArray(response: Response, keys: string[]): unknown[] {
  const body = response.body as unknown;

  if (Array.isArray(body)) {
    return body;
  }

  const record = asRecord(body);

  for (const key of keys) {
    if (Array.isArray(record[key])) {
      return record[key];
    }
  }

  throw new Error(`Expected one of [${keys.join(', ')}] to contain an array.`);
}

function findProperty(value: unknown, keys: readonly string[]): unknown {
  if (!value || typeof value !== 'object') {
    return undefined;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findProperty(item, keys);
      if (found !== undefined) {
        return found;
      }
    }

    return undefined;
  }

  const record = value as Record<string, unknown>;

  for (const key of keys) {
    if (key in record) {
      return record[key];
    }
  }

  for (const nested of Object.values(record)) {
    const found = findProperty(nested, keys);
    if (found !== undefined) {
      return found;
    }
  }

  return undefined;
}

function configureGithubFixture(fixture: GithubFixture): void {
  githubAppMock.getInstallation.mockResolvedValue({
    id: fixture.installationId,
    externalInstallationId: fixture.installationId,
    accountLogin: fixture.owner,
    accountType: 'Organization',
    account: {
      login: fixture.owner,
      type: 'Organization',
    },
  });

  githubAppMock.listInstallationRepositories.mockResolvedValue([
    {
      id: fixture.repositoryId,
      externalRepoId: fixture.repositoryId,
      owner: fixture.owner,
      name: fixture.name,
      fullName: fixture.fullName,
      defaultBranch: 'main',
      private: true,
      isPrivate: true,
      htmlUrl: `https://github.com/${fixture.fullName}`,
      archived: false,
      pushedAt: '2026-08-09T12:00:00.000Z',
    },
  ]);

  githubAppMock.userCanAccessInstallation.mockResolvedValue(true);
  githubAppMock.exchangeUserCode.mockResolvedValue('ghu_phase20_test_user_token');
}

async function createPhase20TestApp(): Promise<INestApplication> {
  const testingModule = await Test.createTestingModule({
    imports: [AppModule],
  })
    .overrideProvider(GithubAppService)
    .useValue(githubAppMock)
    .overrideProvider(GithubCodeService)
    .useValue(githubCodeMock)
    .compile();

  const app = testingModule.createNestApplication<NestExpressApplication>();
  const expressInstance = app.getHttpAdapter().getInstance();
  expressInstance.set('trust proxy', 1);

  app.use(cookieParser());
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
  return app;
}

async function registerIdentity(app: INestApplication, prisma: PrismaService, label: string): Promise<Identity> {
  const userInput = createTestUser({
    name: `${label} User`,
    workspaceName: `${label} Workspace`,
  });

  const response = await registerUser(createAgent(app), userInput);
  expect(response.status).toBe(201);

  const token = readAccessToken(response);
  const user = await prisma.user.findUnique({
    where: {
      email: userInput.email,
    },
    select: {
      id: true,
    },
  });

  if (!user) {
    throw new Error(`Registered user ${userInput.email} was not persisted.`);
  }

  const workspaceResponse = await request(app.getHttpServer()).post(`${API_PREFIX}/workspaces`).set(withBearer(token)).send({
    name: userInput.workspaceName,
  });

  expect(workspaceResponse.status).toBe(201);

  const ownerMembership = await prisma.workspaceMember.findFirst({
    where: {
      userId: user.id,
      role: WorkspaceRole.OWNER,
    },
    select: {
      workspaceId: true,
    },
  });

  if (!ownerMembership) {
    throw new Error(`Explicit workspace for ${userInput.email} was not persisted.`);
  }

  return {
    token,
    userId: user.id,
    workspaceId: ownerMembership.workspaceId,
  };
}

async function addWorkspaceRole(prisma: PrismaService, workspaceId: string, identity: Identity, role: WorkspaceRole): Promise<void> {
  await prisma.workspaceMember.create({
    data: {
      workspaceId,
      userId: identity.userId,
      role,
    },
  });
}

async function connectRepository(
  app: INestApplication,
  prisma: PrismaService,
  identity: Identity,
  workspaceId: string,
  fixture: GithubFixture = DEFAULT_GITHUB_FIXTURE,
): Promise<string> {
  configureGithubFixture(fixture);

  const beginResponse = await request(app.getHttpServer())
    .post(`${repositoriesRoute(workspaceId)}/github/connect`)
    .set(withBearer(identity.token));

  expect(beginResponse.status).toBe(201);

  const installationState = queryParameter(requireString(responseRecord(beginResponse), 'installationUrl'), 'state');

  const setupResponse = await request(app.getHttpServer()).post(`${API_PREFIX}/repositories/github/setup`).set(withBearer(identity.token)).send({
    installState: installationState,
    installationId: fixture.installationId,
  });

  expect(setupResponse.status).toBe(201);

  const oauthState = queryParameter(requireString(responseRecord(setupResponse), 'authorizationUrl'), 'state');

  const callbackResponse = await request(app.getHttpServer()).post(`${API_PREFIX}/repositories/github/callback`).set(withBearer(identity.token)).send({
    code: 'phase20-oauth-code',
    state: oauthState,
  });

  expect(callbackResponse.status).toBe(201);

  const repository = await prisma.repositoryConnection.findFirst({
    where: {
      workspaceId,
    },
    select: {
      id: true,
    },
  });

  if (!repository) {
    throw new Error('Phase 20 setup could not create a repository connection.');
  }

  return repository.id;
}

describe('Phase 20 - Code Explorer E2E', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    app = await createPhase20TestApp();
    prisma = app.get(PrismaService);
  });

  beforeEach(async () => {
    jest.clearAllMocks();
    configureGithubFixture(DEFAULT_GITHUB_FIXTURE);

    githubCodeMock.listBranches.mockResolvedValue([
      {
        name: 'main',
        sha: 'sha-main',
        protected: true,
        isProtected: true,
      },
      {
        name: 'develop',
        sha: 'sha-develop',
        protected: false,
        isProtected: false,
      },
    ]);

    githubCodeMock.getTree.mockResolvedValue({
      sha: 'tree-main',
      truncated: false,
      entries: [
        {
          path: 'README.md',
          type: 'file',
          sha: 'sha-readme',
          size: 120,
        },
        {
          path: 'src',
          type: 'directory',
          sha: 'sha-src',
          size: null,
        },
        {
          path: 'src/index.ts',
          type: 'file',
          sha: 'sha-index',
          size: 64,
        },
      ],
    });

    githubCodeMock.getFile.mockImplementation(
      async (_installationId: string, _owner: string, _repository: string, path: string, ref: string): Promise<GithubFileMock | null> => {
        const text = `// ${ref}\nexport const filePath = '${path}';\n`;

        return {
          name: path.split('/').at(-1) ?? path,
          path,
          sha: `sha-${ref}-${path.replaceAll('/', '-')}`,
          size: Buffer.byteLength(text, 'utf8'),
          encoding: 'base64',
          content: Buffer.from(text, 'utf8').toString('base64'),
          type: 'file',
        };
      },
    );

    await resetDatabase(prisma);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('authorization and tenant isolation', () => {
    it('rejects anonymous code access', async () => {
      const owner = await registerIdentity(app, prisma, 'Anonymous Code Owner');
      const repositoryId = await connectRepository(app, prisma, owner, owner.workspaceId);

      const response = await request(app.getHttpServer()).get(`${codeRoute(owner.workspaceId, repositoryId)}/branches`);

      expect(response.status).toBe(401);
    });

    it('rejects an outsider who is not a workspace member', async () => {
      const owner = await registerIdentity(app, prisma, 'Code Workspace Owner');
      const outsider = await registerIdentity(app, prisma, 'Code Outsider');
      const repositoryId = await connectRepository(app, prisma, owner, owner.workspaceId);

      const response = await request(app.getHttpServer())
        .get(`${codeRoute(owner.workspaceId, repositoryId)}/branches`)
        .set(withBearer(outsider.token));

      expect(response.status).toBe(403);
    });

    it('returns 404 for a repository ID from another workspace', async () => {
      const ownerA = await registerIdentity(app, prisma, 'Code Tenant A');
      const ownerB = await registerIdentity(app, prisma, 'Code Tenant B');
      const fixtureB: GithubFixture = {
        installationId: '930002',
        repositoryId: '940002',
        owner: 'phase20-org-b',
        name: 'private-b',
        fullName: 'phase20-org-b/private-b',
      };
      const repositoryB = await connectRepository(app, prisma, ownerB, ownerB.workspaceId, fixtureB);

      const response = await request(app.getHttpServer())
        .get(`${codeRoute(ownerA.workspaceId, repositoryB)}/branches`)
        .set(withBearer(ownerA.token));

      expect(response.status).toBe(404);
    });

    it('allows VIEWER to use read-only Code Explorer endpoints', async () => {
      const owner = await registerIdentity(app, prisma, 'Viewer Code Owner');
      const viewer = await registerIdentity(app, prisma, 'Viewer Code User');
      await addWorkspaceRole(prisma, owner.workspaceId, viewer, WorkspaceRole.VIEWER);
      const repositoryId = await connectRepository(app, prisma, owner, owner.workspaceId);

      const response = await request(app.getHttpServer())
        .get(`${codeRoute(owner.workspaceId, repositoryId)}/branches`)
        .set(withBearer(viewer.token));

      expect(response.status).toBe(200);
    });

    it('rejects a malformed repository UUID', async () => {
      const owner = await registerIdentity(app, prisma, 'Malformed Repository Owner');

      const response = await request(app.getHttpServer())
        .get(`${codeRoute(owner.workspaceId, 'not-a-uuid')}/branches`)
        .set(withBearer(owner.token));

      expect(response.status).toBe(400);
    });
  });

  describe('branches and tree', () => {
    it('returns repository branches', async () => {
      const owner = await registerIdentity(app, prisma, 'Branches Owner');
      const repositoryId = await connectRepository(app, prisma, owner, owner.workspaceId);

      const response = await request(app.getHttpServer())
        .get(`${codeRoute(owner.workspaceId, repositoryId)}/branches`)
        .set(withBearer(owner.token));

      expect(response.status).toBe(200);
      const branches = readArray(response, ['branches', 'data', 'items']);
      expect(branches).toHaveLength(2);
      expect(JSON.stringify(branches)).toContain('main');
      expect(JSON.stringify(branches)).toContain('develop');
      expect(githubCodeMock.listBranches).toHaveBeenCalledWith(
        DEFAULT_GITHUB_FIXTURE.installationId,
        DEFAULT_GITHUB_FIXTURE.owner,
        DEFAULT_GITHUB_FIXTURE.name,
      );
    });

    it('loads the recursive tree using the repository default branch', async () => {
      const owner = await registerIdentity(app, prisma, 'Default Tree Owner');
      const repositoryId = await connectRepository(app, prisma, owner, owner.workspaceId);

      const response = await request(app.getHttpServer())
        .get(`${codeRoute(owner.workspaceId, repositoryId)}/tree`)
        .set(withBearer(owner.token));

      expect(response.status).toBe(200);
      const text = JSON.stringify(response.body);
      expect(text).toContain('README.md');
      expect(text).toContain('src');
      expect(text).toContain('src/index.ts');
      expect(githubCodeMock.getTree).toHaveBeenCalledWith(
        DEFAULT_GITHUB_FIXTURE.installationId,
        DEFAULT_GITHUB_FIXTURE.owner,
        DEFAULT_GITHUB_FIXTURE.name,
        'main',
      );
    });

    it('forwards an explicit branch to GitHub', async () => {
      const owner = await registerIdentity(app, prisma, 'Explicit Branch Owner');
      const repositoryId = await connectRepository(app, prisma, owner, owner.workspaceId);

      const response = await request(app.getHttpServer())
        .get(`${codeRoute(owner.workspaceId, repositoryId)}/tree`)
        .query({
          branch: 'develop',
        })
        .set(withBearer(owner.token));

      expect(response.status).toBe(200);
      expect(githubCodeMock.getTree).toHaveBeenCalledWith(
        DEFAULT_GITHUB_FIXTURE.installationId,
        DEFAULT_GITHUB_FIXTURE.owner,
        DEFAULT_GITHUB_FIXTURE.name,
        'develop',
      );
    });

    it('preserves GitHub truncated-tree state', async () => {
      const owner = await registerIdentity(app, prisma, 'Truncated Tree Owner');
      const repositoryId = await connectRepository(app, prisma, owner, owner.workspaceId);

      githubCodeMock.getTree.mockResolvedValueOnce({
        sha: 'tree-truncated',
        truncated: true,
        entries: [],
      });

      const response = await request(app.getHttpServer())
        .get(`${codeRoute(owner.workspaceId, repositoryId)}/tree`)
        .set(withBearer(owner.token));

      expect(response.status).toBe(200);
      expect(findProperty(response.body as unknown, ['truncated'])).toBe(true);
    });

    it('rejects a blank branch after normalization', async () => {
      const owner = await registerIdentity(app, prisma, 'Blank Branch Owner');
      const repositoryId = await connectRepository(app, prisma, owner, owner.workspaceId);

      const response = await request(app.getHttpServer())
        .get(`${codeRoute(owner.workspaceId, repositoryId)}/tree`)
        .query({
          branch: '   ',
        })
        .set(withBearer(owner.token));

      expect(response.status).toBe(400);
      expect(githubCodeMock.getTree).not.toHaveBeenCalled();
    });
  });

  describe('repository search', () => {
    it('searches repository paths case-insensitively', async () => {
      const owner = await registerIdentity(app, prisma, 'Search Owner');
      const repositoryId = await connectRepository(app, prisma, owner, owner.workspaceId);

      githubCodeMock.getTree.mockResolvedValueOnce({
        sha: 'tree-search',
        truncated: false,
        entries: [
          { path: 'src/AuthService.ts', type: 'file', sha: '1', size: 10 },
          { path: 'src/user.service.ts', type: 'file', sha: '2', size: 10 },
          { path: 'README.md', type: 'file', sha: '3', size: 10 },
        ],
      });

      const response = await request(app.getHttpServer())
        .get(`${codeRoute(owner.workspaceId, repositoryId)}/search`)
        .query({
          query: 'authservice',
        })
        .set(withBearer(owner.token));

      expect(response.status).toBe(200);
      const results = readArray(response, ['matches']);
      expect(results).toHaveLength(1);
      expect(JSON.stringify(results[0])).toContain('AuthService.ts');
    });

    it('caps search results at 100 entries', async () => {
      const owner = await registerIdentity(app, prisma, 'Search Limit Owner');
      const repositoryId = await connectRepository(app, prisma, owner, owner.workspaceId);

      githubCodeMock.getTree.mockResolvedValueOnce({
        sha: 'tree-large-search',
        truncated: false,
        entries: Array.from({ length: 150 }, (_, index) => ({
          path: `src/file-${index}.ts`,
          type: 'file',
          sha: `sha-${index}`,
          size: 10,
        })),
      });

      const response = await request(app.getHttpServer())
        .get(`${codeRoute(owner.workspaceId, repositoryId)}/search`)
        .query({
          query: 'file-',
        })
        .set(withBearer(owner.token));

      expect(response.status).toBe(200);
      expect(readArray(response, ['matches'])).toHaveLength(100);
    });

    it('rejects a blank search query', async () => {
      const owner = await registerIdentity(app, prisma, 'Blank Search Owner');
      const repositoryId = await connectRepository(app, prisma, owner, owner.workspaceId);

      const response = await request(app.getHttpServer())
        .get(`${codeRoute(owner.workspaceId, repositoryId)}/search`)
        .query({
          query: '   ',
        })
        .set(withBearer(owner.token));

      expect(response.status).toBe(400);
    });
  });

  describe('file viewing and file safety', () => {
    it('decodes a UTF-8 text file from GitHub base64 content', async () => {
      const owner = await registerIdentity(app, prisma, 'Text File Owner');
      const repositoryId = await connectRepository(app, prisma, owner, owner.workspaceId);
      const source = 'export const answer = 42;\n';

      githubCodeMock.getFile.mockResolvedValueOnce({
        name: 'answer.ts',
        path: 'src/answer.ts',
        sha: 'sha-answer',
        size: Buffer.byteLength(source),
        encoding: 'base64',
        content: Buffer.from(source).toString('base64'),
        type: 'file',
      });

      const response = await request(app.getHttpServer())
        .get(`${codeRoute(owner.workspaceId, repositoryId)}/file`)
        .query({
          path: 'src/answer.ts',
        })
        .set(withBearer(owner.token));

      expect(response.status).toBe(200);
      expect(JSON.stringify(response.body)).toContain('export const answer = 42;');
      expect(findProperty(response.body as unknown, ['kind', 'type'])).toBe('text');
    });

    it('returns image files as base64 image content', async () => {
      const owner = await registerIdentity(app, prisma, 'Image File Owner');
      const repositoryId = await connectRepository(app, prisma, owner, owner.workspaceId);
      const bytes = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

      githubCodeMock.getFile.mockResolvedValueOnce({
        name: 'logo.png',
        path: 'public/logo.png',
        sha: 'sha-logo',
        size: bytes.length,
        encoding: 'base64',
        content: bytes.toString('base64'),
        type: 'file',
      });

      const response = await request(app.getHttpServer())
        .get(`${codeRoute(owner.workspaceId, repositoryId)}/file`)
        .query({
          path: 'public/logo.png',
        })
        .set(withBearer(owner.token));

      expect(response.status).toBe(200);
      expect(findProperty(response.body as unknown, ['kind', 'type'])).toBe('image');
      expect(findProperty(response.body as unknown, ['mimeType'])).toBe('image/png');
      expect(JSON.stringify(response.body)).toContain(bytes.toString('base64'));
    });

    it('does not decode an arbitrary binary file as text', async () => {
      const owner = await registerIdentity(app, prisma, 'Binary File Owner');
      const repositoryId = await connectRepository(app, prisma, owner, owner.workspaceId);
      const bytes = Buffer.from([0x00, 0x01, 0x02, 0x03, 0xff]);

      githubCodeMock.getFile.mockResolvedValueOnce({
        name: 'archive.bin',
        path: 'fixtures/archive.bin',
        sha: 'sha-bin',
        size: bytes.length,
        encoding: 'base64',
        content: bytes.toString('base64'),
        type: 'file',
      });

      const response = await request(app.getHttpServer())
        .get(`${codeRoute(owner.workspaceId, repositoryId)}/file`)
        .query({
          path: 'fixtures/archive.bin',
        })
        .set(withBearer(owner.token));

      expect(response.status).toBe(200);
      expect(findProperty(response.body as unknown, ['kind', 'type'])).toBe('binary');
      expect(findProperty(response.body as unknown, ['content'])).toBeNull();
    });

    it('returns 404 when GitHub reports that a file does not exist', async () => {
      const owner = await registerIdentity(app, prisma, 'Missing File Owner');
      const repositoryId = await connectRepository(app, prisma, owner, owner.workspaceId);
      githubCodeMock.getFile.mockResolvedValueOnce(null);

      const response = await request(app.getHttpServer())
        .get(`${codeRoute(owner.workspaceId, repositoryId)}/file`)
        .query({
          path: 'src/missing.ts',
        })
        .set(withBearer(owner.token));

      expect(response.status).toBe(404);
    });

    it('rejects files larger than the Code Explorer limit', async () => {
      const owner = await registerIdentity(app, prisma, 'Large File Owner');
      const repositoryId = await connectRepository(app, prisma, owner, owner.workspaceId);

      githubCodeMock.getFile.mockResolvedValueOnce({
        name: 'large.txt',
        path: 'large.txt',
        sha: 'sha-large',
        size: 1_000_001,
        encoding: 'base64',
        content: Buffer.from('too-large').toString('base64'),
        type: 'file',
      });

      const response = await request(app.getHttpServer())
        .get(`${codeRoute(owner.workspaceId, repositoryId)}/file`)
        .query({
          path: 'large.txt',
        })
        .set(withBearer(owner.token));

      expect(response.status).toBe(413);
    });

    it('rejects parent-directory traversal', async () => {
      const owner = await registerIdentity(app, prisma, 'Traversal Owner');
      const repositoryId = await connectRepository(app, prisma, owner, owner.workspaceId);

      const response = await request(app.getHttpServer())
        .get(`${codeRoute(owner.workspaceId, repositoryId)}/file`)
        .query({
          path: '../.env',
        })
        .set(withBearer(owner.token));

      expect(response.status).toBe(400);
      expect(githubCodeMock.getFile).not.toHaveBeenCalled();
    });

    it('rejects absolute repository paths', async () => {
      const owner = await registerIdentity(app, prisma, 'Absolute Path Owner');
      const repositoryId = await connectRepository(app, prisma, owner, owner.workspaceId);

      const response = await request(app.getHttpServer())
        .get(`${codeRoute(owner.workspaceId, repositoryId)}/file`)
        .query({
          path: '/etc/passwd',
        })
        .set(withBearer(owner.token));

      expect(response.status).toBe(400);
      expect(githubCodeMock.getFile).not.toHaveBeenCalled();
    });

    it('uses repository owner and name from the database instead of client input', async () => {
      const owner = await registerIdentity(app, prisma, 'Scoped Repository Owner');
      const repositoryId = await connectRepository(app, prisma, owner, owner.workspaceId);

      const response = await request(app.getHttpServer())
        .get(`${codeRoute(owner.workspaceId, repositoryId)}/file`)
        .query({
          path: 'src/index.ts',
          branch: 'main',
          owner: 'attacker-org',
          repository: 'attacker-repo',
        })
        .set(withBearer(owner.token));

      // whitelist + forbidNonWhitelisted must reject unsupported query parameters.
      expect(response.status).toBe(400);
      expect(githubCodeMock.getFile).not.toHaveBeenCalled();

      const validResponse = await request(app.getHttpServer())
        .get(`${codeRoute(owner.workspaceId, repositoryId)}/file`)
        .query({
          path: 'src/index.ts',
          branch: 'main',
        })
        .set(withBearer(owner.token));

      expect(validResponse.status).toBe(200);
      expect(githubCodeMock.getFile).toHaveBeenCalledWith(
        DEFAULT_GITHUB_FIXTURE.installationId,
        DEFAULT_GITHUB_FIXTURE.owner,
        DEFAULT_GITHUB_FIXTURE.name,
        'src/index.ts',
        'main',
      );
    });
  });

  describe('diff viewer', () => {
    it('returns decoded text for both sides of a text diff', async () => {
      const owner = await registerIdentity(app, prisma, 'Text Diff Owner');
      const repositoryId = await connectRepository(app, prisma, owner, owner.workspaceId);

      githubCodeMock.getFile
        .mockResolvedValueOnce({
          name: 'index.ts',
          path: 'src/index.ts',
          sha: 'sha-base',
          size: 22,
          encoding: 'base64',
          content: Buffer.from('export const v = 1;\n').toString('base64'),
          type: 'file',
        })
        .mockResolvedValueOnce({
          name: 'index.ts',
          path: 'src/index.ts',
          sha: 'sha-head',
          size: 22,
          encoding: 'base64',
          content: Buffer.from('export const v = 2;\n').toString('base64'),
          type: 'file',
        });

      const response = await request(app.getHttpServer())
        .get(`${codeRoute(owner.workspaceId, repositoryId)}/diff`)
        .query({
          base: 'main',
          head: 'feature/test',
          path: 'src/index.ts',
        })
        .set(withBearer(owner.token));

      expect(response.status).toBe(200);
      const text = JSON.stringify(response.body);
      expect(text).toContain('export const v = 1;');
      expect(text).toContain('export const v = 2;');
      expect(findProperty(response.body as unknown, ['textDiff', 'isText'])).toBe(true);
    });

    it('supports a file that exists only on the base side', async () => {
      const owner = await registerIdentity(app, prisma, 'Deleted Diff Owner');
      const repositoryId = await connectRepository(app, prisma, owner, owner.workspaceId);

      githubCodeMock.getFile
        .mockResolvedValueOnce({
          name: 'removed.ts',
          path: 'src/removed.ts',
          sha: 'sha-removed',
          size: 16,
          encoding: 'base64',
          content: Buffer.from('old content\n').toString('base64'),
          type: 'file',
        })
        .mockResolvedValueOnce(null);

      const response = await request(app.getHttpServer())
        .get(`${codeRoute(owner.workspaceId, repositoryId)}/diff`)
        .query({
          base: 'main',
          head: 'feature/delete-file',
          path: 'src/removed.ts',
        })
        .set(withBearer(owner.token));

      expect(response.status).toBe(200);
      expect(JSON.stringify(response.body)).toContain('old content');
    });

    it('returns 404 when the file is absent from both refs', async () => {
      const owner = await registerIdentity(app, prisma, 'Missing Diff Owner');
      const repositoryId = await connectRepository(app, prisma, owner, owner.workspaceId);
      githubCodeMock.getFile.mockResolvedValueOnce(null).mockResolvedValueOnce(null);

      const response = await request(app.getHttpServer())
        .get(`${codeRoute(owner.workspaceId, repositoryId)}/diff`)
        .query({
          base: 'main',
          head: 'feature/missing',
          path: 'src/missing.ts',
        })
        .set(withBearer(owner.token));

      expect(response.status).toBe(404);
    });

    it('marks a binary comparison as non-text instead of decoding it', async () => {
      const owner = await registerIdentity(app, prisma, 'Binary Diff Owner');
      const repositoryId = await connectRepository(app, prisma, owner, owner.workspaceId);
      const binary = Buffer.from([0x00, 0x01, 0x02, 0xff]);

      githubCodeMock.getFile
        .mockResolvedValueOnce({
          name: 'fixture.bin',
          path: 'fixture.bin',
          sha: 'sha-binary-base',
          size: binary.length,
          encoding: 'base64',
          content: binary.toString('base64'),
          type: 'file',
        })
        .mockResolvedValueOnce({
          name: 'fixture.bin',
          path: 'fixture.bin',
          sha: 'sha-binary-head',
          size: binary.length,
          encoding: 'base64',
          content: binary.toString('base64'),
          type: 'file',
        });

      const response = await request(app.getHttpServer())
        .get(`${codeRoute(owner.workspaceId, repositoryId)}/diff`)
        .query({
          base: 'main',
          head: 'feature/binary',
          path: 'fixture.bin',
        })
        .set(withBearer(owner.token));

      expect(response.status).toBe(200);
      expect(findProperty(response.body as unknown, ['textDiff', 'isText'])).toBe(false);
    });

    it('rejects traversal paths before making either GitHub file request', async () => {
      const owner = await registerIdentity(app, prisma, 'Diff Traversal Owner');
      const repositoryId = await connectRepository(app, prisma, owner, owner.workspaceId);

      const response = await request(app.getHttpServer())
        .get(`${codeRoute(owner.workspaceId, repositoryId)}/diff`)
        .query({
          base: 'main',
          head: 'develop',
          path: '../../secret.txt',
        })
        .set(withBearer(owner.token));

      expect(response.status).toBe(400);
      expect(githubCodeMock.getFile).not.toHaveBeenCalled();
    });
  });
});
