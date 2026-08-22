import type { INestApplication } from '@nestjs/common';
import { PrismaService } from 'src/database/prisma.service';
import { ApplicationType, MobileFramework, MobilePlatform, WorkspaceRole } from 'src/generated/prisma/enums';
import { createTestApp } from '../helpers/create-test-app';
import { resetDatabase } from '../helpers/database';

describe('Mobile Application Foundation E2E', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeEach(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);

    await resetDatabase(prisma);
  });

  afterEach(async () => {
    await app.close();
  });

  async function createFixture() {
    const user = await prisma.user.create({
      data: {
        email: `mobile-foundation-${crypto.randomUUID()}@example.com`,
        passwordHash: 'test-password-hash',
        displayName: 'Mobile Foundation User',
      },
    });

    const workspace = await prisma.workspace.create({
      data: {
        name: 'Mobile Foundation Workspace',
        slug: `mobile-foundation-${crypto.randomUUID()}`,
        ownerId: user.id,

        members: {
          create: {
            userId: user.id,
            role: WorkspaceRole.OWNER,
          },
        },
      },
    });

    return {
      user,
      workspace,
    };
  }

  it('keeps existing applications valid using OTHER as the default type', async () => {
    const { workspace } = await createFixture();

    const application = await prisma.saasApplication.create({
      data: {
        workspaceId: workspace.id,
        name: 'Existing SaaS Application',
        slug: 'existing-saas-application',
      },
    });

    expect(application.type).toBe(ApplicationType.OTHER);
  });

  it('stores a MOBILE application with mobile metadata', async () => {
    const { workspace } = await createFixture();

    const application = await prisma.saasApplication.create({
      data: {
        workspaceId: workspace.id,
        name: 'Karwa Passenger',
        slug: 'karwa-passenger',
        category: 'MOBILE',
        type: ApplicationType.MOBILE,

        mobileApplication: {
          create: {
            platform: MobilePlatform.ANDROID,
            framework: MobileFramework.ANDROID_NATIVE,
            packageId: 'com.karwa.app',
            minOsVersion: '26',
            targetOsVersion: '36',
            currentVersion: '6.14.0',
            currentBuildNumber: '815',
          },
        },
      },

      include: {
        mobileApplication: true,
      },
    });

    expect(application.type).toBe(ApplicationType.MOBILE);

    expect(application.mobileApplication).not.toBeNull();

    expect(application.mobileApplication).toMatchObject({
      platform: MobilePlatform.ANDROID,
      framework: MobileFramework.ANDROID_NATIVE,
      packageId: 'com.karwa.app',
      minOsVersion: '26',
      targetOsVersion: '36',
      currentVersion: '6.14.0',
      currentBuildNumber: '815',
    });
  });

  it('allows only one mobile metadata record per parent application', async () => {
    const { workspace } = await createFixture();

    const application = await prisma.saasApplication.create({
      data: {
        workspaceId: workspace.id,
        name: 'Android Application',
        slug: 'android-application',
        category: 'MOBILE',
        type: ApplicationType.MOBILE,
      },
    });

    await prisma.mobileApplication.create({
      data: {
        applicationId: application.id,
        platform: MobilePlatform.ANDROID,
        framework: MobileFramework.ANDROID_NATIVE,
        packageId: 'com.example.android',
      },
    });

    await expect(
      prisma.mobileApplication.create({
        data: {
          applicationId: application.id,
          platform: MobilePlatform.ANDROID,
          framework: MobileFramework.ANDROID_NATIVE,
          packageId: 'com.example.duplicate',
        },
      }),
    ).rejects.toMatchObject({
      code: 'P2002',
    });
  });

  it('deletes mobile metadata when the parent application is deleted', async () => {
    const { workspace } = await createFixture();

    const application = await prisma.saasApplication.create({
      data: {
        workspaceId: workspace.id,
        name: 'Cascade Application',
        slug: 'cascade-application',
        category: 'MOBILE',
        type: ApplicationType.MOBILE,

        mobileApplication: {
          create: {
            platform: MobilePlatform.IOS,
            framework: MobileFramework.IOS_NATIVE,
            bundleId: 'com.example.ios',
          },
        },
      },
    });

    await prisma.saasApplication.delete({
      where: {
        id: application.id,
      },
    });

    const mobileApplicationCount = await prisma.mobileApplication.count({
      where: {
        applicationId: application.id,
      },
    });

    expect(mobileApplicationCount).toBe(0);
  });

  it('preserves workspace ownership through the parent application', async () => {
    const { workspace } = await createFixture();

    const application = await prisma.saasApplication.create({
      data: {
        workspaceId: workspace.id,
        name: 'Workspace Scoped Mobile App',
        slug: 'workspace-scoped-mobile-app',
        category: 'MOBILE',
        type: ApplicationType.MOBILE,

        mobileApplication: {
          create: {
            platform: MobilePlatform.CROSS_PLATFORM,
            framework: MobileFramework.FLUTTER,
            packageId: 'com.example.flutter',
            bundleId: 'com.example.flutter',
          },
        },
      },
    });

    const mobileApplication = await prisma.mobileApplication.findFirst({
      where: {
        applicationId: application.id,

        application: {
          workspaceId: workspace.id,
        },
      },

      include: {
        application: true,
      },
    });

    expect(mobileApplication).not.toBeNull();
    expect(mobileApplication?.application.workspaceId).toBe(workspace.id);
  });
});
