'use client';

import { useEffect, useState } from 'react';

import Link from 'next/link';

import { useParams } from 'next/navigation';

import { ChevronLeft, ChevronRight, Globe2, Plus, RefreshCw, Search } from 'lucide-react';

import { Button } from '@/components/ui/button';

import { Card, CardContent } from '@/components/ui/card';

import { EmptyState } from '@/components/ui/empty-state';

import { Input } from '@/components/ui/input';

import { Select } from '@/components/ui/select';

import { Spinner } from '@/components/ui/spinner';

import { WebsiteCard } from '@/features/websites/components/website-card';

import { getWebsites } from '@/features/websites/website-api';

import type { Website, WebsiteListQuery, WebsitePagination } from '@/features/websites/website-types';

import { getWebsiteError } from '@/features/websites/website-utils';

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
    <div className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-brand-600">Analytics configuration</p>

          <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-950">Websites</h1>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
            Register domains, configure allowed origins, connect websites to SaaS products, and manage tracking keys.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Button variant="outline" onClick={refresh}>
            <RefreshCw className="size-4" />
            Refresh
          </Button>

          <Link
            href={`/workspaces/${workspaceId}/websites/new`}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 text-sm font-semibold text-white transition hover:bg-brand-700"
          >
            <Plus className="size-4" />
            New website
          </Link>
        </div>
      </header>

      <Card>
        <CardContent className="p-4">
          <form
            className="grid gap-4 xl:grid-cols-[minmax(240px,1fr)_180px_190px_170px_auto_auto]"
            onSubmit={(event) => {
              event.preventDefault();
              applyFilters();
            }}
          >
            <Input
              placeholder="Search websites..."
              value={search}
              leadingIcon={<Search className="size-4" />}
              onChange={(event) => setSearch(event.target.value)}
            />

            <Select value={status} onChange={(event) => setStatus(event.target.value as 'all' | 'enabled' | 'disabled')}>
              <option value="all">All states</option>
              <option value="enabled">Enabled</option>
              <option value="disabled">Disabled</option>
            </Select>

            <Select value={connection} onChange={(event) => setConnection(event.target.value as 'all' | 'connected' | 'unconnected')}>
              <option value="all">All connections</option>
              <option value="connected">Connected</option>
              <option value="unconnected">Not connected</option>
            </Select>

            <Select value={archiveView} onChange={(event) => setArchiveView(event.target.value as 'active' | 'archived')}>
              <option value="active">Active</option>
              <option value="archived">Archived</option>
            </Select>

            <Button type="submit">Apply</Button>

            <Button type="button" variant="ghost" onClick={resetFilters}>
              Reset
            </Button>
          </form>
        </CardContent>
      </Card>

      {loading ? (
        <div className="flex min-h-80 items-center justify-center">
          <div className="flex items-center gap-3 text-sm text-slate-600">
            <Spinner />
            Loading websites...
          </div>
        </div>
      ) : error ? (
        <Card>
          <CardContent className="flex min-h-72 flex-col items-center justify-center text-center">
            <Globe2 className="size-8 text-red-500" />

            <h2 className="mt-4 text-lg font-semibold text-slate-900">Unable to load websites</h2>

            <p className="mt-2 text-sm text-slate-500">{error}</p>

            <Button className="mt-5" variant="outline" onClick={refresh}>
              Try again
            </Button>
          </CardContent>
        </Card>
      ) : websites.length === 0 ? (
        <EmptyState
          icon={<Globe2 className="size-6" />}
          title={query.archived ? 'No archived websites' : 'No websites connected'}
          description={query.archived ? 'Archived websites will appear here.' : 'Register your first analytics website and generate its tracking key.'}
          action={
            !query.archived ? (
              <Link
                href={`/workspaces/${workspaceId}/websites/new`}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 text-sm font-semibold text-white hover:bg-brand-700"
              >
                <Plus className="size-4" />
                Create website
              </Link>
            ) : undefined
          }
        />
      ) : (
        <>
          <p className="text-sm text-slate-500">
            Showing <strong className="text-slate-800">{websites.length}</strong> of <strong className="text-slate-800">{pagination.total}</strong> websites
          </p>

          <div className="grid gap-5 md:grid-cols-2 2xl:grid-cols-3">
            {websites.map((website) => (
              <WebsiteCard key={website.id} workspaceId={workspaceId} website={website} />
            ))}
          </div>

          {pagination.totalPages > 1 ? (
            <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-4">
              <p className="text-sm text-slate-500">
                Page {pagination.page} of {pagination.totalPages}
              </p>

              <div className="flex gap-2">
                <Button variant="outline" disabled={!pagination.hasPreviousPage} onClick={() => changePage(pagination.page - 1)}>
                  <ChevronLeft className="size-4" />
                  Previous
                </Button>

                <Button variant="outline" disabled={!pagination.hasNextPage} onClick={() => changePage(pagination.page + 1)}>
                  Next
                  <ChevronRight className="size-4" />
                </Button>
              </div>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
