'use client';

import { getDesktopAppOverview } from '@/features/desktop-apps/desktop-apps-api';
import { getErrorMessage } from '@/features/lib/api/api-error';
import { CodeExplorer } from '@/features/repositories/code-explorer';
import type { DesktopAppOverview } from '@command-center/shared-types';
import { Code2, GitBranch } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

export default function DesktopCodePage() {
  const params = useParams<{
    workspaceId: string;
    desktopAppId: string;
  }>();
  const workspaceId = params.workspaceId;
  const desktopAppId = params.desktopAppId;
  const baseHref = `/workspaces/${workspaceId}` + `/desktop-apps/${desktopAppId}`;
  const [overview, setOverview] = useState<DesktopAppOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await getDesktopAppOverview(workspaceId, desktopAppId);

      setOverview(response);
    } catch (loadError: unknown) {
      setError(getErrorMessage(loadError));
    } finally {
      setLoading(false);
    }
  }, [workspaceId, desktopAppId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  if (loading) {
    return <div className='h-[600px] animate-pulse rounded-2xl bg-slate-100' />;
  }

  if (error || !overview) {
    return (
      <div role='alert' className='rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700'>
        {error ?? 'Unable to load desktop application.'}
      </div>
    );
  }

  const repository = overview.repository;

  return (
    <div className='space-y-6'>
      <header className='flex items-start gap-3'>
        <div className='flex size-11 items-center justify-center rounded-xl bg-brand-50 text-brand-600'>
          <Code2 className='size-5' />
        </div>

        <div>
          <h1 className='text-2xl font-bold tracking-tight text-slate-950'>Code</h1>

          <p className='mt-1 text-sm text-slate-500'>Browse the source repository for {overview.desktopApp.application.name}.</p>
        </div>
      </header>

      {!repository ? (
        <section className='flex min-h-80 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white px-6 text-center'>
          <div className='flex size-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-600'>
            <GitBranch className='size-6' />
          </div>

          <h2 className='mt-4 text-lg font-semibold text-slate-950'>Connect a repository to browse code</h2>

          <p className='mt-2 max-w-md text-sm leading-6 text-slate-500'>This desktop application does not currently have a GitHub repository connected.</p>

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
    </div>
  );
}
