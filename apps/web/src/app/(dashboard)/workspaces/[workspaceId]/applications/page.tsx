'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { getApplications } from '@/features/applications/application-api';
import type { ApplicationListQuery, ApplicationPagination, SaasApplication } from '@/features/applications/application-types';
import { getErrorMessage } from '@/features/applications/application-utils';
import { ActiveFilterChips } from '@/features/applications/components/active-filter-chips';
import { ApplicationFilters, type ApplicationFilterValue } from '@/features/applications/components/application-filters';
import { ApplicationsEmptyState } from '@/features/applications/components/applications-empty-state';
import { ApplicationsErrorState } from '@/features/applications/components/applications-error-state';
import { ApplicationsGrid } from '@/features/applications/components/applications-grid';
import { ApplicationsHeader } from '@/features/applications/components/applications-header';
import { ApplicationsResultSummary } from '@/features/applications/components/applications-result-summary';
import { ApplicationsSkeleton } from '@/features/applications/components/applications-skeleton';

const DEFAULT_FILTERS: ApplicationFilterValue = {
  search: '',
  status: '',
  priority: '',
  category: '',
  archiveView: 'active',
  sortBy: 'updatedAt',
  sortOrder: 'desc',
};

const DEFAULT_PAGINATION: ApplicationPagination = {
  page: 1,
  limit: 12,
  total: 0,
  totalPages: 0,
  hasNextPage: false,
  hasPreviousPage: false,
};

function filtersToQuery(filters: ApplicationFilterValue): ApplicationListQuery {
  return {
    search: filters.search.trim() || undefined,
    status: filters.status || undefined,
    priority: filters.priority || undefined,
    category: filters.category || undefined,
    archived: filters.archiveView === 'archived',
    sortBy: filters.sortBy,
    sortOrder: filters.sortOrder,
    page: 1,
    limit: 12,
  };
}

function hasActiveFilters(filters: ApplicationFilterValue): boolean {
  return Boolean(filters.search.trim() || filters.status || filters.priority || filters.category || filters.archiveView === 'archived');
}

export default function ApplicationsPage() {
  const params = useParams<{
    workspaceId: string;
  }>();

  const workspaceId = params.workspaceId;

  const [filterDraft, setFilterDraft] = useState<ApplicationFilterValue>(DEFAULT_FILTERS);

  const [appliedFilters, setAppliedFilters] = useState<ApplicationFilterValue>(DEFAULT_FILTERS);

  const [query, setQuery] = useState<ApplicationListQuery>(filtersToQuery(DEFAULT_FILTERS));

  const [applications, setApplications] = useState<SaasApplication[]>([]);

  const [pagination, setPagination] = useState<ApplicationPagination>(DEFAULT_PAGINATION);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState<string | null>(null);

  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function loadApplications(): Promise<void> {
      try {
        const response = await getApplications(workspaceId, query);

        if (cancelled) {
          return;
        }

        setApplications(response.data);
        setPagination(response.meta);
        setError(null);
      } catch (loadError: unknown) {
        if (cancelled) {
          return;
        }

        setError(getErrorMessage(loadError, 'Unable to load applications.'));
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadApplications();

    return () => {
      cancelled = true;
    };
  }, [workspaceId, query, reloadKey]);

  function applyFilters(nextFilters: ApplicationFilterValue = filterDraft): void {
    setFilterDraft(nextFilters);
    setAppliedFilters(nextFilters);
    setLoading(true);
    setQuery(filtersToQuery(nextFilters));
  }

  function resetFilters(): void {
    applyFilters(DEFAULT_FILTERS);
  }

  function changePage(page: number): void {
    setLoading(true);

    setQuery((currentQuery) => ({
      ...currentQuery,
      page,
    }));
  }

  function refresh(): void {
    setLoading(true);
    setReloadKey((currentValue) => currentValue + 1);
  }

  const showEmptyState = !loading && !error && applications.length === 0;

  return (
    <div className='mx-auto w-full max-w-[1600px] space-y-6 p-4 sm:p-6 lg:p-8'>
      <ApplicationsHeader workspaceId={workspaceId} onRefresh={refresh} refreshing={loading} />

      <div className='space-y-3'>
        <ApplicationFilters value={filterDraft} onChange={setFilterDraft} onApply={() => applyFilters()} onReset={resetFilters} />

        <ActiveFilterChips value={appliedFilters} onChange={applyFilters} onClearAll={resetFilters} />
      </div>

      {loading ? (
        <ApplicationsSkeleton />
      ) : error ? (
        <ApplicationsErrorState message={error} onRetry={refresh} />
      ) : showEmptyState ? (
        <ApplicationsEmptyState
          workspaceId={workspaceId}
          hasActiveFilters={hasActiveFilters(appliedFilters)}
          isArchivedView={appliedFilters.archiveView === 'archived'}
          onClearFilters={resetFilters}
        />
      ) : (
        <>
          <ApplicationsResultSummary shown={applications.length} total={pagination.total} />

          <ApplicationsGrid workspaceId={workspaceId} applications={applications} />

          {pagination.totalPages > 1 ? (
            <div className='flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-4'>
              <p className='text-sm text-slate-500'>
                Page {pagination.page} of {pagination.totalPages}
              </p>

              <div className='flex gap-2'>
                <Button variant='outline' disabled={!pagination.hasPreviousPage} onClick={() => changePage(pagination.page - 1)}>
                  <ChevronLeft className='size-4' />
                  Previous
                </Button>

                <Button variant='outline' disabled={!pagination.hasNextPage} onClick={() => changePage(pagination.page + 1)}>
                  Next
                  <ChevronRight className='size-4' />
                </Button>
              </div>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
