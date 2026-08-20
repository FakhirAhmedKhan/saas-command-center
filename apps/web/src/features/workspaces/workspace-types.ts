import type { WorkspaceRole } from '@command-center/shared-types';

export type { CreateWorkspaceInput as CreateWorkspacePayload, WorkspaceRole } from '@command-center/shared-types';
export interface CreatedWorkspace {
  id: string;
  name: string;
  slug: string;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;

  members: Array<{
    id: string;
    userId: string;
    role: WorkspaceRole;
    joinedAt: string;
  }>;

  _count: {
    members: number;
    saasApplications: number;
  };
}
