'use client';

import { getAnalyticsAggregates, getAnalyticsEngineStatus, processAnalytics, reprocessAnalytics, runAnalyticsRetention } from '../analytics-engine-api';
import type { AnalyticsAggregateDimension, AnalyticsAggregatePeriod, AnalyticsAggregateResponse, AnalyticsEngineStatus } from '../analytics-engine-types';
import { calculateBounceRate, formatAnalyticsDate, formatDuration, getAnalyticsEngineError } from '../analytics-engine-utils';
import { Badge, Button, Card, CardContent, CardHeader, Input, Select, Spinner } from '@command-center/ui';
import { Activity, CalendarClock, Database, Gauge, Play, RefreshCw, Repeat2, Trash2, Users } from 'lucide-react';
import { useEffect, useState } from 'react';

interface AnalyticsEnginePanelProps {
  workspaceId: string;
  websiteId: string;
}

const DIMENSIONS: Array<{
  value: AnalyticsAggregateDimension;
  label: string;
}> = [
  {
    value: 'OVERVIEW',
    label: 'Overview',
  },
  {
    value: 'PAGE',
    label: 'Pages',
  },
  {
    value: 'SOURCE',
    label: 'Sources',
  },
  {
    value: 'COUNTRY',
    label: 'Countries',
  },
  {
    value: 'DEVICE',
    label: 'Devices',
  },
  {
    value: 'BROWSER',
    label: 'Browsers',
  },
  {
    value: 'OPERATING_SYSTEM',
    label: 'Operating systems',
  },
  {
    value: 'CUSTOM_EVENT',
    label: 'Custom events',
  },
];

export function AnalyticsEnginePanel({ workspaceId, websiteId }: AnalyticsEnginePanelProps) {
  const [status, setStatus] = useState<AnalyticsEngineStatus | null>(null);
  const [aggregates, setAggregates] = useState<AnalyticsAggregateResponse | null>(null);
  const [period, setPeriod] = useState<AnalyticsAggregatePeriod>('DAILY');
  const [dimension, setDimension] = useState<AnalyticsAggregateDimension>('OVERVIEW');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [reprocessFrom, setReprocessFrom] = useState('');
  const [reprocessTo, setReprocessTo] = useState('');
  const [loading, setLoading] = useState(true);
  const [action, setAction] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function load(): Promise<void> {
      try {
        const [statusResponse, aggregateResponse] = await Promise.all([
          getAnalyticsEngineStatus(workspaceId, websiteId),

          getAnalyticsAggregates(workspaceId, websiteId, {
            period,
            dimension,

            dateFrom: dateFrom ? new Date(`${dateFrom}T00:00:00.000Z`).toISOString() : undefined,
            dateTo: dateTo ? new Date(`${dateTo}T23:59:59.999Z`).toISOString() : undefined,
            limit: 1000,
          }),
        ]);

        if (cancelled) {
          return;
        }

        setStatus(statusResponse);

        setAggregates(aggregateResponse);

        setError(null);
      } catch (loadError: unknown) {
        if (cancelled) {
          return;
        }

        setError(getAnalyticsEngineError(loadError));
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [workspaceId, websiteId, period, dimension, dateFrom, dateTo, reloadKey]);

  function refresh(): void {
    setLoading(true);

    setReloadKey((current) => current + 1);
  }

  async function runAction(actionName: string, operation: () => Promise<unknown>): Promise<void> {
    setAction(actionName);
    setError(null);

    try {
      await operation();
      refresh();
    } catch (actionError: unknown) {
      setError(getAnalyticsEngineError(actionError));
    } finally {
      setAction(null);
    }
  }

  async function handleReprocess(): Promise<void> {
    if (!reprocessFrom || !reprocessTo) {
      setError('Select both reprocessing dates.');

      return;
    }

    const confirmed = window.confirm('Rebuild normalized analytics for this range?');

    if (!confirmed) {
      return;
    }

    await runAction('reprocess', () =>
      reprocessAnalytics(workspaceId, websiteId, {
        dateFrom: new Date(`${reprocessFrom}T00:00:00.000Z`).toISOString(),
        dateTo: new Date(`${reprocessTo}T23:59:59.999Z`).toISOString(),
        maxEvents: 100000,
      }),
    );
  }

  if (loading && !status) {
    return (
      <div className='flex min-h-96 items-center justify-center'>
        <div className='flex items-center gap-3 text-sm text-slate-600'>
          <Spinner />
          Loading analytics engine...
        </div>
      </div>
    );
  }

  if (!status) {
    return (
      <Card>
        <CardContent className='p-10 text-center'>
          <h2 className='text-lg font-semibold text-slate-900'>Analytics engine unavailable</h2>

          <p className='mt-2 text-sm text-red-600'>{error}</p>

          <Button className='mt-5' variant='outline' onClick={refresh}>
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className='space-y-7'>
      {error ? <div className='rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700'>{error}</div> : null}

      <section className='rounded-3xl border border-slate-200 bg-white p-6 shadow-card sm:p-8'>
        <div className='flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between'>
          <div>
            <div className='flex flex-wrap items-center gap-2'>
              <p className='text-sm font-semibold text-brand-600'>Analytics engine</p>

              <ProcessingBadge status={status.processingState?.status ?? 'COMPLETED'} />
            </div>

            <h1 className='mt-2 text-3xl font-bold tracking-tight text-slate-950'>{status.website.name}</h1>

            <p className='mt-2 text-sm text-slate-500'>Raw events are normalized into visitors, sessions, page views, dimensions, and reporting aggregates.</p>
          </div>

          <div className='flex flex-wrap gap-3'>
            <Button variant='outline' onClick={refresh}>
              <RefreshCw className='size-4' />
              Refresh
            </Button>

            <Button loading={action === 'process'} onClick={() => void runAction('process', () => processAnalytics(workspaceId, websiteId))}>
              <Play className='size-4' />
              Process pending events
            </Button>
          </div>
        </div>

        <div className='mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4'>
          <Metric icon={<Database className='size-5' />} label='Raw events' value={status.counts.rawEvents} />

          <Metric icon={<Activity className='size-5' />} label='Pending' value={status.counts.pendingRawEvents} />

          <Metric icon={<Users className='size-5' />} label='Visitors' value={status.counts.visitors} />

          <Metric icon={<Gauge className='size-5' />} label='Sessions' value={status.counts.sessions} />

          <Metric label='Page views' value={status.counts.pageViews} />

          <Metric label='Normalized events' value={status.counts.normalizedEvents} />

          <Metric label='Hourly rows' value={status.counts.hourlyAggregates} />

          <Metric label='Daily rows' value={status.counts.dailyAggregates} />
        </div>
      </section>

      <Card>
        <CardHeader>
          <h2 className='text-lg font-semibold text-slate-950'>Processing status</h2>
        </CardHeader>

        <CardContent className='grid gap-4 md:grid-cols-2 xl:grid-cols-4'>
          <Detail label='Last completed' value={formatAnalyticsDate(status.processingState?.lastCompletedAt)} />

          <Detail label='Last processed event' value={formatAnalyticsDate(status.processingState?.lastProcessedReceivedAt)} />

          <Detail label='Latest run events' value={String(status.latestRun?.rawEventsProcessed ?? 0)} />

          <Detail label='Latest run buckets' value={`${status.latestRun?.hourlyBuckets ?? 0} hourly / ${status.latestRun?.dailyBuckets ?? 0} daily`} />

          {status.processingState?.lastError ? <div className='md:col-span-2 xl:col-span-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700'>{status.processingState.lastError}</div> : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className='flex items-center gap-2'>
            <Repeat2 className='size-5 text-brand-600' />

            <h2 className='font-semibold text-slate-950'>Reprocess a date range</h2>
          </div>

          <p className='mt-2 text-sm text-slate-500'>Use this after normalization, session, source, or metric rules change. Maximum range: 31 days.</p>
        </CardHeader>

        <CardContent>
          <div className='grid gap-4 md:grid-cols-[1fr_1fr_auto]'>
            <Input type='date' label='From' value={reprocessFrom} onChange={(event) => setReprocessFrom(event.target.value)} />

            <Input type='date' label='To' value={reprocessTo} onChange={(event) => setReprocessTo(event.target.value)} />

            <Button className='self-end' variant='outline' loading={action === 'reprocess'} onClick={() => void handleReprocess()}>
              <Repeat2 className='size-4' />
              Reprocess
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className='flex items-center gap-2'>
            <CalendarClock className='size-5 text-brand-600' />

            <h2 className='font-semibold text-slate-950'>Aggregate verification</h2>
          </div>
        </CardHeader>

        <CardContent className='space-y-5'>
          <div className='grid gap-4 md:grid-cols-2 xl:grid-cols-4'>
            <Select
              label='Period'
              value={period}
              onChange={(event) => {
                setLoading(true);

                setPeriod(event.target.value as AnalyticsAggregatePeriod);
              }}
            >
              <option value='HOURLY'>Hourly</option>

              <option value='DAILY'>Daily</option>
            </Select>

            <Select
              label='Dimension'
              value={dimension}
              onChange={(event) => {
                setLoading(true);

                setDimension(event.target.value as AnalyticsAggregateDimension);
              }}
            >
              {DIMENSIONS.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </Select>

            <Input
              type='date'
              label='From'
              value={dateFrom}
              onChange={(event) => {
                setLoading(true);

                setDateFrom(event.target.value);
              }}
            />

            <Input
              type='date'
              label='To'
              value={dateTo}
              onChange={(event) => {
                setLoading(true);

                setDateTo(event.target.value);
              }}
            />
          </div>

          {loading ? (
            <div className='flex min-h-40 items-center justify-center'>
              <Spinner />
            </div>
          ) : !aggregates || aggregates.data.length === 0 ? (
            <div className='rounded-xl border border-dashed border-slate-300 p-10 text-center text-sm text-slate-500'>No aggregate rows found for this selection.</div>
          ) : (
            <div className='overflow-x-auto'>
              <table className='w-full min-w-[1050px] border-collapse text-left text-sm'>
                <thead>
                  <tr className='border-b border-slate-200 text-xs uppercase tracking-wide text-slate-400'>
                    <th className='px-3 py-3'>Bucket</th>
                    <th className='px-3 py-3'>Dimension</th>
                    <th className='px-3 py-3'>Visitors</th>
                    <th className='px-3 py-3'>Sessions</th>
                    <th className='px-3 py-3'>Page views</th>
                    <th className='px-3 py-3'>Events</th>
                    <th className='px-3 py-3'>Bounce rate</th>
                    <th className='px-3 py-3'>Duration</th>
                  </tr>
                </thead>

                <tbody>
                  {aggregates.data.map((aggregate) => (
                    <tr key={aggregate.id} className='border-b border-slate-100 last:border-0'>
                      <td className='whitespace-nowrap px-3 py-4'>{formatAnalyticsDate(aggregate.bucketStart)}</td>

                      <td className='max-w-sm px-3 py-4'>
                        <p className='truncate font-semibold text-slate-800'>{aggregate.dimensionLabel}</p>

                        <p className='mt-1 truncate text-xs text-slate-400'>{aggregate.dimensionValue}</p>
                      </td>

                      <td className='px-3 py-4'>{aggregate.visitors}</td>

                      <td className='px-3 py-4'>{aggregate.sessions}</td>

                      <td className='px-3 py-4'>{aggregate.pageViews}</td>

                      <td className='px-3 py-4'>{aggregate.events}</td>

                      <td className='px-3 py-4'>{calculateBounceRate(aggregate.sessions, aggregate.bounces)}</td>

                      <td className='px-3 py-4'>{formatDuration(aggregate.totalDurationMs)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <h2 className='font-semibold text-slate-950'>Recent normalized sessions</h2>
        </CardHeader>

        <CardContent>
          {status.recentSessions.length === 0 ? (
            <div className='rounded-xl border border-dashed border-slate-300 p-10 text-center text-sm text-slate-500'>No normalized sessions yet.</div>
          ) : (
            <div className='overflow-x-auto'>
              <table className='w-full min-w-[1000px] border-collapse text-left text-sm'>
                <thead>
                  <tr className='border-b border-slate-200 text-xs uppercase tracking-wide text-slate-400'>
                    <th className='px-3 py-3'>Started</th>
                    <th className='px-3 py-3'>Entry</th>
                    <th className='px-3 py-3'>Source</th>
                    <th className='px-3 py-3'>Device</th>
                    <th className='px-3 py-3'>Browser</th>
                    <th className='px-3 py-3'>Views</th>
                    <th className='px-3 py-3'>Duration</th>
                    <th className='px-3 py-3'>Bounce</th>
                  </tr>
                </thead>

                <tbody>
                  {status.recentSessions.map((session) => (
                    <tr key={session.id} className='border-b border-slate-100 last:border-0'>
                      <td className='whitespace-nowrap px-3 py-4'>{formatAnalyticsDate(session.startedAt)}</td>

                      <td className='max-w-xs px-3 py-4'>
                        <p className='truncate'>{session.entryPath ?? 'Unknown'}</p>
                      </td>

                      <td className='px-3 py-4'>{session.sourceName}</td>

                      <td className='px-3 py-4'>{session.deviceType}</td>

                      <td className='px-3 py-4'>{session.browserName}</td>

                      <td className='px-3 py-4'>{session.pageViewCount}</td>

                      <td className='px-3 py-4'>{formatDuration(session.durationMs)}</td>

                      <td className='px-3 py-4'>
                        <Badge variant={session.bounced ? 'orange' : 'green'}>{session.bounced ? 'Yes' : 'No'}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className='flex items-center gap-2'>
            <Trash2 className='size-5 text-red-600' />

            <h2 className='font-semibold text-slate-950'>Retention cleanup</h2>
          </div>

          <p className='mt-2 text-sm text-slate-500'>Delete records older than the configured retention periods.</p>
        </CardHeader>

        <CardContent>
          <Button
            variant='danger'
            loading={action === 'retention'}
            onClick={() => {
              const confirmed = window.confirm('Run analytics retention cleanup now?');

              if (confirmed) {
                void runAction('retention', () => runAnalyticsRetention(workspaceId, websiteId));
              }
            }}
          >
            <Trash2 className='size-4' />
            Run retention cleanup
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function Metric({ icon, label, value }: { icon?: React.ReactNode; label: string; value: number }) {
  return (
    <div className='rounded-2xl border border-slate-200 bg-slate-50 p-4'>
      <div className='flex items-center justify-between gap-3'>
        <span className='text-sm text-slate-500'>{label}</span>

        {icon ? <span className='text-brand-600'>{icon}</span> : null}
      </div>

      <p className='mt-2 text-3xl font-bold text-slate-950'>{value}</p>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className='rounded-xl bg-slate-50 p-4'>
      <p className='text-xs font-semibold uppercase tracking-wide text-slate-400'>{label}</p>

      <p className='mt-2 text-sm font-semibold text-slate-800'>{value}</p>
    </div>
  );
}

function ProcessingBadge({ status }: { status: 'RUNNING' | 'COMPLETED' | 'FAILED' }) {
  if (status === 'RUNNING') {
    return <Badge variant='blue'>Processing</Badge>;
  }

  if (status === 'FAILED') {
    return <Badge variant='red'>Failed</Badge>;
  }

  return <Badge variant='green'>Ready</Badge>;
}
