'use client';

import { queueAnalyticsReprocessing, retryAnalyticsProcessingRun } from './analytics-processing-api';
import type { ProcessingRun } from './analytics-processing.types';
import { useAnalyticsProcessing } from './use-analytics-processing';
import { getErrorMessage } from '../applications/application-utils';
import { PageError } from '@/components/states/page-error';
import { ApiError } from 'next/dist/server/api-utils';
import { useMemo, useState } from 'react';

interface AnalyticsProcessingPanelProps {
  workspaceId: string;

  websiteId: string;
}

const numberFormatter = new Intl.NumberFormat('en-US');

function toDateInput(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function createInitialDates() {
  const to = new Date();

  const from = new Date(to);

  from.setUTCDate(from.getUTCDate() - 7);

  return {
    from: toDateInput(from),

    to: toDateInput(to),
  };
}

function formatDateTime(value: string | null): string {
  if (!value) {
    return 'â€”';
  }

  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',

    timeStyle: 'short',
  }).format(new Date(value));
}

function getStatusClasses(status: string): string {
  switch (status) {
    case 'SUCCEEDED':
      return 'bg-emerald-50 text-emerald-700';

    case 'RUNNING':
      return 'bg-blue-50 text-blue-700';

    case 'QUEUED':
      return 'bg-amber-50 text-amber-700';

    case 'DEAD_LETTERED':
      return 'bg-red-50 text-red-700';

    default:
      return 'bg-slate-100 text-slate-700';
  }
}

function RunRow({
  run,
  canRetry,
  retrying,
  onRetry,
}: {
  run: ProcessingRun;

  canRetry: boolean;

  retrying: boolean;

  onRetry: (runId: string) => void;
}) {
  return (
    <tr className='border-b border-slate-100 last:border-0'>
      <td className='px-4 py-4'>
        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${getStatusClasses(run.status)}`}>{run.status}</span>
      </td>

      <td className='px-4 py-4 text-sm text-slate-700'>{run.trigger}</td>

      <td className='px-4 py-4 text-sm text-slate-700'>
        <div>{formatDateTime(run.rangeStart)}</div>

        <div className='mt-1 text-xs text-slate-500'>to {formatDateTime(run.rangeEnd)}</div>
      </td>

      <td className='px-4 py-4 text-right text-sm'>{numberFormatter.format(run.processedEvents)}</td>

      <td className='px-4 py-4 text-right text-sm'>
        {run.retryCount}/{run.maxRetries}
      </td>

      <td className='max-w-xs px-4 py-4 text-sm text-red-700'>{run.errorMessage ?? 'â€”'}</td>

      <td className='px-4 py-4 text-right'>
        {canRetry && run.status === 'DEAD_LETTERED' ? (
          <button
            type='button'
            disabled={retrying}
            onClick={() => {
              onRetry(run.id);
            }}
            className='rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium disabled:opacity-50'
          >
            {retrying ? 'Retryingâ€¦' : 'Retry'}
          </button>
        ) : null}
      </td>
    </tr>
  );
}

export function AnalyticsProcessingPanel({ workspaceId, websiteId }: AnalyticsProcessingPanelProps) {
  const initialDates = useMemo(
    // eslint-disable-next-line react-hooks/use-memo
    createInitialDates,
    [],
  );

  const [from, setFrom] = useState(initialDates.from);

  const [to, setTo] = useState(initialDates.to);

  const [submitting, setSubmitting] = useState(false);

  const [retryingRunId, setRetryingRunId] = useState<string | null>(null);

  const [actionError, setActionError] = useState<string | null>(null);

  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const { data, loading, error, reload } = useAnalyticsProcessing(workspaceId, websiteId);

  async function reprocess(): Promise<void> {
    const confirmed = window.confirm(
      `Reprocess analytics from ${from} through ${to}? Existing analytics will remain available unless the complete rebuild succeeds.`,
    );

    if (!confirmed) {
      return;
    }

    setSubmitting(true);

    setActionError(null);

    setSuccessMessage(null);

    try {
      const rangeStart = new Date(`${from}T00:00:00.000Z`);

      const exclusiveEnd = new Date(`${to}T00:00:00.000Z`);

      exclusiveEnd.setUTCDate(exclusiveEnd.getUTCDate() + 1);

      await queueAnalyticsReprocessing(workspaceId, websiteId, {
        from: rangeStart.toISOString(),

        to: exclusiveEnd.toISOString(),
      });

      setSuccessMessage('Analytics reprocessing was queued.');

      reload();
    } catch (caughtError) {
      setActionError(getErrorMessage(caughtError));
    } finally {
      setSubmitting(false);
    }
  }

  async function retryRun(runId: string): Promise<void> {
    const confirmed = window.confirm('Retry this failed analytics processing run?');

    if (!confirmed) {
      return;
    }

    setRetryingRunId(runId);

    setActionError(null);

    try {
      await retryAnalyticsProcessingRun(workspaceId, websiteId, runId);

      setSuccessMessage('Failed processing run was queued for retry.');

      reload();
    } catch (caughtError) {
      setActionError(getErrorMessage(caughtError));
    } finally {
      setRetryingRunId(null);
    }
  }

  if (loading && !data) {
    return <div className='h-80 animate-pulse rounded-2xl bg-slate-200' aria-label='Loading processing status' />;
  }

  if (error) {
    return (
      <PageError
        title='Processing status unavailable'
        message={getErrorMessage(error)}
        requestId={error instanceof ApiError ? ('requestId' in error && typeof error.requestId === 'string' ? error.requestId : undefined) : undefined}
        onRetry={reload}
      />
    );
  }

  if (!data) {
    return null;
  }

  return (
    <main className='space-y-6'>
      <header className='rounded-2xl border border-slate-200 bg-white p-5 shadow-sm'>
        <p className='text-sm font-medium text-slate-500'>Analytics processing</p>

        <h1 className='mt-1 text-2xl font-bold text-slate-950'>Processing status</h1>

        <p className='mt-2 text-sm text-slate-600'>View processing health, queued work, retries and failed batches.</p>
      </header>

      <section className='grid gap-4 sm:grid-cols-2 xl:grid-cols-4'>
        <article className='rounded-2xl border border-slate-200 bg-white p-5 shadow-sm'>
          <p className='text-sm text-slate-500'>Pending events</p>

          <p className='mt-2 text-3xl font-bold text-slate-950'>{numberFormatter.format(data.pendingEvents)}</p>
        </article>

        <article className='rounded-2xl border border-slate-200 bg-white p-5 shadow-sm'>
          <p className='text-sm text-slate-500'>Failed batches</p>

          <p className='mt-2 text-3xl font-bold text-slate-950'>{numberFormatter.format(data.unresolvedDeadLetters)}</p>
        </article>

        <article className='rounded-2xl border border-slate-200 bg-white p-5 shadow-sm'>
          <p className='text-sm text-slate-500'>Current status</p>

          <p className='mt-2 text-xl font-bold text-slate-950'>{data.activeRun?.status ?? 'Idle'}</p>
        </article>

        <article className='rounded-2xl border border-slate-200 bg-white p-5 shadow-sm'>
          <p className='text-sm text-slate-500'>Last successful run</p>

          <p className='mt-2 text-sm font-semibold text-slate-950'>{formatDateTime(data.lastSuccessfulRun?.finishedAt ?? null)}</p>
        </article>
      </section>

      {data.activeRun ? (
        <section className='rounded-2xl border border-blue-200 bg-blue-50 p-5'>
          <div className='flex items-center gap-3'>
            <span className='h-5 w-5 animate-spin rounded-full border-2 border-blue-200 border-t-blue-700' aria-hidden='true' />

            <div>
              <h2 className='font-semibold text-blue-950'>{data.activeRun.status === 'QUEUED' ? 'Processing queued' : 'Processing analytics'}</h2>

              <p className='mt-1 text-sm text-blue-800'>
                Retry {data.activeRun.retryCount} of {data.activeRun.maxRetries}
              </p>
            </div>
          </div>
        </section>
      ) : null}

      {data.canReprocess ? (
        <section className='rounded-2xl border border-slate-200 bg-white p-5 shadow-sm'>
          <h2 className='font-semibold text-slate-950'>Manual reprocessing</h2>

          <p className='mt-1 text-sm text-slate-600'>Rebuild a limited analytics date range. Existing valid data is preserved when the rebuild fails.</p>

          <div className='mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_auto]'>
            <label>
              <span className='text-sm font-medium text-slate-700'>From</span>

              <input
                type='date'
                value={from}
                max={to}
                onChange={(event) => {
                  setFrom(event.target.value);
                }}
                className='mt-1 w-full rounded-lg border border-slate-300 px-3 py-2'
              />
            </label>

            <label>
              <span className='text-sm font-medium text-slate-700'>To</span>

              <input
                type='date'
                value={to}
                min={from}
                onChange={(event) => {
                  setTo(event.target.value);
                }}
                className='mt-1 w-full rounded-lg border border-slate-300 px-3 py-2'
              />
            </label>

            <button
              type='button'
              disabled={submitting || Boolean(data.activeRun)}
              onClick={() => {
                void reprocess();
              }}
              className='self-end rounded-lg bg-slate-950 px-4 py-2.5 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50'
            >
              {submitting ? 'Queueingâ€¦' : 'Reprocess'}
            </button>
          </div>

          {actionError ? (
            <p role='alert' className='mt-4 text-sm text-red-700'>
              {actionError}
            </p>
          ) : null}

          {successMessage ? (
            <p role='status' className='mt-4 text-sm text-emerald-700'>
              {successMessage}
            </p>
          ) : null}
        </section>
      ) : null}

      <section className='overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm'>
        <div className='border-b border-slate-200 px-5 py-4'>
          <h2 className='font-semibold text-slate-950'>Recent processing runs</h2>
        </div>

        {data.recentRuns.length === 0 ? (
          <p className='p-5 text-sm text-slate-500'>No processing runs have been recorded.</p>
        ) : (
          <div className='overflow-x-auto'>
            <table className='min-w-[1000px] w-full border-collapse'>
              <thead>
                <tr className='border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500'>
                  <th className='px-4 py-3'>Status</th>

                  <th className='px-4 py-3'>Trigger</th>

                  <th className='px-4 py-3'>Range</th>

                  <th className='px-4 py-3 text-right'>Processed</th>

                  <th className='px-4 py-3 text-right'>Retries</th>

                  <th className='px-4 py-3'>Last error</th>

                  <th className='px-4 py-3' />
                </tr>
              </thead>

              <tbody>
                {data.recentRuns.map((run) => (
                  <RunRow
                    key={run.id}
                    run={run}
                    canRetry={data.canReprocess}
                    retrying={retryingRunId === run.id}
                    onRetry={(runId) => {
                      void retryRun(runId);
                    }}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
