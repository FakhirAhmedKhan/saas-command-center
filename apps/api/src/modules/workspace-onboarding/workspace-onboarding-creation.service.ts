import { REPOSITORY_CONNECTION_PORT, type RepositoryConnectionPort, type VerifiedRepositorySelection } from './repository-connection.port';
import { WorkspaceBlueprintService } from './workspace-blueprint.service';
import { WORKSPACE_CREATION_PORT, type WorkspaceCreationPort } from './workspace-creation.port';
import { WorkspaceOnboardingService } from './workspace-onboarding.service';
import { PrismaService } from '../../database/prisma.service';
import { Prisma } from '../../generated/prisma/client';
import type { ConfirmWorkspaceBlueprintInput, RepositoryStrategy, WorkspaceBlueprint, WorkspaceCreationResult } from '@command-center/shared-types';
import { workspaceBlueprintSchema, workspaceOnboardingAnswersSchema } from '@command-center/validation';
import { ConflictException, Inject, Injectable, UnprocessableEntityException } from '@nestjs/common';

interface LockedOnboardingSession {
  id: string;
  status: string;
  workspaceId: string | null;
  idempotencyKey: string | null;
  blueprintRevision: number;
  blueprintHash: string | null;
  completedAt: Date | null;
}

@Injectable()
export class WorkspaceOnboardingCreationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sessions: WorkspaceOnboardingService,
    private readonly blueprints: WorkspaceBlueprintService,

    @Inject(WORKSPACE_CREATION_PORT)
    private readonly creationPort: WorkspaceCreationPort,

    @Inject(REPOSITORY_CONNECTION_PORT)
    private readonly repositoryConnections: RepositoryConnectionPort,
  ) {}

  async confirm(sessionId: string, userId: string, input: ConfirmWorkspaceBlueprintInput): Promise<WorkspaceCreationResult> {
    const owned = await this.sessions.getOwned(sessionId, userId);

    if (owned.status === 'COMPLETED' && owned.idempotencyKey === input.idempotencyKey && owned.workspaceId) {
      return {
        sessionId,
        workspaceId: owned.workspaceId,
        status: 'COMPLETED',
        createdAt: (owned.completedAt ?? owned.updatedAt).toISOString(),
      };
    }

    if (owned.status !== 'BLUEPRINT_READY') {
      throw new ConflictException('Session is not ready for confirmation');
    }

    if (owned.blueprintRevision !== input.expectedRevision || owned.blueprintHash !== input.blueprintHash) {
      throw new ConflictException('Blueprint changed before confirmation');
    }

    const validation = this.blueprints.validateBlueprint(owned.blueprint, owned.blueprintRevision);

    if (!validation.valid || validation.hash !== input.blueprintHash) {
      throw new UnprocessableEntityException({
        message: 'Blueprint is invalid',
        issues: validation.issues,
      });
    }

    const answers = workspaceOnboardingAnswersSchema.parse(owned.answers);
    const blueprint = workspaceBlueprintSchema.parse(owned.blueprint);
    const verifiedRepositories = await this.verifyRepositorySelections(userId, answers.repositories, blueprint);

    return this.prisma.$transaction(
      async (transaction) => {
        const locked = await transaction.$queryRaw<LockedOnboardingSession[]>(Prisma.sql`
            SELECT
              "id",
              "status",
              "workspaceId",
              "idempotencyKey",
              "blueprintRevision",
              "blueprintHash",
              "completedAt"
            FROM "workspace_onboarding_sessions"
            WHERE
              "id" = ${sessionId}
              AND "userId" = ${userId}
            FOR UPDATE
          `);
        const session = locked[0];

        if (!session) {
          throw new ConflictException('Session is unavailable');
        }

        if (session.status === 'COMPLETED' && session.idempotencyKey === input.idempotencyKey && session.workspaceId) {
          return {
            sessionId,
            workspaceId: session.workspaceId,
            status: 'COMPLETED' as const,
            createdAt: (session.completedAt ?? new Date()).toISOString(),
          };
        }

        if (session.status !== 'BLUEPRINT_READY') {
          throw new ConflictException('Confirmation is already in progress');
        }

        if (session.blueprintRevision !== input.expectedRevision || session.blueprintHash !== input.blueprintHash) {
          throw new ConflictException('Blueprint changed before confirmation');
        }

        await transaction.workspaceOnboardingSession.update({
          where: {
            id: sessionId,
          },
          data: {
            status: 'CREATING',
            idempotencyKey: input.idempotencyKey,
          },
        });

        const created = await this.creationPort.createFromBlueprint({
          transaction,
          ownerUserId: userId,
          blueprint,
        });

        if (verifiedRepositories.length > 0) {
          await this.repositoryConnections.connectVerified({
            transaction,
            userId,
            workspaceId: created.workspaceId,
            applicationIds: created.applicationIds,
            repositories: verifiedRepositories,
          });
        }

        const completedAt = new Date();

        await transaction.workspaceOnboardingSession.update({
          where: {
            id: sessionId,
          },
          data: {
            status: 'COMPLETED',
            workspaceId: created.workspaceId,
            completedAt,
          },
        });

        return {
          sessionId,
          workspaceId: created.workspaceId,
          status: 'COMPLETED' as const,
          createdAt: completedAt.toISOString(),
        };
      },
      {
        isolationLevel: 'Serializable',
        maxWait: 10_000,
        timeout: 30_000,
      },
    );
  }

  private async verifyRepositorySelections(userId: string, strategy: RepositoryStrategy | undefined, blueprint: WorkspaceBlueprint): Promise<VerifiedRepositorySelection[]> {
    const connectNowRepositories = blueprint.repositories.filter(({ strategy: repositoryStrategy }) => repositoryStrategy === 'CONNECT_NOW');

    if (strategy !== 'CONNECT_NOW') {
      if (connectNowRepositories.length > 0) {
        throw new UnprocessableEntityException({
          code: 'REPOSITORY_STRATEGYY_MISMATCH',
          message: 'CONNECT_NOW repositories do not match the onboarding answers',
        });
      }

      return [];
    }

    const applicationTypes = new Set(blueprint.applications.map(({ type }) => type));
    const selectedApplicationTypes = new Set(connectNowRepositories.map(({ applicationType }) => applicationType));

    if (connectNowRepositories.length !== blueprint.applications.length || selectedApplicationTypes.size !== applicationTypes.size || [...applicationTypes].some((type) => !selectedApplicationTypes.has(type))) {
      throw new UnprocessableEntityException({
        code: 'REPOSITORY_SELECTION_REQUIRED',
        message: 'Select one verified repository for every application',
      });
    }

    return this.repositoryConnections.verifySelection(userId, connectNowRepositories);
  }
}
