/* eslint-disable react-hooks/set-state-in-effect */
'use client';

import { useEffect, useRef, useState } from 'react';

import { useRouter, useSearchParams } from 'next/navigation';

import { useSession } from '@/features/auth/use-session';
import { completeGithubSetup } from '@/features/repositories/repositories-api';
import { FolderGit2 } from 'lucide-react';

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

    void completeGithubSetup(installState, installationId)
      .then((result: { authorizationUrl: string | URL }) => {
        window.location.replace(result.authorizationUrl);
      })
      .catch((caughtError: unknown) => {
        started.current = false;

        setError(caughtError instanceof Error ? caughtError.message : 'Unable to complete GitHub setup.');
      });
  }, [router, searchParams, status]);

  return (
    <main className="flex min-h-[70vh] items-center justify-center p-6">
      <section className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-slate-950 text-white">
          <FolderGit2 className="size-7" />
        </div>

        {error ? (
          <>
            <h1 className="mt-5 text-xl font-bold text-slate-950">GitHub connection failed</h1>

            <p className="mt-3 text-sm text-red-700">{error}</p>
          </>
        ) : (
          <>
            <h1 className="mt-5 text-xl font-bold text-slate-950">Connecting GitHub</h1>

            <p className="mt-3 text-sm text-slate-500">Verifying the installation and preparing secure authorization.</p>

            <div className="mx-auto mt-6 size-7 animate-spin rounded-full border-2 border-slate-200 border-t-slate-950" />
          </>
        )}
      </section>
    </main>
  );
}
