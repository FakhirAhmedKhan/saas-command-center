'use client';

import { getDesktopPerformance } from './desktop-apps-api';
import { getErrorMessage } from '@/features/lib/api/api-error';
import type {
  DesktopPerformanceResponse,
  DesktopRuntimeFilters,
} from '@command-center/shared-types';
import { Loader2, RefreshCw } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

interface Props {
  workspaceId: string;
  desktopAppId: string;
}

export function DesktopPerformance({ workspaceId, desktopAppId }: Props) {
  const [data, setData] = useState<DesktopPerformanceResponse | null>(null);
  const [version, setVersion] = useState('');
  const [platform, setPlatform] = useState('');
  const [architecture, setArchitecture] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    const filters: DesktopRuntimeFilters = {
      ...(version ? { version } : {}),
      ...(platform
        ? { platform: platform as DesktopRuntimeFilters['platform'] }
        : {}),
      ...(architecture
        ? {
            architecture:
              architecture as DesktopRuntimeFilters['architecture'],
          }
        : {}),
    };

    try {
      setData(await getDesktopPerformance(workspaceId, desktopAppId, filters));
    } catch (loadError: unknown) {
      setError(getErrorMessage(loadError));
    } finally {
      setLoading(false);
    }
  }, [workspaceId, desktopAppId, version, platform, architecture]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <section className='space-y-5'>
      <div className='rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6'>
        <div className='flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between'>
          <div>
            <h2 className='text-lg font-semibold text-slate-950'>
              Runtime Performance
            </h2>
            <p className='mt-1 text-sm text-slate-500'>
              Normalized runtime health by version, platform and architecture.
            </p>
          </div>

          <div className='grid gap-2 sm:grid-cols-3'>
            <input
              aria-label='Performance version filter'
              value={version}
              onChange={(event) => setVersion(event.target.value)}
              placeholder='Version'
              className='h-9 rounded-lg border border-slate-300 px-3 text-sm'
            />
            <select
              aria-label='Performance platform filter'
              value={platform}
              onChange={(event) => setPlatform(event.target.value)}
              className='h-9 rounded-lg border border-slate-300 px-3 text-sm'
            >
              <option value=''>All platforms</option>
              <option value='WINDOWS'>Windows</option>
              <option value='MACOS'>macOS</option>
              <option value='LINUX'>Linux</option>
              <option value='CROSS_PLATFORM'>Cross-platform</option>
            </select>
            <select
              aria-label='Performance architecture filter'
              value={architecture}
              onChange={(event) => setArchitecture(event.target.value)}
              className='h-9 rounded-lg border border-slate-300 px-3 text-sm'
            >
              <option value=''>All architectures</option>
              <option value='X64'>x64</option>
              <option value='ARM64'>ARM64</option>
              <option value='X86'>x86</option>
              <option value='UNIVERSAL'>Universal</option>
            </select>
          </div>
        </div>

        {error ? (
          <div role='alert' className='mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700'>
            {error}
            <button
              type='button'
              onClick={() => void load()}
              className='ml-3 font-semibold underline'
            >
              Retry
            </button>
          </div>
        ) : null}

        {loading ? (
          <div className='mt-6 flex items-center gap-2 text-sm text-slate-500'>
            <Loader2 className='size-4 animate-spin' /> Loading performance...
          </div>
        ) : data && data.summary.sampleCount > 0 ? (
          <div className='mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4'>
            <MetricCard
              label='Crash-free users'
              value={formatPercent(data.summary.crashFreeUsersPercent)}
            />
            <MetricCard
              label='Startup'
              value={formatMs(data.summary.startupMs)}
            />
            <MetricCard
              label='Memory'
              value={formatNumber(data.summary.memoryMb, ' MB')}
            />
            <MetricCard
              label='CPU'
              value={formatPercent(data.summary.cpuPercent)}
            />
            <MetricCard
              label='Hang rate'
              value={formatPercent(data.summary.hangRatePercent)}
            />
            <MetricCard
              label='Network latency'
              value={formatMs(data.summary.networkLatencyMs)}
            />
            <MetricCard
              label='API failure rate'
              value={formatPercent(data.summary.apiFailureRatePercent)}
            />
            <MetricCard
              label='Version adoption'
              value={formatPercent(data.summary.versionAdoptionPercent)}
            />
          </div>
        ) : !loading && !error ? (
          <div className='mt-6 rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500'>
            No performance metrics match the current filters.
          </div>
        ) : null}
      </div>
    </section>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className='rounded-xl bg-slate-50 p-4'>
      <p className='text-xs font-medium uppercase tracking-wide text-slate-400'>
        {label}
      </p>
      <p className='mt-1 text-xl font-bold text-slate-950'>{value}</p>
    </div>
  );
}

function formatPercent(value: number | null): string {
  return value === null ? 'No data' : `${value.toFixed(1)}%`;
}

function formatMs(value: number | null): string {
  if (value === null) return 'No data';
  return value >= 1000 ? `${(value / 1000).toFixed(2)}s` : `${Math.round(value)}ms`;
}

function formatNumber(value: number | null, suffix: string): string {
  return value === null ? 'No data' : `${value.toFixed(1)}${suffix}`;
}