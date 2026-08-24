'use client';

import { getMobileTestsDashboard } from './mobile-apps-api';
import { formatDuration, MOBILE_TEST_TYPE_LABELS } from './mobile-build-utils';
import { getErrorMessage } from '@/features/lib/api/api-error';
import type { MobileBuildDetails } from '@command-center/shared-types';
import { AlertTriangle, CheckCircle2, RefreshCw } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

interface Props {
  workspaceId: string;
  mobileAppId: string;
}

export function MobileTests({ workspaceId, mobileAppId }: Props) {
  const [builds, setBuilds] = useState<MobileBuildDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      setBuilds(await getMobileTestsDashboard(workspaceId, mobileAppId));
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

  if (loading) {
    return (
      <div className='space-y-3'>
        {[1, 2].map((item) => (
          <div key={item} className='h-48 animate-pulse rounded-2xl bg-slate-100' />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div role='alert' className='rounded-xl border border-red-200 bg-red-50 p-4'>
        <p className='text-red-700'>{error}</p>

        <button type='button' onClick={() => void load()} className='mt-3 inline-flex items-center gap-2 text-sm font-semibold text-red-700'>
          <RefreshCw className='size-4' />
          Retry
        </button>
      </div>
    );
  }

  if (builds.length === 0) {
    return (
      <div className='rounded-2xl border border-dashed border-slate-300 p-10 text-center'>
        <p className='font-semibold text-slate-800'>No test results</p>

        <p className='mt-2 text-sm text-slate-500'>CI test results will appear after they are attached to a mobile build.</p>
      </div>
    );
  }

  return (
    <div className='space-y-5'>
      {builds.map((build) => (
        <section key={build.id} className='rounded-2xl border border-slate-200 bg-white p-5 shadow-sm'>
          <div className='flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4'>
            <div>
              <h2 className='font-semibold text-slate-950'>Build #{build.buildNumber ?? build.workflowRunId}</h2>

              <p className='mt-1 text-sm text-slate-500'>
                {build.version ?? 'No version'}
                {' â€¢ '}
                {build.branch}
              </p>
            </div>

            <div className='flex items-center gap-2'>
              {build.testSummary.hasFailures ? <AlertTriangle className='size-5 text-red-500' /> : <CheckCircle2 className='size-5 text-emerald-600' />}

              <span className='text-sm font-semibold text-slate-700'>
                {build.testSummary.passed} passed
                {' â€¢ '}
                {build.testSummary.failed} failed
              </span>
            </div>
          </div>

          <div className='mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3'>
            {build.testRuns.map((run) => (
              <div key={run.id} className='rounded-xl border border-slate-200 p-4'>
                <div className='flex justify-between gap-3'>
                  <h3 className='font-medium text-slate-900'>{MOBILE_TEST_TYPE_LABELS[run.type]}</h3>

                  <span className='text-xs text-slate-500'>{formatDuration(run.durationMs)}</span>
                </div>

                <div className='mt-3 grid grid-cols-3 gap-2 text-sm'>
                  <Metric label='Passed' value={run.passed} />

                  <Metric label='Failed' value={run.failed} />

                  <Metric label='Skipped' value={run.skipped} />
                </div>

                {run.failures.length > 0 ? (
                  <details className='mt-4'>
                    <summary className='cursor-pointer text-sm font-semibold text-red-600'>
                      View {run.failures.length} failure
                      {run.failures.length === 1 ? '' : 's'}
                    </summary>

                    <div className='mt-3 space-y-3'>
                      {run.failures.map((failure) => (
                        <div key={failure.id} className='rounded-lg bg-red-50 p-3'>
                          <p className='text-sm font-semibold text-red-800'>{failure.testName}</p>

                          {failure.suite ? <p className='mt-1 text-xs text-red-600'>{failure.suite}</p> : null}

                          {failure.message ? <p className='mt-2 text-xs text-red-700'>{failure.message}</p> : null}

                          {failure.file ? <p className='mt-2 break-all font-mono text-xs text-slate-500'>{failure.file}</p> : null}
                        </div>
                      ))}
                    </div>
                  </details>
                ) : null}
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <p className='text-xs text-slate-400'>{label}</p>

      <p className='mt-1 font-semibold text-slate-800'>{value}</p>
    </div>
  );
}
