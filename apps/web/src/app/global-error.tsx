'use client';

import { PageError } from '@/components/states/page-error';
import { ApiError } from '@/features/lib/api/api-error';
import './globals.css';

interface GlobalErrorProps {
  error: Error & {
    digest?: string;
  };

  reset: () => void;
}

/*
 * Next.js requires global-error.tsx to render its own <html>/<body> because
 * it replaces the root layout entirely when a root-level error occurs
 * (nothing above it remains mounted to provide those tags).
 */
export default function GlobalError({ error, reset }: GlobalErrorProps) {
  return (
    <html lang='en'>
      <body className='min-h-screen bg-slate-50 text-slate-950 antialiased'>
        <div className='flex min-h-screen items-center justify-center p-6'>
          <div className='w-full max-w-md'>
            <PageError
              title='Something went wrong'
              message={error instanceof ApiError ? error.message : 'The application hit an unexpected error. Please try again.'}
              requestId={error instanceof ApiError ? error.requestId : undefined}
              onRetry={reset}
            />
          </div>
        </div>
      </body>
    </html>
  );
}
