import { GithubAppService } from './github-app.service';
import { PersonalGithubConnectService } from './personal-github-connect.service';
import type { ActivityWriteInput } from '../../activity/interfaces/activity-writer.interface';
import { ActivityWriterService } from '../../activity/services/activity-writer.service';
import { ImportWorkspaceFromGithubDto } from '../dto/repository-import.dto';
import type { ImportWorkspaceFromGithubResult } from '@command-center/shared-types';
import { BadRequestException, ConflictException, ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from 'src/database/prisma.service';
import { Prisma } from 'src/generated/prisma/client';
import {
  ActivityActorType,
  ActivityEntityType,
  ApplicationActivityType,
  ApplicationCategory,
  ApplicationLinkType,
  ApplicationStatus,
  RepositoryProvider,
  TechnologyType,
  WorkspaceRole,
} from 'src/generated/prisma/enums';

const TECHNOLOGY_TYPE_BY_LABEL: Record<string, TechnologyType> = {
  'Next.js': TechnologyType.FRONTEND,
  React: TechnologyType.FRONTEND,
  Vite: TechnologyType.FRONTEND,
  'Tailwind CSS': TechnologyType.FRONTEND,
  Redux: TechnologyType.FRONTEND,
  Zustand: TechnologyType.FRONTEND,
  'React Query': TechnologyType.FRONTEND,

  NestJS: TechnologyType.BACKEND,
  Express: TechnologyType.BACKEND,
  Fastify: TechnologyType.BACKEND,
  'Node.js': TechnologyType.BACKEND,
  GraphQL: TechnologyType.BACKEND,
  tRPC: TechnologyType.BACKEND,
  Prisma: TechnologyType.DATABASE,
  PostgreSQL: TechnologyType.DATABASE,
  MongoDB: TechnologyType.DATABASE,
  Redis: TechnologyType.DATABASE,
  Docker: TechnologyType.INFRASTRUCTURE,

  'JWT Auth': TechnologyType.OTHER,
  Passport: TechnologyType.OTHER,
  Stripe: TechnologyType.OTHER,
  Jest: TechnologyType.OTHER,
  Vitest: TechnologyType.OTHER,
  Playwright: TechnologyType.OTHER,
  Cypress: TechnologyType.OTHER,
  TypeScript: TechnologyType.OTHER,
};

@Injectable()
export class RepositoryImportService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly personalGithubConnect: PersonalGithubConnectService,
    private readonly githubApp: GithubAppService,
    private readonly activityWriter: ActivityWriterService,
  ) {}

  async importFromGithub(userId: string, dto: ImportWorkspaceFromGithubDto): Promise<ImportWorkspaceFromGithubResult> {
    await this.personalGithubConnect.assertUserCanAccessInstallation(userId, dto.installationId);

    const repository = await this.resolveRepository(dto.installationId, dto.repositoryId);

    const workspaceName = this.normalizeRequiredText(dto.workspace.name, 'Workspace name', 2, 120);

    const workspaceBaseSlug = this.normalizeSlug(dto.workspace.slug ?? workspaceName, 120);

    const applications = this.normalizeApplicationSelections(dto.applications);

    const branch = dto.defaultBranch?.trim() || repository.defaultBranch;

    for (let attempt = 0; attempt < 25; attempt += 1) {
      const workspaceSlug = this.buildSlugCandidate(workspaceBaseSlug, attempt, 120);

      try {
        return await this.prisma.$transaction(async (transaction) => {
          const workspace = await transaction.workspace.create({
            data: {
              name: workspaceName,
              slug: workspaceSlug,
              ownerId: userId,
            },
          });

          await transaction.workspaceMember.create({
            data: {
              workspaceId: workspace.id,
              userId,
              role: WorkspaceRole.OWNER,
            },
          });

          const installation = await transaction.repositoryInstallation.create({
            data: {
              workspaceId: workspace.id,
              provider: RepositoryProvider.GITHUB,
              externalInstallationId: dto.installationId,
              accountLogin: repository.owner,
              accountType: 'Unknown',
              connectedById: userId,
              connectedAt: new Date(),
              lastSyncedAt: new Date(),
            },
          });

          const connection = await transaction.repositoryConnection.create({
            data: {
              workspaceId: workspace.id,
              installationId: installation.id,
              provider: RepositoryProvider.GITHUB,
              externalRepoId: String(repository.id),
              owner: repository.owner,
              name: repository.name,
              fullName: repository.fullName,
              defaultBranch: branch,
              isPrivate: repository.isPrivate,
              htmlUrl: repository.htmlUrl,
              lastSyncedAt: new Date(),
            },
          });

          const activityEvents: ActivityWriteInput[] = [];

          const createdApplications: ImportWorkspaceFromGithubResult['applications'] = [];

          let primaryApplicationId: string | null = null;

          for (const application of applications) {
            const applicationSlug = await this.generateUniqueApplicationSlug(transaction, workspace.id, application.slug ?? application.name);

            const created = await transaction.saasApplication.create({
              data: {
                workspaceId: workspace.id,
                name: application.name,
                slug: applicationSlug,
                shortDescription: dto.workspace.description?.trim().slice(0, 280) || null,
                category: ApplicationCategory.SAAS,
                status: ApplicationStatus.IN_DEVELOPMENT,
              },
            });

            primaryApplicationId ??= created.id;

            if (application.technologies.length > 0) {
              await transaction.applicationTechnology.createMany({
                data: application.technologies.map((technology) => ({
                  applicationId: created.id,
                  name: technology,
                  type: TECHNOLOGY_TYPE_BY_LABEL[technology] ?? TechnologyType.OTHER,
                })),

                skipDuplicates: true,
              });
            }

            await transaction.applicationLink.create({
              data: {
                applicationId: created.id,
                label: 'Repository',
                type: ApplicationLinkType.REPOSITORY,
                url: repository.htmlUrl,
              },
            });

            createdApplications.push({
              id: created.id,
              name: created.name,
              slug: created.slug,
              rootDirectory: application.rootDirectory,
            });

            activityEvents.push({
              workspaceId: workspace.id,
              applicationId: created.id,
              applicationName: created.name,
              actorType: ActivityActorType.USER,
              actorUserId: userId,
              activityType: ApplicationActivityType.APPLICATION_CREATED,
              entityType: ActivityEntityType.APPLICATION,
              entityId: created.id,
              title: 'Application imported from GitHub',
              description: `${created.name} was imported from ${repository.fullName}.`,
              metadata: {
                source: 'github-import',
                repositoryFullName: repository.fullName,
                rootDirectory: application.rootDirectory,
                framework: application.framework,
              },
            });
          }

          if (primaryApplicationId) {
            await transaction.repositoryConnection.update({
              where: {
                id: connection.id,
              },

              data: {
                applicationId: primaryApplicationId,
              },
            });
          }

          await this.activityWriter.writeManyWithTransaction(transaction, activityEvents);

          return {
            workspaceId: workspace.id,
            workspaceSlug: workspace.slug,
            repositoryConnectionId: connection.id,
            applications: createdApplications,
          };
        });
      } catch (error: unknown) {
        if (this.isUniqueConstraintError(error)) {
          continue;
        }

        throw error;
      }
    }

    throw new ConflictException('Unable to generate an available workspace slug');
  }

  private async resolveRepository(
    installationId: string,
    repositoryId: number,
  ): Promise<{
    id: number;
    owner: string;
    name: string;
    fullName: string;
    defaultBranch: string;
    isPrivate: boolean;
    htmlUrl: string;
  }> {
    const repositories = await this.githubApp.listImportableInstallationRepositories(installationId);

    const match = repositories.find((repository) => repository.id === repositoryId);

    if (!match) {
      throw new ForbiddenException('Repository is not accessible through this GitHub installation.');
    }

    return {
      id: match.id,
      owner: match.owner.login,
      name: match.name,
      fullName: match.fullName,
      defaultBranch: match.defaultBranch,
      isPrivate: match.isPrivate,
      htmlUrl: match.htmlUrl,
    };
  }

  private normalizeApplicationSelections(applications: ImportWorkspaceFromGithubDto['applications']) {
    if (applications.length === 0) {
      throw new BadRequestException('Select at least one application to import.');
    }

    const seenDirectories = new Set<string>();

    return applications.map((application) => {
      const rootDirectory = application.rootDirectory.trim().replace(/^\/+|\/+$/g, '') || '.';

      if (seenDirectories.has(rootDirectory)) {
        throw new BadRequestException(`Duplicate application root directory: ${rootDirectory}`);
      }

      seenDirectories.add(rootDirectory);

      return {
        name: this.normalizeRequiredText(application.name, 'Application name', 2, 160),
        slug: application.slug ? this.normalizeSlug(application.slug, 160) : null,
        rootDirectory,
        framework: application.framework?.trim() || null,
        technologies: (application.technologies ?? []).map((technology) => technology.trim()).filter(Boolean),
      };
    });
  }

  private async generateUniqueApplicationSlug(transaction: Prisma.TransactionClient, workspaceId: string, requestedName: string): Promise<string> {
    const baseSlug = this.normalizeSlug(requestedName, 160);

    let slug = baseSlug;

    let suffix = 1;

    while (
      await transaction.saasApplication.findUnique({
        where: {
          workspaceId_slug: {
            workspaceId,
            slug,
          },
        },

        select: {
          id: true,
        },
      })
    ) {
      suffix += 1;

      const suffixText = `-${suffix}`;

      slug = `${baseSlug.slice(0, 160 - suffixText.length)}${suffixText}`;
    }

    return slug;
  }

  private normalizeRequiredText(value: string, fieldName: string, minLength: number, maxLength: number): string {
    const normalized = value.trim().replace(/\s+/g, ' ');

    if (normalized.length < minLength) {
      throw new BadRequestException(`${fieldName} must contain at least ${minLength} characters`);
    }

    if (normalized.length > maxLength) {
      throw new BadRequestException(`${fieldName} cannot exceed ${maxLength} characters`);
    }

    return normalized;
  }

  private normalizeSlug(value: string, maxLength: number): string {
    const slug = value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

    if (slug.length < 2) {
      throw new BadRequestException('Slug must contain at least two valid characters');
    }

    return slug.slice(0, maxLength);
  }

  private buildSlugCandidate(baseSlug: string, attempt: number, maxLength: number): string {
    if (attempt === 0) {
      return baseSlug.slice(0, maxLength);
    }

    const suffix = `-${attempt + 1}`;

    return `${baseSlug.slice(0, maxLength - suffix.length)}${suffix}`;
  }

  private isUniqueConstraintError(error: unknown): boolean {
    return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
  }
}
