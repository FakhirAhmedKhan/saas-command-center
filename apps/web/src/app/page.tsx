'use client';

import { FullPageLoader } from '@/features/auth/auth-gates';
import { useAuth } from '@/features/auth/auth-provider';
import LandingPage from '@/features/landingpage';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function HomePage() {
  const router = useRouter();
  const { status } = useAuth();

  useEffect(() => {
    // Only redirect if they are actually logged in
    if (status === 'authenticated') {
      router.replace('/dashboard');
    }
    // We REMOVED the unauthenticated redirect so they stay on the page!
  }, [router, status]);

  // Show the full page loader while checking auth status,
  // or while waiting for the dashboard redirect to happen.
  if (status === 'loading' || status === 'authenticated') {
    return <FullPageLoader />;
  }

  // Once we confirm they are unauthenticated, show the actual landing page
  return <LandingPage />;
}
