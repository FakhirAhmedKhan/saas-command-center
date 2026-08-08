'use client';

import {
    useMemo,
} from 'react';

import {
    usePathname,
    useRouter,
    useSearchParams,
} from 'next/navigation';


import {
    PageError,
} from '@/components/states/page-error';

import type {
    AnalyticsBreakdownItem,
    AnalyticsMetric,
    AnalyticsOverviewResponse,
    AnalyticsPreset,
    AnalyticsTrendPoint,
} from './analytics-overview.types';

import {
    useAnalyticsOverview,
} from './use-analytics-overview';
import { EmptyState } from '@/components/ui/empty-state';
import { ApiError } from '@/features/lib/api/api-error';
import { getErrorMessage } from '../applications/application-utils';

interface AnalyticsOverviewDashboardProps {
    workspaceId: string;

    websiteId: string;
}

interface MetricCardProps {
    title: string;

    metric:
    AnalyticsMetric;

    formattedValue: string;

    description: string;
}

interface BreakdownPanelProps {
    title: string;

    items:
    AnalyticsBreakdownItem[];

    emptyLabel: string;
}

const PRESETS: Array<{
    value:
    AnalyticsPreset;

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

const numberFormatter =
    new Intl.NumberFormat(
        'en-US',
    );

function formatNumber(
    value: number,
): string {
    return numberFormatter
        .format(value);
}

function formatDuration(
    totalSeconds: number,
): string {
    if (
        totalSeconds <
        60
    ) {
        return `${Math.round(
            totalSeconds,
        )}s`;
    }

    const minutes =
        Math.floor(
            totalSeconds / 60,
        );

    const seconds =
        Math.round(
            totalSeconds % 60,
        );

    return `${minutes}m ${seconds}s`;
}

function formatMetricChange(
    changePercent:
        | number
        | null,
): {
    label: string;
    className: string;
} {
    if (
        changePercent ===
        null
    ) {
        return {
            label:
                'New activity',

            className:
                'text-blue-700 bg-blue-50',
        };
    }

    if (
        changePercent > 0
    ) {
        return {
            label:
                `â†‘ ${Math.abs(
                    changePercent,
                )}%`,

            className:
                'text-emerald-700 bg-emerald-50',
        };
    }

    if (
        changePercent < 0
    ) {
        return {
            label:
                `â†“ ${Math.abs(
                    changePercent,
                )}%`,

            className:
                'text-red-700 bg-red-50',
        };
    }

    return {
        label:
            'No change',

        className:
            'text-slate-600 bg-slate-100',
    };
}

function MetricCard({
    title,
    metric,
    formattedValue,
    description,
}: MetricCardProps) {
    const change =
        formatMetricChange(
            metric.changePercent,
        );

    return (
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-3">
                <div>
                    <p className="text-sm font-medium text-slate-600">
                        {title}
                    </p>

                    <p className="mt-2 text-3xl font-bold tracking-tight text-slate-950">
                        {formattedValue}
                    </p>
                </div>

                <span
                    className={`rounded-full px-2.5 py-1 text-xs font-semibold ${change.className}`}
                >
                    {change.label}
                </span>
            </div>

            <p className="mt-3 text-xs text-slate-500">
                {description}
            </p>
        </article>
    );
}

function BreakdownPanel({
    title,
    items,
    emptyLabel,
}: BreakdownPanelProps) {
    const maximumValue =
        Math.max(
            ...items.map(
                (item) =>
                    item.value,
            ),
            1,
        );

    return (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-base font-semibold text-slate-950">
                {title}
            </h2>

            {items.length ===
                0 ? (
                <p className="mt-5 text-sm text-slate-500">
                    {emptyLabel}
                </p>
            ) : (
                <div className="mt-5 space-y-4">
                    {items.map(
                        (item) => {
                            const barWidth =
                                Math.max(
                                    4,

                                    (
                                        item.value /
                                        maximumValue
                                    ) *
                                    100,
                                );

                            return (
                                <div
                                    key={
                                        item.key
                                    }
                                >
                                    <div className="mb-1.5 flex items-center justify-between gap-3 text-sm">
                                        <span
                                            className="min-w-0 truncate font-medium text-slate-800"
                                            title={
                                                item.label
                                            }
                                        >
                                            {
                                                item.label
                                            }
                                        </span>

                                        <span className="shrink-0 text-slate-500">
                                            {formatNumber(
                                                item.value,
                                            )}
                                            {' Â· '}
                                            {
                                                item.percentage
                                            }
                                            %
                                        </span>
                                    </div>

                                    <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                                        <div
                                            className="h-full rounded-full bg-slate-900"
                                            style={{
                                                width: `${barWidth}%`,
                                            }}
                                        />
                                    </div>
                                </div>
                            );
                        },
                    )}
                </div>
            )}
        </section>
    );
}

function buildChartPoints(
    values: number[],
    width: number,
    height: number,
    padding: number,
): string {
    if (
        values.length === 0
    ) {
        return '';
    }

    const maximum =
        Math.max(
            ...values,
            1,
        );

    return values
        .map(
            (
                value,
                index,
            ) => {
                const x =
                    values.length ===
                        1
                        ? width / 2
                        : padding +
                        (
                            index /
                            (
                                values.length -
                                1
                            )
                        ) *
                        (
                            width -
                            padding * 2
                        );

                const y =
                    height -
                    padding -
                    (
                        value /
                        maximum
                    ) *
                    (
                        height -
                        padding * 2
                    );

                return `${x},${y}`;
            },
        )
        .join(' ');
}

function formatTrendLabel(
    value: string,
    timeZone: string,
    granularity:
        | 'hour'
        | 'day',
): string {
    const date =
        new Date(value);

    return new Intl
        .DateTimeFormat(
            'en-US',
            granularity ===
                'hour'
                ? {
                    timeZone,

                    hour:
                        'numeric',

                    month:
                        'short',

                    day:
                        'numeric',
                }
                : {
                    timeZone,

                    month:
                        'short',

                    day:
                        'numeric',
                },
        )
        .format(date);
}

function TrafficChart({
    points,
    timeZone,
    granularity,
}: {
    points:
    AnalyticsTrendPoint[];

    timeZone: string;

    granularity:
    | 'hour'
    | 'day';
}) {
    const width =
        900;

    const height =
        260;

    const padding =
        28;

    const pageViewPoints =
        useMemo(
            () =>
                buildChartPoints(
                    points.map(
                        (point) =>
                            point.pageViews,
                    ),

                    width,

                    height,

                    padding,
                ),
            [
                points,
            ],
        );

    const maximumValue =
        Math.max(
            ...points.map(
                (point) =>
                    point.pageViews,
            ),
            0,
        );

    const labelIndexes =
        points.length <= 3
            ? points.map(
                (
                    _point,
                    index,
                ) => index,
            )
            : [
                0,

                Math.floor(
                    (
                        points.length -
                        1
                    ) / 2,
                ),

                points.length -
                1,
            ];

    return (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-2">
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                    <h2 className="text-base font-semibold text-slate-950">
                        Traffic trend
                    </h2>

                    <p className="mt-1 text-sm text-slate-500">
                        Page views by{' '}
                        {granularity}
                    </p>
                </div>

                <div className="text-right">
                    <p className="text-xs text-slate-500">
                        Peak
                    </p>

                    <p className="font-semibold text-slate-900">
                        {formatNumber(
                            maximumValue,
                        )}
                    </p>
                </div>
            </div>

            {points.length ===
                0 ? (
                <div className="flex h-64 items-center justify-center text-sm text-slate-500">
                    No traffic was recorded
                    in this range.
                </div>
            ) : (
                <>
                    <div className="mt-6 overflow-hidden">
                        <svg
                            viewBox={`0 0 ${width} ${height}`}
                            className="h-64 w-full"
                            role="img"
                            aria-label="Page views trend chart"
                            preserveAspectRatio="none"
                        >
                            {[0.25, 0.5, 0.75].map(
                                (
                                    ratio,
                                ) => (
                                    <line
                                        key={
                                            ratio
                                        }
                                        x1={
                                            padding
                                        }
                                        x2={
                                            width -
                                            padding
                                        }
                                        y1={
                                            height *
                                            ratio
                                        }
                                        y2={
                                            height *
                                            ratio
                                        }
                                        stroke="currentColor"
                                        className="text-slate-100"
                                        strokeWidth="1"
                                    />
                                ),
                            )}

                            <polyline
                                fill="none"
                                stroke="currentColor"
                                className="text-slate-950"
                                strokeWidth="4"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                points={
                                    pageViewPoints
                                }
                            />
                        </svg>
                    </div>

                    <div className="flex justify-between gap-3 text-xs text-slate-500">
                        {labelIndexes.map(
                            (
                                index,
                            ) => {
                                const point =
                                    points[index];

                                if (!point) {
                                    return null;
                                }

                                return (
                                    <span
                                        key={
                                            point.bucketStart
                                        }
                                    >
                                        {formatTrendLabel(
                                            point.bucketStart,
                                            timeZone,
                                            granularity,
                                        )}
                                    </span>
                                );
                            },
                        )}
                    </div>
                </>
            )}
        </section>
    );
}

function AnalyticsSkeleton() {
    return (
        <div
            className="space-y-6"
            aria-busy="true"
            aria-label="Loading analytics"
        >
            <div className="h-16 animate-pulse rounded-2xl bg-slate-200" />

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
                {Array.from({
                    length: 5,
                }).map(
                    (
                        _item,
                        index,
                    ) => (
                        <div
                            key={
                                index
                            }
                            className="h-36 animate-pulse rounded-2xl bg-slate-200"
                        />
                    ),
                )}
            </div>

            <div className="h-80 animate-pulse rounded-2xl bg-slate-200" />
        </div>
    );
}

function AnalyticsContent({
    data,
}: {
    data:
    AnalyticsOverviewResponse;
}) {
    return (
        <>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
                <MetricCard
                    title="Visitors"
                    metric={
                        data.metrics
                            .visitors
                    }
                    formattedValue={formatNumber(
                        data.metrics
                            .visitors
                            .value,
                    )}
                    description="Unique visitors with activity during this period."
                />

                <MetricCard
                    title="Sessions"
                    metric={
                        data.metrics
                            .sessions
                    }
                    formattedValue={formatNumber(
                        data.metrics
                            .sessions
                            .value,
                    )}
                    description="Distinct active sessions during this period."
                />

                <MetricCard
                    title="Page views"
                    metric={
                        data.metrics
                            .pageViews
                    }
                    formattedValue={formatNumber(
                        data.metrics
                            .pageViews
                            .value,
                    )}
                    description="Processed page-view events during this period."
                />

                <MetricCard
                    title="Bounce rate"
                    metric={
                        data.metrics
                            .bounceRate
                    }
                    formattedValue={`${data.metrics.bounceRate.value}%`}
                    description="Percentage of measured sessions that bounced."
                />

                <MetricCard
                    title="Avg. duration"
                    metric={
                        data.metrics
                            .averageDurationSeconds
                    }
                    formattedValue={formatDuration(
                        data.metrics
                            .averageDurationSeconds
                            .value,
                    )}
                    description="Average duration of sessions started in this period."
                />
            </div>

            <div className="mt-6 grid gap-6 lg:grid-cols-2">
                <TrafficChart
                    points={
                        data.trend
                    }
                    timeZone={
                        data.website
                            .timeZone
                    }
                    granularity={
                        data.range
                            .granularity
                    }
                />
            </div>

            <div className="mt-6 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                <BreakdownPanel
                    title="Top pages"
                    items={
                        data.topPages
                    }
                    emptyLabel="No page data available."
                />

                <BreakdownPanel
                    title="Top sources"
                    items={
                        data.topSources
                    }
                    emptyLabel="No source data available."
                />

                <BreakdownPanel
                    title="Countries"
                    items={
                        data.topCountries
                    }
                    emptyLabel="No country data available."
                />

                <BreakdownPanel
                    title="Devices"
                    items={
                        data.topDevices
                    }
                    emptyLabel="No device data available."
                />

                <BreakdownPanel
                    title="Browsers"
                    items={
                        data.topBrowsers
                    }
                    emptyLabel="No browser data available."
                />

                <BreakdownPanel
                    title="Operating systems"
                    items={
                        data
                            .topOperatingSystems
                    }
                    emptyLabel="No operating-system data available."
                />
            </div>
        </>
    );
}

export function AnalyticsOverviewDashboard({
    workspaceId,
    websiteId,
}: AnalyticsOverviewDashboardProps) {
    const router =
        useRouter();

    const pathname =
        usePathname();

    const searchParams =
        useSearchParams();

    const rawPreset =
        searchParams.get(
            'range',
        );

    const preset:
        AnalyticsPreset =
        rawPreset ===
            'today' ||
            rawPreset ===
            '30d' ||
            rawPreset ===
            '90d'
            ? rawPreset
            : '7d';

    const {
        data,
        loading,
        error,
        reload,
    } =
        useAnalyticsOverview(
            {
                workspaceId,

                websiteId,

                preset,
            },
        );

    function updatePreset(
        nextPreset:
            AnalyticsPreset,
    ): void {
        const nextParams =
            new URLSearchParams(
                searchParams
                    .toString(),
            );

        nextParams.set(
            'range',
            nextPreset,
        );

        router.replace(
            `${pathname}?${nextParams.toString()}`,
            {
                scroll: false,
            },
        );
    }

    if (loading) {
        return (
            <AnalyticsSkeleton />
        );
    }

    if (error) {
        return (
            <PageError
                title="Analytics unavailable"
                message={getErrorMessage(
                    error,
                )}
                requestId={
                    error instanceof
                        ApiError
                        ? error
                            .requestId 
                        : undefined
                }
                onRetry={
                    reload
                }
            />
        );
    }

    if (!data) {
        return (
            <PageError
                message="The analytics API returned no data."
                onRetry={
                    reload
                }
            />
        );
    }

    return (
        <main className="space-y-6">
            <header className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:flex-row md:items-center md:justify-between">
                <div>
                    <p className="text-sm font-medium text-slate-500">
                        Analytics
                    </p>

                    <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-950">
                        {
                            data.website
                                .name
                        }
                    </h1>

                    <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-sm text-slate-500">
                        <span>
                            {
                                data.website
                                    .domain
                            }
                        </span>

                        <span aria-hidden="true">
                            â€¢
                        </span>

                        <span>
                            {
                                data.website
                                    .timeZone
                            }
                        </span>

                        <span aria-hidden="true">
                            â€¢
                        </span>

                        <span>
                            {
                                data.range
                                    .from
                            }
                            {' â€” '}
                            {
                                data.range
                                    .to
                            }
                        </span>
                    </div>
                </div>

                <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                    <span>
                        Date range
                    </span>

                    <select
                        value={
                            preset
                        }
                        onChange={(
                            event,
                        ) => {
                            updatePreset(
                                event
                                    .target
                                    .value as AnalyticsPreset,
                            );
                        }}
                        className="rounded-lg border border-slate-300 bg-white px-3 py-2 outline-none focus:border-slate-950"
                    >
                        {PRESETS.map(
                            (
                                option,
                            ) => (
                                <option
                                    key={
                                        option.value
                                    }
                                    value={
                                        option.value
                                    }
                                >
                                    {
                                        option.label
                                    }
                                </option>
                            ),
                        )}
                    </select>
                </label>
            </header>

            {data.empty ? (
                <EmptyState
                    title="No analytics yet"
                    description="Tracking is connected, but no processed visitor sessions or page views were found for this date range." icon={undefined} />
            ) : (
                <AnalyticsContent
                    data={
                        data
                    }
                />
            )}
        </main>
    );
}
