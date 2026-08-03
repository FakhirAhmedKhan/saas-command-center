import { resolve } from 'node:path';
import { config } from 'dotenv';
import { PrismaPg } from '@prisma/adapter-pg';
import {
  PrismaClient,
  WorkspaceRole,
} from '../src/generated/prisma/client';

config({
  path: resolve(process.cwd(), '../../.env'),
});

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error('DATABASE_URL is required for database seeding');
}

const adapter = new PrismaPg({
  connectionString: databaseUrl,
});

const prisma = new PrismaClient({
  adapter,
});

function createSlug(value: string): string {
  const slug = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  if (!slug) {
    throw new Error('SEED_WORKSPACE_SLUG is invalid');
  }

  return slug;
}

async function main(): Promise<void> {
  const email = process.env.SEED_OWNER_EMAIL?.trim().toLowerCase();
  const passwordHash = process.env.SEED_OWNER_PASSWORD_HASH?.trim();

  if (!email || !passwordHash) {
    console.log(
      'Seed skipped: SEED_OWNER_EMAIL and SEED_OWNER_PASSWORD_HASH are not configured.',
    );
    return;
  }

  const displayName =
    process.env.SEED_OWNER_NAME?.trim() || 'Development Owner';

  const workspaceName =
    process.env.SEED_WORKSPACE_NAME?.trim() || 'Development Workspace';

  const workspaceSlug = createSlug(
    process.env.SEED_WORKSPACE_SLUG || workspaceName,
  );

  const user = await prisma.user.upsert({
    where: {
      email,
    },
    update: {
      displayName,
      passwordHash,
      isActive: true,
      deletedAt: null,
    },
    create: {
      email,
      displayName,
      passwordHash,
    },
  });

  const workspace = await prisma.workspace.upsert({
    where: {
      slug: workspaceSlug,
    },
    update: {
      name: workspaceName,
      deletedAt: null,
    },
    create: {
      name: workspaceName,
      slug: workspaceSlug,
      ownerId: user.id,
    },
  });

  if (workspace.ownerId !== user.id) {
    throw new Error(
      `Workspace "${workspaceSlug}" already belongs to another user`,
    );
  }

  await prisma.workspaceMember.upsert({
    where: {
      workspaceId_userId: {
        workspaceId: workspace.id,
        userId: user.id,
      },
    },
    update: {
      role: WorkspaceRole.OWNER,
    },
    create: {
      workspaceId: workspace.id,
      userId: user.id,
      role: WorkspaceRole.OWNER,
    },
  });

  console.log(`Seeded owner: ${user.email}`);
  console.log(`Seeded workspace: ${workspace.name}`);
}

main()
  .catch((error: unknown) => {
    console.error('Database seed failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });