'use client';

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';


import type {
  AuthResponse,
  CurrentUserResponse,
  LoginInput,
  RegisterInput,
  User,
  Workspace,
} from './auth.types';
import { setAccessToken, apiRequest } from '../lib/api/api-client';

type AuthStatus =
  | 'loading'
  | 'authenticated'
  | 'unauthenticated';

interface AuthContextValue {
  status: AuthStatus;
  user: User | null;
  workspaces: Workspace[];

  login: (
    input: LoginInput,
  ) => Promise<void>;

  register: (
    input: RegisterInput,
  ) => Promise<void>;

  logout: () => Promise<void>;

  logoutAll: () => Promise<void>;

  refreshCurrentUser: () => Promise<void>;

  updateWorkspaceInState: (
    workspace: Workspace,
  ) => void;
}

const AuthContext =
  createContext<AuthContextValue | null>(null);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({
  children,
}: AuthProviderProps) {
  const [status, setStatus] =
    useState<AuthStatus>('loading');

  const [user, setUser] =
    useState<User | null>(null);

  const [workspaces, setWorkspaces] =
    useState<Workspace[]>([]);

  const applyAuthResponse = useCallback(
    (response: AuthResponse) => {
      setAccessToken(response.accessToken);
      setUser(response.user);
      setWorkspaces(response.workspaces);
      setStatus('authenticated');
    },
    [],
  );

  const clearSession = useCallback(() => {
    setAccessToken(null);
    setUser(null);
    setWorkspaces([]);
    setStatus('unauthenticated');
  }, []);

  useEffect(() => {
    let active = true;

    async function restoreSession() {
      try {
        const response =
          await apiRequest<AuthResponse>(
            '/auth/refresh',
            {
              method: 'POST',
              body: JSON.stringify({}),
            },
            false,
          );

        if (!active) {
          return;
        }

        applyAuthResponse(response);
      } catch {
        if (active) {
          clearSession();
        }
      }
    }

    void restoreSession();

    return () => {
      active = false;
    };
  }, [applyAuthResponse, clearSession]);

  const login = useCallback(
    async (input: LoginInput) => {
      const response =
        await apiRequest<AuthResponse>(
          '/auth/login',
          {
            method: 'POST',
            body: JSON.stringify(input),
          },
          false,
        );

      applyAuthResponse(response);
    },
    [applyAuthResponse],
  );

  const register = useCallback(
    async (input: RegisterInput) => {
      const response =
        await apiRequest<AuthResponse>(
          '/auth/register',
          {
            method: 'POST',
            body: JSON.stringify(input),
          },
          false,
        );

      applyAuthResponse(response);
    },
    [applyAuthResponse],
  );

  const logout = useCallback(async () => {
    try {
      await apiRequest(
        '/auth/logout',
        {
          method: 'POST',
          body: JSON.stringify({}),
        },
        false,
      );
    } finally {
      clearSession();
    }
  }, [clearSession]);

  const logoutAll = useCallback(async () => {
    try {
      await apiRequest(
        '/auth/logout-all',
        {
          method: 'POST',
        },
      );
    } finally {
      clearSession();
    }
  }, [clearSession]);

  const refreshCurrentUser =
    useCallback(async () => {
      const response =
        await apiRequest<CurrentUserResponse>(
          '/auth/me',
        );

      setUser(response.user);
      setWorkspaces(response.workspaces);
    }, []);

  const updateWorkspaceInState =
    useCallback(
      (updatedWorkspace: Workspace) => {
        setWorkspaces((current) =>
          current.map((workspace) =>
            workspace.id ===
            updatedWorkspace.id
              ? {
                  ...workspace,
                  ...updatedWorkspace,
                }
              : workspace,
          ),
        );
      },
      [],
    );

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      user,
      workspaces,
      login,
      register,
      logout,
      logoutAll,
      refreshCurrentUser,
      updateWorkspaceInState,
    }),
    [
      status,
      user,
      workspaces,
      login,
      register,
      logout,
      logoutAll,
      refreshCurrentUser,
      updateWorkspaceInState,
    ],
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error(
      'useAuth must be used inside AuthProvider',
    );
  }

  return context;
}