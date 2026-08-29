import type { WorkspaceApplicationType, WorkspaceBlueprintRepository } from '@command-center/shared-types';

export const REPOSITORY_CONNECTION_PORT = Symbol('REPOSITORY_CONNECTION_PORT');

export interface VerifiedRepositorySelection {
  repositoryId: string;
  applicationType: WorkspaceApplicationType;
  fullName: string;
}

export interface RepositoryConnectionPort {
  listAvailable(userId: string): Promise<VerifiedRepositorySelection[]>;
  verifySelection(userId: string, repositories: WorkspaceBlueprintRepository[]): Promise<VerifiedRepositorySelection[]>;
  enqueueLinks(input: { userId: string; workspaceId: string; repositories: VerifiedRepositorySelection[] }): Promise<void>;
}
