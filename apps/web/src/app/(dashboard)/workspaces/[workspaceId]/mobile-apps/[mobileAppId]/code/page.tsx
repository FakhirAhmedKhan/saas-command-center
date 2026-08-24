'use client';

import { getErrorMessage } from '@/features/lib/api/api-error';
import { MobileAppSubNav } from '@/features/mobile-apps/mobile-app-sub-nav';
import { getMobileAppOverview } from '@/features/mobile-apps/mobile-apps-api';
import { CodeExplorer } from '@/features/repositories/code-explorer';
import type { MobileAppOverview } from '@command-center/shared-types';
import { ArrowLeft, Code2, GitBranch } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

export default function MobileCodePage() {
  const params = useParams<{
    workspaceId: string;
    mobileAppId: string;
  }>();
  const workspaceId = params.workspaceId;
  const mobileAppId = params.mobileAppId;
  const baseHref = `/workspaces/${workspaceId}` + `/mobile-apps/${mobileAppId}`;
  const [overview, setOverview] = useState<MobileAppOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await getMobileAppOverview(workspaceId, mobileAppId);

      setOverview(response);
    } catch (loadError: unknown) {
      setError(getErrorMessage(loadError));
    } finally {
      setLoading(false);
    }
  }, [workspaceId, mobileAppId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  if (loading) {
    return (
      <main className='mx-auto w-full max-w-7xl p-8'>
        <div className='h-[600px] animate-pulse rounded-2xl bg-slate-100' />
      </main>
    );
  }

  if (error || !overview) {
    return (
      <main className='mx-auto w-full max-w-7xl p-8'>
        <div role='alert' className='rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700'>
          {error ?? 'Unable to load mobile application.'}
        </div>
      </main>
    );
  }

  const repository = overview.repository;

  return (
    <main className='mx-auto w-full max-w-7xl space-y-6 p-4 pt-8 sm:p-6 sm:pt-10 lg:p-8'>
      <header>
        <Link href={baseHref} className='inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-900'>
          <ArrowLeft className='size-4' />

          {overview.mobileApp.application.name}
        </Link>

        <div className='mt-5 flex items-start gap-3'>
          <div className='flex size-11 items-center justify-center rounded-xl bg-brand-50 text-brand-600'>
            <Code2 className='size-5' />
          </div>

          <div>
            <h1 className='text-2xl font-bold tracking-tight text-slate-950'>Code</h1>

            <p className='mt-1 text-sm text-slate-500'>Browse the source repository for {overview.mobileApp.application.name}.</p>
          </div>
        </div>
      </header>

      <MobileAppSubNav workspaceId={workspaceId} mobileAppId={mobileAppId} />

      {!repository ? (
        <section className='flex min-h-80 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white px-6 text-center'>
          <div className='flex size-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-600'>
            <GitBranch className='size-6' />
          </div>

          <h2 className='mt-4 text-lg font-semibold text-slate-950'>Connect a repository to browse code</h2>

          <p className='mt-2 max-w-md text-sm leading-6 text-slate-500'>This mobile application does not currently have a GitHub repository connected.</p>

          <Link href={`${baseHref}#settings`} className='mt-5 inline-flex h-10 items-center rounded-lg bg-brand-600 px-4 text-sm font-semibold text-white hover:bg-brand-700'>
            Connect Repository
          </Link>
        </section>
      ) : (
        <>
          <div className='flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm'>
            <GitBranch className='size-4 text-slate-400' />

            <span className='font-medium text-slate-800'>{repository.fullName}</span>

            <span className='text-slate-300'>/</span>

            <span className='text-slate-500'>{repository.defaultBranch}</span>
          </div>

          <CodeExplorer workspaceId={workspaceId} repositoryId={repository.id} />
        </>
      )}
    </main>
  );
}
