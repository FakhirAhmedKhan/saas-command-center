'use client';

import { getErrorMessage } from '@/features/lib/api/api-error';
import { MobileAppCard } from '@/features/mobile-apps/mobile-app-card';
import { listMobileApps } from '@/features/mobile-apps/mobile-apps-api';
import type { MobileApplicationDetails } from '@command-center/shared-types';
import { Plus, RefreshCw, Smartphone } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

export default function MobileAppsPage() {
  const params = useParams<{
    workspaceId: string;
  }>();

  const workspaceId = params.workspaceId;

  const [mobileApps, setMobileApps] = useState<MobileApplicationDetails[]>([]);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState<string | null>(null);

  const loadMobileApps = useCallback(async (): Promise<void> => {
    setLoading(true);
    setError(null);

    try {
      const response = await listMobileApps(workspaceId);

      setMobileApps(response);
    } catch (loadError: unknown) {
      setError(getErrorMessage(loadError));
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadMobileApps();
  }, [loadMobileApps]);

  return (
    <main className='mx-auto w-full max-w-7xl space-y-6 p-4 pt-8 sm:p-6 sm:pt-10 lg:p-8'>
      <header className='flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between'>
        <div>
          <div className='flex items-center gap-2 text-sm font-medium text-brand-600'>
            <Smartphone className='size-4' />
            Mobile
          </div>

          <h1 className='mt-2 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl'>Mobile Apps</h1>

          <p className='mt-2 max-w-2xl text-sm leading-6 text-slate-500'>Manage Android, iOS and cross-platform applications in this workspace.</p>
        </div>

        <Link
          href={`/workspaces/${workspaceId}/mobile-apps/new`}
          className='inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 text-sm font-semibold text-white transition hover:bg-brand-700'
        >
          <Plus className='size-4' />
          Add Mobile App
        </Link>
      </header>

      {loading ? (
        <div aria-label='Loading mobile applications' className='grid gap-4 md:grid-cols-2 xl:grid-cols-3'>
          {Array.from({
            length: 3,
          }).map((_, index) => (
            <div key={index} className='h-64 animate-pulse rounded-2xl border border-slate-200 bg-slate-100' />
          ))}
        </div>
      ) : null}

      {!loading && error ? (
        <div role='alert' className='rounded-2xl border border-red-200 bg-red-50 p-6'>
          <h2 className='font-semibold text-red-800'>Unable to load mobile apps</h2>

          <p className='mt-1 text-sm text-red-700'>{error}</p>

          <button
            type='button'
            onClick={() => void loadMobileApps()}
            className='mt-4 inline-flex items-center gap-2 text-sm font-semibold text-red-700 hover:text-red-900'
          >
            <RefreshCw className='size-4' />
            Try again
          </button>
        </div>
      ) : null}

      {!loading && !error && mobileApps.length === 0 ? (
        <div className='flex min-h-80 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white px-6 text-center'>
          <div className='flex size-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-600'>
            <Smartphone className='size-6' />
          </div>

          <h2 className='mt-4 text-lg font-semibold text-slate-950'>No mobile applications yet</h2>

          <p className='mt-2 max-w-md text-sm leading-6 text-slate-500'>
            Add your first Android, iOS, Flutter, React Native or Kotlin Multiplatform application.
          </p>

          <Link
            href={`/workspaces/${workspaceId}/mobile-apps/new`}
            className='mt-5 inline-flex h-10 items-center gap-2 rounded-lg bg-brand-600 px-4 text-sm font-semibold text-white hover:bg-brand-700'
          >
            <Plus className='size-4' />
            Add Mobile App
          </Link>
        </div>
      ) : null}

      {!loading && !error && mobileApps.length > 0 ? (
        <div className='grid gap-4 md:grid-cols-2 xl:grid-cols-3'>
          {mobileApps.map((mobileApp) => (
            <MobileAppCard key={mobileApp.id} workspaceId={workspaceId} mobileApp={mobileApp} />
          ))}
        </div>
      ) : null}
    </main>
  );
}
