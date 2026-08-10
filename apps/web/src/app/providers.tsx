'use client';

import type { PropsWithChildren } from 'react';

import { AuthProvider } from '@/features/auth/auth-provider';

export function Providers({ children }: PropsWithChildren) {
  return <AuthProvider>{children}</AuthProvider>;
}
