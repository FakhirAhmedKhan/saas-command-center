'use client';

import { getApplicationActivities, getWorkspaceActivities } from '../activity-api';
import { getActivityErrorMessage } from '../activity-utils';
import { ActivityFilters, type ActivityFilterValue } from './activity-filters';
import { ActivityItem } from './activity-item';
import type { ActivityListQuery, ActivityPagination, ApplicationActivity } from '../activity-types';
import { Button, Card, CardContent, CardHeader, EmptyState, Spinner } from '@command-center/ui';
import { Activity, ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react';
import { useEffect, useState } from 'react';

const DEFAULT_FILTERS: ActivityFilterValue = {
  search: '',
  activityType: '',
  actorType: '',
  entityType: '',
  dateFrom: '',
  dateTo: '',
};
const DEFAULT_PAGINATION: ActivityPagination = {
  page: 1,
  limit: 20,
  total: 0,
  totalPages: 0,
  hasNextPage: false,
  hasPreviousPage: false,
};

function toIsoStartDate(value: string): string | undefined {
  if (!value) {
    return undefined;
  }

  return new Date(`${value}T00:00:00.000Z`).toISOString();
}

function toIsoEndDate(value: string): string | undefined {
  if (!value) {
    return undefined;
  }

  return new Date(`${value}T23:59:59.999Z`).toISOString();
}

function filtersToQuery(filters: ActivityFilterValue): ActivityListQuery {
  return {
    search: filters.search.trim() || undefined,
    activityType: filters.activityType || undefined,
    actorType: filters.actorType || undefined,
    entityType: filters.entityType || undefined,
    dateFrom: toIsoStartDate(filters.dateFrom),
    dateTo: toIsoEndDate(filters.dateTo),
    page: 1,
    limit: 20,
  };
}

interface ActivityFeedProps {
  workspaceId: string;

  applicationId?: string;

  title?: string;

  description?: string;

  showApplication?: boolean;
}

export function ActivityFeed({ workspaceId, applicationId, title = 'Activity history', description = 'Review important changes and the people who made them.', showApplication = false }: ActivityFeedProps) {
  const [filterDraft, setFilterDraft] = useState<ActivityFilterValue>(DEFAULT_FILTERS);
  const [query, setQuery] = useState<ActivityListQuery>(filtersToQuery(DEFAULT_FILTERS));
  const [activities, setActivities] = useState<ApplicationActivity[]>([]);
  const [pagination, setPagination] = useState<ActivityPagination>(DEFAULT_PAGINATION);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function load(): Promise<void> {
      try {
        const response = applicationId ? await getApplicationActivities(workspaceId, applicationId, query) : await getWorkspaceActivities(workspaceId, query);

        if (cancelled) {
          return;
        }

        setActivities(response.data);

        setPagination(response.meta);

        setError(null);
      } catch (loadError: unknown) {
        if (cancelled) {
          return;
        }

        setError(getActivityErrorMessage(loadError));
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
  }, [workspaceId, applicationId, query, reloadKey]);

  function applyFilters(): void {
    setLoading(true);

    setQuery(filtersToQuery(filterDraft));
  }

  function resetFilters(): void {
    setFilterDraft(DEFAULT_FILTERS);

    setLoading(true);

    setQuery(filtersToQuery(DEFAULT_FILTERS));
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

  return (
    <div className='space-y-5'>
      <Card>
        <CardHeader>
          <div className='flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between'>
            <div>
              <div className='flex items-center gap-2'>
                <Activity className='size-5 text-brand-600' />

                <h2 className='text-lg font-semibold text-slate-950'>{title}</h2>
              </div>

              <p className='mt-2 text-sm leading-6 text-slate-500'>{description}</p>
            </div>

            <Button variant='outline' onClick={refresh}>
              <RefreshCw className='size-4' />
              Refresh
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          <ActivityFilters value={filterDraft} onChange={setFilterDraft} onApply={applyFilters} onReset={resetFilters} />
        </CardContent>
      </Card>

      {loading ? (
        <div className='flex min-h-72 items-center justify-center'>
          <div className='flex items-center gap-3 text-sm text-slate-600'>
            <Spinner />
            Loading activity...
          </div>
        </div>
      ) : error ? (
        <Card>
          <CardContent className='flex min-h-64 flex-col items-center justify-center text-center'>
            <div className='flex size-14 items-center justify-center rounded-2xl bg-red-50 text-red-600'>
              <Activity className='size-6' />
            </div>

            <h3 className='mt-5 text-lg font-semibold text-slate-900'>Unable to load activity</h3>

            <p className='mt-2 max-w-md text-sm leading-6 text-slate-500'>{error}</p>

            <Button className='mt-6' variant='outline' onClick={refresh}>
              Try again
            </Button>
          </CardContent>
        </Card>
      ) : (activities ?? []).length === 0 ? (
        <EmptyState icon={<Activity className='size-6' />} title='No activity found' description='Important application changes will appear here.' />
      ) : (
        <Card>
          <CardContent className='p-5 sm:p-6'>
            <div>
              {(activities ?? []).map((activity) => (
                <ActivityItem key={activity.id} workspaceId={workspaceId} activity={activity} showApplication={showApplication} />
              ))}
            </div>

            {pagination.totalPages > 1 ? (
              <div className='mt-6 flex flex-col gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:items-center sm:justify-between'>
                <p className='text-sm text-slate-500'>
                  Page {pagination.page} of {pagination.totalPages} Ã‚Â· {pagination.total} activities
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
          </CardContent>
        </Card>
      )}
    </div>
  );
}
