'use client';

import { DesktopAnalysisPanel } from '@/features/desktop-apps/desktop-analysis-panel';
import { DesktopAppForm } from '@/features/desktop-apps/desktop-app-form';
import { DESKTOP_ARCHITECTURE_LABELS, DESKTOP_FRAMEWORK_LABELS, DESKTOP_PLATFORM_LABELS } from '@/features/desktop-apps/desktop-app.constants';
import { archiveDesktopApp, getDesktopApp, getDesktopAppOverview, updateDesktopApp } from '@/features/desktop-apps/desktop-apps-api';
import { DesktopOverview } from '@/features/desktop-apps/desktop-overview';
import { DesktopProjectDetectionPanel } from '@/features/desktop-apps/desktop-project-detection-panel';
import { DesktopRepositoryPanel } from '@/features/desktop-apps/desktop-repository-panel';
import { getErrorMessage } from '@/features/lib/api/api-error';
import type { CreateDesktopApplicationInput, DesktopApplicationDetails, DesktopAppOverview } from '@command-center/shared-types';
import { Archive } from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

export default function DesktopAppDetailsPage() {
  const params = useParams<{
    workspaceId: string;
    desktopAppId: string;
  }>();
  const router = useRouter();
  const workspaceId = params.workspaceId;
  const desktopAppId = params.desktopAppId;
  const listHref = `/workspaces/${workspaceId}/desktop-apps`;
  const [desktopApp, setDesktopApp] = useState<DesktopApplicationDetails | null>(null);
  const [overview, setOverview] = useState<DesktopAppOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [archiving, setArchiving] = useState(false);
  const load = useCallback(async (): Promise<void> => {
    try {
      const [detailsResponse, overviewResponse] = await Promise.all([getDesktopApp(workspaceId, desktopAppId), getDesktopAppOverview(workspaceId, desktopAppId)]);

      setDesktopApp(detailsResponse);
      setOverview(overviewResponse);
    } catch (loadError: unknown) {
      setError(getErrorMessage(loadError));
    } finally {
      setLoading(false);
    }
  }, [workspaceId, desktopAppId]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void load();
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [load]);

  async function handleUpdate(payload: CreateDesktopApplicationInput): Promise<void> {
    const updated = await updateDesktopApp(workspaceId, desktopAppId, payload);

    setDesktopApp(updated);

    const overviewResponse = await getDesktopAppOverview(workspaceId, desktopAppId);

    setOverview(overviewResponse);

    router.refresh();
  }

  async function handleArchive(): Promise<void> {
    if (!desktopApp) {
      return;
    }

    const confirmed = window.confirm(`Archive "${desktopApp.application.name}"?`);

    if (!confirmed) {
      return;
    }

    setArchiving(true);
    setError(null);

    try {
      await archiveDesktopApp(workspaceId, desktopAppId);

      router.replace(listHref);

      router.refresh();
    } catch (archiveError: unknown) {
      setError(getErrorMessage(archiveError));

      setArchiving(false);
    }
  }

  if (loading) {
    return (
      <div aria-label='Loading desktop application' className='space-y-5'>
        <div className='h-40 animate-pulse rounded-2xl border border-slate-200 bg-slate-100' />

        <div className='h-80 animate-pulse rounded-2xl border border-slate-200 bg-slate-100' />
      </div>
    );
  }

  if (!desktopApp) {
    return (
      <div role='alert' className='rounded-2xl border border-red-200 bg-red-50 p-6'>
        <h1 className='font-semibold text-red-800'>Unable to load desktop application</h1>

        <p className='mt-2 text-sm text-red-700'>{error ?? 'Desktop application not found.'}</p>

        <Link href={listHref} className='mt-4 inline-flex text-sm font-semibold text-red-700 underline'>
          Return to Desktop Apps
        </Link>
      </div>
    );
  }

  return (
    <div className='space-y-6'>
      <div className='flex justify-end'>
        <button
          type='button'
          disabled={archiving}
          onClick={() => void handleArchive()}
          className='inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-lg border border-red-200 bg-white px-4 text-sm font-semibold text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60'
        >
          <Archive className='size-4' />

          {archiving ? 'Archiving...' : 'Archive'}
        </button>
      </div>

      {error ? (
        <div role='alert' className='rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700'>
          {error}
        </div>
      ) : null}

      {overview ? <DesktopOverview workspaceId={workspaceId} desktopAppId={desktopAppId} overview={overview} /> : null}

      <DesktopProjectDetectionPanel
        workspaceId={workspaceId}
        desktopApp={desktopApp}
        onApplied={(updatedDesktopApp) => {
          setDesktopApp(updatedDesktopApp);

          void getDesktopAppOverview(workspaceId, desktopAppId).then(setOverview);
        }}
      />

      <section className='rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6'>
        <div>
          <h2 className='text-lg font-semibold text-slate-950'>Application information</h2>

          <p className='mt-1 text-sm text-slate-500'>Current desktop application metadata.</p>
        </div>
        <DesktopAnalysisPanel workspaceId={workspaceId} desktopAppId={desktopAppId} />

        <dl className='mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3'>
          <OverviewItem label='Platform' value={DESKTOP_PLATFORM_LABELS[desktopApp.platform]} />

          <OverviewItem label='Framework' value={DESKTOP_FRAMEWORK_LABELS[desktopApp.framework]} />

          <OverviewItem label='Architecture' value={DESKTOP_ARCHITECTURE_LABELS[desktopApp.architecture]} />

          <OverviewItem label='Version' value={desktopApp.currentVersion ?? 'Not set'} />

          <OverviewItem label='Build' value={desktopApp.currentBuildNumber ?? 'Not set'} />

          <OverviewItem label='Update channel' value={desktopApp.updateChannel ?? 'Not set'} />

          <OverviewItem label='Minimum OS' value={desktopApp.minimumOsVersion ?? 'Not set'} />

          <OverviewItem label='Package' value={desktopApp.packageName ?? 'Not set'} />
        </dl>
      </section>

      <section id='edit' className='scroll-mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6'>
        <div className='mb-6'>
          <h2 className='text-lg font-semibold text-slate-950'>Edit Desktop App</h2>

          <p className='mt-1 text-sm text-slate-500'>Update desktop application metadata.</p>
        </div>

        <DesktopAppForm desktopApp={desktopApp} cancelHref={listHref} submitLabel='Save Changes' onSubmit={handleUpdate} />
        <DesktopRepositoryPanel workspaceId={workspaceId} desktopApp={desktopApp} />
      </section>
    </div>
  );
}

function OverviewItem({ label, value }: { label: string; value: string }) {
  return (
    <div className='rounded-xl bg-slate-50 p-4'>
      <dt className='text-xs font-medium uppercase tracking-wide text-slate-400'>{label}</dt>

      <dd className='mt-1 break-words text-sm font-semibold text-slate-900'>{value}</dd>
    </div>
  );
}
