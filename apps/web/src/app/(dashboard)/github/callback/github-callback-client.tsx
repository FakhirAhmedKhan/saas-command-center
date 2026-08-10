/* eslint-disable react-hooks/set-state-in-effect */
'use client';

import { CheckCircle2, FolderGit2 } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { useSession } from '@/features/auth/use-session';
import { completeGithubCallback } from '@/features/repositories/repositories-api';

export function GithubCallbackClient() {
  const router = useRouter();

  const searchParams = useSearchParams();

  const { status } = useSession();

  const started = useRef(false);

  const [error, setError] = useState<string | null>(null);

  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (status === 'loading') {
      return;
    }

    if (status === 'unauthenticated') {
      const query = searchParams.toString();

      const nextPath = query ? `/github/callback?${query}` : '/github/callback';

      router.replace(`/login?next=${encodeURIComponent(nextPath)}`);

      return;
    }

    if (started.current) {
      return;
    }

    const code = searchParams.get('code');

    const state = searchParams.get('state');

    if (!code || !state) {
      setError('GitHub did not return the required authorization information.');

      return;
    }

    started.current = true;

    void completeGithubCallback(code, state)
      .then((result: { workspaceId: string; repositoryCount: number }) => {
        setConnected(true);

        window.setTimeout(() => {
          router.replace(`/workspaces/${result.workspaceId}/repositories?connected=1`);
        }, 900);
      })
      .catch((caughtError: unknown) => {
        started.current = false;

        setError(caughtError instanceof Error ? caughtError.message : 'Unable to complete GitHub authorization.');
      });
  }, [router, searchParams, status]);

  return (
    <main className='flex min-h-[70vh] items-center justify-center p-6'>
      <section className='w-full max-w-sm rounded-xl border border-slate-200 bg-white p-6 text-center'>
        <div className='mx-auto flex size-11 items-center justify-center rounded-xl bg-slate-950 text-white'>
          {connected ? <CheckCircle2 className='size-5' /> : <FolderGit2 className='size-5' />}
        </div>

        {error ? (
          <>
            <h1 className='mt-4 text-lg font-semibold text-slate-950'>Authorization failed</h1>

            <p className='mt-2 text-sm leading-6 text-red-700'>{error}</p>
          </>
        ) : connected ? (
          <>
            <h1 className='mt-4 text-lg font-semibold text-slate-950'>GitHub connected</h1>

            <p className='mt-2 text-sm leading-6 text-slate-500'>Your repositories are ready. Redirecting to the workspace.</p>
          </>
        ) : (
          <>
            <h1 className='mt-4 text-lg font-semibold text-slate-950'>Finalizing GitHub connection</h1>

            <p className='mt-2 text-sm leading-6 text-slate-500'>Verifying repository access and synchronizing your installation.</p>

            <div className='mx-auto mt-5 size-6 animate-spin rounded-full border-2 border-slate-200 border-t-slate-950' />
          </>
        )}
      </section>
    </main>
  );
}
