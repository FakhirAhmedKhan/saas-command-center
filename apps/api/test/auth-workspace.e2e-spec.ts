import {
  INestApplication,
  ValidationPipe,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import request from 'supertest';

import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/database/prisma.service';

interface RegistrationResult {
  accessToken: string;
  refreshToken: string;
  userId: string;
  workspaceId: string;
  email: string;
}

describe('Phase 4 authentication and workspaces', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let ipCounter = 10;

  beforeAll(async () => {
    const moduleFixture =
      await Test.createTestingModule({
        imports: [AppModule],
      }).compile();

    app = moduleFixture.createNestApplication();

    app.setGlobalPrefix('api/v1');

    app.use(cookieParser());

    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    // Allows every test registration to use a different IP
    // and avoid triggering the registration rate limiter.
    app
      .getHttpAdapter()
      .getInstance()
      .set('trust proxy', true);

    await app.init();

    prisma = app.get(PrismaService);
  });

  beforeEach(async () => {
    await prisma.authSession.deleteMany();
    await prisma.workspaceMember.deleteMany();
    await prisma.workspace.deleteMany();
    await prisma.user.deleteMany();
  });

  afterAll(async () => {
    await app.close();
  });

  function nextIp(): string {
    ipCounter += 1;

    return `10.0.0.${ipCounter}`;
  }

  function extractRefreshToken(
    response: request.Response,
  ): string {
    const setCookie = response.headers[
      'set-cookie'
    ] as string[] | undefined;

    const cookieHeader = setCookie?.find((cookie) =>
      cookie.startsWith(
        'command_center_refresh_token=',
      ),
    );

    if (!cookieHeader) {
      throw new Error(
        'Refresh-token cookie was not returned',
      );
    }

    const cookiePair = cookieHeader
      .split(';')
      .at(0);

    if (!cookiePair) {
      throw new Error(
        'Refresh-token cookie is invalid',
      );
    }

    const encodedToken = cookiePair
      .split('=')
      .slice(1)
      .join('=');

    return decodeURIComponent(encodedToken);
  }

  async function registerUser(
    suffix: string,
  ): Promise<RegistrationResult> {
    const email =
      `phase4-${suffix}-${Date.now()}@example.com`;

    const response = await request(
      app.getHttpServer(),
    )
      .post('/api/v1/auth/register')
      .set('X-Forwarded-For', nextIp())
      .send({
        email,
        password: 'StrongPassword123!',
        displayName: `User ${suffix}`,
        workspaceName: `Workspace ${suffix}`,
      })
      .expect(201);

    expect(response.body.accessToken).toEqual(
      expect.any(String),
    );

    expect(response.body.user.email).toBe(
      email,
    );

    expect(response.body.workspaces).toHaveLength(
      1,
    );

    return {
      accessToken: response.body.accessToken,
      refreshToken:
        extractRefreshToken(response),
      userId: response.body.user.id,
      workspaceId:
        response.body.workspaces[0].id,
      email,
    };
  }

  it('registers a user, workspace, owner membership and session', async () => {
    const result = await registerUser('register');

    expect(
      await prisma.user.count({
        where: {
          id: result.userId,
        },
      }),
    ).toBe(1);

    expect(
      await prisma.workspace.count({
        where: {
          id: result.workspaceId,
          ownerId: result.userId,
        },
      }),
    ).toBe(1);

    expect(
      await prisma.workspaceMember.count({
        where: {
          workspaceId: result.workspaceId,
          userId: result.userId,
          role: 'OWNER',
        },
      }),
    ).toBe(1);

    expect(
      await prisma.authSession.count({
        where: {
          userId: result.userId,
          revokedAt: null,
        },
      }),
    ).toBe(1);
  });

  it('rejects duplicate email registration', async () => {
    const first = await registerUser('duplicate');

    await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .set('X-Forwarded-For', nextIp())
      .send({
        email: first.email,
        password: 'AnotherPassword123!',
        displayName: 'Duplicate User',
        workspaceName: 'Duplicate Workspace',
      })
      .expect(409);
  });

  it('logs in with valid credentials and rejects an invalid password', async () => {
    const registered =
      await registerUser('login');

    await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .set('X-Forwarded-For', nextIp())
      .send({
        email: registered.email,
        password: 'WrongPassword123!',
      })
      .expect(401);

    const loginResponse = await request(
      app.getHttpServer(),
    )
      .post('/api/v1/auth/login')
      .set('X-Forwarded-For', nextIp())
      .send({
        email: registered.email,
        password: 'StrongPassword123!',
      })
      .expect(200);

    expect(
      loginResponse.body.accessToken,
    ).toEqual(expect.any(String));
  });

  it('protects private endpoints with access tokens', async () => {
    const registered =
      await registerUser('protected');

    await request(app.getHttpServer())
      .get('/api/v1/auth/me')
      .expect(401);

    const response = await request(
      app.getHttpServer(),
    )
      .get('/api/v1/auth/me')
      .set(
        'Authorization',
        `Bearer ${registered.accessToken}`,
      )
      .expect(200);

    expect(response.body.user.id).toBe(
      registered.userId,
    );
  });

  it('prevents cross-workspace access', async () => {
    const first = await registerUser('first');
    const second = await registerUser('second');

    await request(app.getHttpServer())
      .get(
        `/api/v1/workspaces/${second.workspaceId}`,
      )
      .set(
        'Authorization',
        `Bearer ${first.accessToken}`,
      )
      .expect(403);
  });

  it('allows OWNER to add a VIEWER but blocks VIEWER workspace updates', async () => {
    const owner = await registerUser('owner');
    const viewer = await registerUser('viewer');

    const addResponse = await request(
      app.getHttpServer(),
    )
      .post(
        `/api/v1/workspaces/${owner.workspaceId}/members`,
      )
      .set(
        'Authorization',
        `Bearer ${owner.accessToken}`,
      )
      .send({
        email: viewer.email,
        role: 'VIEWER',
      })
      .expect(201);

    expect(addResponse.body.role).toBe(
      'VIEWER',
    );

    await request(app.getHttpServer())
      .get(
        `/api/v1/workspaces/${owner.workspaceId}/members`,
      )
      .set(
        'Authorization',
        `Bearer ${viewer.accessToken}`,
      )
      .expect(200);

    await request(app.getHttpServer())
      .patch(
        `/api/v1/workspaces/${owner.workspaceId}`,
      )
      .set(
        'Authorization',
        `Bearer ${viewer.accessToken}`,
      )
      .send({
        name: 'Unauthorized Update',
      })
      .expect(403);

    const ownerUpdate = await request(
      app.getHttpServer(),
    )
      .patch(
        `/api/v1/workspaces/${owner.workspaceId}`,
      )
      .set(
        'Authorization',
        `Bearer ${owner.accessToken}`,
      )
      .send({
        name: 'Updated Workspace',
      })
      .expect(200);

    expect(ownerUpdate.body.name).toBe(
      'Updated Workspace',
    );
  });

  it('does not allow an owner to be removed or demoted directly', async () => {
    const owner = await registerUser(
      'owner-protection',
    );

    await request(app.getHttpServer())
      .delete(
        `/api/v1/workspaces/${owner.workspaceId}/members/${owner.userId}`,
      )
      .set(
        'Authorization',
        `Bearer ${owner.accessToken}`,
      )
      .expect(409);

    await request(app.getHttpServer())
      .patch(
        `/api/v1/workspaces/${owner.workspaceId}/members/${owner.userId}`,
      )
      .set(
        'Authorization',
        `Bearer ${owner.accessToken}`,
      )
      .send({
        role: 'ADMIN',
      })
      .expect(409);
  });

  it('rotates refresh tokens and detects old-token reuse', async () => {
    const registered =
      await registerUser('rotation');

    const refreshResponse = await request(
      app.getHttpServer(),
    )
      .post('/api/v1/auth/refresh')
      .set('X-Forwarded-For', nextIp())
      .send({
        refreshToken:
          registered.refreshToken,
      })
      .expect(200);

    const rotatedRefreshToken =
      extractRefreshToken(refreshResponse);

    expect(rotatedRefreshToken).not.toBe(
      registered.refreshToken,
    );

    await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .set('X-Forwarded-For', nextIp())
      .send({
        refreshToken:
          registered.refreshToken,
      })
      .expect(401);

    // Reuse detection revokes the entire family.
    await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .set('X-Forwarded-For', nextIp())
      .send({
        refreshToken:
          rotatedRefreshToken,
      })
      .expect(401);
  });

  it('revokes all refresh sessions with logout-all', async () => {
    const registered =
      await registerUser('logout-all');

    await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .set('X-Forwarded-For', nextIp())
      .send({
        email: registered.email,
        password: 'StrongPassword123!',
      })
      .expect(200);

    const response = await request(
      app.getHttpServer(),
    )
      .post('/api/v1/auth/logout-all')
      .set(
        'Authorization',
        `Bearer ${registered.accessToken}`,
      )
      .expect(200);

    expect(
      response.body.revokedSessions,
    ).toBeGreaterThanOrEqual(2);

    await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .set('X-Forwarded-For', nextIp())
      .send({
        refreshToken:
          registered.refreshToken,
      })
      .expect(401);
  });
});