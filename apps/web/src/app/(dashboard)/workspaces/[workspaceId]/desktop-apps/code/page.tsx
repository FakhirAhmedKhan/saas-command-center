'use client';

import { DesktopAppSubNav } from '@/features/desktop-apps/desktop-app-sub-nav';
import { getDesktopAppOverview } from '@/features/desktop-apps/desktop-apps-api';
import { getErrorMessage } from '@/features/lib/api/api-error';
import { CodeExplorer } from '@/features/repositories/code-explorer';
import type { DesktopAppOverview } from '@command-center/shared-types';
import { Code2, GitBranch } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function DesktopCodePage() {
  const params = useParams<{
    workspaceId: string;
    desktopAppId: string;
  }>();
  const [overview, setOverview] = useState<DesktopAppOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    void getDesktopAppOverview(params.workspaceId, params.desktopAppId)
      .then((result) => {
        if (active) setOverview(result);
      })
      .catch((caught: unknown) => {
        if (active) setError(getErrorMessage(caught));
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [params.workspaceId, params.desktopAppId]);

  if (loading) {
    return <main className='p-8'>Loading repository...</main>;
  }

  if (error || !overview) {
    return (
      <main className='p-8'>
        <div role='alert'>{error ?? 'Desktop application was not found.'}</div>
      </main>
    );
  }

  const repository = overview.repository;

  return (
    <main className='space-y-6 p-4 sm:p-6 lg:p-8'>
      <header>
        <div className='flex items-center gap-2 text-sm text-slate-500'>
          <Code2 className='size-4' aria-hidden='true' />
          Desktop Code
        </div>

        <h1 className='mt-1 text-2xl font-bold text-slate-950'>{overview.desktopApp.application.name}</h1>
      </header>

      <DesktopAppSubNav workspaceId={params.workspaceId} desktopAppId={params.desktopAppId} />

      {!repository ? (
        <section className='flex min-h-80 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white px-6 text-center'>
          <GitBranch className='size-10 text-slate-300' aria-hidden='true' />

          <h2 className='mt-4 text-lg font-semibold text-slate-900'>Connect a repository first</h2>

          <p className='mt-2 max-w-lg text-sm text-slate-500'>The Desktop Code tab reuses the workspace Code Explorer. Connect a repository to this desktop application before browsing source.</p>

          <Link href={`/workspaces/${params.workspaceId}/desktop-apps/${params.desktopAppId}`} className='mt-4 font-semibold text-brand-600'>
            Back to desktop overview
          </Link>
        </section>
      ) : (
        <CodeExplorer workspaceId={params.workspaceId} repositoryId={repository.id} />
      )}
    </main>
  );
}
