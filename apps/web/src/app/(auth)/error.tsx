'use client';

import { PageError } from '@/components/states/page-error';
import { ApiError } from '@/features/lib/api/api-error';
import { useEffect } from 'react';

interface AuthErrorProps {
  error: Error & {
    digest?: string;
  };

  reset: () => void;
}

export default function AuthError({ error, reset }: AuthErrorProps) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <PageError
      title='Something went wrong'
      message={error instanceof ApiError ? error.message : 'This page hit an unexpected error. Please try again.'}
      requestId={error instanceof ApiError ? error.requestId : undefined}
      onRetry={reset}
    />
  );
}
