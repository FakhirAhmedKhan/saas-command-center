'use client';
/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable react-hooks/exhaustive-deps */

import { downloadAnalyticsReport, getAnalyticsReport } from './analytics-reports-api';
import type {
  AnalyticsPreset,
  AnalyticsReportRequest,
  AnalyticsReportResponse,
  AnalyticsReportTab,
  DimensionReportResponse,
  EventReportResponse,
  PageReportResponse,
  SortDirection,
  TechnologyDimension,
} from './analytics-reports.types';
import { getErrorMessage } from '../applications/application-utils';
import { PageError } from '@/components/states/page-error';
import { ApiError } from '@/features/lib/api/api-error';
import { EmptyState } from '@command-center/ui';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

interface AnalyticsReportsDashboardProps {
  workspaceId: string;

  websiteId: string;
}

const numberFormatter = new Intl.NumberFormat('en-US');

const MAIN_TABS: Array<{
  value: AnalyticsReportTab;

  label: string;
}> = [
  {
    value: 'pages',
    label: 'Pages',
  },

  {
    value: 'sources',
    label: 'Sources',
  },

  {
    value: 'geography',
    label: 'Geography',
  },

  {
    value: 'technology',
    label: 'Technology',
  },

  {
    value: 'events',
    label: 'Events',
  },
];

const TECHNOLOGY_OPTIONS: Array<{
  value: TechnologyDimension;

  label: string;
}> = [
  {
    value: 'devices',
    label: 'Devices',
  },

  {
    value: 'browsers',
    label: 'Browsers',
  },

  {
    value: 'operating-systems',
    label: 'Operating systems',
  },
];

const PRESET_OPTIONS: Array<{
  value: AnalyticsPreset;

  label: string;
}> = [
  {
    value: 'today',
    label: 'Today',
  },

  {
    value: '7d',
    label: 'Last 7 days',
  },

  {
    value: '30d',
    label: 'Last 30 days',
  },

  {
    value: '90d',
    label: 'Last 90 days',
  },
];

function normalizeTab(value: string | null): AnalyticsReportTab {
  if (value === 'sources' || value === 'geography' || value === 'technology' || value === 'events') {
    return value;
  }

  return 'pages';
}

function normalizeTechnologyDimension(value: string | null): TechnologyDimension {
  if (value === 'browsers' || value === 'operating-systems') {
    return value;
  }

  return 'devices';
}

function normalizePreset(value: string | null): AnalyticsPreset {
  if (value === 'today' || value === '30d' || value === '90d') {
    return value;
  }

  return '7d';
}

function normalizeDirection(value: string | null): SortDirection {
  return value === 'asc' ? 'asc' : 'desc';
}

function getDefaultSort(tab: AnalyticsReportTab): string {
  if (tab === 'pages') {
    return 'views';
  }

  if (tab === 'events') {
    return 'events';
  }

  return 'sessions';
}

function getSortOptions(tab: AnalyticsReportTab): Array<{
  value: string;
  label: string;
}> {
  if (tab === 'pages') {
    return [
      {
        value: 'views',
        label: 'Views',
      },

      {
        value: 'visitors',
        label: 'Visitors',
      },

      {
        value: 'sessions',
        label: 'Sessions',
      },

      {
        value: 'entrances',
        label: 'Entrances',
      },

      {
        value: 'exits',
        label: 'Exits',
      },

      {
        value: 'bounceRate',
        label: 'Bounce rate',
      },

      {
        value: 'averageDuration',
        label: 'Average duration',
      },

      {
        value: 'path',
        label: 'Path',
      },
    ];
  }

  if (tab === 'events') {
    return [
      {
        value: 'events',
        label: 'Total events',
      },

      {
        value: 'visitors',
        label: 'Visitors',
      },

      {
        value: 'sessions',
        label: 'Sessions',
      },

      {
        value: 'name',
        label: 'Name',
      },
    ];
  }

  return [
    {
      value: 'sessions',
      label: 'Sessions',
    },

    {
      value: 'visitors',
      label: 'Visitors',
    },

    {
      value: 'pageViews',
      label: 'Page views',
    },

    {
      value: 'label',
      label: 'Name',
    },
  ];
}

function formatDuration(seconds: number): string {
  if (seconds < 60) {
    return `${Math.round(seconds)}s`;
  }

  const minutes = Math.floor(seconds / 60);

  const remainingSeconds = Math.round(seconds % 60);

  return `${minutes}m ${remainingSeconds}s`;
}

function isPageReport(report: AnalyticsReportResponse): report is PageReportResponse {
  return 'items' in report && (report.items[0] === undefined || 'path' in report.items[0]);
}

function isEventReport(report: AnalyticsReportResponse): report is EventReportResponse {
  return 'summary' in report;
}

function ReportSkeleton() {
  return (
    <div className='space-y-4' aria-busy='true'>
      <div className='h-14 animate-pulse rounded-xl bg-slate-200' />

      <div className='h-96 animate-pulse rounded-xl bg-slate-200' />
    </div>
  );
}

function PageReportTable({ report }: { report: PageReportResponse }) {
  return (
    <div className='overflow-x-auto'>
      <table className='min-w-262.5 w-full border-collapse text-sm'>
        <thead>
          <tr className='border-b border-slate-200 bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500'>
            <th className='px-4 py-3'>Page</th>

            <th className='px-4 py-3 text-right'>Views</th>

            <th className='px-4 py-3 text-right'>Visitors</th>

            <th className='px-4 py-3 text-right'>Sessions</th>

            <th className='px-4 py-3 text-right' title='Sessions that began on this page.'>
              Entrances
            </th>

            <th className='px-4 py-3 text-right' title='Sessions whose final page was this page.'>
              Exits
            </th>

            <th className='px-4 py-3 text-right' title='Bounced entrance sessions divided by entrance sessions.'>
              Bounce rate
            </th>

            <th className='px-4 py-3 text-right' title='Average recorded page duration.'>
              Avg. duration
            </th>
          </tr>
        </thead>

        <tbody>
          {report.items.map((item) => (
            <tr key={item.path} className='border-b border-slate-100 last:border-0'>
              <td className='max-w-sm px-4 py-4'>
                <p className='truncate font-medium text-slate-900' title={item.title}>
                  {item.title}
                </p>

                <p className='mt-1 truncate text-xs text-slate-500' title={item.path}>
                  {item.path}
                </p>
              </td>

              <td className='px-4 py-4 text-right'>{numberFormatter.format(item.views)}</td>

              <td className='px-4 py-4 text-right'>{numberFormatter.format(item.visitors)}</td>

              <td className='px-4 py-4 text-right'>{numberFormatter.format(item.sessions)}</td>

              <td className='px-4 py-4 text-right'>{numberFormatter.format(item.entrances)}</td>

              <td className='px-4 py-4 text-right'>{numberFormatter.format(item.exits)}</td>

              <td className='px-4 py-4 text-right'>{item.bounceRate}%</td>

              <td className='px-4 py-4 text-right'>{formatDuration(item.averageDurationSeconds)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function EventReportTable({ report }: { report: EventReportResponse }) {
  return (
    <>
      <div className='grid gap-4 border-b border-slate-200 p-4 sm:grid-cols-3'>
        <div>
          <p className='text-xs font-medium uppercase tracking-wide text-slate-500'>Total events</p>

          <p className='mt-1 text-2xl font-bold text-slate-950'>{numberFormatter.format(report.summary.totalEvents)}</p>
        </div>

        <div>
          <p className='text-xs font-medium uppercase tracking-wide text-slate-500'>Unique visitors</p>

          <p className='mt-1 text-2xl font-bold text-slate-950'>{numberFormatter.format(report.summary.uniqueVisitors)}</p>
        </div>

        <div>
          <p className='text-xs font-medium uppercase tracking-wide text-slate-500'>Sessions</p>

          <p className='mt-1 text-2xl font-bold text-slate-950'>{numberFormatter.format(report.summary.uniqueSessions)}</p>
        </div>
      </div>

      <div className='overflow-x-auto'>
        <table className='min-w-162.5 w-full border-collapse text-sm'>
          <thead>
            <tr className='border-b border-slate-200 bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500'>
              <th className='px-4 py-3'>Event</th>

              <th className='px-4 py-3 text-right'>Total</th>

              <th className='px-4 py-3 text-right'>Visitors</th>

              <th className='px-4 py-3 text-right'>Sessions</th>
            </tr>
          </thead>

          <tbody>
            {report.items.map((item) => (
              <tr key={item.name} className='border-b border-slate-100 last:border-0'>
                <td className='px-4 py-4 font-medium text-slate-900'>{item.name}</td>

                <td className='px-4 py-4 text-right'>{numberFormatter.format(item.events)}</td>

                <td className='px-4 py-4 text-right'>{numberFormatter.format(item.visitors)}</td>

                <td className='px-4 py-4 text-right'>{numberFormatter.format(item.sessions)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function DimensionReportTable({ report }: { report: DimensionReportResponse }) {
  return (
    <div className='overflow-x-auto'>
      <table className='min-w-175 w-full border-collapse text-sm'>
        <thead>
          <tr className='border-b border-slate-200 bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500'>
            <th className='px-4 py-3'>Value</th>

            <th className='px-4 py-3 text-right'>Visitors</th>

            <th className='px-4 py-3 text-right'>Sessions</th>

            <th className='px-4 py-3 text-right'>Page views</th>

            <th className='px-4 py-3 text-right'>Share</th>
          </tr>
        </thead>

        <tbody>
          {report.items.map((item) => (
            <tr key={item.key} className='border-b border-slate-100 last:border-0'>
              <td className='px-4 py-4 font-medium text-slate-900'>{item.label}</td>

              <td className='px-4 py-4 text-right'>{numberFormatter.format(item.visitors)}</td>

              <td className='px-4 py-4 text-right'>{numberFormatter.format(item.sessions)}</td>

              <td className='px-4 py-4 text-right'>{numberFormatter.format(item.pageViews)}</td>

              <td className='px-4 py-4 text-right'>{item.percentage}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function AnalyticsReportsDashboard({ workspaceId, websiteId }: AnalyticsReportsDashboardProps) {
  const router = useRouter();

  const pathname = usePathname();

  const searchParams = useSearchParams();

  const tab = normalizeTab(searchParams.get('tab'));

  const dimension = normalizeTechnologyDimension(searchParams.get('dimension'));

  const preset = normalizePreset(searchParams.get('range'));

  const page = Math.max(1, Number(searchParams.get('page') ?? 1) || 1);

  const search = searchParams.get('search') ?? '';

  const sortBy = searchParams.get('sort') ?? getDefaultSort(tab);

  const sortDirection = normalizeDirection(searchParams.get('direction'));

  const [searchInput, setSearchInput] = useState(search);

  const [report, setReport] = useState<AnalyticsReportResponse | null>(null);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState<unknown>(null);

  const [exporting, setExporting] = useState(false);

  const [exportError, setExportError] = useState<string | null>(null);

  const request = useMemo<AnalyticsReportRequest>(
    () => ({
      workspaceId,

      websiteId,

      tab,

      dimension,

      preset,

      search,

      page,

      limit: 25,

      sortBy,

      sortDirection,
    }),
    [workspaceId, websiteId, tab, dimension, preset, search, page, sortBy, sortDirection],
  );

  function updateUrl(
    updates: Record<string, string | null>,

    resetPage = true,
  ): void {
    const params = new URLSearchParams(searchParams.toString());

    for (const [key, value] of Object.entries(updates)) {
      if (value === null || value === '') {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    }

    if (resetPage) {
      params.set('page', '1');
    }

    router.replace(`${pathname}?${params.toString()}`, {
      scroll: false,
    });
  }

  useEffect(() => {
    setSearchInput(search);
  }, [search]);

  useEffect(() => {
    const timer = window.setTimeout(
      () => {
        if (searchInput !== search) {
          updateUrl({
            search: searchInput.trim() || null,
          });
        }
      },

      350,
    );

    return () => {
      window.clearTimeout(timer);
    };
  }, [searchInput, search, updateUrl]);

  useEffect(() => {
    const controller = new AbortController();

    setLoading(true);
    setError(null);

    void getAnalyticsReport({
      ...request,

      signal: controller.signal,
    })
      .then((response) => {
        setReport(response);

        setLoading(false);
      })
      .catch((caughtError: unknown) => {
        if (controller.signal.aborted) {
          return;
        }

        setError(caughtError);

        setLoading(false);
      });

    return () => {
      controller.abort();
    };
  }, [request]);

  async function handleExport(): Promise<void> {
    setExporting(true);
    setExportError(null);

    try {
      await downloadAnalyticsReport(request);
    } catch (caughtError) {
      setExportError(getErrorMessage(caughtError));
    } finally {
      setExporting(false);
    }
  }

  const sortOptions = getSortOptions(tab);

  const pagination = report?.pagination;

  return (
    <main className='space-y-5'>
      <header className='rounded-2xl border border-slate-200 bg-white p-5 shadow-sm'>
        <div className='flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between'>
          <div>
            <p className='text-sm font-medium text-slate-500'>Analytics reports</p>

            <h1 className='mt-1 text-2xl font-bold tracking-tight text-slate-950'>Detailed analytics</h1>
          </div>

          <div className='flex flex-wrap gap-2'>
            <Link
              href={`/workspaces/${workspaceId}/websites/${websiteId}/analytics?range=${preset}`}
              className='rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50'
            >
              Overview
            </Link>

            <button
              type='button'
              disabled={exporting}
              onClick={() => void handleExport()}
              className='rounded-lg bg-slate-950 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60'
            >
              {exporting ? 'Exportingâ€¦' : 'Export CSV'}
            </button>
          </div>
        </div>

        {exportError ? (
          <p role='alert' className='mt-3 text-sm text-red-700'>
            {exportError}
          </p>
        ) : null}

        <nav className='mt-5 flex gap-1 overflow-x-auto border-b border-slate-200'>
          {MAIN_TABS.map((item) => (
            <button
              key={item.value}
              type='button'
              onClick={() => {
                updateUrl({
                  tab: item.value,
                  sort: getDefaultSort(item.value),
                  direction: 'desc',
                });
              }}
              className={`whitespace-nowrap border-b-2 px-4 py-3 text-sm font-medium ${
                tab === item.value ? 'border-slate-950 text-slate-950' : 'border-transparent text-slate-500 hover:text-slate-900'
              }`}
            >
              {item.label}
            </button>
          ))}
        </nav>
      </header>

      <section className='rounded-2xl border border-slate-200 bg-white p-4 shadow-sm'>
        <div className='grid gap-3 md:grid-cols-2 xl:grid-cols-5'>
          <label className='xl:col-span-2'>
            <span className='text-xs font-medium uppercase tracking-wide text-slate-500'>Search</span>

            <input
              type='search'
              value={searchInput}
              onChange={(event) => {
                setSearchInput(event.target.value);
              }}
              placeholder='Search report'
              className='mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-950'
            />
          </label>

          <label>
            <span className='text-xs font-medium uppercase tracking-wide text-slate-500'>Date range</span>

            <select
              value={preset}
              onChange={(event) => {
                updateUrl({
                  range: event.target.value,
                });
              }}
              className='mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-950'
            >
              {PRESET_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          {tab === 'technology' ? (
            <label>
              <span className='text-xs font-medium uppercase tracking-wide text-slate-500'>Technology</span>

              <select
                value={dimension}
                onChange={(event) => {
                  updateUrl({
                    dimension: event.target.value,
                  });
                }}
                className='mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-950'
              >
                {TECHNOLOGY_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          ) : null}

          <label>
            <span className='text-xs font-medium uppercase tracking-wide text-slate-500'>Sort by</span>

            <select
              value={sortBy}
              onChange={(event) => {
                updateUrl({
                  sort: event.target.value,
                });
              }}
              className='mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-950'
            >
              {sortOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span className='text-xs font-medium uppercase tracking-wide text-slate-500'>Direction</span>

            <select
              value={sortDirection}
              onChange={(event) => {
                updateUrl({
                  direction: event.target.value,
                });
              }}
              className='mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-950'
            >
              <option value='desc'>Highest first</option>

              <option value='asc'>Lowest first</option>
            </select>
          </label>
        </div>
      </section>

      {loading ? (
        <ReportSkeleton />
      ) : error ? (
        <PageError
          title='Unable to load analytics report'
          message={getErrorMessage(error)}
          requestId={error instanceof ApiError ? error.requestId : undefined}
          onRetry={() => {
            router.refresh();
          }}
        />
      ) : !report || report.items.length === 0 ? (
        <EmptyState title='No report data' description='No matching analytics data was found for the selected filters and date range.' icon={undefined} />
      ) : (
        <section className='overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm'>
          <div className='flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 py-3 text-sm text-slate-500'>
            <span>
              {report.range.from}
              {' â€” '}
              {report.range.to}
              {' Â· '}
              {report.range.timeZone}
            </span>

            <span>{report.pagination.total} results</span>
          </div>

          {isPageReport(report) ? (
            <PageReportTable report={report} />
          ) : isEventReport(report) ? (
            <EventReportTable report={report} />
          ) : (
            <DimensionReportTable report={report} />
          )}

          <div className='flex items-center justify-between gap-4 border-t border-slate-200 px-4 py-4'>
            <button
              type='button'
              disabled={!pagination?.hasPreviousPage}
              onClick={() => {
                updateUrl(
                  {
                    page: String(Math.max(1, page - 1)),
                  },

                  false,
                );
              }}
              className='rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50'
            >
              Previous
            </button>

            <span className='text-sm text-slate-600'>
              Page {pagination?.page} of {pagination?.totalPages}
            </span>

            <button
              type='button'
              disabled={!pagination?.hasNextPage}
              onClick={() => {
                updateUrl(
                  {
                    page: String(page + 1),
                  },

                  false,
                );
              }}
              className='rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50'
            >
              Next
            </button>
          </div>
        </section>
      )}
    </main>
  );
}
