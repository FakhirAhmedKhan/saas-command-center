import { DeploymentTransitionService } from './deployment-transition.service';
import { ReleaseAccessService } from './release-access.service';
import { PrismaService } from '../../../database/prisma.service';
import { DeploymentActivityAction, DeploymentStatus, HealthIncidentStatus, Prisma, ReleaseStatus } from '../../../generated/prisma/client';
import type {
  CreateDeploymentDto,
  CreateReleaseDto,
  DeploymentListQueryDto,
  ReleaseListQueryDto,
  TransitionDeploymentDto,
  UpdateReleaseDto,
} from '../dto/release-deployment.dto';
import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';

@Injectable()
export class ReleaseDeploymentService {
  constructor(
    private readonly prisma: PrismaService,

    private readonly access: ReleaseAccessService,

    private readonly transitions: DeploymentTransitionService,
  ) {}

  async getOptions(workspaceId: string, applicationId: string, userId: string) {
    await this.requireApplication(workspaceId, applicationId);

    const [canManage, environments, incidents] = await Promise.all([
      this.access.canManage(workspaceId, userId),

      this.prisma.applicationEnvironment.findMany({
        where: {
          workspaceId,

          applicationId,

          archivedAt: null,
        },

        select: {
          id: true,
          name: true,
        },

        orderBy: {
          name: 'asc',
        },
      }),

      this.prisma.healthIncident.findMany({
        where: {
          workspaceId,

          status: HealthIncidentStatus.OPEN,
          healthCheck: {
            applicationId,
          },
        },

        select: {
          id: true,
          summary: true,
          startedAt: true,
          healthCheck: {
            select: {
              name: true,
            },
          },
        },

        orderBy: {
          startedAt: 'desc',
        },

        take: 50,
      }),
    ]);

    return {
      canManage,

      environments,

      openIncidents: incidents.map((incident) => ({
        id: incident.id,
        name: incident.healthCheck.name,
        summary: incident.summary,
        startedAt: incident.startedAt.toISOString(),
      })),
    };
  }

  async createRelease(workspaceId: string, applicationId: string, userId: string, input: CreateReleaseDto) {
    await this.access.assertCanManage(workspaceId, userId);

    await this.requireApplication(workspaceId, applicationId);

    try {
      return await this.prisma.release.create({
        data: {
          workspaceId,

          applicationId,

          version: input.version.trim(),
          name: input.name?.trim() || null,
          notes: input.notes?.trim() || null,
          commitRef: input.commitRef?.trim() || null,
          repositoryUrl: input.repositoryUrl?.trim() || null,
          scheduledAt: input.scheduledAt ? new Date(input.scheduledAt) : null,
          status: input.scheduledAt ? ReleaseStatus.SCHEDULED : ReleaseStatus.DRAFT,
          createdById: userId,
          updatedById: userId,
        },

        include: {
          createdBy: {
            select: {
              id: true,
              displayName: true,
              email: true,
            },
          },

          _count: {
            select: {
              deployments: true,
            },
          },
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException(`Release version ${input.version} already exists for this application.`);
      }

      throw error;
    }
  }

  async updateRelease(workspaceId: string, applicationId: string, releaseId: string, userId: string, input: UpdateReleaseDto) {
    await this.access.assertCanManage(workspaceId, userId);

    const release = await this.requireRelease(workspaceId, applicationId, releaseId);

    if (input.version && input.version !== release.version && release.status !== ReleaseStatus.DRAFT) {
      throw new BadRequestException('Version can only be changed while a release is Draft.');
    }

    try {
      return await this.prisma.release.update({
        where: {
          id: release.id,
        },

        data: {
          version: input.version?.trim(),
          name: input.name === undefined ? undefined : input.name.trim() || null,
          notes: input.notes === undefined ? undefined : input.notes.trim() || null,
          commitRef: input.commitRef === undefined ? undefined : input.commitRef.trim() || null,
          repositoryUrl: input.repositoryUrl === undefined ? undefined : input.repositoryUrl.trim() || null,
          scheduledAt: input.scheduledAt === undefined ? undefined : new Date(input.scheduledAt),
          updatedById: userId,
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException(`Release version ${input.version} already exists for this application.`);
      }

      throw error;
    }
  }

  async listReleases(workspaceId: string, applicationId: string, query: ReleaseListQueryDto) {
    await this.requireApplication(workspaceId, applicationId);

    const where: Prisma.ReleaseWhereInput = {
      workspaceId,

      applicationId,

      OR: query.search
        ? [
            {
              version: {
                contains: query.search,
                mode: 'insensitive',
              },
            },

            {
              name: {
                contains: query.search,
                mode: 'insensitive',
              },
            },

            {
              commitRef: {
                contains: query.search,
                mode: 'insensitive',
              },
            },
          ]
        : undefined,
    };

    const [total, releases] = await Promise.all([
      this.prisma.release.count({
        where,
      }),

      this.prisma.release.findMany({
        where,

        include: {
          createdBy: {
            select: {
              id: true,
              displayName: true,
              email: true,
            },
          },

          _count: {
            select: {
              deployments: true,
            },
          },
        },

        orderBy: {
          createdAt: 'desc',
        },

        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
    ]);

    return {
      items: releases,
      pagination: this.createPagination(query.page, query.limit, total),
    };
  }

  async getRelease(workspaceId: string, applicationId: string, releaseId: string) {
    return this.requireRelease(workspaceId, applicationId, releaseId);
  }

  async createDeployment(workspaceId: string, applicationId: string, userId: string, input: CreateDeploymentDto) {
    await this.access.assertCanManage(workspaceId, userId);

    const [release, environment] = await Promise.all([
      this.requireRelease(workspaceId, applicationId, input.releaseId),

      this.requireEnvironment(workspaceId, applicationId, input.environmentId),
    ]);

    if (input.healthIncidentId) {
      await this.requireHealthIncident(workspaceId, applicationId, input.healthIncidentId);
    }

    return this.prisma.$transaction(
      async (transaction) => {
        const maximumAttempt = await transaction.deployment.aggregate({
          where: {
            releaseId: release.id,
            environmentId: environment.id,
          },

          _max: {
            attempt: true,
          },
        });

        const attempt = (maximumAttempt._max.attempt ?? 0) + 1;

        const deployment = await transaction.deployment.create({
          data: {
            workspaceId,

            applicationId,

            environmentId: environment.id,
            releaseId: release.id,

            attempt,

            status: DeploymentStatus.DRAFT,
            commitRef: input.commitRef?.trim() || release.commitRef,
            repositoryUrl: input.repositoryUrl?.trim() || release.repositoryUrl,
            ciJobUrl: input.ciJobUrl?.trim() || null,
            liveUrl: input.liveUrl?.trim() || null,
            deploymentNotes: input.deploymentNotes?.trim() || null,
            scheduledAt: input.scheduledAt ? new Date(input.scheduledAt) : null,
            healthIncidentId: input.healthIncidentId,
            createdById: userId,
            updatedById: userId,
          },
        });

        await transaction.deploymentActivity.create({
          data: {
            workspaceId,

            deploymentId: deployment.id,
            actorId: userId,
            action: DeploymentActivityAction.CREATED,
            toStatus: DeploymentStatus.DRAFT,
            message: `Deployment attempt ${attempt} created for ${environment.name}.`,
            metadata: {
              releaseId: release.id,
              releaseVersion: release.version,
              environmentId: environment.id,
              environmentName: environment.name,

              attempt,
            },
          },
        });

        return this.getDeploymentById(transaction, deployment.id);
      },
      {
        isolationLevel: 'Serializable',
      },
    );
  }

  async transitionDeployment(workspaceId: string, applicationId: string, deploymentId: string, userId: string, input: TransitionDeploymentDto) {
    await this.access.assertCanManage(workspaceId, userId);

    const deployment = await this.requireDeployment(workspaceId, applicationId, deploymentId);

    this.transitions.assertTransition(deployment.status, input.status);

    if (input.status === DeploymentStatus.SCHEDULED && !input.scheduledAt && !deployment.scheduledAt) {
      throw new BadRequestException('scheduledAt is required when scheduling a deployment.');
    }

    if (input.status === DeploymentStatus.FAILED && !input.failureReason?.trim()) {
      throw new BadRequestException('failureReason is required when a deployment fails.');
    }

    let rollbackTarget: Awaited<ReturnType<ReleaseDeploymentService['requireDeployment']>> | null = null;

    if (input.status === DeploymentStatus.ROLLED_BACK) {
      if (!input.rollbackToDeploymentId) {
        throw new BadRequestException('rollbackToDeploymentId is required.');
      }

      if (input.rollbackToDeploymentId === deployment.id) {
        throw new BadRequestException('A deployment cannot roll back to itself.');
      }

      rollbackTarget = await this.requireDeployment(workspaceId, applicationId, input.rollbackToDeploymentId);

      if (rollbackTarget.environmentId !== deployment.environmentId) {
        throw new BadRequestException('Rollback target must belong to the same environment.');
      }

      if (rollbackTarget.status !== DeploymentStatus.SUCCESSFUL) {
        throw new BadRequestException('Rollback target must be a successful deployment.');
      }
    }

    if (input.healthIncidentId) {
      await this.requireHealthIncident(workspaceId, applicationId, input.healthIncidentId);
    }

    const now = new Date();

    const terminal = input.status === DeploymentStatus.SUCCESSFUL || input.status === DeploymentStatus.FAILED || input.status === DeploymentStatus.ROLLED_BACK;

    const startedAt = input.status === DeploymentStatus.IN_PROGRESS ? (deployment.startedAt ?? now) : deployment.startedAt;

    const finishedAt = terminal ? now : input.status === DeploymentStatus.DRAFT || input.status === DeploymentStatus.SCHEDULED ? null : deployment.finishedAt;

    const durationMs = terminal && startedAt ? Math.max(0, now.getTime() - startedAt.getTime()) : null;

    return this.prisma.$transaction(async (transaction) => {
      const changed = await transaction.deployment.updateMany({
        where: {
          id: deployment.id,
          status: deployment.status,
        },

        data: {
          status: input.status,
          statusChangedAt: now,
          scheduledAt: input.status === DeploymentStatus.DRAFT ? null : input.scheduledAt ? new Date(input.scheduledAt) : undefined,

          startedAt,

          finishedAt,

          durationMs,

          failureReason: input.status === DeploymentStatus.FAILED ? input.failureReason?.trim() : null,
          rollbackToDeploymentId: rollbackTarget?.id,
          healthIncidentId: input.healthIncidentId ?? deployment.healthIncidentId,
          deployedById: terminal ? userId : deployment.deployedById,
          updatedById: userId,
        },
      });

      if (changed.count === 0) {
        throw new ConflictException('Deployment status changed before this request completed. Refresh and retry.');
      }

      await transaction.release.update({
        where: {
          id: deployment.releaseId,
        },

        data: {
          status: this.mapReleaseStatus(input.status),
          releasedAt: input.status === DeploymentStatus.SUCCESSFUL ? now : undefined,
          updatedById: userId,
        },
      });

      await transaction.deploymentActivity.create({
        data: {
          workspaceId,

          deploymentId: deployment.id,
          actorId: userId,
          action: input.status === DeploymentStatus.ROLLED_BACK ? DeploymentActivityAction.ROLLBACK_RECORDED : DeploymentActivityAction.STATUS_CHANGED,
          fromStatus: deployment.status,
          toStatus: input.status,
          message:
            input.message?.trim() ||
            this.getTransitionMessage(
              deployment.status,

              input.status,

              rollbackTarget?.release.version,
            ),

          metadata: {
            failureReason: input.failureReason,
            rollbackToDeploymentId: rollbackTarget?.id,
            rollbackToVersion: rollbackTarget?.release.version,
            healthIncidentId: input.healthIncidentId,
          },
        },
      });

      return this.getDeploymentById(transaction, deployment.id);
    });
  }

  async listDeployments(workspaceId: string, applicationId: string, query: DeploymentListQueryDto) {
    await this.requireApplication(workspaceId, applicationId);

    const where: Prisma.DeploymentWhereInput = {
      workspaceId,

      applicationId,

      environmentId: query.environmentId,
      releaseId: query.releaseId,
      status: query.status,
    };

    const [total, deployments] = await Promise.all([
      this.prisma.deployment.count({
        where,
      }),

      this.prisma.deployment.findMany({
        where,

        include: this.deploymentInclude(),
        orderBy: [
          {
            statusChangedAt: 'desc',
          },

          {
            createdAt: 'desc',
          },
        ],

        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
    ]);

    return {
      items: deployments.map((deployment) => this.mapDeployment(deployment)),
      pagination: this.createPagination(query.page, query.limit, total),
    };
  }

  async getDeployment(workspaceId: string, applicationId: string, deploymentId: string) {
    return this.mapDeployment(await this.requireDeployment(workspaceId, applicationId, deploymentId));
  }

  async getCurrentVersions(workspaceId: string, applicationId: string) {
    await this.requireApplication(workspaceId, applicationId);

    const environments = await this.prisma.applicationEnvironment.findMany({
      where: {
        workspaceId,

        applicationId,

        archivedAt: null,
      },

      select: {
        id: true,
        name: true,
      },

      orderBy: {
        name: 'asc',
      },
    });

    return Promise.all(
      environments.map(async (environment) => {
        const latestTerminal = await this.prisma.deployment.findFirst({
          where: {
            workspaceId,

            applicationId,

            environmentId: environment.id,
            status: {
              in: [DeploymentStatus.SUCCESSFUL, DeploymentStatus.ROLLED_BACK],
            },
          },

          include: {
            release: true,
            rollbackTo: {
              include: {
                release: true,
              },
            },
          },

          orderBy: {
            statusChangedAt: 'desc',
          },
        });

        if (!latestTerminal) {
          return {
            environmentId: environment.id,
            environmentName: environment.name,
            deploymentId: null,
            releaseId: null,
            version: null,
            status: null,
            deployedAt: null,
            liveUrl: null,
          };
        }

        const effective = latestTerminal.status === DeploymentStatus.ROLLED_BACK && latestTerminal.rollbackTo ? latestTerminal.rollbackTo : latestTerminal;

        return {
          environmentId: environment.id,
          environmentName: environment.name,
          deploymentId: effective.id,
          releaseId: effective.releaseId,
          version: effective.release.version,
          status: latestTerminal.status,
          deployedAt: latestTerminal.statusChangedAt.toISOString(),
          liveUrl: effective.liveUrl,
        };
      }),
    );
  }

  private async requireApplication(workspaceId: string, applicationId: string) {
    const application = await this.prisma.saasApplication.findFirst({
      where: {
        id: applicationId,

        workspaceId,

        archivedAt: null,
      },

      select: {
        id: true,
        name: true,
      },
    });

    if (!application) {
      throw new NotFoundException('Application not found.');
    }

    return application;
  }

  private async requireEnvironment(workspaceId: string, applicationId: string, environmentId: string) {
    const environment = await this.prisma.applicationEnvironment.findFirst({
      where: {
        id: environmentId,

        workspaceId,

        applicationId,

        archivedAt: null,
      },

      select: {
        id: true,
        name: true,
      },
    });

    if (!environment) {
      throw new NotFoundException('Application environment not found.');
    }

    return environment;
  }

  private async requireRelease(workspaceId: string, applicationId: string, releaseId: string) {
    const release = await this.prisma.release.findFirst({
      where: {
        id: releaseId,

        workspaceId,

        applicationId,
      },

      include: {
        createdBy: {
          select: {
            id: true,
            displayName: true,
            email: true,
          },
        },

        deployments: {
          include: {
            environment: true,
          },

          orderBy: {
            createdAt: 'desc',
          },
        },
      },
    });

    if (!release) {
      throw new NotFoundException('Release not found.');
    }

    return release;
  }

  private async requireDeployment(workspaceId: string, applicationId: string, deploymentId: string) {
    const deployment = await this.prisma.deployment.findFirst({
      where: {
        id: deploymentId,

        workspaceId,

        applicationId,
      },

      include: this.deploymentInclude(),
    });

    if (!deployment) {
      throw new NotFoundException('Deployment not found.');
    }

    return deployment;
  }

  private async requireHealthIncident(workspaceId: string, applicationId: string, incidentId: string) {
    const incident = await this.prisma.healthIncident.findFirst({
      where: {
        id: incidentId,

        workspaceId,

        healthCheck: {
          applicationId,
        },
      },

      select: {
        id: true,
      },
    });

    if (!incident) {
      throw new NotFoundException('Health incident not found for this application.');
    }

    return incident;
  }

  private deploymentInclude() {
    return {
      release: true,
      environment: {
        select: {
          id: true,
          name: true,
        },
      },

      deployedBy: {
        select: {
          id: true,
          displayName: true,
          email: true,
        },
      },

      healthIncident: {
        select: {
          id: true,
          status: true,
          summary: true,
          startedAt: true,
          resolvedAt: true,
        },
      },

      rollbackTo: {
        include: {
          release: true,
          environment: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },

      activities: {
        include: {
          actor: {
            select: {
              id: true,
              displayName: true,
              email: true,
            },
          },
        },

        orderBy: {
          createdAt: 'desc',
        },
      },
    } as const;
  }

  private async getDeploymentById(transaction: Prisma.TransactionClient, deploymentId: string) {
    const deployment = await transaction.deployment.findUniqueOrThrow({
      where: {
        id: deploymentId,
      },

      include: this.deploymentInclude(),
    });

    return this.mapDeployment(deployment);
  }

  private mapDeployment(deployment: Awaited<ReturnType<ReleaseDeploymentService['requireDeployment']>>) {
    return {
      ...deployment,

      scheduledAt: deployment.scheduledAt?.toISOString() ?? null,
      startedAt: deployment.startedAt?.toISOString() ?? null,
      finishedAt: deployment.finishedAt?.toISOString() ?? null,
      statusChangedAt: deployment.statusChangedAt.toISOString(),
      createdAt: deployment.createdAt.toISOString(),
      updatedAt: deployment.updatedAt.toISOString(),
      healthIncident: deployment.healthIncident
        ? {
            ...deployment.healthIncident,

            startedAt: deployment.healthIncident.startedAt.toISOString(),
            resolvedAt: deployment.healthIncident.resolvedAt?.toISOString() ?? null,
          }
        : null,

      activities: deployment.activities.map((activity) => ({
        ...activity,

        createdAt: activity.createdAt.toISOString(),
      })),

      allowedTransitions: this.transitions.getAllowedTransitions(deployment.status),
    };
  }

  private mapReleaseStatus(deploymentStatus: DeploymentStatus): ReleaseStatus {
    return ReleaseStatus[deploymentStatus];
  }

  private getTransitionMessage(
    from: DeploymentStatus,
    to: DeploymentStatus,

    rollbackVersion?: string,
  ): string {
    if (to === DeploymentStatus.ROLLED_BACK) {
      return rollbackVersion ? `Deployment rolled back to version ${rollbackVersion}.` : 'Deployment rollback recorded.';
    }

    return `Deployment changed from ${from} to ${to}.`;
  }

  private createPagination(page: number, limit: number, total: number) {
    const totalPages = Math.max(1, Math.ceil(total / limit));

    return {
      page,

      limit,

      total,

      totalPages,

      hasPreviousPage: page > 1,
      hasNextPage: page < totalPages,
    };
  }
}
