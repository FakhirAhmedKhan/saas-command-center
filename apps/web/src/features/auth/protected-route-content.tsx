'use client';

import { useSession } from './use-session';
import { PageLoading } from '@/components/states/page-loading';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, type PropsWithChildren } from 'react';

export function ProtectedRoute({ children }: PropsWithChildren) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { status } = useSession();

  useEffect(() => {
    if (status !== 'unauthenticated') {
      return;
    }

    const query = searchParams.toString();
    const currentPath = query.length > 0 ? `${pathname}?${query}` : pathname;

    router.replace(`/login?next=${encodeURIComponent(currentPath)}`);
  }, [pathname, router, searchParams, status]);

  if (status !== 'authenticated') {
    return <PageLoading label={status === 'loading' ? 'Restoring your session…' : 'Redirecting to login…'} />;
  }

  return children;
}
