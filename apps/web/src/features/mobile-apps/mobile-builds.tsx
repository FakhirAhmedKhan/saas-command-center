'use client';

import { listMobileBuilds } from './mobile-apps-api';
import { formatDuration, MOBILE_BUILD_STATUS_LABELS, shortSha } from './mobile-build-utils';
import { getErrorMessage } from '@/features/lib/api/api-error';
import type { MobileBuild, MobileBuildFilters, MobileBuildStatus, MobilePlatform } from '@command-center/shared-types';
import { GitCommit, GitBranch, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';

interface Props {
  workspaceId: string;
  mobileAppId: string;
}

export function MobileBuilds({ workspaceId, mobileAppId }: Props) {
  const [builds, setBuilds] = useState<MobileBuild[]>([]);
  const [filters, setFilters] = useState<MobileBuildFilters>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      setBuilds(await listMobileBuilds(workspaceId, mobileAppId, filters));
    } catch (loadError) {
      setError(getErrorMessage(loadError));
    } finally {
      setLoading(false);
    }
  }, [workspaceId, mobileAppId, filters]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  return (
    <div className='space-y-5'>
      <div className='grid gap-3 md:grid-cols-4'>
        <select
          aria-label='Build status'
          value={filters.status ?? ''}
          onChange={(event) =>
            setFilters((current) => ({
              ...current,

              status: event.target.value ? (event.target.value as MobileBuildStatus) : undefined,
            }))
          }
          className='h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm'
        >
          <option value=''>All statuses</option>

          {Object.entries(MOBILE_BUILD_STATUS_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>

        <input
          aria-label='Build branch'
          placeholder='Branch'
          value={filters.branch ?? ''}
          onChange={(event) =>
            setFilters((current) => ({
              ...current,

              branch: event.target.value || undefined,
            }))
          }
          className='h-10 rounded-lg border border-slate-300 px-3 text-sm'
        />

        <input
          aria-label='Build version'
          placeholder='Version'
          value={filters.version ?? ''}
          onChange={(event) =>
            setFilters((current) => ({
              ...current,

              version: event.target.value || undefined,
            }))
          }
          className='h-10 rounded-lg border border-slate-300 px-3 text-sm'
        />

        <select
          aria-label='Build platform'
          value={filters.platform ?? ''}
          onChange={(event) =>
            setFilters((current) => ({
              ...current,

              platform: event.target.value ? (event.target.value as MobilePlatform) : undefined,
            }))
          }
          className='h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm'
        >
          <option value=''>All platforms</option>

          <option value='ANDROID'>Android</option>

          <option value='IOS'>iOS</option>

          <option value='CROSS_PLATFORM'>Cross-platform</option>
        </select>
      </div>

      {loading ? (
        <div className='space-y-3'>
          {[1, 2, 3].map((item) => (
            <div key={item} className='h-32 animate-pulse rounded-2xl bg-slate-100' />
          ))}
        </div>
      ) : null}

      {!loading && error ? (
        <div role='alert' className='rounded-xl border border-red-200 bg-red-50 p-4'>
          <p className='text-sm text-red-700'>{error}</p>

          <button type='button' onClick={() => void load()} className='mt-3 inline-flex items-center gap-2 text-sm font-semibold text-red-700'>
            <RefreshCw className='size-4' />
            Retry
          </button>
        </div>
      ) : null}

      {!loading && !error && builds.length === 0 ? (
        <div className='rounded-2xl border border-dashed border-slate-300 p-10 text-center'>
          <p className='font-semibold text-slate-800'>No mobile builds</p>

          <p className='mt-2 text-sm text-slate-500'>Builds will appear after CI/CD workflow ingestion.</p>
        </div>
      ) : null}

      {!loading && !error ? (
        <div className='space-y-3'>
          {builds.map((build) => (
            <Link
              key={build.id}
              href={`/workspaces/${workspaceId}` + `/mobile-apps/${mobileAppId}` + `/builds/${build.id}`}
              className='block rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-slate-300 hover:shadow-md'
            >
              <div className='flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between'>
                <div>
                  <div className='flex flex-wrap items-center gap-2'>
                    <h3 className='font-semibold text-slate-950'>Build #{build.buildNumber ?? build.workflowRunId}</h3>

                    <BuildStatus status={build.status} />
                  </div>

                  <p className='mt-1 text-sm text-slate-500'>Version {build.version ?? 'â€”'}</p>
                </div>

                <div className='grid grid-cols-2 gap-x-8 gap-y-2 text-sm md:grid-cols-3'>
                  <span className='inline-flex items-center gap-1.5 text-slate-600'>
                    <GitBranch className='size-4' />
                    {build.branch}
                  </span>

                  <span className='inline-flex items-center gap-1.5 font-mono text-slate-600'>
                    <GitCommit className='size-4' />
                    {shortSha(build.commitSha)}
                  </span>

                  <span className='text-slate-600'>{formatDuration(build.durationMs)}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function BuildStatus({ status }: { status: MobileBuildStatus }) {
  const classes: Record<MobileBuildStatus, string> = {
    QUEUED: 'bg-slate-100 text-slate-700',

    BUILDING: 'bg-blue-50 text-blue-700',

    SUCCESS: 'bg-emerald-50 text-emerald-700',

    FAILED: 'bg-red-50 text-red-700',

    CANCELLED: 'bg-amber-50 text-amber-700',
  };

  return <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${classes[status]}`}>{MOBILE_BUILD_STATUS_LABELS[status]}</span>;
}
