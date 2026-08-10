import 'dotenv/config';

import { PrismaClient } from '../src/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { argon2id, hash } from 'argon2';
import { createHash } from 'node:crypto';

const DEMO_EMAIL = 'demo@saas-command-center.local';

const DEMO_PASSWORD = 'DemoPassword123!';

const DEMO_DISPLAY_NAME = 'Demo Owner';

const DEMO_WORKSPACE_SLUG = 'demo-command-center';

function createPrismaClient(): PrismaClient {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error('DATABASE_URL is not configured.');
  }

  if (process.env.NODE_ENV === 'production' && process.env.ALLOW_DEMO_DATA !== 'true') {
    throw new Error('Demo data is blocked in production. Set ALLOW_DEMO_DATA=true only if you intentionally want it.');
  }

  const adapter = new PrismaPg({
    connectionString: databaseUrl,
  });

  return new PrismaClient({
    adapter,
  });
}

const prisma = createPrismaClient();

function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

function daysAgo(days: number): Date {
  const date = new Date();

  date.setUTCDate(date.getUTCDate() - days);

  return date;
}

async function resetDemoData(): Promise<void> {
  console.log('Removing existing demo data...');

  const workspace = await prisma.workspace.findUnique({
    where: {
      slug: DEMO_WORKSPACE_SLUG,
    },

    select: {
      id: true,

      owner: {
        select: {
          email: true,
        },
      },
    },
  });

  if (workspace) {
    if (workspace.owner.email !== DEMO_EMAIL) {
      throw new Error(`Workspace slug "${DEMO_WORKSPACE_SLUG}" exists but does not belong to the demo account.`);
    }

    await prisma.workspace.delete({
      where: {
        id: workspace.id,
      },
    });

    console.log('Demo workspace removed.');
  }

  const demoUser = await prisma.user.findUnique({
    where: {
      email: DEMO_EMAIL,
    },

    include: {
      ownedWorkspaces: {
        select: {
          id: true,
        },
      },
    },
  });

  if (demoUser && demoUser.ownedWorkspaces.length === 0) {
    await prisma.user.delete({
      where: {
        id: demoUser.id,
      },
    });

    console.log('Demo user removed.');
  }

  console.log('Demo reset complete.');
}

async function seedDemoData(): Promise<void> {
  await resetDemoData();

  console.log('Creating demo data...');

  const passwordHash = await hash(DEMO_PASSWORD, {
    type: argon2id,
  });

  const now = new Date();

  // =========================================================
  // USER
  // =========================================================

  const owner = await prisma.user.create({
    data: {
      email: DEMO_EMAIL,

      passwordHash,

      displayName: DEMO_DISPLAY_NAME,

      isActive: true,

      emailVerifiedAt: now,
    },
  });

  // =========================================================
  // WORKSPACE
  // =========================================================

  const workspace = await prisma.workspace.create({
    data: {
      name: 'Demo Command Center',

      slug: DEMO_WORKSPACE_SLUG,

      ownerId: owner.id,
    },
  });

  await prisma.workspaceMember.create({
    data: {
      workspaceId: workspace.id,

      userId: owner.id,

      role: 'OWNER',
    },
  });

  // =========================================================
  // APPLICATION 1
  // =========================================================

  const commandCenter = await prisma.saasApplication.create({
    data: {
      workspaceId: workspace.id,

      name: 'SaaS Command Center',

      slug: 'saas-command-center',

      shortDescription: 'Central control panel for managing SaaS products, analytics, development and integrations.',

      longDescription:
        'A unified SaaS management platform containing application management, analytics, releases, monitoring, GitHub repositories and development workflows.',

      category: 'SAAS',

      status: 'IN_DEVELOPMENT',

      priority: 'HIGH',

      progressPercent: 72,

      startedAt: daysAgo(60),

      targetLaunchAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),

      lastActivityAt: now,
    },
  });

  // =========================================================
  // APPLICATION 2
  // =========================================================

  const aiSupport = await prisma.saasApplication.create({
    data: {
      workspaceId: workspace.id,

      name: 'AI Support Agent',

      slug: 'ai-support-agent',

      shortDescription: 'AI customer-support automation platform.',

      category: 'AI',

      status: 'TESTING',

      priority: 'CRITICAL',

      progressPercent: 88,

      startedAt: daysAgo(45),

      lastActivityAt: daysAgo(1),
    },
  });

  // =========================================================
  // APPLICATION 3
  // =========================================================

  const storefront = await prisma.saasApplication.create({
    data: {
      workspaceId: workspace.id,

      name: 'Commerce Storefront',

      slug: 'commerce-storefront',

      shortDescription: 'Production e-commerce storefront and administration platform.',

      category: 'ECOMMERCE',

      status: 'LIVE',

      priority: 'MEDIUM',

      progressPercent: 100,

      startedAt: daysAgo(120),

      launchedAt: daysAgo(15),

      lastActivityAt: daysAgo(2),
    },
  });

  // =========================================================
  // TECHNOLOGIES
  // =========================================================

  await prisma.applicationTechnology.createMany({
    data: [
      {
        applicationId: commandCenter.id,

        name: 'Next.js',

        type: 'FRONTEND',

        version: '16',
      },
      {
        applicationId: commandCenter.id,

        name: 'NestJS',

        type: 'BACKEND',

        version: '11',
      },
      {
        applicationId: commandCenter.id,

        name: 'PostgreSQL',

        type: 'DATABASE',

        version: '17',
      },
      {
        applicationId: commandCenter.id,

        name: 'Prisma',

        type: 'DATABASE',

        version: '7',
      },
      {
        applicationId: aiSupport.id,

        name: 'Python',

        type: 'AI',
      },
      {
        applicationId: storefront.id,

        name: 'Next.js',

        type: 'FRONTEND',

        version: '16',
      },
    ],
  });

  // =========================================================
  // LINKS
  // =========================================================

  await prisma.applicationLink.createMany({
    data: [
      {
        applicationId: commandCenter.id,

        label: 'Production',

        type: 'PRODUCTION',

        url: 'https://demo.command-center.test',
      },
      {
        applicationId: commandCenter.id,

        label: 'Documentation',

        type: 'DOCUMENTATION',

        url: 'https://docs.command-center.test',
      },
      {
        applicationId: aiSupport.id,

        label: 'Staging',

        type: 'STAGING',

        url: 'https://ai-staging.command-center.test',
      },
    ],
  });

  // =========================================================
  // MILESTONES + TASKS
  // =========================================================

  const foundation = await prisma.applicationMilestone.create({
    data: {
      applicationId: commandCenter.id,

      title: 'Platform Foundation',

      description: 'Core workspace, authentication and application management.',

      status: 'COMPLETED',

      progressPercent: 100,

      position: 1,

      startsAt: daysAgo(60),

      dueAt: daysAgo(30),

      completedAt: daysAgo(32),
    },
  });

  const githubMilestone = await prisma.applicationMilestone.create({
    data: {
      applicationId: commandCenter.id,

      title: 'GitHub Integration',

      description: 'Repository connection and browser-based Code Explorer.',

      status: 'IN_PROGRESS',

      progressPercent: 65,

      position: 2,

      startsAt: daysAgo(10),

      dueAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
    },
  });

  await prisma.applicationTask.createMany({
    data: [
      {
        milestoneId: foundation.id,

        assigneeUserId: owner.id,

        title: 'Authentication foundation',

        status: 'COMPLETED',

        priority: 'HIGH',

        position: 1,

        completedAt: daysAgo(35),
      },
      {
        milestoneId: foundation.id,

        assigneeUserId: owner.id,

        title: 'Workspace management',

        status: 'COMPLETED',

        priority: 'HIGH',

        position: 2,

        completedAt: daysAgo(33),
      },
      {
        milestoneId: githubMilestone.id,

        assigneeUserId: owner.id,

        title: 'GitHub App connection',

        status: 'COMPLETED',

        priority: 'CRITICAL',

        position: 1,

        completedAt: daysAgo(2),
      },
      {
        milestoneId: githubMilestone.id,

        assigneeUserId: owner.id,

        title: 'Code Explorer',

        status: 'IN_PROGRESS',

        priority: 'HIGH',

        position: 2,
      },
      {
        milestoneId: githubMilestone.id,

        assigneeUserId: owner.id,

        title: 'Repository intelligence dashboard',

        status: 'TODO',

        priority: 'MEDIUM',

        position: 3,
      },
    ],
  });

  // =========================================================
  // BLOCKER
  // =========================================================

  await prisma.applicationBlocker.create({
    data: {
      applicationId: commandCenter.id,

      milestoneId: githubMilestone.id,

      createdByUserId: owner.id,

      title: 'Complete GitHub webhook configuration',

      description: 'Webhook is disabled during localhost development and will be enabled after a public development URL is available.',

      severity: 'MEDIUM',

      status: 'OPEN',
    },
  });

  // =========================================================
  // WEBSITES
  // =========================================================

  const mainWebsite = await prisma.website.create({
    data: {
      workspaceId: workspace.id,

      applicationId: commandCenter.id,

      name: 'Command Center Dashboard',

      domain: 'demo.command-center.test',

      timeZone: 'Asia/Dubai',

      enabled: true,

      allowedOrigins: ['https://demo.command-center.test'],

      trackingKeyPrefix: 'demo_cc_main',

      trackingKeyHash: sha256('demo-command-center-main-key'),

      lastEventAt: now,
    },
  });

  await prisma.website.create({
    data: {
      workspaceId: workspace.id,

      applicationId: storefront.id,

      name: 'Commerce Store',

      domain: 'store.command-center.test',

      timeZone: 'Asia/Dubai',

      enabled: true,

      allowedOrigins: ['https://store.command-center.test'],

      trackingKeyPrefix: 'demo_store_main',

      trackingKeyHash: sha256('demo-store-main-key'),

      lastEventAt: daysAgo(1),
    },
  });

  // =========================================================
  // ACTIVITY FEED
  // =========================================================

  await prisma.applicationActivity.createMany({
    data: [
      {
        workspaceId: workspace.id,

        applicationId: commandCenter.id,

        applicationName: commandCenter.name,

        actorUserId: owner.id,

        actorType: 'USER',

        activityType: 'APPLICATION_CREATED',

        entityType: 'APPLICATION',

        entityId: commandCenter.id,

        title: 'SaaS Command Center created',

        description: 'Initial application record was created.',

        createdAt: daysAgo(60),
      },
      {
        workspaceId: workspace.id,

        applicationId: aiSupport.id,

        applicationName: aiSupport.name,

        actorUserId: owner.id,

        actorType: 'USER',

        activityType: 'APPLICATION_CREATED',

        entityType: 'APPLICATION',

        entityId: aiSupport.id,

        title: 'AI Support Agent created',

        description: 'New AI product added to the workspace.',

        createdAt: daysAgo(45),
      },
      {
        workspaceId: workspace.id,

        applicationId: storefront.id,

        applicationName: storefront.name,

        actorUserId: owner.id,

        actorType: 'USER',

        activityType: 'APPLICATION_STATUS_CHANGED',

        entityType: 'APPLICATION',

        entityId: storefront.id,

        title: 'Commerce Storefront launched',

        description: 'Application status changed to LIVE.',

        createdAt: daysAgo(15),
      },
      {
        workspaceId: workspace.id,

        applicationId: commandCenter.id,

        applicationName: commandCenter.name,

        actorUserId: owner.id,

        actorType: 'USER',

        activityType: 'MILESTONE_COMPLETED',

        entityType: 'MILESTONE',

        entityId: foundation.id,

        title: 'Platform Foundation completed',

        description: 'Core platform foundation reached 100%.',

        createdAt: daysAgo(32),
      },
      {
        workspaceId: workspace.id,

        applicationId: commandCenter.id,

        applicationName: commandCenter.name,

        actorUserId: owner.id,

        actorType: 'USER',

        activityType: 'WEBSITE_CONNECTED',

        entityType: 'WEBSITE',

        entityId: mainWebsite.id,

        title: 'Dashboard website connected',

        description: 'Analytics tracking website was connected.',

        createdAt: daysAgo(7),
      },
      {
        workspaceId: workspace.id,

        applicationId: commandCenter.id,

        applicationName: commandCenter.name,

        actorUserId: owner.id,

        actorType: 'USER',

        activityType: 'APPLICATION_UPDATED',

        entityType: 'APPLICATION',

        entityId: commandCenter.id,

        title: 'GitHub integration updated',

        description: 'Repository integration foundation and Code Explorer were added.',

        createdAt: now,
      },
    ],
  });

  // =========================================================
  // NOTIFICATIONS
  // =========================================================

  await prisma.notification.createMany({
    data: [
      {
        workspaceId: workspace.id,

        userId: owner.id,

        applicationId: commandCenter.id,

        type: 'SYSTEM',

        priority: 'INFO',

        title: 'Demo workspace ready',

        message: 'Your SaaS Command Center demo workspace has been populated with sample data.',

        actionUrl: `/workspaces/${workspace.id}`,
      },
      {
        workspaceId: workspace.id,

        userId: owner.id,

        applicationId: commandCenter.id,

        type: 'ASSIGNMENT',

        priority: 'WARNING',

        title: 'Code Explorer task in progress',

        message: 'Continue implementation and verification of the repository Code Explorer.',

        actionUrl: `/workspaces/${workspace.id}/applications/${commandCenter.id}`,
      },
    ],
  });

  // =========================================================
  // SIMPLE ANALYTICS DATA
  // =========================================================

  for (let daysBack = 6; daysBack >= 0; daysBack -= 1) {
    const bucketStart = daysAgo(daysBack);

    bucketStart.setUTCHours(0, 0, 0, 0);

    const bucketEnd = new Date(bucketStart.getTime() + 24 * 60 * 60 * 1000);

    const multiplier = 7 - daysBack;

    await prisma.analyticsDailyAggregate.create({
      data: {
        websiteId: mainWebsite.id,

        bucketStart,

        bucketEnd,

        timeZone: 'Asia/Dubai',

        dimension: 'OVERVIEW',

        dimensionKey: 'overview',

        dimensionValue: 'all',

        dimensionLabel: 'All Traffic',

        visitors: 35 * multiplier,

        sessions: 48 * multiplier,

        pageViews: 120 * multiplier,

        events: 160 * multiplier,

        customEvents: 20 * multiplier,

        bounces: 8 * multiplier,

        totalDurationMs: BigInt(240000 * multiplier),
      },
    });
  }

  await prisma.analyticsProcessingState.create({
    data: {
      websiteId: mainWebsite.id,

      status: 'COMPLETED',

      lastCompletedAt: now,

      totalRawEventsProcessed: BigInt(1120),
    },
  });

  console.log('');
  console.log('============================================');
  console.log('DEMO DATA CREATED');
  console.log('============================================');
  console.log('');
  console.log(`Email:    ${DEMO_EMAIL}`);
  console.log(`Password: ${DEMO_PASSWORD}`);
  console.log('');
  console.log(`Workspace: ${workspace.name}`);
  console.log(`Workspace ID: ${workspace.id}`);
  console.log('');
  console.log('Applications:');
  console.log(`- ${commandCenter.name}`);
  console.log(`- ${aiSupport.name}`);
  console.log(`- ${storefront.name}`);
  console.log('');
}

async function main(): Promise<void> {
  const command = process.argv[2];

  if (command === 'seed') {
    await seedDemoData();

    return;
  }

  if (command === 'reset') {
    await resetDemoData();

    return;
  }

  throw new Error('Usage: tsx scripts/demo-data.ts <seed|reset>');
}

void main()
  .catch((error: unknown) => {
    console.error('Demo data command failed:', error);

    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
