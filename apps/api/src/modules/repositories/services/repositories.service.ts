import { Injectable, NotFoundException } from '@nestjs/common';

import { PrismaService } from 'src/database/prisma.service';
import { RepositoryProvider } from 'src/generated/prisma/enums';

import { GithubAppService } from './github-app.service';

const repositoryInclude = {
  application: {
    select: {
      id: true,
      name: true,
      slug: true,
      archivedAt: true,
    },
  },

  installation: {
    select: {
      id: true,
      externalInstallationId: true,
      accountLogin: true,
      accountType: true,
      connectedAt: true,
      lastSyncedAt: true,
    },
  },
} as const;

@Injectable()
export class RepositoriesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly githubApp: GithubAppService,
  ) {}

  async list(workspaceId: string) {
    const [installations, repositories] = await Promise.all([
      this.prisma.repositoryInstallation.findMany({
        where: {
          workspaceId,
          provider: RepositoryProvider.GITHUB,
        },

        select: {
          id: true,
          externalInstallationId: true,
          accountLogin: true,
          accountType: true,
          connectedAt: true,
          lastSyncedAt: true,
        },

        orderBy: {
          connectedAt: 'asc',
        },
      }),

      this.prisma.repositoryConnection.findMany({
        where: {
          workspaceId,
          isAvailable: true,
        },

        include: repositoryInclude,

        orderBy: {
          fullName: 'asc',
        },
      }),
    ]);

    return {
      installations,
      repositories,
    };
  }

  async findOne(workspaceId: string, repositoryId: string) {
    const repository = await this.prisma.repositoryConnection.findFirst({
      where: {
        id: repositoryId,
        workspaceId,
        isAvailable: true,
      },

      include: repositoryInclude,
    });

    if (!repository) {
      throw new NotFoundException('Repository connection was not found.');
    }

    return repository;
  }

  async syncInstallation(
    workspaceId: string,
    externalInstallationId: string,
    connectedById?: string,
  ): Promise<{
    repositoryCount: number;
  }> {
    const installation = await this.githubApp.getInstallation(externalInstallationId);

    const repositories =
      await this.githubApp.listInstallationRepositories(externalInstallationId);

    const now = new Date();

    await this.prisma.$transaction(async (transaction) => {
      const localInstallation = await transaction.repositoryInstallation.upsert({
        where: {
          workspaceId_provider_externalInstallationId: {
            workspaceId,
            provider: RepositoryProvider.GITHUB,
            externalInstallationId,
          },
        },

        create: {
          workspaceId,
          provider: RepositoryProvider.GITHUB,
          externalInstallationId,
          accountLogin: installation.accountLogin,
          accountType: installation.accountType,
          connectedById: connectedById ?? null,
          connectedAt: now,
          lastSyncedAt: now,
        },

        update: {
          accountLogin: installation.accountLogin,
          accountType: installation.accountType,
          lastSyncedAt: now,
        },
      });

      await transaction.repositoryConnection.updateMany({
        where: {
          workspaceId,
          installationId: localInstallation.id,
        },

        data: {
          isAvailable: false,
        },
      });

      for (const repository of repositories) {
        await transaction.repositoryConnection.upsert({
          where: {
            workspaceId_provider_externalRepoId: {
              workspaceId,
              provider: RepositoryProvider.GITHUB,
              externalRepoId: repository.id,
            },
          },

          create: {
            workspaceId,
            installationId: localInstallation.id,
            provider: RepositoryProvider.GITHUB,
            externalRepoId: repository.id,
            owner: repository.owner,
            name: repository.name,
            fullName: repository.fullName,
            defaultBranch: repository.defaultBranch,
            isPrivate: repository.isPrivate,
            htmlUrl: repository.htmlUrl,
            archived: repository.archived,
            isAvailable: true,
            lastSyncedAt: now,
          },

          update: {
            installationId: localInstallation.id,
            owner: repository.owner,
            name: repository.name,
            fullName: repository.fullName,
            defaultBranch: repository.defaultBranch,
            isPrivate: repository.isPrivate,
            htmlUrl: repository.htmlUrl,
            archived: repository.archived,
            isAvailable: true,
            lastSyncedAt: now,
          },
        });
      }
    });

    return {
      repositoryCount: repositories.length,
    };
  }

  async syncWorkspace(workspaceId: string) {
    const installations = await this.prisma.repositoryInstallation.findMany({
      where: {
        workspaceId,
        provider: RepositoryProvider.GITHUB,
      },

      select: {
        externalInstallationId: true,
      },

      orderBy: {
        connectedAt: 'asc',
      },
    });

    let repositoryCount = 0;

    for (const installation of installations) {
      const result = await this.syncInstallation(
        workspaceId,
        installation.externalInstallationId,
      );

      repositoryCount += result.repositoryCount;
    }

    return {
      installationCount: installations.length,
      repositoryCount,
    };
  }

  async syncOne(workspaceId: string, repositoryId: string) {
    const repository = await this.findOne(workspaceId, repositoryId);

    await this.syncInstallation(
      workspaceId,
      repository.installation.externalInstallationId,
    );

    return this.findOne(workspaceId, repositoryId);
  }

  async linkApplication(
    workspaceId: string,
    repositoryId: string,
    applicationId: string,
  ) {
    await this.findOne(workspaceId, repositoryId);

    const application = await this.prisma.saasApplication.findFirst({
      where: {
        id: applicationId,
        workspaceId,
        archivedAt: null,
      },

      select: {
        id: true,
      },
    });

    if (!application) {
      throw new NotFoundException('Application was not found in this workspace.');
    }

    await this.prisma.repositoryConnection.update({
      where: {
        id: repositoryId,
      },

      data: {
        applicationId,
      },
    });

    return this.findOne(workspaceId, repositoryId);
  }

  async unlinkApplication(workspaceId: string, repositoryId: string) {
    await this.findOne(workspaceId, repositoryId);

    await this.prisma.repositoryConnection.update({
      where: {
        id: repositoryId,
      },

      data: {
        applicationId: null,
      },
    });

    return this.findOne(workspaceId, repositoryId);
  }

  async disconnectInstallation(
    workspaceId: string,
    installationRecordId: string,
  ): Promise<{
    success: true;
  }> {
    const installation = await this.prisma.repositoryInstallation.findFirst({
      where: {
        id: installationRecordId,
        workspaceId,
        provider: RepositoryProvider.GITHUB,
      },

      select: {
        id: true,
      },
    });

    if (!installation) {
      throw new NotFoundException('Repository installation was not found.');
    }

    await this.prisma.repositoryInstallation.delete({
      where: {
        id: installation.id,
      },
    });

    return {
      success: true,
    };
  }

  async deleteInstallationEverywhere(externalInstallationId: string): Promise<void> {
    await this.prisma.repositoryInstallation.deleteMany({
      where: {
        provider: RepositoryProvider.GITHUB,
        externalInstallationId,
      },
    });
  }

  async syncInstallationEverywhere(externalInstallationId: string): Promise<void> {
    const installations = await this.prisma.repositoryInstallation.findMany({
      where: {
        provider: RepositoryProvider.GITHUB,
        externalInstallationId,
      },

      select: {
        workspaceId: true,
      },
    });

    for (const installation of installations) {
      await this.syncInstallation(installation.workspaceId, externalInstallationId);
    }
  }

  async touchRepositoryEverywhere(
    externalInstallationId: string,
    externalRepoId: string,
  ): Promise<void> {
    const installations = await this.prisma.repositoryInstallation.findMany({
      where: {
        provider: RepositoryProvider.GITHUB,
        externalInstallationId,
      },

      select: {
        id: true,
      },
    });

    if (installations.length === 0) {
      return;
    }

    await this.prisma.repositoryConnection.updateMany({
      where: {
        provider: RepositoryProvider.GITHUB,
        externalRepoId,

        installationId: {
          in: installations.map((installation) => installation.id),
        },
      },

      data: {
        lastSyncedAt: new Date(),
      },
    });
  }
}