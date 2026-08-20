'use client';

import { PageError } from '@/components/states/page-error';
import { ApiError } from '@/features/lib/api/api-error';
import { useEffect } from 'react';

interface DashboardErrorProps {
  error: Error & {
    digest?: string;
  };

  reset: () => void;
}

export default function DashboardError({ error, reset }: DashboardErrorProps) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className='mx-auto w-full max-w-[1600px] p-4 sm:p-6 lg:p-8'>
      <PageError
        title='Something went wrong'
        message={error instanceof ApiError ? error.message : 'This page hit an unexpected error. Please try again.'}
        requestId={error instanceof ApiError ? error.requestId : undefined}
        onRetry={reset}
      />
    </div>
  );
}
