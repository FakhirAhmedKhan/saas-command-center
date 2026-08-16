'use client';

import { getWorkspaceActivities, type WorkspaceActivity } from '@/features/activity/workspace-activity-api';
import { getErrorMessage } from '@/features/applications/application-utils';
import { EmptyState, ErrorState, Input, Select, Skeleton } from '@command-center/ui';
import { Activity as ActivityIcon } from 'lucide-react';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';

function humanize(value: string): string {
  return value
    .toLowerCase()
    .replace(/_/g, ' ')
    .replace(/^\w/, (letter) => letter.toUpperCase());
}

function formatDayLabel(value: string): string {
  const date = new Date(value);

  const today = new Date();

  const isSameDay = date.toDateString() === today.toDateString();

  if (isSameDay) {
    return 'Today';
  }

  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  if (date.toDateString() === yesterday.toDateString()) {
    return 'Yesterday';
  }

  return new Intl.DateTimeFormat('en-US', { dateStyle: 'medium' }).format(date);
}

function groupByDay(activities: WorkspaceActivity[]): Array<[string, WorkspaceActivity[]]> {
  const groups = new Map<string, WorkspaceActivity[]>();

  for (const activity of activities) {
    const key = formatDayLabel(activity.createdAt);

    const existing = groups.get(key);

    if (existing) {
      existing.push(activity);
    } else {
      groups.set(key, [activity]);
    }
  }

  return Array.from(groups.entries());
}

export default function WorkspaceActivityPage() {
  const params = useParams<{
    workspaceId: string;
  }>();

  const [activities, setActivities] = useState<WorkspaceActivity[]>([]);

  const [search, setSearch] = useState('');

  const [entityType, setEntityType] = useState('');

  const [from, setFrom] = useState('');

  const [to, setTo] = useState('');

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    const timer = window.setTimeout(() => {
      setLoading(true);

      void getWorkspaceActivities(
        params.workspaceId,
        {
          search: search || undefined,
          entityType: entityType || undefined,
          from: from ? new Date(`${from}T00:00:00.000Z`).toISOString() : undefined,
          to: to ? new Date(`${to}T23:59:59.999Z`).toISOString() : undefined,
        },
        controller.signal,
      )
        .then((response) => {
          setActivities(response.items);
          setError(null);
        })
        .catch((caughtError: unknown) => {
          if (!controller.signal.aborted) {
            setError(getErrorMessage(caughtError));
          }
        })
        .finally(() => {
          if (!controller.signal.aborted) {
            setLoading(false);
          }
        });
    }, 300);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [params.workspaceId, search, entityType, from, to]);

  const hasFilters = Boolean(search || entityType || from || to);

  const groupedActivities = groupByDay(activities);

  return (
    <div className='mx-auto w-full max-w-4xl space-y-5 p-4 sm:p-6 lg:p-8'>
      <header>
        <h1 className='text-[26px] font-semibold tracking-tight text-slate-950'>Activity</h1>
        <p className='mt-1 text-sm leading-6 text-slate-500'>Search who changed what and when, across every application in this workspace.</p>
      </header>

      <div className='flex flex-wrap items-center gap-2.5'>
        <div className='min-w-56 flex-1'>
          <Input aria-label='Search activity' placeholder='Search activity…' value={search} onChange={(event) => setSearch(event.target.value)} />
        </div>

        <Select aria-label='Resource' value={entityType} className='w-44 shrink-0' onChange={(event) => setEntityType(event.target.value)}>
          <option value=''>All resources</option>
          <option value='APPLICATION'>Application</option>
          <option value='WEBSITE'>Website</option>
          <option value='MILESTONE'>Milestone</option>
          <option value='TASK'>Task</option>
          <option value='BLOCKER'>Blocker</option>
          <option value='DEPLOYMENT'>Deployment</option>
        </Select>

        <Input aria-label='From date' type='date' value={from} className='w-40 shrink-0' onChange={(event) => setFrom(event.target.value)} />

        <Input aria-label='To date' type='date' value={to} className='w-40 shrink-0' onChange={(event) => setTo(event.target.value)} />
      </div>

      {error ? (
        <ErrorState message={error} onRetry={() => setError(null)} />
      ) : loading ? (
        <div className='space-y-2.5'>
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} className='h-16 w-full rounded-lg' />
          ))}
        </div>
      ) : activities.length === 0 ? (
        <EmptyState
          icon={<ActivityIcon className='size-5' />}
          title={hasFilters ? 'No results match these filters.' : 'Nothing has happened yet.'}
          description={hasFilters ? 'Try adjusting the search, resource, or date filters.' : 'Changes across this workspace will appear here.'}
        />
      ) : (
        <div className='space-y-6'>
          {groupedActivities.map(([day, items]) => (
            <section key={day}>
              <h2 className='mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400'>{day}</h2>

              <div className='space-y-0.5 rounded-xl border border-slate-200 bg-white'>
                {items.map((activity, index) => (
                  <div key={activity.id} className={index > 0 ? 'border-t border-slate-100 px-4 py-3' : 'px-4 py-3'}>
                    <div className='flex items-start justify-between gap-4'>
                      <div className='flex items-start gap-2.5 min-w-0'>
                        <span className='mt-1.5 size-1.5 shrink-0 rounded-full bg-brand-500' aria-hidden='true' />

                        <div className='min-w-0'>
                          <p className='text-sm font-medium text-slate-900'>{humanize(activity.activityType)}</p>
                          <p className='mt-0.5 text-sm text-slate-500'>{activity.description}</p>
                          <p className='mt-1 text-xs text-slate-400'>
                            {activity.actorUser?.name ?? activity.actorUser?.email ?? humanize(activity.actorType)}
                            {activity.application ? ` · ${activity.application.name}` : ''}
                          </p>
                        </div>
                      </div>

                      <time className='shrink-0 text-xs text-slate-400'>
                        {new Intl.DateTimeFormat('en-US', { timeStyle: 'short' }).format(new Date(activity.createdAt))}
                      </time>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
