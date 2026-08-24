import { createTestApp } from '../helpers/create-test-app';
import { resetDatabase } from '../helpers/database';
import { registerWorkspaceTestUser } from '../helpers/workspace';
import type { INestApplication } from '@nestjs/common';
import { createHash, randomBytes } from 'node:crypto';
import { PrismaService } from 'src/database/prisma.service';
import { GithubConnectIntentCleanupService } from 'src/modules/repositories/services/github-connect-intent-cleanup.service';

function hash(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

function secret(): string {
  return randomBytes(16).toString('hex');
}

describe('GitHub Connect Intent Cleanup (BE-06)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let cleanupService: GithubConnectIntentCleanupService;

  beforeAll(async () => {
    app = await createTestApp();

    prisma = app.get(PrismaService);

    cleanupService = app.get(GithubConnectIntentCleanupService);
  });

  beforeEach(async () => {
    await resetDatabase(prisma);
  });

  afterAll(async () => {
    await app.close();
  });

  it('removes an expired, never-consumed personal intent', async () => {
    const owner = await registerWorkspaceTestUser(app, prisma);
    const intent = await prisma.personalGithubConnectIntent.create({
      data: {
        userId: owner.userId,
        installStateHash: hash(secret()),
        expiresAt: new Date(Date.now() - 60_000),
      },
    });

    await cleanupService.cleanup();

    const found = await prisma.personalGithubConnectIntent.findUnique({ where: { id: intent.id } });

    expect(found).toBeNull();
  });

  it('retains a personal intent that has not expired yet', async () => {
    const owner = await registerWorkspaceTestUser(app, prisma);
    const intent = await prisma.personalGithubConnectIntent.create({
      data: {
        userId: owner.userId,
        installStateHash: hash(secret()),
        expiresAt: new Date(Date.now() + 10 * 60_000),
      },
    });

    await cleanupService.cleanup();

    const found = await prisma.personalGithubConnectIntent.findUnique({ where: { id: intent.id } });

    expect(found).not.toBeNull();
  });

  it('retains a consumed personal intent even after its expiry, since it is the durable installation-access record', async () => {
    const owner = await registerWorkspaceTestUser(app, prisma);
    const intent = await prisma.personalGithubConnectIntent.create({
      data: {
        userId: owner.userId,
        installStateHash: hash(secret()),
        oauthStateHash: hash(secret()),
        installationId: '123456',
        expiresAt: new Date(Date.now() - 60_000),
        consumedAt: new Date(Date.now() - 30_000),
        pkceVerifier: null,
      },
    });

    await cleanupService.cleanup();

    const found = await prisma.personalGithubConnectIntent.findUnique({ where: { id: intent.id } });

    expect(found).not.toBeNull();
    expect(found?.consumedAt).not.toBeNull();
  });

  it('removes an expired repository (workspace-scoped) connect intent regardless of consumption state', async () => {
    const owner = await registerWorkspaceTestUser(app, prisma);
    const expiredUnconsumed = await prisma.repositoryConnectIntent.create({
      data: {
        workspaceId: owner.workspaceId,
        userId: owner.userId,
        installStateHash: hash(secret()),
        expiresAt: new Date(Date.now() - 60_000),
      },
    });
    const expiredConsumed = await prisma.repositoryConnectIntent.create({
      data: {
        workspaceId: owner.workspaceId,
        userId: owner.userId,
        installStateHash: hash(secret()),
        expiresAt: new Date(Date.now() - 60_000),
        consumedAt: new Date(Date.now() - 30_000),
      },
    });
    const stillValid = await prisma.repositoryConnectIntent.create({
      data: {
        workspaceId: owner.workspaceId,
        userId: owner.userId,
        installStateHash: hash(secret()),
        expiresAt: new Date(Date.now() + 10 * 60_000),
      },
    });

    await cleanupService.cleanup();

    const [foundUnconsumed, foundConsumed, foundValid] = await Promise.all([
      prisma.repositoryConnectIntent.findUnique({ where: { id: expiredUnconsumed.id } }),
      prisma.repositoryConnectIntent.findUnique({ where: { id: expiredConsumed.id } }),
      prisma.repositoryConnectIntent.findUnique({ where: { id: stillValid.id } }),
    ]);

    expect(foundUnconsumed).toBeNull();
    expect(foundConsumed).toBeNull();
    expect(foundValid).not.toBeNull();
  });

  it('is idempotent across repeated runs and safe to call concurrently', async () => {
    const owner = await registerWorkspaceTestUser(app, prisma);

    await prisma.personalGithubConnectIntent.create({
      data: {
        userId: owner.userId,
        installStateHash: hash(secret()),
        expiresAt: new Date(Date.now() - 60_000),
      },
    });

    await Promise.all([cleanupService.cleanup(), cleanupService.cleanup()]);

    const remaining = await prisma.personalGithubConnectIntent.count({
      where: {
        userId: owner.userId,
      },
    });

    expect(remaining).toBe(0);
  });
});
