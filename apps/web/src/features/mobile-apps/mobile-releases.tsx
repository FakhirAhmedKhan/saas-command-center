'use client';

import { createMobileRelease, listMobileBuilds, listMobileReleases, updateMobileReleaseStatus } from './mobile-apps-api';
import { getErrorMessage } from '@/features/lib/api/api-error';
import type { MobileBuild, MobileRelease, MobileReleaseEnvironment, MobileReleaseStatus } from '@command-center/shared-types';
import { Plus, RefreshCw, Rocket } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

const ENVIRONMENTS: MobileReleaseEnvironment[] = ['DEVELOPMENT', 'QA', 'INTERNAL', 'BETA', 'PRODUCTION'];

interface Props {
  workspaceId: string;
  mobileAppId: string;
}

export function MobileReleases({ workspaceId, mobileAppId }: Props) {
  const [releases, setReleases] = useState<MobileRelease[]>([]);
  const [builds, setBuilds] = useState<MobileBuild[]>([]);
  const [buildId, setBuildId] = useState('');
  const [environment, setEnvironment] = useState<MobileReleaseEnvironment>('INTERNAL');
  const [releaseNotes, setReleaseNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [releaseData, successfulBuilds] = await Promise.all([
        listMobileReleases(workspaceId, mobileAppId),

        listMobileBuilds(workspaceId, mobileAppId, {
          status: 'SUCCESS',
        }),
      ]);

      setReleases(releaseData);

      setBuilds(successfulBuilds);
    } catch (loadError) {
      setError(getErrorMessage(loadError));
    } finally {
      setLoading(false);
    }
  }, [workspaceId, mobileAppId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  async function create() {
    if (!buildId) {
      setError('Select a successful build.');

      return;
    }

    setSaving(true);
    setError(null);

    try {
      await createMobileRelease(workspaceId, mobileAppId, {
        buildId,
        environment,

        releaseNotes: releaseNotes.trim() || null,
      });

      setBuildId('');
      setReleaseNotes('');

      await load();
    } catch (createError) {
      setError(getErrorMessage(createError));
    } finally {
      setSaving(false);
    }
  }

  async function transition(
    release: MobileRelease,

    status: MobileReleaseStatus,
  ) {
    setSaving(true);
    setError(null);

    try {
      await updateMobileReleaseStatus(workspaceId, mobileAppId, release.id, status);

      await load();
    } catch (transitionError) {
      setError(getErrorMessage(transitionError));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className='space-y-6'>
      <section className='rounded-2xl border border-slate-200 bg-white p-5 shadow-sm'>
        <div className='flex items-center gap-3'>
          <Rocket className='size-5 text-brand-600' />

          <div>
            <h2 className='font-semibold text-slate-950'>Create Release</h2>

            <p className='text-sm text-slate-500'>Create a release from a successful mobile build.</p>
          </div>
        </div>

        <div className='mt-5 grid gap-4 md:grid-cols-2'>
          <label>
            <span className='mb-2 block text-sm font-medium'>Build</span>

            <select aria-label='Release build' value={buildId} onChange={(event) => setBuildId(event.target.value)} className='h-10 w-full rounded-lg border border-slate-300 px-3'>
              <option value=''>Select successful build</option>

              {builds.map((build) => (
                <option key={build.id} value={build.id}>
                  #{build.buildNumber ?? build.workflowRunId} â€” {build.version ?? 'No version'}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span className='mb-2 block text-sm font-medium'>Environment</span>

            <select
              aria-label='Release environment'
              value={environment}
              onChange={(event) => setEnvironment(event.target.value as MobileReleaseEnvironment)}
              className='h-10 w-full rounded-lg border border-slate-300 px-3'
            >
              {ENVIRONMENTS.map((value) => (
                <option key={value} value={value}>
                  {formatEnum(value)}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label className='mt-4 block'>
          <span className='mb-2 block text-sm font-medium'>Release Notes</span>

          <textarea aria-label='Release notes' value={releaseNotes} onChange={(event) => setReleaseNotes(event.target.value)} className='min-h-28 w-full rounded-lg border border-slate-300 p-3 text-sm' />
        </label>

        <button
          type='button'
          disabled={saving || !buildId}
          onClick={() => void create()}
          className='mt-4 inline-flex h-10 items-center gap-2 rounded-lg bg-brand-600 px-4 text-sm font-semibold text-white disabled:opacity-50'
        >
          <Plus className='size-4' />
          Create Release
        </button>
      </section>

      {error ? (
        <div role='alert' className='rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700'>
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className='space-y-3'>
          {[1, 2].map((item) => (
            <div key={item} className='h-32 animate-pulse rounded-2xl bg-slate-100' />
          ))}
        </div>
      ) : null}

      {!loading && releases.length === 0 ? <div className='rounded-2xl border border-dashed border-slate-300 p-10 text-center'>No releases yet.</div> : null}

      {!loading ? (
        <div className='space-y-3'>
          {releases.map((release) => (
            <ReleaseCard key={release.id} release={release} disabled={saving} onTransition={transition} />
          ))}
        </div>
      ) : null}

      {!loading && error ? (
        <button type='button' onClick={() => void load()} className='inline-flex items-center gap-2 text-sm'>
          <RefreshCw className='size-4' />
          Retry
        </button>
      ) : null}
    </div>
  );
}

function ReleaseCard({
  release,
  disabled,
  onTransition,
}: {
  release: MobileRelease;

  disabled: boolean;

  onTransition(
    release: MobileRelease,

    status: MobileReleaseStatus,
  ): Promise<void>;
}) {
  const next = nextStatus(release.status);

  return (
    <article className='rounded-2xl border border-slate-200 bg-white p-5 shadow-sm'>
      <div className='flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between'>
        <div>
          <div className='flex flex-wrap items-center gap-2'>
            <h3 className='text-lg font-semibold text-slate-950'>{release.version}</h3>

            <span className='rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold'>{release.status}</span>
          </div>

          <p className='mt-1 text-sm text-slate-500'>
            Build {release.buildNumber}
            {' â€¢ '}
            {formatEnum(release.environment)}
          </p>

          <p className='mt-1 text-xs text-slate-400'>{release.releasedAt ? `Released ${new Date(release.releasedAt).toLocaleDateString()}` : 'Not released yet'}</p>
        </div>

        {next ? (
          <button type='button' disabled={disabled} onClick={() => void onTransition(release, next)} className='h-9 rounded-lg border border-slate-300 px-3 text-sm font-semibold'>
            {transitionLabel(next)}
          </button>
        ) : null}
      </div>

      {release.releaseNotes ? <p className='mt-4 whitespace-pre-wrap text-sm text-slate-600'>{release.releaseNotes}</p> : null}
    </article>
  );
}

function nextStatus(current: MobileReleaseStatus): MobileReleaseStatus | null {
  switch (current) {
    case 'DRAFT':
      return 'READY';

    case 'READY':
      return 'RELEASED';

    case 'RELEASED':
      return 'ROLLED_BACK';

    default:
      return null;
  }
}

function transitionLabel(status: MobileReleaseStatus) {
  switch (status) {
    case 'READY':
      return 'Mark Ready';

    case 'RELEASED':
      return 'Release';

    case 'ROLLED_BACK':
      return 'Roll Back';

    default:
      return status;
  }
}

function formatEnum(value: string) {
  return value
    .replaceAll('_', ' ')
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}
