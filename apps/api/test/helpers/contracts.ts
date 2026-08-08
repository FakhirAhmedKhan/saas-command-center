export const API_PREFIX = '/api/v1';

export const TEST_ROUTES = {
  auth: {
    register: `${API_PREFIX}/auth/register`,

    login: `${API_PREFIX}/auth/login`,

    refresh: `${API_PREFIX}/auth/refresh`,

    logout: `${API_PREFIX}/auth/logout`,

    logoutAll: `${API_PREFIX}/auth/logout-all`,

    me: `${API_PREFIX}/auth/me`,
  },

  system: {
    health: `${API_PREFIX}/health`,
  },

  workspaces: {
    root: `${API_PREFIX}/workspaces`,

    details(workspaceId: string): string {
      return `${API_PREFIX}/workspaces/${workspaceId}`;
    },

    applications(workspaceId: string): string {
      return `${API_PREFIX}/workspaces/${workspaceId}/applications`;
    },
  },
} as const;

export interface TestUserInput {
  name: string;
  email: string;
  password: string;
  workspaceName: string;
}

/*
 * If your RegisterDto uses `fullName`
 * instead of `name`, change it here only.
 */
export function buildRegisterPayload(user: TestUserInput) {
  return {
    displayName: user.name,
    email: user.email.trim().toLowerCase(),
    password: user.password,
    workspaceName: user.workspaceName,
  };
}

export function buildLoginPayload(user: Pick<TestUserInput, 'email' | 'password'>) {
  return {
    email: user.email,

    password: user.password,
  };
}

export function buildWorkspacePayload(name: string) {
  return {
    name,
  };
}
