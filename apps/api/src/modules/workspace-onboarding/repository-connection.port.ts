import type { Prisma } from '../../generated/prisma/client';
import type { WorkspaceApplicationType, WorkspaceBlueprintRepository } from '@command-center/shared-types';

export const REPOSITORY_CONNECTION_PORT = Symbol('REPOSITORY_CONNECTION_PORT');

export interface VerifiedRepositorySelection {
  repositoryId: string;
  applicationType: WorkspaceApplicationType;
  installationId: string;
  owner: string;
  name: string;
  fullName: string;
  defaultBranch: string;
  isPrivate: boolean;
  htmlUrl: string;
}

export interface RepositoryConnectionPort {
  verifySelection(userId: string, repositories: WorkspaceBlueprintRepository[]): Promise<VerifiedRepositorySelection[]>;

  connectVerified(input: {
    transaction: Prisma.TransactionClient;
    userId: string;
    workspaceId: string;
    applicationIds: Partial<Record<WorkspaceApplicationType, string>>;
    repositories: VerifiedRepositorySelection[];
  }): Promise<void>;
}
