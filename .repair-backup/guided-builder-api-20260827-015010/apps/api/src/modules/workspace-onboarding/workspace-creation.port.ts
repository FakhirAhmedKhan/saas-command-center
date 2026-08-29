import type { WorkspaceBlueprint } from '@command-center/shared-types';
import type { Prisma } from '@prisma/client';

export const WORKSPACE_CREATION_PORT = Symbol('WORKSPACE_CREATION_PORT');

export interface WorkspaceCreationPort {
  createFromBlueprint(input: { transaction: Prisma.TransactionClient; ownerUserId: string; blueprint: WorkspaceBlueprint }): Promise<{ workspaceId: string }>;
}
