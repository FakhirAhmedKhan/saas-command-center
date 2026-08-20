'use client';
import { useAuth } from '@/features/auth/auth-provider';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, type ReactNode } from 'react';

interface GateProps {
  children: ReactNode;
}

export function GuestOnly({ children }: GateProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { status, workspaces } = useAuth();

  const authenticatedRedirect = pathname === '/register' && workspaces.length === 0 ? '/workspaces/new' : '/dashboard';

  useEffect(() => {
    if (status === 'authenticated') {
      router.replace(authenticatedRedirect);
    }
  }, [authenticatedRedirect, router, status]);

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
    <div className='page-loader'>
      <div className='spinner' />
      <p>Loading your workspace…</p>
    </div>
  );
}
