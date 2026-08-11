export const WORKSPACE_ROLES = ['OWNER', 'ADMIN', 'DEVELOPER', 'VIEWER'] as const;

export type WorkspaceRole = (typeof WORKSPACE_ROLES)[number];
