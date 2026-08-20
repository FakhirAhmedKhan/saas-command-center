import type { WorkspaceRole } from '@command-center/shared-types';

export type { LoginInput, RegisterInput, WorkspaceRole } from '@command-center/shared-types';
export interface User {
  id: string;
  email: string;
  displayName: string | null;
  isActive: boolean;
  emailVerifiedAt: string | null;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface WorkspaceMembership {
  role: WorkspaceRole;
}

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;

  members?: WorkspaceMembership[];

  _count?: {
    members: number;
  };
}

export interface WorkspaceMember {
  id: string;
  workspaceId: string;
  userId: string;
  role: WorkspaceRole;
  joinedAt: string;
  createdAt: string;
  updatedAt: string;

  user: {
    id: string;
    email: string;
    displayName: string | null;
    isActive: boolean;
  };
}

export interface AuthUser extends User {
  workspaces?: Workspace[];
  currentWorkspaceId?: string | null;
}

export interface AuthResponse {
  accessToken: string;

  tokenType: 'Bearer';

  expiresIn: number;

  user: User;

  workspaces: Workspace[];
}

export interface CurrentUserResponse {
  user: User;

  workspaces: Workspace[];
}

export interface AuthSession {
  accessToken: string;

  tokenType: 'Bearer';

  expiresIn: number;

  user: AuthUser;
}
