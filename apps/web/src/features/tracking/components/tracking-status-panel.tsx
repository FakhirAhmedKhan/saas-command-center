'use client';

import { getTrackingStatus } from '../tracking-api';
import type { TrackingStatus } from '../tracking-types';
import { formatTrackingDate, getTrackingError } from '../tracking-utils';
import { usePageVisibility } from '@/hooks/use-page-visibility';
import { Badge, Button, Card, CardContent, CardHeader, Spinner } from '@command-center/ui';
import { Activity, CheckCircle2, Clock3, MousePointerClick, Radio, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';

interface TrackingStatusPanelProps {
  workspaceId: string;
  websiteId: string;
  autoRefresh?: boolean;
}

export function TrackingStatusPanel({ workspaceId, websiteId, autoRefresh = true }: TrackingStatusPanelProps) {
  const [status, setStatus] = useState<TrackingStatus | null>(null);

  const [loading, setLoading] = useState(true);

  const [refreshing, setRefreshing] = useState(false);

  const [error, setError] = useState<string | null>(null);

  const visible = usePageVisibility();

  useEffect(() => {
    if (!visible) {
      return;
    }

    let cancelled = false;

    async function load(): Promise<void> {
      try {
        const response = await getTrackingStatus(workspaceId, websiteId);

        if (!cancelled) {
          setStatus(response);
          setError(null);
          setLoading(false);
          setRefreshing(false);
        }
      } catch (loadError: unknown) {
        if (!cancelled) {
          setError(getTrackingError(loadError));

          setLoading(false);
          setRefreshing(false);
        }
      }
    }

    void load();

    if (!autoRefresh) {
      return () => {
        cancelled = true;
      };
    }

    const timer = window.setInterval(() => {
      void load();
    }, 5_000);

    return () => {
      cancelled = true;

      window.clearInterval(timer);
    };
  }, [workspaceId, websiteId, autoRefresh, visible]);

  async function refresh(): Promise<void> {
    setRefreshing(true);

    try {
      const response = await getTrackingStatus(workspaceId, websiteId);

      setStatus(response);
      setError(null);
    } catch (refreshError: unknown) {
      setError(getTrackingError(refreshError));
    } finally {
      setRefreshing(false);
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className='flex min-h-48 items-center justify-center'>
          <div className='flex items-center gap-3 text-sm text-slate-600'>
            <Spinner />
            Checking tracker connection...
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!status) {
    return (
      <Card>
        <CardContent className='p-6'>
          <p className='text-sm text-red-600'>{error ?? 'Tracking status could not be loaded.'}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className='flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between'>
          <div>
            <div className='flex flex-wrap items-center gap-2'>
              <Radio className='size-5 text-brand-600' />

              <h2 className='text-lg font-semibold text-slate-950'>Tracker connection</h2>

              {status.connected ? <Badge variant='green'>Receiving events</Badge> : <Badge variant='orange'>Waiting for first event</Badge>}
            </div>

            <p className='mt-2 text-sm text-slate-500'>This status refreshes every five seconds.</p>
          </div>

          <Button variant='outline' loading={refreshing} onClick={() => void refresh()}>
            <RefreshCw className='size-4' />
            Refresh
          </Button>
        </div>
      </CardHeader>

      <CardContent className='space-y-5'>
        {error ? <div className='rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700'>{error}</div> : null}

        <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-4'>
          <Metric icon={<Activity className='size-5' />} label='Total events' value={status.totalEvents} />

          <Metric icon={<CheckCircle2 className='size-5' />} label='Page views' value={status.counts.PAGE_VIEW} />

          <Metric icon={<Clock3 className='size-5' />} label='Heartbeats' value={status.counts.HEARTBEAT} />

          <Metric icon={<MousePointerClick className='size-5' />} label='Custom events' value={status.counts.CUSTOM} />
        </div>

        <div className='rounded-xl bg-slate-50 p-4'>
          <p className='text-xs font-semibold uppercase tracking-wide text-slate-400'>Last event</p>

          <p className='mt-2 text-sm font-semibold text-slate-800'>{formatTrackingDate(status.website.lastEventAt)}</p>
        </div>

        <Link
          href={`/workspaces/${workspaceId}/websites/${websiteId}/events`}
          className='inline-flex h-11 items-center justify-center rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50'
        >
          View raw events
        </Link>
      </CardContent>
    </Card>
  );
}

function Metric({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className='rounded-xl border border-slate-200 bg-white p-4'>
      <div className='flex items-center justify-between'>
        <span className='text-sm text-slate-500'>{label}</span>

        <span className='text-brand-600'>{icon}</span>
      </div>

      <p className='mt-2 text-2xl font-bold text-slate-950'>{value}</p>
    </div>
  );
}
