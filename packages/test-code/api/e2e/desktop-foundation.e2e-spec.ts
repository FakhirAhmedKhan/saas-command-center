import { createTestApp } from '../helpers/create-test-app';
import { resetDatabase } from '../helpers/database';
import { registerWorkspaceTestUser } from '../helpers/workspace';
import type { INestApplication } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { PrismaService } from 'src/database/prisma.service';
import { ApplicationType, DesktopArchitecture, DesktopFramework, DesktopPlatform, MobileFramework, MobilePlatform } from 'src/generated/prisma/enums';

describe('Desktop Application Foundation E2E', () => {
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

  it('exposes DESKTOP as an application type', () => {
    expect(ApplicationType.DESKTOP).toBe('DESKTOP');
  });

  it('keeps existing application types available', () => {
    expect(ApplicationType.WEB).toBe('WEB');

    expect(ApplicationType.API).toBe('API');

    expect(ApplicationType.MOBILE).toBe('MOBILE');

    expect(ApplicationType.WORKER).toBe('WORKER');

    expect(ApplicationType.OTHER).toBe('OTHER');
  });

  it('creates a DESKTOP application with desktop metadata', async () => {
    const owner = await registerWorkspaceTestUser(app, prisma);
    const application = await prisma.saasApplication.create({
      data: {
        workspaceId: owner.workspaceId,

        name: 'Command Center Desktop',

        slug: `desktop-${randomUUID()}`,

        type: ApplicationType.DESKTOP,

        desktopApplication: {
          create: {
            platform: DesktopPlatform.CROSS_PLATFORM,

            framework: DesktopFramework.ELECTRON,

            architecture: DesktopArchitecture.X64,

            packageName: 'com.commandcenter.desktop',

            currentVersion: '1.0.0',

            currentBuildNumber: '1',

            minimumOsVersion: 'Windows 10',

            updateChannel: 'stable',
          },
        },
      },

      include: {
        desktopApplication: true,
      },
    });

    expect(application.type).toBe(ApplicationType.DESKTOP);

    expect(application.desktopApplication).not.toBeNull();

    expect(application.desktopApplication?.platform).toBe(DesktopPlatform.CROSS_PLATFORM);

    expect(application.desktopApplication?.framework).toBe(DesktopFramework.ELECTRON);

    expect(application.desktopApplication?.architecture).toBe(DesktopArchitecture.X64);

    expect(application.desktopApplication?.packageName).toBe('com.commandcenter.desktop');
  });

  it('persists the one-to-one application relationship', async () => {
    const owner = await registerWorkspaceTestUser(app, prisma);
    const application = await prisma.saasApplication.create({
      data: {
        workspaceId: owner.workspaceId,

        name: 'Windows Desktop App',

        slug: `windows-${randomUUID()}`,

        type: ApplicationType.DESKTOP,
      },
    });
    const desktop = await prisma.desktopApplication.create({
      data: {
        applicationId: application.id,

        platform: DesktopPlatform.WINDOWS,

        framework: DesktopFramework.DOTNET,

        architecture: DesktopArchitecture.X64,

        packageName: 'com.example.windows',
      },
    });
    const stored = await prisma.desktopApplication.findUnique({
      where: {
        applicationId: application.id,
      },

      include: {
        application: true,
      },
    });

    expect(stored?.id).toBe(desktop.id);

    expect(stored?.application.id).toBe(application.id);

    expect(stored?.application.workspaceId).toBe(owner.workspaceId);

    expect(stored?.application.type).toBe(ApplicationType.DESKTOP);
  });

  it('rejects duplicate desktop metadata for one application', async () => {
    const owner = await registerWorkspaceTestUser(app, prisma);
    const application = await prisma.saasApplication.create({
      data: {
        workspaceId: owner.workspaceId,

        name: 'Unique Desktop App',

        slug: `unique-${randomUUID()}`,

        type: ApplicationType.DESKTOP,
      },
    });

    await prisma.desktopApplication.create({
      data: {
        applicationId: application.id,

        platform: DesktopPlatform.WINDOWS,

        framework: DesktopFramework.DOTNET,

        architecture: DesktopArchitecture.X64,
      },
    });

    await expect(
      prisma.desktopApplication.create({
        data: {
          applicationId: application.id,

          platform: DesktopPlatform.WINDOWS,

          framework: DesktopFramework.DOTNET,

          architecture: DesktopArchitecture.ARM64,
        },
      }),
    ).rejects.toMatchObject({
      code: 'P2002',
    });
  });

  it('rejects invalid desktop enum values', async () => {
    const owner = await registerWorkspaceTestUser(app, prisma);
    const application = await prisma.saasApplication.create({
      data: {
        workspaceId: owner.workspaceId,

        name: 'Invalid Desktop App',

        slug: `invalid-${randomUUID()}`,

        type: ApplicationType.DESKTOP,
      },
    });

    await expect(
      prisma.desktopApplication.create({
        data: {
          applicationId: application.id,

          platform: 'ANDROID' as DesktopPlatform,

          framework: DesktopFramework.ELECTRON,

          architecture: DesktopArchitecture.X64,
        },
      }),
    ).rejects.toBeDefined();
  });

  it('deletes desktop metadata when the parent application is deleted', async () => {
    const owner = await registerWorkspaceTestUser(app, prisma);
    const application = await prisma.saasApplication.create({
      data: {
        workspaceId: owner.workspaceId,

        name: 'Cascade Desktop App',

        slug: `cascade-${randomUUID()}`,

        type: ApplicationType.DESKTOP,

        desktopApplication: {
          create: {
            platform: DesktopPlatform.MACOS,

            framework: DesktopFramework.NATIVE_MACOS,

            architecture: DesktopArchitecture.UNIVERSAL,
          },
        },
      },
    });

    expect(
      await prisma.desktopApplication.count({
        where: {
          applicationId: application.id,
        },
      }),
    ).toBe(1);

    await prisma.saasApplication.delete({
      where: {
        id: application.id,
      },
    });

    expect(
      await prisma.desktopApplication.count({
        where: {
          applicationId: application.id,
        },
      }),
    ).toBe(0);
  });

  it('does not break existing WEB applications', async () => {
    const owner = await registerWorkspaceTestUser(app, prisma);
    const web = await prisma.saasApplication.create({
      data: {
        workspaceId: owner.workspaceId,

        name: 'Existing Web App',

        slug: `web-${randomUUID()}`,

        type: ApplicationType.WEB,
      },
    });
    const stored = await prisma.saasApplication.findUniqueOrThrow({
      where: {
        id: web.id,
      },
    });

    expect(stored.type).toBe(ApplicationType.WEB);
  });

  it('does not break existing MOBILE applications', async () => {
    const owner = await registerWorkspaceTestUser(app, prisma);
    const mobile = await prisma.saasApplication.create({
      data: {
        workspaceId: owner.workspaceId,

        name: 'Existing Mobile App',

        slug: `mobile-${randomUUID()}`,

        type: ApplicationType.MOBILE,

        mobileApplication: {
          create: {
            platform: MobilePlatform.ANDROID,

            framework: MobileFramework.ANDROID_NATIVE,

            packageId: 'com.example.mobile',
          },
        },
      },

      include: {
        mobileApplication: true,
      },
    });

    expect(mobile.type).toBe(ApplicationType.MOBILE);

    expect(mobile.mobileApplication?.platform).toBe(MobilePlatform.ANDROID);
  });

  it('keeps desktop applications isolated by workspace relationship', async () => {
    const workspaceA = await registerWorkspaceTestUser(app, prisma);
    const workspaceB = await registerWorkspaceTestUser(app, prisma);
    const desktop = await prisma.saasApplication.create({
      data: {
        workspaceId: workspaceA.workspaceId,

        name: 'Workspace A Desktop',

        slug: `workspace-a-${randomUUID()}`,

        type: ApplicationType.DESKTOP,

        desktopApplication: {
          create: {
            platform: DesktopPlatform.LINUX,

            framework: DesktopFramework.QT,

            architecture: DesktopArchitecture.X64,
          },
        },
      },

      include: {
        desktopApplication: true,
      },
    });
    const workspaceBDesktop = await prisma.desktopApplication.findMany({
      where: {
        application: {
          workspaceId: workspaceB.workspaceId,
        },
      },
    });

    expect(desktop.desktopApplication).not.toBeNull();

    expect(workspaceBDesktop).toHaveLength(0);
  });
});
