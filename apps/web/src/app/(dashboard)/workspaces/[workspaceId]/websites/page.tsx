'use client';

import { useAuth } from '@/features/auth/auth-provider';
import { WebsiteCard } from '@/features/websites/components/website-card';
import { getWebsites } from '@/features/websites/website-api';
import type { Website, WebsiteListQuery, WebsitePagination } from '@/features/websites/website-types';
import { getWebsiteError } from '@/features/websites/website-utils';
import { Button, Card, EmptyState, ErrorState, SearchInput, Select, Skeleton } from '@command-center/ui';
import { ChevronLeft, ChevronRight, Globe2, Plus, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';

const DEFAULT_PAGINATION: WebsitePagination = {
  page: 1,
  limit: 12,
  total: 0,
  totalPages: 0,
  hasNextPage: false,
  hasPreviousPage: false,
};

export default function WebsitesPage() {
  const params = useParams<{
    workspaceId: string;
  }>();

  const workspaceId = params.workspaceId;

  const { workspaces } = useAuth();

  const role = workspaces.find((workspace) => workspace.id === workspaceId)?.members?.[0]?.role ?? 'VIEWER';

  const canCreate = role !== 'VIEWER';

  const [search, setSearch] = useState('');

  const [status, setStatus] = useState<'all' | 'enabled' | 'disabled'>('all');

  const [connection, setConnection] = useState<'all' | 'connected' | 'unconnected'>('all');

  const [archiveView, setArchiveView] = useState<'active' | 'archived'>('active');

  const [query, setQuery] = useState<WebsiteListQuery>({
    archived: false,
    page: 1,
    limit: 12,
  });

  const [websites, setWebsites] = useState<Website[]>([]);

  const [pagination, setPagination] = useState<WebsitePagination>(DEFAULT_PAGINATION);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState<string | null>(null);

  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function load(): Promise<void> {
      try {
        const response = await getWebsites(workspaceId, query);

        if (cancelled) {
          return;
        }

        setWebsites(response.data);

        setPagination(response.meta);

        setError(null);
      } catch (loadError: unknown) {
        if (cancelled) {
          return;
        }

        setError(getWebsiteError(loadError, 'Unable to load websites.'));
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
  }, [workspaceId, query, reloadKey]);

  function applyFilters(): void {
    setLoading(true);

    setQuery({
      search: search.trim() || undefined,
      enabled: status === 'all' ? undefined : status === 'enabled',
      connected: connection === 'all' ? undefined : connection === 'connected',
      archived: archiveView === 'archived',
      page: 1,
      limit: 12,
    });
  }

  function resetFilters(): void {
    setSearch('');
    setStatus('all');
    setConnection('all');
    setArchiveView('active');
    setLoading(true);

    setQuery({
      archived: false,
      page: 1,
      limit: 12,
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

  return (
    <div className='mx-auto w-full max-w-[1600px] space-y-6 p-4 sm:p-6 lg:p-8'>
      <header className='flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between'>
        <div>
          <p className='text-xs font-semibold uppercase tracking-wide text-slate-400'>Analytics configuration</p>

          <h1 className='mt-1 text-2xl font-bold tracking-tight text-slate-950 sm:text-[28px]'>Websites</h1>

          <p className='mt-1.5 max-w-2xl text-sm leading-6 text-slate-500'>
            Register domains, configure allowed origins, connect websites to SaaS products, and manage tracking keys.
          </p>
        </div>

        <div className='flex shrink-0 gap-2.5'>
          <Button variant='outline' onClick={refresh} loading={loading}>
            <RefreshCw className='size-4' />
            Refresh
          </Button>

          {canCreate ? (
            <Link
              href={`/workspaces/${workspaceId}/websites/new`}
              className='inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-brand-600 px-3.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700'
            >
              <Plus className='size-4' />
              New website
            </Link>
          ) : null}
        </div>
      </header>

      <Card className='p-3'>
        <form
          className='flex flex-wrap items-center gap-2.5'
          onSubmit={(event) => {
            event.preventDefault();
            applyFilters();
          }}
        >
          <div className='min-w-60 flex-1'>
            <SearchInput
              aria-label='Search websites'
              placeholder='Search websites...'
              className='h-10'
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>

          <Select
            aria-label='Status'
            className='h-10 w-36 shrink-0'
            value={status}
            onChange={(event) => setStatus(event.target.value as 'all' | 'enabled' | 'disabled')}
          >
            <option value='all'>All states</option>
            <option value='enabled'>Enabled</option>
            <option value='disabled'>Disabled</option>
          </Select>

          <Select
            aria-label='Connection'
            className='h-10 w-44 shrink-0'
            value={connection}
            onChange={(event) => setConnection(event.target.value as 'all' | 'connected' | 'unconnected')}
          >
            <option value='all'>All connections</option>
            <option value='connected'>Connected</option>
            <option value='unconnected'>Not connected</option>
          </Select>

          <Select
            aria-label='Archive view'
            className='h-10 w-36 shrink-0'
            value={archiveView}
            onChange={(event) => setArchiveView(event.target.value as 'active' | 'archived')}
          >
            <option value='active'>Active</option>
            <option value='archived'>Archived</option>
          </Select>

          <div className='ml-auto flex shrink-0 items-center gap-1.5'>
            <Button type='button' variant='ghost' size='sm' onClick={resetFilters}>
              Reset
            </Button>

            <Button type='submit' size='sm'>
              Apply
            </Button>
          </div>
        </form>
      </Card>

      {loading ? (
        <div className='grid gap-5 md:grid-cols-2 2xl:grid-cols-3'>
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} className='h-56 w-full rounded-xl' />
          ))}
        </div>
      ) : error ? (
        <ErrorState message={error} onRetry={refresh} />
      ) : websites.length === 0 ? (
        <EmptyState
          icon={<Globe2 className='size-5' />}
          title={query.archived ? 'No archived websites' : 'No websites connected'}
          description={query.archived ? 'Archived websites will appear here.' : 'Add a website to start collecting analytics.'}
          action={
            !query.archived ? (
              <Link
                href={`/workspaces/${workspaceId}/websites/new`}
                className='inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-brand-600 px-3.5 text-sm font-semibold text-white hover:bg-brand-700'
              >
                <Plus className='size-4' />
                Create website
              </Link>
            ) : undefined
          }
        />
      ) : (
        <>
          <p className='text-xs font-medium text-slate-500'>
            Showing <span className='text-slate-800'>{websites.length}</span> of <span className='text-slate-800'>{pagination.total}</span> websites
          </p>

          <div className='grid gap-5 md:grid-cols-2 2xl:grid-cols-3'>
            {websites.map((website) => (
              <WebsiteCard key={website.id} workspaceId={workspaceId} website={website} />
            ))}
          </div>

          {pagination.totalPages > 1 ? (
            <div className='flex items-center justify-between rounded-xl border border-slate-200 bg-white p-3.5'>
              <p className='text-sm text-slate-500'>
                Page {pagination.page} of {pagination.totalPages}
              </p>

              <div className='flex gap-2'>
                <Button variant='outline' size='sm' disabled={!pagination.hasPreviousPage} onClick={() => changePage(pagination.page - 1)}>
                  <ChevronLeft className='size-3.5' />
                  Previous
                </Button>

                <Button variant='outline' size='sm' disabled={!pagination.hasNextPage} onClick={() => changePage(pagination.page + 1)}>
                  Next
                  <ChevronRight className='size-3.5' />
                </Button>
              </div>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
