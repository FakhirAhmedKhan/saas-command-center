'use client';

import {
    useEffect,
    useState,
} from 'react';

import Link from 'next/link';

import {
    useParams,
} from 'next/navigation';

import {
    ArrowLeft,
    ChevronLeft,
    ChevronRight,
    Radio,
    RefreshCw,
} from 'lucide-react';

import {
    Badge,
} from '@/components/ui/badge';

import {
    Button,
} from '@/components/ui/button';

import {
    Card,
    CardContent,
    CardHeader,
} from '@/components/ui/card';

import {
    Input,
} from '@/components/ui/input';

import {
    Select,
} from '@/components/ui/select';

import {
    Spinner,
} from '@/components/ui/spinner';

import {
    getRawTrackingEvents,
} from '@/features/tracking/tracking-api';

import type {
    RawEventQuery,
    RawEventsResponse,
    RawEventType,
} from '@/features/tracking/tracking-types';

import {
    formatTrackingDate,
    getTrackingError,
} from '@/features/tracking/tracking-utils';

const EMPTY_RESPONSE:
    RawEventsResponse = {
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

export default function RawEventsPage() {
    const params =
        useParams<{
            workspaceId: string;
            websiteId: string;
        }>();

    const {
        workspaceId,
        websiteId,
    } = params;

    const [type, setType] =
        useState<
            RawEventType | ''
        >('');

    const [
        eventName,
        setEventName,
    ] = useState('');

    const [query, setQuery] =
        useState<RawEventQuery>({
            page: 1,
            limit: 50,
        });

    const [response, setResponse] =
        useState<RawEventsResponse>(
            EMPTY_RESPONSE,
        );

    const [loading, setLoading] =
        useState(true);

    const [error, setError] =
        useState<string | null>(
            null,
        );

    const [
        reloadKey,
        setReloadKey,
    ] = useState(0);

    useEffect(() => {
        let cancelled = false;

        async function load(): Promise<void> {
            try {
                const result =
                    await getRawTrackingEvents(
                        workspaceId,
                        websiteId,
                        query,
                    );

                if (!cancelled) {
                    setResponse(result);
                    setError(null);
                    setLoading(false);
                }
            } catch (
            loadError: unknown
            ) {
                if (!cancelled) {
                    setError(
                        getTrackingError(
                            loadError,
                        ),
                    );

                    setLoading(false);
                }
            }
        }

        void load();

        return () => {
            cancelled = true;
        };
    }, [
        workspaceId,
        websiteId,
        query,
        reloadKey,
    ]);

    function applyFilters():
        void {
        setLoading(true);

        setQuery({
            type:
                type || undefined,

            eventName:
                eventName.trim() ||
                undefined,

            page: 1,
            limit: 50,
        });
    }

    function resetFilters():
        void {
        setType('');
        setEventName('');
        setLoading(true);

        setQuery({
            page: 1,
            limit: 50,
        });
    }

    function changePage(
        page: number,
    ): void {
        setLoading(true);

        setQuery(
            (current) => ({
                ...current,
                page,
            }),
        );
    }

    return (
        <div className="space-y-6">
            <Link
                href={`/workspaces/${workspaceId}/websites/${websiteId}`}
                className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-slate-900"
            >
                <ArrowLeft className="size-4" />
                Back to website
            </Link>

            <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                    <div className="flex items-center gap-3">
                        <Radio className="size-6 text-brand-600" />

                        <h1 className="text-3xl font-bold tracking-tight text-slate-950">
                            Raw tracking events
                        </h1>
                    </div>

                    <p className="mt-2 text-sm leading-6 text-slate-500">
                        Inspect the raw stream before
                        Phase 10 converts it into visitors,
                        sessions, page views, and reports.
                    </p>
                </div>

                <Button
                    variant="outline"
                    onClick={() => {
                        setLoading(true);

                        setReloadKey(
                            (current) =>
                                current + 1,
                        );
                    }}
                >
                    <RefreshCw className="size-4" />
                    Refresh
                </Button>
            </header>

            <Card>
                <CardContent className="p-4">
                    <form
                        className="grid gap-4 md:grid-cols-[200px_minmax(220px,1fr)_auto_auto]"
                        onSubmit={(event) => {
                            event.preventDefault();
                            applyFilters();
                        }}
                    >
                        <Select
                            value={type}
                            onChange={(event) =>
                                setType(
                                    event.target
                                        .value as
                                    | RawEventType
                                    | '',
                                )
                            }
                        >
                            <option value="">
                                All event types
                            </option>

                            <option value="PAGE_VIEW">
                                Page view
                            </option>

                            <option value="HEARTBEAT">
                                Heartbeat
                            </option>

                            <option value="CUSTOM">
                                Custom event
                            </option>
                        </Select>

                        <Input
                            placeholder="Custom event name..."
                            value={eventName}
                            onChange={(event) =>
                                setEventName(
                                    event.target.value,
                                )
                            }
                        />

                        <Button type="submit">
                            Apply
                        </Button>

                        <Button
                            type="button"
                            variant="ghost"
                            onClick={
                                resetFilters
                            }
                        >
                            Reset
                        </Button>
                    </form>
                </CardContent>
            </Card>

            {loading ? (
                <div className="flex min-h-72 items-center justify-center">
                    <div className="flex items-center gap-3 text-sm text-slate-600">
                        <Spinner />
                        Loading events...
                    </div>
                </div>
            ) : error ? (
                <Card>
                    <CardContent className="p-8 text-center text-sm text-red-600">
                        {error}
                    </CardContent>
                </Card>
            ) : response.data.length ===
                0 ? (
                <Card>
                    <CardContent className="p-12 text-center">
                        <Radio className="mx-auto size-8 text-slate-400" />

                        <h2 className="mt-4 font-semibold text-slate-900">
                            No tracking events found
                        </h2>

                        <p className="mt-2 text-sm text-slate-500">
                            Install the tracker and visit the
                            external website.
                        </p>
                    </CardContent>
                </Card>
            ) : (
                <Card>
                    <CardHeader>
                        <p className="text-sm text-slate-500">
                            Showing{' '}
                            <strong>
                                {response.data.length}
                            </strong>{' '}
                            of{' '}
                            <strong>
                                {
                                    response.meta
                                        .total
                                }
                            </strong>{' '}
                            events
                        </p>
                    </CardHeader>

                    <CardContent>
                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[1050px] border-collapse text-left text-sm">
                                <thead>
                                    <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-400">
                                        <th className="px-3 py-3">
                                            Type
                                        </th>

                                        <th className="px-3 py-3">
                                            Page
                                        </th>

                                        <th className="px-3 py-3">
                                            Event
                                        </th>

                                        <th className="px-3 py-3">
                                            Visitor
                                        </th>

                                        <th className="px-3 py-3">
                                            Session
                                        </th>

                                        <th className="px-3 py-3">
                                            Occurred
                                        </th>

                                        <th className="px-3 py-3">
                                            SDK
                                        </th>
                                    </tr>
                                </thead>

                                <tbody>
                                    {response.data.map(
                                        (event) => (
                                            <tr
                                                key={event.id}
                                                className="border-b border-slate-100 align-top last:border-0"
                                            >
                                                <td className="px-3 py-4">
                                                    <EventBadge
                                                        type={
                                                            event.type
                                                        }
                                                    />
                                                </td>

                                                <td className="max-w-xs px-3 py-4">
                                                    <p className="truncate font-medium text-slate-800">
                                                        {
                                                            event.pageTitle ??
                                                            event.pagePath
                                                        }
                                                    </p>

                                                    <p className="mt-1 truncate text-xs text-slate-400">
                                                        {
                                                            event.pagePath
                                                        }
                                                    </p>
                                                </td>

                                                <td className="px-3 py-4">
                                                    {event.eventName ??
                                                        '—'}
                                                </td>

                                                <td className="px-3 py-4 font-mono text-xs">
                                                    {event.visitorId.slice(
                                                        0,
                                                        12,
                                                    )}
                                                    …
                                                </td>

                                                <td className="px-3 py-4 font-mono text-xs">
                                                    {event.sessionId.slice(
                                                        0,
                                                        12,
                                                    )}
                                                    …
                                                </td>

                                                <td className="whitespace-nowrap px-3 py-4 text-xs text-slate-500">
                                                    {formatTrackingDate(
                                                        event.occurredAt,
                                                    )}
                                                </td>

                                                <td className="px-3 py-4">
                                                    {
                                                        event.sdkVersion
                                                    }
                                                </td>
                                            </tr>
                                        ),
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {response.meta
                            .totalPages > 1 ? (
                            <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-5">
                                <p className="text-sm text-slate-500">
                                    Page{' '}
                                    {
                                        response.meta
                                            .page
                                    }{' '}
                                    of{' '}
                                    {
                                        response.meta
                                            .totalPages
                                    }
                                </p>

                                <div className="flex gap-2">
                                    <Button
                                        variant="outline"
                                        disabled={
                                            !response.meta
                                                .hasPreviousPage
                                        }
                                        onClick={() =>
                                            changePage(
                                                response.meta
                                                    .page - 1,
                                            )
                                        }
                                    >
                                        <ChevronLeft className="size-4" />
                                        Previous
                                    </Button>

                                    <Button
                                        variant="outline"
                                        disabled={
                                            !response.meta
                                                .hasNextPage
                                        }
                                        onClick={() =>
                                            changePage(
                                                response.meta
                                                    .page + 1,
                                            )
                                        }
                                    >
                                        Next
                                        <ChevronRight className="size-4" />
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

function EventBadge({
    type,
}: {
    type: RawEventType;
}) {
    if (
        type === 'PAGE_VIEW'
    ) {
        return (
            <Badge variant="blue">
                Page view
            </Badge>
        );
    }

    if (
        type === 'HEARTBEAT'
    ) {
        return (
            <Badge variant="green">
                Heartbeat
            </Badge>
        );
    }

    return (
        <Badge variant="purple">
            Custom
        </Badge>
    );
}