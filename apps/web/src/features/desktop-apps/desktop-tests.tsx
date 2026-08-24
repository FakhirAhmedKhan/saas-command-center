'use client';

import { getDesktopTestSummary, listDesktopAppTests } from './desktop-apps-api';
import { DESKTOP_TEST_TYPE_LABELS, formatDuration } from './desktop-build-utils';
import { getErrorMessage } from '@/features/lib/api/api-error';
import type { DesktopTestRun, DesktopTestSummary } from '@command-center/shared-types';
import { useEffect, useState } from 'react';

interface Props {
  workspaceId: string;
  desktopAppId: string;
}

export function DesktopTests({ workspaceId, desktopAppId }: Props) {
  const [runs, setRuns] = useState<DesktopTestRun[]>([]);
  const [summary, setSummary] = useState<DesktopTestSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    void Promise.all([listDesktopAppTests(workspaceId, desktopAppId), getDesktopTestSummary(workspaceId, desktopAppId)])
      .then(([runResult, summaryResult]) => {
        if (!active) return;

        setRuns(runResult);
        setSummary(summaryResult);
      })
      .catch((caught: unknown) => {
        if (active) {
          setError(getErrorMessage(caught));
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [workspaceId, desktopAppId]);

  if (loading) {
    return <div className='rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500'>Loading test results...</div>;
  }

  if (error) {
    return (
      <div role='alert' className='rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700'>
        {error}
      </div>
    );
  }

  return (
    <div className='space-y-5'>
      {summary ? (
        <section className='grid gap-3 sm:grid-cols-3 lg:grid-cols-6'>
          {[
            ['Runs', summary.totalRuns],
            ['Passed runs', summary.passedRuns],
            ['Failed runs', summary.failedRuns],
            ['Passed tests', summary.passedTests],
            ['Failed tests', summary.failedTests],
            ['Skipped tests', summary.skippedTests],
          ].map(([label, value]) => (
            <div key={String(label)} className='rounded-xl border border-slate-200 bg-white p-4'>
              <p className='text-xs font-semibold uppercase tracking-wide text-slate-400'>{label}</p>
              <p className='mt-2 text-xl font-bold text-slate-950'>{value}</p>
            </div>
          ))}
        </section>
      ) : null}

      {runs.length === 0 ? (
        <div className='rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500'>No desktop test results have been recorded yet.</div>
      ) : (
        <div className='space-y-4'>
          {runs.map((run) => (
            <article key={run.id} className='rounded-2xl border border-slate-200 bg-white p-5'>
              <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
                <div>
                  <p className='font-semibold text-slate-950'>{DESKTOP_TEST_TYPE_LABELS[run.type]}</p>
                  <p className='mt-1 text-sm text-slate-500'>
                    {run.passed} passed · {run.failed} failed · {run.skipped} skipped · {formatDuration(run.durationMs)}
                  </p>
                </div>

                <span className='rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700'>{run.status}</span>
              </div>

              {run.failures.length > 0 ? (
                <div className='mt-4 space-y-3 border-t border-slate-100 pt-4'>
                  {run.failures.map((failure) => (
                    <div key={failure.id} className='rounded-xl bg-red-50 p-4'>
                      <p className='font-semibold text-red-900'>{failure.testName ?? failure.suite ?? 'Failed test'}</p>

                      {failure.message ? <p className='mt-1 whitespace-pre-wrap text-sm text-red-800'>{failure.message}</p> : null}

                      {failure.file ? (
                        <p className='mt-2 break-all font-mono text-xs text-red-700'>
                          {failure.file}
                          {failure.line ? `:${failure.line}` : ''}
                        </p>
                      ) : null}
                    </div>
                  ))}
                </div>
              ) : null}
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
