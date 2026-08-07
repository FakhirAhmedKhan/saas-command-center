'use client';

import type {
  PropsWithChildren,
} from 'react';

import {
  AuthProvider,
} from '@/features/auth/auth-provider';

import {
  SessionProvider,
} from '@/features/auth/session-provider';

export function Providers({
  children,
}: PropsWithChildren) {
  return (
    <AuthProvider>
      <SessionProvider>
        {children}
      </SessionProvider>
    </AuthProvider>
  );
}
