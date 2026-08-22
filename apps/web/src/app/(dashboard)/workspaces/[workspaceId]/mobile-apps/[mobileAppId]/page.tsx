'use client';

import type { CreateMobileApplicationInput, MobileApplicationDetails } from '@command-center/shared-types';

import { ArrowLeft, Smartphone, Trash2 } from 'lucide-react';

import Link from 'next/link';

import { useParams, useRouter } from 'next/navigation';

import { useCallback, useEffect, useState } from 'react';

import { getErrorMessage } from '@/features/lib/api/api-error';

import { MOBILE_FRAMEWORK_LABELS, MOBILE_PLATFORM_LABELS } from '@/features/mobile-apps/mobile-app.constants';

import { MobileAppForm } from '@/features/mobile-apps/mobile-app-form';

import { MobileProjectDetectionPanel } from '@/features/mobile-apps/mobile-project-detection-panel';

import { MobileRepositoryPanel } from '@/features/mobile-apps/mobile-repository-panel';

import { archiveMobileApp, getMobileApp, updateMobileApp } from '@/features/mobile-apps/mobile-apps-api';

import { getPrimaryIdentifier } from '@/features/mobile-apps/mobile-app-utils';

export default function MobileAppDetailPage() {
  const params = useParams<{
    workspaceId: string;
    mobileAppId: string;
  }>();

  const router = useRouter();

  const workspaceId = params.workspaceId;

  const mobileAppId = params.mobileAppId;

  const listHref = `/workspaces/${workspaceId}/mobile-apps`;

  const [mobileApp, setMobileApp] = useState<MobileApplicationDetails | null>(null);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState<string | null>(null);

  const [archiving, setArchiving] = useState(false);

  /**
   * Reload the current mobile application.
   *
   * Phase 4 repository linking can call this
   * after repository state changes.
   *
   * Phase 5 detection calls this after detected
   * metadata is applied.
   */
  const load = useCallback(async (): Promise<void> => {
    setLoading(true);
    setError(null);

    try {
      const response = await getMobileApp(workspaceId, mobileAppId);

      setMobileApp(response);
    } catch (loadError: unknown) {
      setError(getErrorMessage(loadError));
    } finally {
      setLoading(false);
    }
  }, [mobileAppId, workspaceId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleUpdate(payload: CreateMobileApplicationInput): Promise<void> {
    const response = await updateMobileApp(workspaceId, mobileAppId, payload);

    setMobileApp(response);

    router.refresh();
  }

  async function handleArchive(): Promise<void> {
    if (!mobileApp) {
      return;
    }

    const confirmed = window.confirm(`Archive "${mobileApp.application.name}"?`);

    if (!confirmed) {
      return;
    }

    setArchiving(true);
    setError(null);

    try {
      await archiveMobileApp(workspaceId, mobileAppId);

      router.replace(listHref);

      router.refresh();
    } catch (archiveError: unknown) {
      setError(getErrorMessage(archiveError));

      setArchiving(false);
    }
  }

  if (loading) {
    return (
      <main className='mx-auto w-full max-w-5xl p-4 pt-8 sm:p-6 sm:pt-10 lg:p-8'>
        <div className='space-y-5'>
          <div className='h-28 animate-pulse rounded-2xl bg-slate-100' />

          <div className='h-40 animate-pulse rounded-2xl bg-slate-100' />

          <div className='h-64 animate-pulse rounded-2xl bg-slate-100' />
        </div>
      </main>
    );
  }

  if (error && !mobileApp) {
    return (
      <main className='mx-auto w-full max-w-5xl p-4 pt-8 sm:p-6 sm:pt-10 lg:p-8'>
        <div role='alert' className='rounded-2xl border border-red-200 bg-red-50 p-6'>
          <h1 className='font-semibold text-red-800'>Unable to load mobile application</h1>

          <p className='mt-2 text-sm text-red-700'>{error}</p>

          <button type='button' onClick={() => void load()} className='mt-4 text-sm font-semibold text-red-700 hover:text-red-900'>
            Try again
          </button>
        </div>
      </main>
    );
  }

  if (!mobileApp) {
    return null;
  }

  return (
    <main className='mx-auto w-full max-w-5xl space-y-8 p-4 pt-8 sm:p-6 sm:pt-10 lg:p-8'>
      {/* Header */}
      <header>
        <Link href={listHref} className='inline-flex items-center gap-1.5 text-[13px] font-medium text-slate-500 transition hover:text-slate-800'>
          <ArrowLeft className='size-4' />
          Back to Mobile Apps
        </Link>

        <div className='mt-5 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between'>
          <div className='flex min-w-0 items-start gap-3'>
            <div className='flex size-12 shrink-0 items-center justify-center rounded-2xl bg-brand-50 text-brand-600'>
              <Smartphone className='size-6' />
            </div>

            <div className='min-w-0'>
              <h1 className='truncate text-2xl font-bold tracking-tight text-slate-950'>{mobileApp.application.name}</h1>

              <p className='mt-1 text-sm text-slate-500'>
                {MOBILE_PLATFORM_LABELS[mobileApp.platform]}

                {' â€¢ '}

                {MOBILE_FRAMEWORK_LABELS[mobileApp.framework]}
              </p>
            </div>
          </div>

          <button
            type='button'
            disabled={archiving}
            onClick={() => void handleArchive()}
            className='inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-red-200 bg-white px-4 text-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60'
          >
            <Trash2 className='size-4' />

            {archiving ? 'Archiving...' : 'Archive'}
          </button>
        </div>
      </header>

      {/* Non-blocking page errors */}
      {error ? (
        <div role='alert' className='rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700'>
          {error}
        </div>
      ) : null}

      {/* Summary */}
      <section className='grid gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:grid-cols-2 lg:grid-cols-4'>
        <MetadataItem label='Platform' value={MOBILE_PLATFORM_LABELS[mobileApp.platform]} />

        <MetadataItem label='Framework' value={MOBILE_FRAMEWORK_LABELS[mobileApp.framework]} />

        <MetadataItem label='Version' value={mobileApp.currentVersion ?? 'â€”'} />

        <MetadataItem label='Build' value={mobileApp.currentBuildNumber ?? 'â€”'} />

        <div className='sm:col-span-2 lg:col-span-4'>
          <MetadataItem label='Identifier' value={getPrimaryIdentifier(mobileApp)} />
        </div>
      </section>

      {/* Phase 4 â€” Repository Linking */}
      <MobileRepositoryPanel
        workspaceId={workspaceId}
        mobileApp={mobileApp}
        onRepositoryChanged={() => {
          void load();
        }}
      />

      {/* Phase 5 â€” Project Detection */}
      <MobileProjectDetectionPanel
        workspaceId={workspaceId}
        mobileApp={mobileApp}
        onApplied={() => {
          void load();
        }}
      />

      {/* Edit */}
      <section id='edit' className='scroll-mt-8'>
        <div className='mb-4'>
          <h2 className='text-xl font-semibold text-slate-950'>Edit Mobile App</h2>

          <p className='mt-1 text-sm text-slate-500'>Update the mobile application metadata.</p>
        </div>

        <MobileAppForm mobileApp={mobileApp} cancelHref={listHref} submitLabel='Save Changes' onSubmit={handleUpdate} />
      </section>
    </main>
  );
}

function MetadataItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className='text-xs font-medium uppercase tracking-wide text-slate-400'>{label}</p>

      <p className='mt-1 break-all text-sm font-medium text-slate-800'>{value}</p>
    </div>
  );
}
