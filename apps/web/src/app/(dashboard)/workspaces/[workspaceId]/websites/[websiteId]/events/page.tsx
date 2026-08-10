'use client';

import { useEffect, useState } from 'react';

import { useParams } from 'next/navigation';

import { ChevronLeft, ChevronRight, Radio, RefreshCw } from 'lucide-react';

import { Badge } from '@/components/ui/badge';

import { Button } from '@/components/ui/button';

import { Card } from '@/components/ui/card';

import { DataTable, type DataTableColumn } from '@/components/ui/data-table';

import { EmptyState } from '@/components/ui/empty-state';

import { ErrorState } from '@/components/ui/error-state';

import { Input } from '@/components/ui/input';

import { Select } from '@/components/ui/select';

import { Skeleton } from '@/components/ui/skeleton';

import { WebsiteSubNav } from '@/features/websites/components/website-sub-nav';

import { getRawTrackingEvents } from '@/features/tracking/tracking-api';

import type { RawEventQuery, RawEventsResponse, RawEventType, RawTrackingEvent } from '@/features/tracking/tracking-types';

import { formatTrackingDate, getTrackingError } from '@/features/tracking/tracking-utils';

const EMPTY_RESPONSE: RawEventsResponse = {
  data: [],

  meta: {
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 0,
    hasNextPage: false,
    hasPreviousPage: false,
  },
};

function EventBadge({ type }: { type: RawEventType }) {
  if (type === 'PAGE_VIEW') {
    return <Badge variant="blue">Page view</Badge>;
  }

  if (type === 'HEARTBEAT') {
    return <Badge variant="green">Heartbeat</Badge>;
  }

  return <Badge variant="purple">Custom</Badge>;
}

export default function RawEventsPage() {
  const params = useParams<{
    workspaceId: string;
    websiteId: string;
  }>();

  const { workspaceId, websiteId } = params;

  const [type, setType] = useState<RawEventType | ''>('');

  const [eventName, setEventName] = useState('');

  const [query, setQuery] = useState<RawEventQuery>({
    page: 1,
    limit: 50,
  });

  const [response, setResponse] = useState<RawEventsResponse>(EMPTY_RESPONSE);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState<string | null>(null);

  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function load(): Promise<void> {
      try {
        const result = await getRawTrackingEvents(workspaceId, websiteId, query);

        if (!cancelled) {
          setResponse(result);
          setError(null);
          setLoading(false);
        }
      } catch (loadError: unknown) {
        if (!cancelled) {
          setError(getTrackingError(loadError));

          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [workspaceId, websiteId, query, reloadKey]);

  function applyFilters(): void {
    setLoading(true);

    setQuery({
      type: type || undefined,
      eventName: eventName.trim() || undefined,
      page: 1,
      limit: 50,
    });
  }

  function resetFilters(): void {
    setType('');
    setEventName('');
    setLoading(true);

    setQuery({
      page: 1,
      limit: 50,
    });
  }

  function changePage(page: number): void {
    setLoading(true);

    setQuery((current) => ({
      ...current,
      page,
    }));
  }

  function refresh(): void {
    setLoading(true);
    setReloadKey((current) => current + 1);
  }

  const columns: DataTableColumn<RawTrackingEvent>[] = [
    { key: 'type', header: 'Type', cell: (event) => <EventBadge type={event.type} /> },
    {
      key: 'page',
      header: 'Page',
      cell: (event) => (
        <div className="max-w-xs">
          <p className="truncate font-medium text-slate-800">{event.pageTitle ?? event.pagePath}</p>
          <p className="mt-0.5 truncate text-xs text-slate-400">{event.pagePath}</p>
        </div>
      ),
    },
    { key: 'event', header: 'Event', cell: (event) => event.eventName ?? '—', hideBelow: 'md' },
    { key: 'visitor', header: 'Visitor', cell: (event) => <span className="font-mono text-xs">{event.visitorId.slice(0, 12)}…</span>, hideBelow: 'lg' },
    { key: 'session', header: 'Session', cell: (event) => <span className="font-mono text-xs">{event.sessionId.slice(0, 12)}…</span>, hideBelow: 'lg' },
    {
      key: 'occurred',
      header: 'Occurred',
      cell: (event) => <span className="whitespace-nowrap text-xs text-slate-500">{formatTrackingDate(event.occurredAt)}</span>,
    },
    { key: 'sdk', header: 'SDK', cell: (event) => event.sdkVersion, hideBelow: 'xl' },
  ];

  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-5 p-4 sm:p-6 lg:p-8">
      <WebsiteSubNav workspaceId={workspaceId} websiteId={websiteId} />

      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-slate-950">Raw events</h1>
          <p className="mt-1 text-sm leading-6 text-slate-500">Inspect the raw tracking stream before it&apos;s converted into visitors, sessions and reports.</p>
        </div>

        <Button variant="outline" size="sm" onClick={refresh} loading={loading}>
          <RefreshCw className="size-3.5" />
          Refresh
        </Button>
      </header>

      <Card className="p-3">
        <form
          className="flex flex-wrap items-center gap-2.5"
          onSubmit={(event) => {
            event.preventDefault();
            applyFilters();
          }}
        >
          <Select aria-label="Event type" className="h-10 w-44 shrink-0" value={type} onChange={(event) => setType(event.target.value as RawEventType | '')}>
            <option value="">All event types</option>
            <option value="PAGE_VIEW">Page view</option>
            <option value="HEARTBEAT">Heartbeat</option>
            <option value="CUSTOM">Custom event</option>
          </Select>

          <div className="min-w-56 flex-1">
            <Input aria-label="Custom event name" placeholder="Custom event name..." value={eventName} onChange={(event) => setEventName(event.target.value)} />
          </div>

          <div className="flex shrink-0 items-center gap-1.5">
            <Button type="button" variant="ghost" size="sm" onClick={resetFilters}>
              Reset
            </Button>

            <Button type="submit" size="sm">
              Apply
            </Button>
          </div>
        </form>
      </Card>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} className="h-10 w-full rounded-lg" />
          ))}
        </div>
      ) : error ? (
        <ErrorState message={error} onRetry={refresh} />
      ) : response.data.length === 0 ? (
        <EmptyState icon={<Radio className="size-5" />} title="No tracking events found" description="Install the tracker and visit the external website." />
      ) : (
        <>
          <p className="text-xs font-medium text-slate-500">
            Showing <span className="text-slate-800">{response.data.length}</span> of <span className="text-slate-800">{response.meta.total}</span> events
          </p>

          <DataTable columns={columns} rows={response.data} getRowKey={(event) => event.id} />

          {response.meta.totalPages > 1 ? (
            <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-3.5">
              <p className="text-sm text-slate-500">
                Page {response.meta.page} of {response.meta.totalPages}
              </p>

              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={!response.meta.hasPreviousPage} onClick={() => changePage(response.meta.page - 1)}>
                  <ChevronLeft className="size-3.5" />
                  Previous
                </Button>

                <Button variant="outline" size="sm" disabled={!response.meta.hasNextPage} onClick={() => changePage(response.meta.page + 1)}>
                  Next
                  <ChevronRight className="size-3.5" />
                </Button>
              </div>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
