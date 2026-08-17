/* eslint-disable react-hooks/set-state-in-effect */
'use client';

import type { AuthResponse, CurrentUserResponse, LoginInput, RegisterInput, User, Workspace } from './auth.types';
import { apiRequest, refreshSession, setAccessToken, setUnauthorizedHandler } from '../lib/api/api-client';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type PropsWithChildren } from 'react';

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
    /*
     * Goes through the api-client's single-flight refreshSession() rather
     * than a plain apiRequest() call. The refresh-token cookie is single-use
     * and rotated on every call, so if this effect ever runs twice
     * concurrently (React Strict Mode double-invokes mount effects in
     * development), a second independent request would reuse an
     * already-consumed cookie and get the whole session revoked as
     * suspected token replay. Sharing one in-flight request keeps that from
     * happening.
     */
    const response = await refreshSession<AuthResponse>();

    if (!response) {
      throw new Error('Unable to restore session.');
    }

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
