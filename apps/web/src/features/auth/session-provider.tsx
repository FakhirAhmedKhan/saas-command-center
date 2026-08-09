/* eslint-disable react-hooks/set-state-in-effect */
'use client';

import { createContext, useCallback, useEffect, useMemo, useState } from 'react';

import type { PropsWithChildren } from 'react';

import { login as loginRequest, logout as logoutRequest, register as registerRequest, restoreSession } from './auth-api';

import { AuthUser, setUnauthorizedHandler, type LoginInput, type RegisterInput } from './auth.types';
import { setAccessToken } from '../lib/api/api-client';

export type SessionStatus = 'loading' | 'authenticated' | 'unauthenticated';

export interface SessionContextValue {
  status: SessionStatus;

  user: AuthUser | null;

  login(input: LoginInput): Promise<void>;

  register(input: RegisterInput): Promise<void>;

  logout(): Promise<void>;

  refresh(): Promise<void>;
}

export const SessionContext = createContext<SessionContextValue | undefined>(undefined);

export function SessionProvider({ children }: PropsWithChildren) {
  const [status, setStatus] = useState<SessionStatus>('loading');

  const [user, setUser] = useState<AuthUser | null>(null);

  const clearSession = useCallback(() => {
    setAccessToken(null);

    setUser(null);

    setStatus('unauthenticated');
  }, []);

  const applySession = useCallback(
    (
      nextUser: AuthUser,

      token: string,
    ) => {
      setAccessToken(token);

      setUser(nextUser);

      setStatus('authenticated');
    },
    [],
  );

  const refresh = useCallback(async () => {
    const session = await restoreSession();

    applySession(session.user, session.accessToken);
  }, [applySession]);

  useEffect(() => {
    setUnauthorizedHandler(clearSession);

    void refresh().catch(() => {
      clearSession();
    });

    return () => {
      setUnauthorizedHandler(null);
    };
  }, [clearSession, refresh]);

  const login = useCallback(
    async (input: LoginInput) => {
      const session = await loginRequest(input);

      applySession(session.user, session.accessToken);
    },
    [applySession],
  );

  const register = useCallback(
    async (input: RegisterInput) => {
      const session = await registerRequest(input);

      applySession(session.user, session.accessToken);
    },
    [applySession],
  );

  const logout = useCallback(async () => {
    try {
      await logoutRequest();
    } finally {
      clearSession();
    }
  }, [clearSession]);

  const contextValue = useMemo<SessionContextValue>(
    () => ({
      status,
      user,
      login,
      register,
      logout,
      refresh,
    }),
    [status, user, login, register, logout, refresh],
  );

  return <SessionContext.Provider value={contextValue}>{children}</SessionContext.Provider>;
}
