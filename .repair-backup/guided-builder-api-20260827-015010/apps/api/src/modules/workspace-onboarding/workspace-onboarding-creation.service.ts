import type { ConfirmWorkspaceBlueprintInput, WorkspaceCreationResult } from '@command-center/shared-types';
import { workspaceBlueprintSchema } from '@command-center/validation';
import { Prisma } from '@prisma/client';
import { ConflictException, Inject, Injectable, UnprocessableEntityException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { WORKSPACE_CREATION_PORT, type WorkspaceCreationPort } from './ports/workspace-creation.port';
import { WorkspaceBlueprintService } from './workspace-blueprint.service';
import { WorkspaceOnboardingService } from './workspace-onboarding.service';

@Injectable()
export class WorkspaceOnboardingCreationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sessions: WorkspaceOnboardingService,
    private readonly blueprints: WorkspaceBlueprintService,
    @Inject(WORKSPACE_CREATION_PORT)
    private readonly creationPort: WorkspaceCreationPort,
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

    const blueprint = workspaceBlueprintSchema.parse(owned.blueprint);

    return this.prisma.$transaction(
      async (transaction) => {
        const locked = await transaction.$queryRaw<
          Array<{
            id: string;
            status: string;
            workspace_id: string | null;
            idempotency_key: string | null;
          }>
        >(Prisma.sql`
          SELECT id, status, workspace_id, idempotency_key
          FROM workspace_onboarding_sessions
          WHERE id = ${sessionId} AND user_id = ${userId}
          FOR UPDATE
        `);

        const session = locked[0];

        if (!session) {
          throw new ConflictException('Session is unavailable');
        }

        if (session.status === 'COMPLETED' && session.idempotency_key === input.idempotencyKey && session.workspace_id) {
          return {
            sessionId,
            workspaceId: session.workspace_id,
            status: 'COMPLETED' as const,
            createdAt: new Date().toISOString(),
          };
        }

        if (session.status !== 'BLUEPRINT_READY') {
          throw new ConflictException('Confirmation is already in progress');
        }

        await transaction.workspaceOnboardingSession.update({
          where: { id: sessionId },
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
        const completedAt = new Date();

        await transaction.workspaceOnboardingSession.update({
          where: { id: sessionId },
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
}
