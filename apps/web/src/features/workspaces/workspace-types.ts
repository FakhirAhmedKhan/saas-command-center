export type WorkspaceRole = 'OWNER' | 'ADMIN' | 'DEVELOPER' | 'VIEWER';

export interface CreateWorkspacePayload {
  name: string;
  slug?: string;
}

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
