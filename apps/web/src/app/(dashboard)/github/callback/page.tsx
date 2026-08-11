import { GithubCallbackClient } from './github-callback-client';
import { Suspense } from 'react';

export default function GithubCallbackPage() {
  return (
    <Suspense
      fallback={
        <main className='flex min-h-[70vh] items-center justify-center p-6'>
          <div className='size-8 animate-spin rounded-full border-2 border-slate-200 border-t-slate-950' />
        </main>
      }
    >
      <GithubCallbackClient />
    </Suspense>
  );
}
