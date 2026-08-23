'use client';

import { getErrorMessage } from '@/features/lib/api/api-error';
import { DesktopAppCard } from '@/features/desktop-apps/desktop-app-card';
import { listDesktopApps } from '@/features/desktop-apps/desktop-apps-api';
import type { DesktopApplicationDetails } from '@command-center/shared-types';
import { Monitor, Plus, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

export default function DesktopAppsPage() {
  const params = useParams<{
    workspaceId: string;
  }>();

  const workspaceId = params.workspaceId;

  const [desktopApps, setDesktopApps] = useState<DesktopApplicationDetails[]>([]);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState<string | null>(null);

  const loadDesktopApps = useCallback(async (): Promise<void> => {
    setLoading(true);
    setError(null);

    try {
      const response = await listDesktopApps(workspaceId);

      setDesktopApps(response);
    } catch (loadError: unknown) {
      setError(getErrorMessage(loadError, 'Unable to load desktop applications.'));
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadDesktopApps();
  }, [loadDesktopApps]);

  return (
    <main className='mx-auto w-full max-w-7xl space-y-6 p-4 pt-8 sm:p-6 sm:pt-10 lg:p-8'>
      <header className='flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between'>
        <div>
          <div className='flex items-center gap-2 text-sm font-semibold text-slate-500'>
            <Monitor className='size-4' />
            Workspace
          </div>

          <h1 className='mt-2 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl'>Desktop Apps</h1>

          <p className='mt-2 max-w-2xl text-sm leading-6 text-slate-500'>
            Manage Windows, macOS, Linux and cross-platform desktop applications in this workspace.
          </p>
        </div>

        <Link
          href={`/workspaces/${workspaceId}/desktop-apps/new`}
          className='inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 text-sm font-semibold text-white transition hover:bg-brand-700'
        >
          <Plus className='size-4' />
          Add Desktop App
        </Link>
      </header>

      {loading ? (
        <div aria-label='Loading desktop applications' className='grid gap-4 md:grid-cols-2 xl:grid-cols-3'>
          {Array.from({
            length: 3,
          }).map((_, index) => (
            <div key={index} className='h-64 animate-pulse rounded-2xl border border-slate-200 bg-slate-100' />
          ))}
        </div>
      ) : null}

      {!loading && error ? (
        <div role='alert' className='rounded-2xl border border-red-200 bg-red-50 p-6'>
          <h2 className='font-semibold text-red-800'>Unable to load desktop apps</h2>

          <p className='mt-1 text-sm text-red-700'>{error}</p>

          <button
            type='button'
            onClick={() => void loadDesktopApps()}
            className='mt-4 inline-flex items-center gap-2 text-sm font-semibold text-red-700 hover:text-red-900'
          >
            <RefreshCw className='size-4' />
            Try again
          </button>
        </div>
      ) : null}

      {!loading && !error && desktopApps.length === 0 ? (
        <div className='flex min-h-80 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white px-6 text-center'>
          <div className='flex size-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-600'>
            <Monitor className='size-6' />
          </div>

          <h2 className='mt-4 text-lg font-semibold text-slate-950'>No desktop applications yet</h2>

          <p className='mt-2 max-w-md text-sm leading-6 text-slate-500'>
            Add your first Windows, macOS, Linux, Electron, Tauri, .NET, Qt or Java desktop application.
          </p>

          <Link
            href={`/workspaces/${workspaceId}/desktop-apps/new`}
            className='mt-5 inline-flex h-10 items-center gap-2 rounded-lg bg-brand-600 px-4 text-sm font-semibold text-white hover:bg-brand-700'
          >
            <Plus className='size-4' />
            Add Desktop App
          </Link>
        </div>
      ) : null}

      {!loading && !error && desktopApps.length > 0 ? (
        <div className='grid gap-4 md:grid-cols-2 xl:grid-cols-3'>
          {desktopApps.map((desktopApp) => (
            <DesktopAppCard key={desktopApp.id} workspaceId={workspaceId} desktopApp={desktopApp} />
          ))}
        </div>
      ) : null}
    </main>
  );
}
