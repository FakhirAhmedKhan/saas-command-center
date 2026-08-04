'use client';

import {
  useEffect,
} from 'react';
import {
  useRouter,
} from 'next/navigation';

import { FullPageLoader } from '@/components/auth/auth-gates';
import { useAuth } from '@/features/auth/auth-provider';

export default function HomePage() {
  const router = useRouter();

  const { status } = useAuth();

  useEffect(() => {
    if (status === 'authenticated') {
      router.replace('/dashboard');
    }

    if (status === 'unauthenticated') {
      router.replace('/login');
    }
  }, [router, status]);

  return <FullPageLoader />;
}