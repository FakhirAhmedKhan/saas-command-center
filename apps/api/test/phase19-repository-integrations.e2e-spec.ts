import { AppModule } from '../src/app.module';
import { createAgent, createTestUser, registerUser, withBearer } from './helpers/auth';
import { resetDatabase } from './helpers/database';
import { readAccessToken } from './helpers/response';
import { PrismaService } from '../src/database/prisma.service';
import { ApplicationCategory, ApplicationPriority, ApplicationStatus, WorkspaceRole } from '../src/generated/prisma/enums';
import { GithubAppService } from '../src/modules/repositories/services/github-app.service';
import { ValidationPipe, type INestApplication } from '@nestjs/common';
import { type NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import { json, raw, urlencoded } from 'express';
import { createHmac } from 'node:crypto';
import request, { type Response } from 'supertest';

const API_PREFIX = '/api/v1';
const WEBHOOK_SECRET = 'phase19-e2e-webhook-secret';

interface Identity {
  token: string;
  userId: string;
  workspaceId: string;
  email: string;
}

interface GithubFixture {
  installationId: string;
  repositoryId: string;
  owner: string;
  name: string;
  fullName: string;
}

const DEFAULT_GITHUB_FIXTURE: GithubFixture = {
  installationId: '910001',
  repositoryId: '920001',
  owner: 'phase19-org',
  name: 'saas-command-center',
  fullName: 'phase19-org/saas-command-center',
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
    return 'ghu_phase19_test_user_token';
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

  getRepository: jest.fn(async (_installationId: string, _owner: string, _repository: string) => {
    return {
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
    };
  }),

  getInstallationAccessToken: jest.fn(async (_installationId: string): Promise<string> => {
    return 'ghs_phase19_test_installation_token';
  }),

  getWebhookSecret: jest.fn((): string => WEBHOOK_SECRET),

  verifyWebhookSignature: jest.fn((body: Buffer | string, signature: string): boolean => {
    const rawBody = Buffer.isBuffer(body) ? body : Buffer.from(body, 'utf8');
    const expected = `sha256=${createHmac('sha256', WEBHOOK_SECRET).update(rawBody).digest('hex')}`;

    return signature === expected;
  }),
};

function routeForWorkspace(workspaceId: string): string {
  return `${API_PREFIX}/workspaces/${workspaceId}/repositories`;
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

function responseItems(response: Response): Record<string, unknown>[] {
  const body = response.body as unknown;

  if (Array.isArray(body)) {
    return body.map(asRecord);
  }

  const record = asRecord(body);
  const candidates = [record.data, record.items, record.repositories];
  const array = candidates.find(Array.isArray);

  if (!array) {
    throw new Error(`Expected an array response. Body: ${JSON.stringify(body)}`);
  }

  return array.map(asRecord);
}

function queryParameter(urlValue: string, key: string): string {
  const value = new URL(urlValue).searchParams.get(key);

  if (!value) {
    throw new Error(`Expected ${key} query parameter in ${urlValue}`);
  }

  return value;
}

async function createRepositoryTestApp(): Promise<INestApplication> {
  const testingModule = await Test.createTestingModule({
    imports: [AppModule],
  })
    .overrideProvider(GithubAppService)
    .useValue(githubAppMock)
    .compile();

  const app = testingModule.createNestApplication<NestExpressApplication>({
    bodyParser: false,
  });

  const expressInstance = app.getHttpAdapter().getInstance();
  expressInstance.set('trust proxy', 1);

  app.use(cookieParser());

  // The webhook must receive the exact bytes GitHub signed.
  app.use(
    `${API_PREFIX}/repositories/github/webhook`,
    raw({
      type: 'application/json',
      limit: '1mb',
    }),
  );

  app.use(
    json({
      limit: '1mb',
    }),
  );

  app.use(
    urlencoded({
      extended: true,
      limit: '1mb',
    }),
  );

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
    email: userInput.email,
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

  const repository = {
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
  };

  githubAppMock.listInstallationRepositories.mockResolvedValue([repository]);
  githubAppMock.getRepository.mockResolvedValue(repository);
  githubAppMock.userCanAccessInstallation.mockResolvedValue(true);
  githubAppMock.exchangeUserCode.mockResolvedValue('ghu_phase19_test_user_token');
}

async function beginGithubConnect(app: INestApplication, identity: Identity, workspaceId: string): Promise<string> {
  const response = await request(app.getHttpServer())
    .post(`${routeForWorkspace(workspaceId)}/github/connect`)
    .set(withBearer(identity.token));

  expect(response.status).toBe(201);

  const installationUrl = requireString(responseRecord(response), 'installationUrl');
  return queryParameter(installationUrl, 'state');
}

async function completeGithubSetup(app: INestApplication, identity: Identity, installationState: string, installationId: string): Promise<string> {
  const response = await request(app.getHttpServer()).post(`${API_PREFIX}/repositories/github/setup`).set(withBearer(identity.token)).send({
    installState: installationState,
    installationId,
  });

  expect(response.status).toBe(201);

  const authorizationUrl = requireString(responseRecord(response), 'authorizationUrl');
  return queryParameter(authorizationUrl, 'state');
}

async function finishGithubCallback(app: INestApplication, identity: Identity, oauthState: string): Promise<Response> {
  return request(app.getHttpServer()).post(`${API_PREFIX}/repositories/github/callback`).set(withBearer(identity.token)).send({
    code: 'phase19-oauth-code',
    state: oauthState,
  });
}

async function connectRepository(
  app: INestApplication,
  prisma: PrismaService,
  identity: Identity,
  workspaceId: string,
  fixture: GithubFixture = DEFAULT_GITHUB_FIXTURE,
): Promise<{
  repositoryId: string;
  installationRecordId: string;
}> {
  configureGithubFixture(fixture);

  const installationState = await beginGithubConnect(app, identity, workspaceId);
  const oauthState = await completeGithubSetup(app, identity, installationState, fixture.installationId);

  const callbackResponse = await finishGithubCallback(app, identity, oauthState);
  expect(callbackResponse.status).toBe(201);

  const installation = await prisma.repositoryInstallation.findFirst({
    where: {
      workspaceId,
    },
    select: {
      id: true,
    },
  });

  const repository = await prisma.repositoryConnection.findFirst({
    where: {
      workspaceId,
    },
    select: {
      id: true,
    },
  });

  if (!installation || !repository) {
    throw new Error('GitHub callback did not persist the installation and repository.');
  }

  return {
    repositoryId: repository.id,
    installationRecordId: installation.id,
  };
}

describe('Phase 19 - Repository Integrations E2E', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    process.env.GITHUB_APP_WEBHOOK_SECRET = WEBHOOK_SECRET;
    app = await createRepositoryTestApp();
    prisma = app.get(PrismaService);
  });

  beforeEach(async () => {
    jest.clearAllMocks();
    configureGithubFixture(DEFAULT_GITHUB_FIXTURE);
    await resetDatabase(prisma);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GitHub connection authorization', () => {
    it('rejects anonymous GitHub connection attempts', async () => {
      const owner = await registerIdentity(app, prisma, 'Anonymous Connect Owner');

      const response = await request(app.getHttpServer()).post(`${routeForWorkspace(owner.workspaceId)}/github/connect`);

      expect(response.status).toBe(401);
    });

    it('rejects a malformed workspace identifier', async () => {
      const owner = await registerIdentity(app, prisma, 'Malformed Workspace Owner');

      const response = await request(app.getHttpServer())
        .post(`${routeForWorkspace('not-a-uuid')}/github/connect`)
        .set(withBearer(owner.token));

      expect(response.status).toBe(400);
    });

    it('allows OWNER to start a GitHub App installation and stores only hashed state', async () => {
      const owner = await registerIdentity(app, prisma, 'Connect Owner');
      const state = await beginGithubConnect(app, owner, owner.workspaceId);

      expect(state.length).toBeGreaterThan(20);
      expect(githubAppMock.buildInstallationUrl).toHaveBeenCalledTimes(1);

      const intent = await prisma.repositoryConnectIntent.findFirst({
        where: {
          workspaceId: owner.workspaceId,
        },
      });

      expect(intent).not.toBeNull();
      expect(JSON.stringify(intent)).not.toContain(state);
    });

    it('allows ADMIN to start a GitHub connection', async () => {
      const owner = await registerIdentity(app, prisma, 'Admin Connect Owner');
      const admin = await registerIdentity(app, prisma, 'Repository Admin');
      await addWorkspaceRole(prisma, owner.workspaceId, admin, WorkspaceRole.ADMIN);

      const response = await request(app.getHttpServer())
        .post(`${routeForWorkspace(owner.workspaceId)}/github/connect`)
        .set(withBearer(admin.token));

      expect(response.status).toBe(201);
    });

    it('prevents DEVELOPER from starting a GitHub connection', async () => {
      const owner = await registerIdentity(app, prisma, 'Developer Connect Owner');
      const developer = await registerIdentity(app, prisma, 'Repository Developer');
      await addWorkspaceRole(prisma, owner.workspaceId, developer, WorkspaceRole.DEVELOPER);

      const response = await request(app.getHttpServer())
        .post(`${routeForWorkspace(owner.workspaceId)}/github/connect`)
        .set(withBearer(developer.token));

      expect(response.status).toBe(403);
    });

    it('prevents VIEWER from starting a GitHub connection', async () => {
      const owner = await registerIdentity(app, prisma, 'Viewer Connect Owner');
      const viewer = await registerIdentity(app, prisma, 'Repository Viewer');
      await addWorkspaceRole(prisma, owner.workspaceId, viewer, WorkspaceRole.VIEWER);

      const response = await request(app.getHttpServer())
        .post(`${routeForWorkspace(owner.workspaceId)}/github/connect`)
        .set(withBearer(viewer.token));

      expect(response.status).toBe(403);
    });
  });

  describe('GitHub setup and OAuth callback', () => {
    it('rejects setup without authentication', async () => {
      const response = await request(app.getHttpServer()).post(`${API_PREFIX}/repositories/github/setup`).send({
        installState: 'missing-authentication-state-value-1234567890',
        installationId: DEFAULT_GITHUB_FIXTURE.installationId,
      });

      expect(response.status).toBe(401);
    });

    it('rejects an unknown installation state', async () => {
      const owner = await registerIdentity(app, prisma, 'Unknown State Owner');

      const response = await request(app.getHttpServer()).post(`${API_PREFIX}/repositories/github/setup`).set(withBearer(owner.token)).send({
        installState: 'unknown-installation-state-value-1234567890',
        installationId: DEFAULT_GITHUB_FIXTURE.installationId,
      });

      expect(response.status).toBe(401);
    });

    it('does not allow another user to consume an installation state', async () => {
      const owner = await registerIdentity(app, prisma, 'State Owner');
      const attacker = await registerIdentity(app, prisma, 'State Attacker');
      const installationState = await beginGithubConnect(app, owner, owner.workspaceId);

      const response = await request(app.getHttpServer()).post(`${API_PREFIX}/repositories/github/setup`).set(withBearer(attacker.token)).send({
        installState: installationState,
        installationId: DEFAULT_GITHUB_FIXTURE.installationId,
      });

      expect(response.status).toBe(401);
    });

    it('creates OAuth authorization state without storing the raw state', async () => {
      const owner = await registerIdentity(app, prisma, 'OAuth State Owner');
      const installationState = await beginGithubConnect(app, owner, owner.workspaceId);
      const oauthState = await completeGithubSetup(app, owner, installationState, DEFAULT_GITHUB_FIXTURE.installationId);

      expect(oauthState.length).toBeGreaterThan(20);
      expect(githubAppMock.buildUserAuthorizationUrl).toHaveBeenCalledTimes(1);

      const intent = await prisma.repositoryConnectIntent.findFirst({
        where: {
          workspaceId: owner.workspaceId,
        },
      });

      expect(intent).not.toBeNull();
      expect(JSON.stringify(intent)).not.toContain(oauthState);
      expect(JSON.stringify(intent)).toContain(DEFAULT_GITHUB_FIXTURE.installationId);
    });

    it('rejects callback when the authenticated GitHub user cannot access the installation', async () => {
      const owner = await registerIdentity(app, prisma, 'Denied Callback Owner');
      const installationState = await beginGithubConnect(app, owner, owner.workspaceId);
      const oauthState = await completeGithubSetup(app, owner, installationState, DEFAULT_GITHUB_FIXTURE.installationId);

      githubAppMock.userCanAccessInstallation.mockResolvedValueOnce(false);

      const response = await finishGithubCallback(app, owner, oauthState);

      expect(response.status).toBe(403);
      expect(
        await prisma.repositoryInstallation.count({
          where: {
            workspaceId: owner.workspaceId,
          },
        }),
      ).toBe(0);
      expect(
        await prisma.repositoryConnection.count({
          where: {
            workspaceId: owner.workspaceId,
          },
        }),
      ).toBe(0);
    });

    it('persists the installation and repositories after a valid callback', async () => {
      const owner = await registerIdentity(app, prisma, 'Successful Callback Owner');
      await connectRepository(app, prisma, owner, owner.workspaceId);

      const installation = await prisma.repositoryInstallation.findFirst({
        where: {
          workspaceId: owner.workspaceId,
        },
      });
      const repository = await prisma.repositoryConnection.findFirst({
        where: {
          workspaceId: owner.workspaceId,
        },
      });

      expect(installation).not.toBeNull();
      expect(repository).not.toBeNull();
      expect(JSON.stringify(repository)).toContain(DEFAULT_GITHUB_FIXTURE.fullName);

      const persistedText = JSON.stringify({ installation, repository });
      expect(persistedText).not.toContain('ghu_phase19_test_user_token');
      expect(persistedText).not.toContain('ghs_phase19_test_installation_token');
      expect(persistedText).not.toContain(WEBHOOK_SECRET);
    });

    it('prevents OAuth callback replay after the intent has been consumed', async () => {
      const owner = await registerIdentity(app, prisma, 'Replay Owner');
      const installationState = await beginGithubConnect(app, owner, owner.workspaceId);
      const oauthState = await completeGithubSetup(app, owner, installationState, DEFAULT_GITHUB_FIXTURE.installationId);

      const first = await finishGithubCallback(app, owner, oauthState);
      const second = await finishGithubCallback(app, owner, oauthState);

      expect(first.status).toBe(201);
      expect(second.status).toBe(401);
    });
  });

  describe('Repository read, tenant isolation, linking, and sync', () => {
    it('lists only repositories in the requested workspace', async () => {
      const owner = await registerIdentity(app, prisma, 'List Owner');
      const connected = await connectRepository(app, prisma, owner, owner.workspaceId);

      const response = await request(app.getHttpServer()).get(routeForWorkspace(owner.workspaceId)).set(withBearer(owner.token));

      expect(response.status).toBe(200);

      const items = responseItems(response);
      expect(items).toHaveLength(1);
      expect(items[0]?.id).toBe(connected.repositoryId);
      expect(JSON.stringify(items[0])).toContain(DEFAULT_GITHUB_FIXTURE.fullName);
    });

    it('allows VIEWER to read repository metadata', async () => {
      const owner = await registerIdentity(app, prisma, 'Viewer Read Owner');
      const viewer = await registerIdentity(app, prisma, 'Viewer Read User');
      await addWorkspaceRole(prisma, owner.workspaceId, viewer, WorkspaceRole.VIEWER);
      await connectRepository(app, prisma, owner, owner.workspaceId);

      const response = await request(app.getHttpServer()).get(routeForWorkspace(owner.workspaceId)).set(withBearer(viewer.token));

      expect(response.status).toBe(200);
      expect(responseItems(response)).toHaveLength(1);
    });

    it('prevents an outsider from reading repository metadata', async () => {
      const owner = await registerIdentity(app, prisma, 'Outsider Read Owner');
      const outsider = await registerIdentity(app, prisma, 'Repository Outsider');
      await connectRepository(app, prisma, owner, owner.workspaceId);

      const response = await request(app.getHttpServer()).get(routeForWorkspace(owner.workspaceId)).set(withBearer(outsider.token));

      expect(response.status).toBe(403);
    });

    it('returns 404 when a repository belongs to a different workspace', async () => {
      const ownerA = await registerIdentity(app, prisma, 'Tenant A Owner');
      const ownerB = await registerIdentity(app, prisma, 'Tenant B Owner');

      const fixtureB: GithubFixture = {
        installationId: '910002',
        repositoryId: '920002',
        owner: 'phase19-org-b',
        name: 'private-b',
        fullName: 'phase19-org-b/private-b',
      };

      const repositoryB = await connectRepository(app, prisma, ownerB, ownerB.workspaceId, fixtureB);

      const response = await request(app.getHttpServer())
        .get(`${routeForWorkspace(ownerA.workspaceId)}/${repositoryB.repositoryId}`)
        .set(withBearer(ownerA.token));

      expect(response.status).toBe(404);
    });

    it('links a repository to an application in the same workspace', async () => {
      const owner = await registerIdentity(app, prisma, 'Application Link Owner');
      const connected = await connectRepository(app, prisma, owner, owner.workspaceId);

      const application = await prisma.saasApplication.create({
        data: {
          workspaceId: owner.workspaceId,
          name: 'Phase 19 Repository App',
          slug: `phase19-repository-app-${Date.now()}`,
          category: ApplicationCategory.SAAS,
          status: ApplicationStatus.LIVE,
          priority: ApplicationPriority.MEDIUM,
        },
      });

      const response = await request(app.getHttpServer())
        .patch(`${routeForWorkspace(owner.workspaceId)}/${connected.repositoryId}/application`)
        .set(withBearer(owner.token))
        .send({
          applicationId: application.id,
        });

      expect(response.status).toBe(200);

      const repository = await prisma.repositoryConnection.findUnique({
        where: {
          id: connected.repositoryId,
        },
        select: {
          applicationId: true,
        },
      });

      expect(repository?.applicationId).toBe(application.id);
    });

    it('rejects linking a repository to an application from another workspace', async () => {
      const ownerA = await registerIdentity(app, prisma, 'Foreign App Owner A');
      const ownerB = await registerIdentity(app, prisma, 'Foreign App Owner B');
      const connected = await connectRepository(app, prisma, ownerA, ownerA.workspaceId);

      const foreignApplication = await prisma.saasApplication.create({
        data: {
          workspaceId: ownerB.workspaceId,
          name: 'Foreign Application',
          slug: `foreign-application-${Date.now()}`,
          category: ApplicationCategory.SAAS,
          status: ApplicationStatus.LIVE,
          priority: ApplicationPriority.MEDIUM,
        },
      });

      const response = await request(app.getHttpServer())
        .patch(`${routeForWorkspace(ownerA.workspaceId)}/${connected.repositoryId}/application`)
        .set(withBearer(ownerA.token))
        .send({
          applicationId: foreignApplication.id,
        });

      expect(response.status).toBe(404);
    });

    it('unlinks an application from a repository', async () => {
      const owner = await registerIdentity(app, prisma, 'Application Unlink Owner');
      const connected = await connectRepository(app, prisma, owner, owner.workspaceId);

      const application = await prisma.saasApplication.create({
        data: {
          workspaceId: owner.workspaceId,
          name: 'Phase 19 Unlink App',
          slug: `phase19-unlink-app-${Date.now()}`,
          category: ApplicationCategory.SAAS,
          status: ApplicationStatus.LIVE,
          priority: ApplicationPriority.MEDIUM,
        },
      });

      await request(app.getHttpServer())
        .patch(`${routeForWorkspace(owner.workspaceId)}/${connected.repositoryId}/application`)
        .set(withBearer(owner.token))
        .send({
          applicationId: application.id,
        })
        .expect(200);

      const response = await request(app.getHttpServer())
        .delete(`${routeForWorkspace(owner.workspaceId)}/${connected.repositoryId}/application`)
        .set(withBearer(owner.token));

      expect(response.status).toBe(200);

      const repository = await prisma.repositoryConnection.findUnique({
        where: {
          id: connected.repositoryId,
        },
        select: {
          applicationId: true,
        },
      });

      expect(repository?.applicationId).toBeNull();
    });

    it('allows DEVELOPER to synchronize an already-connected repository', async () => {
      const owner = await registerIdentity(app, prisma, 'Sync Owner');
      const developer = await registerIdentity(app, prisma, 'Sync Developer');
      await addWorkspaceRole(prisma, owner.workspaceId, developer, WorkspaceRole.DEVELOPER);
      const connected = await connectRepository(app, prisma, owner, owner.workspaceId);

      const response = await request(app.getHttpServer())
        .post(`${routeForWorkspace(owner.workspaceId)}/${connected.repositoryId}/sync`)
        .set(withBearer(developer.token));

      expect(response.status).toBe(201);

      const repository = await prisma.repositoryConnection.findUnique({
        where: {
          id: connected.repositoryId,
        },
        select: {
          lastSyncedAt: true,
        },
      });

      expect(repository?.lastSyncedAt).toBeInstanceOf(Date);
    });
  });

  describe('Disconnect authorization and cascade behavior', () => {
    it('prevents DEVELOPER from disconnecting a GitHub installation', async () => {
      const owner = await registerIdentity(app, prisma, 'Disconnect Role Owner');
      const developer = await registerIdentity(app, prisma, 'Disconnect Developer');
      await addWorkspaceRole(prisma, owner.workspaceId, developer, WorkspaceRole.DEVELOPER);
      const connected = await connectRepository(app, prisma, owner, owner.workspaceId);

      const response = await request(app.getHttpServer())
        .delete(`${routeForWorkspace(owner.workspaceId)}/github/installations/${connected.installationRecordId}`)
        .set(withBearer(developer.token));

      expect(response.status).toBe(403);
    });

    it('allows OWNER to disconnect an installation and removes its repositories', async () => {
      const owner = await registerIdentity(app, prisma, 'Disconnect Owner');
      const connected = await connectRepository(app, prisma, owner, owner.workspaceId);

      const response = await request(app.getHttpServer())
        .delete(`${routeForWorkspace(owner.workspaceId)}/github/installations/${connected.installationRecordId}`)
        .set(withBearer(owner.token));

      expect(response.status).toBe(200);
      expect(
        await prisma.repositoryInstallation.count({
          where: {
            workspaceId: owner.workspaceId,
          },
        }),
      ).toBe(0);
      expect(
        await prisma.repositoryConnection.count({
          where: {
            workspaceId: owner.workspaceId,
          },
        }),
      ).toBe(0);
    });
  });

  describe('GitHub webhook security and idempotency', () => {
    const webhookRoute = `${API_PREFIX}/repositories/github/webhook`;

    function webhookPayload(): Record<string, unknown> {
      return {
        action: 'synchronize',
        installation: {
          id: Number(DEFAULT_GITHUB_FIXTURE.installationId),
          account: {
            login: DEFAULT_GITHUB_FIXTURE.owner,
            type: 'Organization',
          },
        },
        repository: {
          id: Number(DEFAULT_GITHUB_FIXTURE.repositoryId),
          name: DEFAULT_GITHUB_FIXTURE.name,
          full_name: DEFAULT_GITHUB_FIXTURE.fullName,
          private: true,
          default_branch: 'main',
          archived: false,
        },
      };
    }

    function sign(body: string): string {
      return `sha256=${createHmac('sha256', WEBHOOK_SECRET).update(body).digest('hex')}`;
    }

    it('rejects a webhook when GitHub delivery headers are missing', async () => {
      const rawBody = JSON.stringify(webhookPayload());

      const response = await request(app.getHttpServer()).post(webhookRoute).set('content-type', 'application/json').send(rawBody);

      expect(response.status).toBe(401);
    });

    it('rejects a webhook with an invalid signature', async () => {
      const rawBody = JSON.stringify(webhookPayload());

      const response = await request(app.getHttpServer())
        .post(webhookRoute)
        .set('content-type', 'application/json')
        .set('x-github-delivery', 'phase19-invalid-signature')
        .set('x-github-event', 'push')
        .set('x-hub-signature-256', 'sha256=invalid')
        .send(rawBody);

      expect(response.status).toBe(401);
      expect(await prisma.repositoryWebhookDelivery.count()).toBe(0);
    });

    it('accepts a correctly signed webhook and records the delivery', async () => {
      const rawBody = JSON.stringify(webhookPayload());
      const deliveryId = 'phase19-valid-delivery';

      const response = await request(app.getHttpServer())
        .post(webhookRoute)
        .set('content-type', 'application/json')
        .set('x-github-delivery', deliveryId)
        .set('x-github-event', 'pull_request')
        .set('x-hub-signature-256', sign(rawBody))
        .send(rawBody);

      expect(response.status).toBe(201);
      expect(
        await prisma.repositoryWebhookDelivery.count({
          where: {
            deliveryId,
          },
        }),
      ).toBe(1);

      const responseText = JSON.stringify(response.body);
      expect(responseText).not.toContain(WEBHOOK_SECRET);
      expect(responseText).not.toContain('ghu_phase19_test_user_token');
      expect(responseText).not.toContain('ghs_phase19_test_installation_token');
    });

    it('treats duplicate GitHub delivery IDs idempotently', async () => {
      const rawBody = JSON.stringify(webhookPayload());
      const deliveryId = 'phase19-duplicate-delivery';
      const headers = {
        'content-type': 'application/json',
        'x-github-delivery': deliveryId,
        'x-github-event': 'push',
        'x-hub-signature-256': sign(rawBody),
      };

      const first = await request(app.getHttpServer()).post(webhookRoute).set(headers).send(rawBody);
      const second = await request(app.getHttpServer()).post(webhookRoute).set(headers).send(rawBody);

      expect(first.status).toBe(201);
      expect(second.status).toBe(201);
      expect(
        await prisma.repositoryWebhookDelivery.count({
          where: {
            deliveryId,
          },
        }),
      ).toBe(1);
    });
  });
});
