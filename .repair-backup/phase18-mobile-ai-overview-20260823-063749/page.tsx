'use client';

import { getErrorMessage } from '@/features/lib/api/api-error';
import { MobileAppForm } from '@/features/mobile-apps/mobile-app-form';
import { MobileAppSubNav } from '@/features/mobile-apps/mobile-app-sub-nav';
import { getPrimaryIdentifier } from '@/features/mobile-apps/mobile-app-utils';
import { MOBILE_FRAMEWORK_LABELS, MOBILE_PLATFORM_LABELS } from '@/features/mobile-apps/mobile-app.constants';
import { archiveMobileApp, getMobileAppOverview, updateMobileApp } from '@/features/mobile-apps/mobile-apps-api';
import { MobileProjectDetectionPanel } from '@/features/mobile-apps/mobile-project-detection-panel';
import { MobileRepositoryPanel } from '@/features/mobile-apps/mobile-repository-panel';
import type { CreateMobileApplicationInput, MobileAppOverview } from '@command-center/shared-types';
import { Archive, ArrowLeft, GitBranch, Smartphone } from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

export default function MobileAppOverviewPage() {
  const params = useParams<{
    workspaceId: string;
    mobileAppId: string;
  }>();

  const router = useRouter();

  const workspaceId = params.workspaceId;

  const mobileAppId = params.mobileAppId;

  const listHref = `/workspaces/${workspaceId}/mobile-apps`;

  const [overview, setOverview] = useState<MobileAppOverview | null>(null);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState<string | null>(null);

  const [archiving, setArchiving] = useState(false);

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

  async function handleUpdate(payload: CreateMobileApplicationInput) {
    await updateMobileApp(workspaceId, mobileAppId, payload);

    await load();

    router.refresh();
  }

  async function handleArchive() {
    if (!overview) {
      return;
    }

    const confirmed = window.confirm(`Archive "${overview.mobileApp.application.name}"?`);

    if (!confirmed) {
      return;
    }

    setArchiving(true);
    setError(null);

    try {
      await archiveMobileApp(workspaceId, mobileAppId);

      /*
       * Archived applications disappear
       * from the active list.
       */
      router.replace(listHref);

      router.refresh();
    } catch (archiveError: unknown) {
      setError(getErrorMessage(archiveError));

      setArchiving(false);
    }
  }

  if (loading) {
    return (
      <main className='mx-auto w-full max-w-7xl space-y-5 p-4 pt-8 sm:p-6 sm:pt-10 lg:p-8'>
        <div className='h-28 animate-pulse rounded-2xl bg-slate-100' />

        <div className='h-12 animate-pulse rounded-xl bg-slate-100' />

        <div className='grid gap-4 md:grid-cols-3'>
          {Array.from({
            length: 6,
          }).map((_, index) => (
            <div key={index} className='h-24 animate-pulse rounded-2xl bg-slate-100' />
          ))}
        </div>
      </main>
    );
  }

  if (error && !overview) {
    return (
      <main className='mx-auto w-full max-w-7xl p-8'>
        <div role='alert' className='rounded-2xl border border-red-200 bg-red-50 p-6'>
          <h1 className='font-semibold text-red-800'>Unable to load mobile application</h1>

          <p className='mt-2 text-sm text-red-700'>{error}</p>

          <button type='button' onClick={() => void load()} className='mt-4 text-sm font-semibold text-red-700'>
            Try again
          </button>
        </div>
      </main>
    );
  }

  if (!overview) {
    return null;
  }

  const mobileApp = overview.mobileApp;

  const repository = overview.repository;

  const archived = Boolean(mobileApp.application.archivedAt);

  return (
    <main className='mx-auto w-full max-w-7xl space-y-6 p-4 pt-8 sm:p-6 sm:pt-10 lg:p-8'>
      <header>
        <Link href={listHref} className='inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-900'>
          <ArrowLeft className='size-4' />
          Mobile Apps
        </Link>

        <div className='mt-5 flex flex-col gap-5 md:flex-row md:items-start md:justify-between'>
          <div className='flex items-start gap-4'>
            <div className='flex size-12 shrink-0 items-center justify-center rounded-2xl bg-brand-50 text-brand-600'>
              <Smartphone className='size-6' />
            </div>

            <div>
              <div className='flex flex-wrap items-center gap-2'>
                <h1 className='text-2xl font-bold tracking-tight text-slate-950'>{mobileApp.application.name}</h1>

                {archived ? <span className='rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600'>Archived</span> : null}
              </div>

              <p className='mt-1 text-sm text-slate-500'>
                {MOBILE_PLATFORM_LABELS[mobileApp.platform]}

                {' • '}

                {MOBILE_FRAMEWORK_LABELS[mobileApp.framework]}
              </p>
            </div>
          </div>

          {!archived ? (
            <button
              type='button'
              disabled={archiving}
              onClick={() => void handleArchive()}
              className='inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-red-200 bg-white px-4 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50'
            >
              <Archive className='size-4' />

              {archiving ? 'Archiving...' : 'Archive'}
            </button>
          ) : null}
        </div>
      </header>

      <MobileAppSubNav workspaceId={workspaceId} mobileAppId={mobileAppId} />

      {archived ? (
        <div className='rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800'>
          This mobile application is archived. Historical information remains available, but configuration is read-only.
        </div>
      ) : null}

      {error ? (
        <div role='alert' className='rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700'>
          {error}
        </div>
      ) : null}

      <section>
        <h2 className='text-lg font-semibold text-slate-950'>Overview</h2>

        <div className='mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4'>
          <OverviewItem label='Platform' value={MOBILE_PLATFORM_LABELS[mobileApp.platform]} />

          <OverviewItem label='Framework' value={MOBILE_FRAMEWORK_LABELS[mobileApp.framework]} />

          <OverviewItem label='Version' value={mobileApp.currentVersion ?? 'Not set'} />

          <OverviewItem label='Build' value={mobileApp.currentBuildNumber ?? 'Not set'} />

          <OverviewItem label='Package / Bundle ID' value={getPrimaryIdentifier(mobileApp)} />

          <OverviewItem label='Minimum OS' value={mobileApp.minOsVersion ?? 'Not set'} />

          <OverviewItem label='Target OS' value={mobileApp.targetOsVersion ?? 'Not set'} />

          <OverviewItem label='Repository' value={repository?.fullName ?? 'Not connected'} />

          <OverviewItem label='Default branch' value={repository?.defaultBranch ?? '—'} />
        </div>
      </section>

      <section className='rounded-2xl border border-slate-200 bg-white p-5 shadow-sm'>
        <div className='flex items-center gap-3'>
          <GitBranch className='size-5 text-slate-500' />

          <div>
            <h2 className='font-semibold text-slate-950'>Source Repository</h2>

            <p className='text-sm text-slate-500'>Repository currently associated with this mobile application.</p>
          </div>
        </div>

        {repository ? (
          <div className='mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4'>
            <OverviewItem label='Repository' value={repository.fullName} />

            <OverviewItem label='Branch' value={repository.defaultBranch} />

            <OverviewItem label='Availability' value={repository.isAvailable ? 'Available' : 'Unavailable'} />

            <OverviewItem label='Repository status' value={repository.archived ? 'Archived' : 'Active'} />
          </div>
        ) : (
          <div className='mt-5 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center'>
            <p className='font-medium text-slate-800'>No repository connected</p>

            <p className='mt-1 text-sm text-slate-500'>Connect a GitHub repository to enable Code Explorer and project analysis.</p>
          </div>
        )}
      </section>

      {!archived ? (
        <>
          <MobileRepositoryPanel
            workspaceId={workspaceId}
            mobileApp={mobileApp}
            onRepositoryChanged={() => {
              void load();
            }}
          />

          <MobileProjectDetectionPanel
            workspaceId={workspaceId}
            mobileApp={mobileApp}
            onApplied={() => {
              void load();
            }}
          />

          <section id='settings' className='scroll-mt-8'>
            <div className='mb-4'>
              <h2 className='text-lg font-semibold text-slate-950'>Settings</h2>

              <p className='mt-1 text-sm text-slate-500'>Update mobile application metadata.</p>
            </div>

            <MobileAppForm mobileApp={mobileApp} cancelHref={listHref} submitLabel='Save Changes' onSubmit={handleUpdate} />
          </section>
        </>
      ) : null}
    </main>
  );
}

function OverviewItem({
  label,
  value,
}: {
  label: string;

  value: string;
}) {
  return (
    <div className='rounded-2xl border border-slate-200 bg-white p-4 shadow-sm'>
      <p className='text-xs font-medium uppercase tracking-wide text-slate-400'>{label}</p>

      <p className='mt-2 break-all text-sm font-semibold text-slate-800'>{value}</p>
    </div>
  );
}
