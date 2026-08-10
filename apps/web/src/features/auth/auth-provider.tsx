/* eslint-disable react-hooks/set-state-in-effect */
'use client';

import { createContext, type PropsWithChildren, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { apiRequest, setAccessToken, setUnauthorizedHandler } from '../lib/api/api-client';

import type { AuthResponse, CurrentUserResponse, LoginInput, RegisterInput, User, Workspace } from './auth.types';

export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';

export interface AuthContextValue {
  status: AuthStatus;

  user: User | null;

  workspaces: Workspace[];

  login(input: LoginInput): Promise<void>;

  register(input: RegisterInput): Promise<void>;

  logout(): Promise<void>;

  logoutAll(): Promise<void>;

  refresh(): Promise<void>;

  refreshCurrentUser(): Promise<void>;

  updateWorkspaceInState(workspace: Workspace): void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: PropsWithChildren) {
  const existingContext = useContext(AuthContext);

  if (existingContext) {
    return children;
  }

  return <AuthProviderRoot>{children}</AuthProviderRoot>;
}

function AuthProviderRoot({ children }: PropsWithChildren) {
  const [status, setStatus] = useState<AuthStatus>('loading');

  const [user, setUser] = useState<User | null>(null);

  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);

  const applyAuthResponse = useCallback((response: AuthResponse) => {
    setAccessToken(response.accessToken);

    setUser(response.user);

    setWorkspaces(response.workspaces ?? []);

    setStatus('authenticated');
  }, []);

  const clearSession = useCallback(() => {
    setAccessToken(null);

    setUser(null);

    setWorkspaces([]);

    setStatus('unauthenticated');
  }, []);

  const refresh = useCallback(async () => {
    const response = await apiRequest<AuthResponse>('/auth/refresh', {
      method: 'POST',

      skipAuthentication: true,

      skipRefresh: true,
    });

    applyAuthResponse(response);
  }, [applyAuthResponse]);

  useEffect(() => {
    let active = true;

    setUnauthorizedHandler(clearSession);

    void refresh().catch(() => {
      if (active) {
        clearSession();
      }
    });

    return () => {
      active = false;

      setUnauthorizedHandler(null);
    };
  }, [clearSession, refresh]);

  const login = useCallback(
    async (input: LoginInput) => {
      const response = await apiRequest<AuthResponse>('/auth/login', {
        method: 'POST',

        body: input,

        skipAuthentication: true,

        skipRefresh: true,
      });

      applyAuthResponse(response);
    },
    [applyAuthResponse],
  );

  const register = useCallback(
    async (input: RegisterInput) => {
      const response = await apiRequest<AuthResponse>('/auth/register', {
        method: 'POST',

        body: input,

        skipAuthentication: true,

        skipRefresh: true,
      });

      applyAuthResponse(response);
    },
    [applyAuthResponse],
  );

  const logout = useCallback(async () => {
    try {
      await apiRequest<{
        success: true;
      }>('/auth/logout', {
        method: 'POST',

        skipRefresh: true,
      });
    } finally {
      clearSession();
    }
  }, [clearSession]);

  const logoutAll = useCallback(async () => {
    try {
      await apiRequest<{
        success: true;
      }>('/auth/logout-all', {
        method: 'POST',

        skipRefresh: true,
      });
    } finally {
      clearSession();
    }
  }, [clearSession]);

  const refreshCurrentUser = useCallback(async () => {
    const response = await apiRequest<CurrentUserResponse>('/auth/me');

    setUser(response.user);

    setWorkspaces(response.workspaces ?? []);
  }, []);

  const updateWorkspaceInState = useCallback((updatedWorkspace: Workspace) => {
    setWorkspaces((current) => {
      const exists = current.some((workspace) => workspace.id === updatedWorkspace.id);

      if (!exists) {
        return [...current, updatedWorkspace];
      }

      return current.map((workspace) =>
        workspace.id === updatedWorkspace.id
          ? {
              ...workspace,
              ...updatedWorkspace,
            }
          : workspace,
      );
    });
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      status,

      user,

      workspaces,

      login,

      register,

      logout,

      logoutAll,

      refresh,

      refreshCurrentUser,

      updateWorkspaceInState,
    }),
    [status, user, workspaces, login, register, logout, logoutAll, refresh, refreshCurrentUser, updateWorkspaceInState],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider.');
  }

  return context;
}
