export type WorkspaceRole =
  | 'OWNER'
  | 'ADMIN'
  | 'DEVELOPER'
  | 'VIEWER';

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

export interface LoginInput {
  email: string;
  password: string;
}

export interface RegisterInput {
  email: string;
  password: string;
  displayName?: string;
  workspaceName: string;
  workspaceSlug?: string;
}