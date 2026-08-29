import type { WorkspaceCreationPort } from './workspace-creation.port';
import type { Prisma } from '../../generated/prisma/client';
import { ApplicationCategory, ApplicationType, DesktopArchitecture, DesktopFramework, DesktopPlatform, MobileFramework, MobilePlatform, TechnologyType, WorkspaceRole } from '../../generated/prisma/enums';
import type { WorkspaceBlueprint, WorkspaceBlueprintApplication, WorkspaceProductType, WorkspaceTechnology } from '@command-center/shared-types';
import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';

const applicationTypes: Record<WorkspaceBlueprintApplication['type'], ApplicationType> = {
  WEB: ApplicationType.WEB,
  MOBILE: ApplicationType.MOBILE,
  DESKTOP: ApplicationType.DESKTOP,
};
const technologyTypes: Record<WorkspaceTechnology, TechnologyType> = {
  NEXT_JS: TechnologyType.FRONTEND,
  TYPESCRIPT: TechnologyType.FRONTEND,
  KOTLIN: TechnologyType.MOBILE,
  JETPACK_COMPOSE: TechnologyType.MOBILE,
  SWIFT: TechnologyType.MOBILE,
  SWIFTUI: TechnologyType.MOBILE,
  REACT_NATIVE: TechnologyType.MOBILE,
  FLUTTER: TechnologyType.MOBILE,
  TAURI: TechnologyType.FRONTEND,
  ELECTRON: TechnologyType.FRONTEND,
  NEST_JS: TechnologyType.BACKEND,
  POSTGRESQL: TechnologyType.DATABASE,
  REDIS: TechnologyType.INFRASTRUCTURE,
};

@Injectable()
export class PrismaWorkspaceCreationAdapter implements WorkspaceCreationPort {
  async createFromBlueprint(input: { transaction: Prisma.TransactionClient; ownerUserId: string; blueprint: WorkspaceBlueprint }): Promise<{ workspaceId: string }> {
    const { transaction, ownerUserId, blueprint } = input;

    if (blueprint.repositories.some(({ strategy }) => strategy === 'CONNECT_NOW')) {
      throw new ConflictException('CONNECT_NOW requires the verified post-creation GitHub linking flow');
    }

    const user = await transaction.user.findFirst({
      where: {
        id: ownerUserId,
        isActive: true,
        deletedAt: null,
      },
      select: {
        id: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('Your account is not available');
    }

    const slug = await this.availableWorkspaceSlug(transaction, blueprint.workspace.slug);
    const workspace = await transaction.workspace.create({
      data: {
        name: blueprint.workspace.name,
        slug,
        ownerId: ownerUserId,
      },
    });

    await transaction.workspaceMember.create({
      data: {
        workspaceId: workspace.id,
        userId: ownerUserId,
        role: WorkspaceRole.OWNER,
      },
    });

    for (const application of blueprint.applications) {
      const createdApplication = await transaction.saasApplication.create({
        data: {
          workspaceId: workspace.id,
          name: application.name,
          slug: await this.availableApplicationSlug(transaction, workspace.id, this.slugify(application.name)),
          type: applicationTypes[application.type],
          category: this.category(blueprint.workspace.productType),
          shortDescription: blueprint.workspace.description.slice(0, 280),
          longDescription: blueprint.workspace.description,
        },
      });

      if (application.stack.length > 0) {
        await transaction.applicationTechnology.createMany({
          data: application.stack.map((technology) => ({
            applicationId: createdApplication.id,
            name: technology.replaceAll('_', ' '),
            type: technologyTypes[technology],
          })),
          skipDuplicates: true,
        });
      }

      if (application.type === 'MOBILE') {
        await transaction.mobileApplication.create({
          data: {
            applicationId: createdApplication.id,
            platform: this.mobilePlatform(application.platforms),
            framework: this.mobileFramework(application.stack, application.platforms),
          },
        });
      }

      if (application.type === 'DESKTOP') {
        await transaction.desktopApplication.create({
          data: {
            applicationId: createdApplication.id,
            platform: this.desktopPlatform(application.platforms),
            framework: this.desktopFramework(application.stack),
            architecture: DesktopArchitecture.X64,
          },
        });
      }

      if (blueprint.environments.length > 0) {
        await transaction.applicationEnvironment.createMany({
          data: blueprint.environments.map((environment) => ({
            workspaceId: workspace.id,
            applicationId: createdApplication.id,
            name: environment.charAt(0) + environment.slice(1).toLowerCase(),
            slug: environment.toLowerCase(),
            isProduction: environment === 'PRODUCTION',
          })),
          skipDuplicates: true,
        });
      }
    }

    return {
      workspaceId: workspace.id,
    };
  }

  private async availableWorkspaceSlug(transaction: Prisma.TransactionClient, requestedSlug: string): Promise<string> {
    const base = this.slugify(requestedSlug).slice(0, 120);

    for (let attempt = 0; attempt < 25; attempt += 1) {
      const suffix = attempt === 0 ? '' : `-${attempt + 1}`;
      const candidate = `${base.slice(0, 120 - suffix.length)}${suffix}`;
      const existing = await transaction.workspace.findUnique({
        where: {
          slug: candidate,
        },
        select: {
          id: true,
        },
      });

      if (!existing) {
        return candidate;
      }
    }

    throw new ConflictException('Unable to generate an available workspace slug');
  }

  private async availableApplicationSlug(transaction: Prisma.TransactionClient, workspaceId: string, requestedSlug: string): Promise<string> {
    const base = requestedSlug.slice(0, 160);

    for (let attempt = 0; attempt < 25; attempt += 1) {
      const suffix = attempt === 0 ? '' : `-${attempt + 1}`;
      const candidate = `${base.slice(0, 160 - suffix.length)}${suffix}`;
      const existing = await transaction.saasApplication.findUnique({
        where: {
          workspaceId_slug: {
            workspaceId,
            slug: candidate,
          },
        },
        select: {
          id: true,
        },
      });

      if (!existing) {
        return candidate;
      }
    }

    throw new ConflictException('Unable to generate an available application slug');
  }

  private slugify(value: string): string {
    const slug = value
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

    return slug.length >= 2 ? slug : 'application';
  }

  private category(productType: WorkspaceProductType): ApplicationCategory {
    if (productType === 'ECOMMERCE') {
      return ApplicationCategory.ECOMMERCE;
    }

    if (productType === 'INTERNAL_TOOL') {
      return ApplicationCategory.INTERNAL_TOOL;
    }

    return ApplicationCategory.SAAS;
  }

  private mobilePlatform(platforms: WorkspaceBlueprintApplication['platforms']): MobilePlatform {
    const android = platforms.includes('ANDROID');
    const ios = platforms.includes('IOS');

    if (android && ios) {
      return MobilePlatform.CROSS_PLATFORM;
    }

    return android ? MobilePlatform.ANDROID : MobilePlatform.IOS;
  }

  private mobileFramework(stack: WorkspaceTechnology[], platforms: WorkspaceBlueprintApplication['platforms']): MobileFramework {
    if (stack.includes('FLUTTER')) {
      return MobileFramework.FLUTTER;
    }

    if (stack.includes('REACT_NATIVE')) {
      return MobileFramework.REACT_NATIVE;
    }

    if (platforms.includes('ANDROID') && !platforms.includes('IOS')) {
      return MobileFramework.ANDROID_NATIVE;
    }

    if (platforms.includes('IOS') && !platforms.includes('ANDROID')) {
      return MobileFramework.IOS_NATIVE;
    }

    return MobileFramework.OTHER;
  }

  private desktopPlatform(platforms: WorkspaceBlueprintApplication['platforms']): DesktopPlatform {
    const desktopPlatforms = platforms.filter((platform) => platform === 'WINDOWS' || platform === 'MACOS' || platform === 'LINUX');

    if (desktopPlatforms.length !== 1) {
      return DesktopPlatform.CROSS_PLATFORM;
    }

    const platform = desktopPlatforms[0];

    if (platform === 'MACOS') {
      return DesktopPlatform.MACOS;
    }

    if (platform === 'LINUX') {
      return DesktopPlatform.LINUX;
    }

    return DesktopPlatform.WINDOWS;
  }

  private desktopFramework(stack: WorkspaceTechnology[]): DesktopFramework {
    if (stack.includes('TAURI')) {
      return DesktopFramework.TAURI;
    }

    if (stack.includes('ELECTRON')) {
      return DesktopFramework.ELECTRON;
    }

    return DesktopFramework.OTHER;
  }
}
