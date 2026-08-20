/* eslint-disable react-hooks/set-state-in-effect */
'use client';

import { useSession } from '@/features/auth/use-session';
import { assertTrustedGithubUrl } from '@/features/lib/github/github-url';
import { completeGithubSetup } from '@/features/repositories/repositories-api';
import { completePersonalGithubSetup } from '@/features/workspaces/github-import/github-import-api';
import { isGithubImportFlow } from '@/features/workspaces/github-import/github-import-flow-marker';
import { FolderGit2 } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

export function GithubSetupClient() {
  const router = useRouter();

  const searchParams = useSearchParams();

  const { status } = useSession();

  const started = useRef(false);

  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status === 'loading') {
      return;
    }

    if (status === 'unauthenticated') {
      const query = searchParams.toString();

      const nextPath = query ? `/github/setup?${query}` : '/github/setup';

      router.replace(`/login?next=${encodeURIComponent(nextPath)}`);

      return;
    }

    if (started.current) {
      return;
    }

    const installationId = searchParams.get('installation_id');

    const installState = searchParams.get('state');

    if (!installationId || !installState) {
      setError('GitHub did not return the required installation information.');

      return;
    }

    started.current = true;

    const completeSetup = isGithubImportFlow() ? completePersonalGithubSetup(installState, installationId) : completeGithubSetup(installState, installationId);

    void completeSetup
      .then((result: { authorizationUrl: string }) => {
        window.location.replace(assertTrustedGithubUrl(result.authorizationUrl));
      })
      .catch((caughtError: unknown) => {
        started.current = false;

        setError(caughtError instanceof Error ? caughtError.message : 'Unable to complete GitHub setup.');
      });
  }, [router, searchParams, status]);

  return (
    <main className='flex min-h-[70vh] items-center justify-center p-6'>
      <section className='w-full max-w-sm rounded-xl border border-slate-200 bg-white p-6 text-center'>
        <div className='mx-auto flex size-11 items-center justify-center rounded-xl bg-slate-950 text-white'>
          <FolderGit2 className='size-5' />
        </div>

        {error ? (
          <>
            <h1 className='mt-4 text-lg font-semibold text-slate-950'>GitHub connection failed</h1>

            <p className='mt-2 text-sm leading-6 text-red-700'>{error}</p>
          </>
        ) : (
          <>
            <h1 className='mt-4 text-lg font-semibold text-slate-950'>Connecting GitHub</h1>

            <p className='mt-2 text-sm leading-6 text-slate-500'>Verifying the installation and preparing secure authorization.</p>

            <div className='mx-auto mt-5 size-6 animate-spin rounded-full border-2 border-slate-200 border-t-slate-950' />
          </>
        )}
      </section>
    </main>
  );
}
