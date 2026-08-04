'use client';

import {
    useEffect,
    useState,
} from 'react';

import Link from 'next/link';
import { useParams } from 'next/navigation';

import {
    Boxes,
    ChevronLeft,
    ChevronRight,
    Plus,
    RefreshCw,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
} from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Spinner } from '@/components/ui/spinner';

import { getApplications } from '@/features/applications/application-api';

import { ApplicationCard } from '@/features/applications/components/application-card';

import {
    ApplicationFilters,
    type ApplicationFilterValue,
} from '@/features/applications/components/application-filters';

import type {
    ApplicationListQuery,
    ApplicationPagination,
    SaasApplication,
} from '@/features/applications/application-types';

import { getErrorMessage } from '@/features/applications/application-utils';

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

function filtersToQuery(
    filters: ApplicationFilterValue,
): ApplicationListQuery {
    return {
        search:
            filters.search.trim() || undefined,
        status: filters.status || undefined,
        priority:
            filters.priority || undefined,
        category:
            filters.category || undefined,
        archived:
            filters.archiveView === 'archived',
        sortBy: filters.sortBy,
        sortOrder: filters.sortOrder,
        page: 1,
        limit: 12,
    };
}

export default function ApplicationsPage() {
    const params = useParams<{
        workspaceId: string;
    }>();

    const workspaceId = params.workspaceId;

    const [filterDraft, setFilterDraft] =
        useState<ApplicationFilterValue>(
            DEFAULT_FILTERS,
        );

    const [query, setQuery] =
        useState<ApplicationListQuery>(
            filtersToQuery(DEFAULT_FILTERS),
        );

    const [applications, setApplications] =
        useState<SaasApplication[]>([]);

    const [pagination, setPagination] =
        useState<ApplicationPagination>(
            DEFAULT_PAGINATION,
        );

    const [loading, setLoading] =
        useState(true);

    const [error, setError] =
        useState<string | null>(null);

    const [reloadKey, setReloadKey] =
        useState(0);

    useEffect(() => {
        let cancelled = false;

        async function loadApplications(): Promise<void> {
            try {
                const response =
                    await getApplications(
                        workspaceId,
                        query,
                    );

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

                setError(
                    getErrorMessage(
                        loadError,
                        'Unable to load applications.',
                    ),
                );
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

    function applyFilters(): void {
        setLoading(true);
        setQuery(
            filtersToQuery(filterDraft),
        );
    }

    function resetFilters(): void {
        setFilterDraft(DEFAULT_FILTERS);
        setLoading(true);
        setQuery(
            filtersToQuery(DEFAULT_FILTERS),
        );
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
        setReloadKey(
            (currentValue) =>
                currentValue + 1,
        );
    }

    return (
        <div className="space-y-6">
            <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                    <p className="text-sm font-semibold text-brand-600">
                        SaaS registry
                    </p>

                    <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-950">
                        Applications
                    </h1>

                    <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                        Manage your SaaS products,
                        technology stacks, important
                        links, status and launch dates.
                    </p>
                </div>

                <div className="flex gap-3">
                    <Button
                        variant="outline"
                        onClick={refresh}
                    >
                        <RefreshCw className="size-4" />
                        Refresh
                    </Button>

                    <Link
                        href={`/workspaces/${workspaceId}/applications/new`}
                        className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700"
                    >
                        <Plus className="size-4" />
                        New application
                    </Link>
                </div>
            </header>

            <ApplicationFilters
                value={filterDraft}
                onChange={setFilterDraft}
                onApply={applyFilters}
                onReset={resetFilters}
            />

            {loading ? (
                <div className="flex min-h-80 items-center justify-center">
                    <div className="flex items-center gap-3 text-sm text-slate-600">
                        <Spinner />
                        Loading applications...
                    </div>
                </div>
            ) : error ? (
                <Card>
                    <CardContent className="flex min-h-72 flex-col items-center justify-center text-center">
                        <div className="flex size-14 items-center justify-center rounded-2xl bg-red-50 text-red-600">
                            <Boxes className="size-6" />
                        </div>

                        <h2 className="mt-5 text-lg font-semibold text-slate-900">
                            Unable to load applications
                        </h2>

                        <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">
                            {error}
                        </p>

                        <Button
                            className="mt-6"
                            variant="outline"
                            onClick={refresh}
                        >
                            Try again
                        </Button>
                    </CardContent>
                </Card>
            ) : applications.length === 0 ? (
                <EmptyState
                    icon={
                        <Boxes className="size-6" />
                    }
                    title={
                        query.archived
                            ? 'No archived applications'
                            : 'No applications yet'
                    }
                    description={
                        query.archived
                            ? 'Archived applications will appear here.'
                            : 'Create your first SaaS application and start tracking its progress.'
                    }
                    action={
                        !query.archived ? (
                            <Link
                                href={`/workspaces/${workspaceId}/applications/new`}
                                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 text-sm font-semibold text-white hover:bg-brand-700"
                            >
                                <Plus className="size-4" />
                                Create application
                            </Link>
                        ) : undefined
                    }
                />
            ) : (
                <>
                    <div className="flex items-center justify-between">
                        <p className="text-sm text-slate-500">
                            Showing{' '}
                            <strong className="text-slate-800">
                                {applications.length}
                            </strong>{' '}
                            of{' '}
                            <strong className="text-slate-800">
                                {pagination.total}
                            </strong>{' '}
                            applications
                        </p>
                    </div>

                    <div className="grid gap-5 md:grid-cols-2 2xl:grid-cols-3">
                        {applications.map(
                            (application) => (
                                <ApplicationCard
                                    key={application.id}
                                    workspaceId={workspaceId}
                                    application={
                                        application
                                    }
                                />
                            ),
                        )}
                    </div>

                    {pagination.totalPages > 1 ? (
                        <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-4">
                            <p className="text-sm text-slate-500">
                                Page {pagination.page} of{' '}
                                {pagination.totalPages}
                            </p>

                            <div className="flex gap-2">
                                <Button
                                    variant="outline"
                                    disabled={
                                        !pagination.hasPreviousPage
                                    }
                                    onClick={() =>
                                        changePage(
                                            pagination.page - 1,
                                        )
                                    }
                                >
                                    <ChevronLeft className="size-4" />
                                    Previous
                                </Button>

                                <Button
                                    variant="outline"
                                    disabled={
                                        !pagination.hasNextPage
                                    }
                                    onClick={() =>
                                        changePage(
                                            pagination.page + 1,
                                        )
                                    }
                                >
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