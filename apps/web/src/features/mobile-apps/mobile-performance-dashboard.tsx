'use client';

import { compareMobilePerformance, getMobilePerformanceIssues, getMobilePerformanceSummary, getMobilePerformanceVersions } from './mobile-apps-api';
import { getErrorMessage } from '@/features/lib/api/api-error';
import type { MobilePerformanceComparison, MobilePerformanceFilters, MobilePerformanceProblem, MobilePerformanceSummary, MobilePerformanceVersionSummary } from '@command-center/shared-types';
import { AlertTriangle, Gauge, RefreshCw } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

type Section = 'OVERVIEW' | 'VERSIONS' | 'PROBLEMS' | 'COMPARISON';

interface Props {
  workspaceId: string;
  mobileAppId: string;
}

export function MobilePerformanceDashboard({ workspaceId, mobileAppId }: Props) {
  const [section, setSection] = useState<Section>('OVERVIEW');
  const [filters, setFilters] = useState<MobilePerformanceFilters>({});
  const [summary, setSummary] = useState<MobilePerformanceSummary | null>(null);
  const [versions, setVersions] = useState<MobilePerformanceVersionSummary[]>([]);
  const [problems, setProblems] = useState<MobilePerformanceProblem[]>([]);
  const [comparison, setComparison] = useState<MobilePerformanceComparison | null>(null);
  const [fromVersion, setFromVersion] = useState('');
  const [toVersion, setToVersion] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [nextSummary, nextVersions, nextProblems] = await Promise.all([
        getMobilePerformanceSummary(workspaceId, mobileAppId, filters),

        getMobilePerformanceVersions(workspaceId, mobileAppId, filters),

        getMobilePerformanceIssues(workspaceId, mobileAppId, filters),
      ]);

      setSummary(nextSummary);

      setVersions(nextVersions);

      setProblems(nextProblems);
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

  async function compare() {
    if (!fromVersion || !toVersion) {
      setError('Select two versions.');

      return;
    }

    try {
      setComparison(await compareMobilePerformance(workspaceId, mobileAppId, fromVersion, toVersion));
    } catch (compareError) {
      setError(getErrorMessage(compareError));
    }
  }

  if (loading) {
    return <div className='h-96 animate-pulse rounded-2xl bg-slate-100' />;
  }

  if (error && !summary) {
    return (
      <div role='alert' className='rounded-xl border border-red-200 bg-red-50 p-5'>
        <p className='text-sm text-red-700'>{error}</p>

        <button type='button' onClick={() => void load()} className='mt-3 inline-flex items-center gap-2 text-sm font-semibold text-red-700'>
          <RefreshCw className='size-4' />
          Retry
        </button>
      </div>
    );
  }

  if (summary && !summary.providerAvailable && !summary.hasData) {
    return (
      <div className='rounded-2xl border border-dashed border-slate-300 p-10 text-center'>
        <Gauge className='mx-auto size-8 text-slate-400' />

        <h2 className='mt-3 font-semibold'>Performance provider unavailable</h2>

        <p className='mt-2 text-sm text-slate-500'>Connect a telemetry provider from mobile app settings.</p>
      </div>
    );
  }

  if (summary && !summary.hasData) {
    return <div className='rounded-2xl border border-dashed border-slate-300 p-10 text-center'>No performance data for this selection.</div>;
  }

  return (
    <div className='space-y-6'>
      <div className='grid gap-3 md:grid-cols-4'>
        <input
          aria-label='Performance version'
          placeholder='Version'
          value={filters.version ?? ''}
          onChange={(event) =>
            setFilters((current) => ({
              ...current,
              version: event.target.value || undefined,
            }))
          }
          className='h-10 rounded-lg border px-3'
        />

        <input
          aria-label='Performance build'
          placeholder='Build'
          value={filters.buildNumber ?? ''}
          onChange={(event) =>
            setFilters((current) => ({
              ...current,

              buildNumber: event.target.value || undefined,
            }))
          }
          className='h-10 rounded-lg border px-3'
        />

        <input
          aria-label='Performance from'
          type='datetime-local'
          onChange={(event) =>
            setFilters((current) => ({
              ...current,

              from: event.target.value ? new Date(event.target.value).toISOString() : undefined,
            }))
          }
          className='h-10 rounded-lg border px-3'
        />

        <input
          aria-label='Performance to'
          type='datetime-local'
          onChange={(event) =>
            setFilters((current) => ({
              ...current,

              to: event.target.value ? new Date(event.target.value).toISOString() : undefined,
            }))
          }
          className='h-10 rounded-lg border px-3'
        />
      </div>

      <div className='flex gap-2 overflow-x-auto border-b'>
        {(['OVERVIEW', 'VERSIONS', 'PROBLEMS', 'COMPARISON'] as Section[]).map((item) => (
          <button
            key={item}
            type='button'
            onClick={() => setSection(item)}
            className={section === item ? 'border-b-2 border-brand-600 px-3 py-3 text-sm font-semibold text-brand-700' : 'px-3 py-3 text-sm text-slate-500'}
          >
            {item.charAt(0) + item.slice(1).toLowerCase()}
          </button>
        ))}
      </div>

      {section === 'OVERVIEW' && summary ? (
        <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-3'>
          <MetricCard label='Crash-free' metric={summary.metrics.CRASH_FREE_USERS_RATE} />

          <MetricCard label='Crashes' metric={summary.metrics.CRASH_COUNT} />

          <MetricCard label='ANRs' metric={summary.metrics.ANR_COUNT} />

          <MetricCard label='Hangs' metric={summary.metrics.HANG_COUNT} />

          <MetricCard label='Cold startup' metric={summary.metrics.COLD_STARTUP_MS} />

          <MetricCard label='Memory' metric={summary.metrics.MEMORY_MB} />

          <MetricCard label='Network' metric={summary.metrics.NETWORK_LATENCY_MS} />

          <MetricCard label='API failures' metric={summary.metrics.API_FAILURE_RATE} />
        </div>
      ) : null}

      {section === 'VERSIONS' ? (
        <div className='space-y-3'>
          {versions.map((version) => (
            <div key={`${version.platform}:${version.version}`} className='grid gap-3 rounded-xl border p-4 md:grid-cols-6'>
              <strong>{version.version}</strong>

              <span>Crash-free: {value(version.crashFreeUsersRate, '%')}</span>

              <span>Startup: {value(version.coldStartupMs, 'ms')}</span>

              <span>Memory: {value(version.memoryMb, 'MB')}</span>

              <span>Network: {value(version.networkLatencyMs, 'ms')}</span>

              <span>Adoption: {value(version.adoptionRate, '%')}</span>
            </div>
          ))}
        </div>
      ) : null}

      {section === 'PROBLEMS' ? (
        <div className='space-y-3'>
          {problems.length === 0 ? (
            <div className='rounded-xl border border-dashed p-8 text-center'>No performance problems detected.</div>
          ) : (
            problems.map((problem) => (
              <div key={problem.id} className='flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4'>
                <AlertTriangle className='size-5 text-amber-600' />

                <div>
                  <strong>{problem.title}</strong>

                  <p className='mt-1 text-sm'>{problem.description}</p>
                </div>
              </div>
            ))
          )}
        </div>
      ) : null}

      {section === 'COMPARISON' ? (
        <div className='space-y-4'>
          <div className='grid gap-3 md:grid-cols-3'>
            <select aria-label='Compare from version' value={fromVersion} onChange={(event) => setFromVersion(event.target.value)} className='h-10 rounded-lg border px-3'>
              <option value=''>From version</option>

              {versions.map((item) => (
                <option key={`from-${item.version}`} value={item.version}>
                  {item.version}
                </option>
              ))}
            </select>

            <select aria-label='Compare to version' value={toVersion} onChange={(event) => setToVersion(event.target.value)} className='h-10 rounded-lg border px-3'>
              <option value=''>To version</option>

              {versions.map((item) => (
                <option key={`to-${item.version}`} value={item.version}>
                  {item.version}
                </option>
              ))}
            </select>

            <button type='button' onClick={() => void compare()} className='h-10 rounded-lg bg-brand-600 px-4 font-semibold text-white'>
              Compare Versions
            </button>
          </div>

          {comparison ? (
            <div className='space-y-2'>
              {comparison.metrics.map((metric) => (
                <div key={metric.metric} className='grid grid-cols-4 gap-3 rounded-xl border p-3 text-sm'>
                  <strong>{metric.metric}</strong>

                  <span>{metric.before ?? 'â€”'}</span>

                  <span>{metric.after ?? 'â€”'}</span>

                  <span>
                    {metric.direction}
                    {metric.percentDelta !== null ? ` (${metric.percentDelta}%)` : ''}
                  </span>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function MetricCard({
  label,
  metric,
}: {
  label: string;

  metric: {
    value: number | null;

    unit: string;
  };
}) {
  return (
    <div className='rounded-2xl border bg-white p-5'>
      <p className='text-xs uppercase text-slate-400'>{label}</p>

      <p className='mt-2 text-2xl font-bold'>
        {metric.value ?? 'â€”'}
        {metric.value !== null ? metric.unit : ''}
      </p>
    </div>
  );
}

function value(number: number | null, unit: string) {
  return number === null ? 'â€”' : `${number}${unit}`;
}
