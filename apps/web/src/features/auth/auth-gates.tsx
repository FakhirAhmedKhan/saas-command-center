'use client';

import type { ReactNode } from 'react';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

import { useAuth } from '@/features/auth/auth-provider';

interface GateProps {
  children: ReactNode;
}

export function GuestOnly({ children }: GateProps) {
  const router = useRouter();

  const { status } = useAuth();

  useEffect(() => {
    if (status === 'authenticated') {
      router.replace('/dashboard');
    }
  }, [router, status]);

  if (status === 'loading') {
    return <FullPageLoader />;
  }

  if (status === 'authenticated') {
    return <FullPageLoader />;
  }

  return children;
}

export function AuthenticatedOnly({ children }: GateProps) {
  const router = useRouter();

  const { status } = useAuth();

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace('/login');
    }
  }, [router, status]);

  if (status !== 'authenticated') {
    return <FullPageLoader />;
  }

  return children;
}

export function FullPageLoader() {
  return (
    <div className="page-loader">
      <div className="spinner" />
      <p>Loading your workspace…</p>
    </div>
  );
}
