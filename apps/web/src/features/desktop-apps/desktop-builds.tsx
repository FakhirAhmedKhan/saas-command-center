'use client';

import { listDesktopBuilds } from './desktop-apps-api';
import { DESKTOP_BUILD_STATUS_LABELS, formatDuration, shortSha } from './desktop-build-utils';
import { getErrorMessage } from '@/features/lib/api/api-error';
import type { DesktopArchitecture, DesktopBuild, DesktopBuildStatus, DesktopPlatform } from '@command-center/shared-types';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';

interface Props {
  workspaceId: string;
  desktopAppId: string;
}

export function BuildStatus({ status }: { status: DesktopBuildStatus }) {
  return <span className='rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700'>{DESKTOP_BUILD_STATUS_LABELS[status]}</span>;
}

export function DesktopBuilds({ workspaceId, desktopAppId }: Props) {
  const [builds, setBuilds] = useState<DesktopBuild[]>([]);
  const [status, setStatus] = useState<DesktopBuildStatus | ''>('');
  const [platform, setPlatform] = useState<DesktopPlatform | ''>('');
  const [architecture, setArchitecture] = useState<DesktopArchitecture | ''>('');
  const [branch, setBranch] = useState('');
  const [version, setVersion] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(async () => {
    try {
      setBuilds(
        await listDesktopBuilds(workspaceId, desktopAppId, {
          status: status || undefined,
          platform: platform || undefined,
          architecture: architecture || undefined,
          branch: branch.trim() || undefined,
          version: version.trim() || undefined,
        }),
      );
    } catch (caught: unknown) {
      setError(getErrorMessage(caught));
    } finally {
      setLoading(false);
    }
  }, [architecture, branch, desktopAppId, platform, status, version, workspaceId]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void load();
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [load]);

  return (
    <section className='space-y-4'>
      <div className='grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 md:grid-cols-5'>
        <label className='text-xs font-semibold text-slate-500'>
          Status
          <select
            aria-label='Build status filter'
            value={status}
            onChange={(event) => setStatus(event.target.value as DesktopBuildStatus | '')}
            className='mt-1 h-9 w-full rounded-lg border border-slate-300 bg-white px-2 text-sm'
          >
            <option value=''>All</option>
            {Object.keys(DESKTOP_BUILD_STATUS_LABELS).map((value) => (
              <option key={value} value={value}>
                {DESKTOP_BUILD_STATUS_LABELS[value as DesktopBuildStatus]}
              </option>
            ))}
          </select>
        </label>

        <label className='text-xs font-semibold text-slate-500'>
          Platform
          <select
            aria-label='Build platform filter'
            value={platform}
            onChange={(event) => setPlatform(event.target.value as DesktopPlatform | '')}
            className='mt-1 h-9 w-full rounded-lg border border-slate-300 bg-white px-2 text-sm'
          >
            <option value=''>All</option>
            <option value='WINDOWS'>Windows</option>
            <option value='MACOS'>macOS</option>
            <option value='LINUX'>Linux</option>
            <option value='CROSS_PLATFORM'>Cross-platform</option>
          </select>
        </label>

        <label className='text-xs font-semibold text-slate-500'>
          Architecture
          <select
            aria-label='Build architecture filter'
            value={architecture}
            onChange={(event) => setArchitecture(event.target.value as DesktopArchitecture | '')}
            className='mt-1 h-9 w-full rounded-lg border border-slate-300 bg-white px-2 text-sm'
          >
            <option value=''>All</option>
            <option value='X64'>x64</option>
            <option value='ARM64'>ARM64</option>
            <option value='X86'>x86</option>
            <option value='UNIVERSAL'>Universal</option>
          </select>
        </label>

        <label className='text-xs font-semibold text-slate-500'>
          Branch
          <input aria-label='Build branch filter' value={branch} onChange={(event) => setBranch(event.target.value)} className='mt-1 h-9 w-full rounded-lg border border-slate-300 px-2 text-sm' />
        </label>

        <label className='text-xs font-semibold text-slate-500'>
          Version
          <input aria-label='Build version filter' value={version} onChange={(event) => setVersion(event.target.value)} className='mt-1 h-9 w-full rounded-lg border border-slate-300 px-2 text-sm' />
        </label>
      </div>

      {error ? (
        <div role='alert' className='rounded-xl bg-red-50 p-4 text-sm text-red-700'>
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className='rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500'>Loading builds...</div>
      ) : builds.length === 0 ? (
        <div className='rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500'>No desktop builds match the current filters.</div>
      ) : (
        <div className='overflow-hidden rounded-2xl border border-slate-200 bg-white'>
          <div className='overflow-x-auto'>
            <table className='min-w-full text-left text-sm'>
              <thead className='bg-slate-50 text-xs uppercase tracking-wide text-slate-500'>
                <tr>
                  <th className='px-4 py-3'>Status</th>
                  <th className='px-4 py-3'>Platform</th>
                  <th className='px-4 py-3'>Architecture</th>
                  <th className='px-4 py-3'>Branch</th>
                  <th className='px-4 py-3'>Commit</th>
                  <th className='px-4 py-3'>Version</th>
                  <th className='px-4 py-3'>Duration</th>
                </tr>
              </thead>
              <tbody className='divide-y divide-slate-100'>
                {builds.map((build) => (
                  <tr key={build.id}>
                    <td className='px-4 py-3'>
                      <BuildStatus status={build.status} />
                    </td>
                    <td className='px-4 py-3'>{build.platform}</td>
                    <td className='px-4 py-3'>{build.architecture}</td>
                    <td className='px-4 py-3'>{build.branch}</td>
                    <td className='px-4 py-3 font-mono'>{shortSha(build.commitSha)}</td>
                    <td className='px-4 py-3'>
                      <Link href={`/workspaces/${workspaceId}/desktop-apps/${desktopAppId}/builds/${build.id}`} className='font-semibold text-brand-600'>
                        {build.version ?? 'Build details'}
                      </Link>
                    </td>
                    <td className='px-4 py-3'>{formatDuration(build.durationMs)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
}
