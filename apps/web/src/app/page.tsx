// app/page.tsx

'use client';

import { LandingPage } from './DynmicIndex';
import { FullPageLoader } from '@/features/auth/auth-gates';
import { useAuth } from '@/features/auth/auth-provider';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function HomePage() {
  const router = useRouter();
  const { status } = useAuth();

  useEffect(() => {
    if (status === 'authenticated') {
      router.replace('/dashboard');
    }
  }, [router, status]);

  if (status === 'loading' || status === 'authenticated') {
    return <FullPageLoader />;
  }

  return <LandingPage />;
}
