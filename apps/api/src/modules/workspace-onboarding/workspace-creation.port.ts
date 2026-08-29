import type { Prisma } from '../../generated/prisma/client';
import type { WorkspaceApplicationType, WorkspaceBlueprint } from '@command-center/shared-types';

export const WORKSPACE_CREATION_PORT = Symbol('WORKSPACE_CREATION_PORT');

export interface CreatedWorkspaceFromBlueprint {
  workspaceId: string;
  applicationIds: Partial<Record<WorkspaceApplicationType, string>>;
}

export interface WorkspaceCreationPort {
  createFromBlueprint(input: { transaction: Prisma.TransactionClient; ownerUserId: string; blueprint: WorkspaceBlueprint }): Promise<CreatedWorkspaceFromBlueprint>;
}
