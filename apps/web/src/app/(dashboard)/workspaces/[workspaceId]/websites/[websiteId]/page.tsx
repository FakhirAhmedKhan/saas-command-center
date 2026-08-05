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
    Clock3,
    Code2,
    Globe2,
    KeyRound,
    Link2,
    Pencil,
    Settings,
} from 'lucide-react';

import {
    Badge,
} from '@/components/ui/badge';

import {
    Card,
    CardContent,
    CardHeader,
} from '@/components/ui/card';

import {
    Spinner,
} from '@/components/ui/spinner';

import {
    getWebsite,
} from '@/features/websites/website-api';

import type {
    Website,
} from '@/features/websites/website-types';

import {
    formatWebsiteDate,
    getWebsiteError,
} from '@/features/websites/website-utils';

export default function WebsiteDetailsPage() {
    const params =
        useParams<{
            workspaceId: string;
            websiteId: string;
        }>();

    const {
        workspaceId,
        websiteId,
    } = params;

    const [website, setWebsite] =
        useState<Website | null>(
            null,
        );

    const [loading, setLoading] =
        useState(true);

    const [error, setError] =
        useState<string | null>(
            null,
        );

    useEffect(() => {
        let cancelled = false;

        async function load(): Promise<void> {
            try {
                const response =
                    await getWebsite(
                        workspaceId,
                        websiteId,
                    );

                if (!cancelled) {
                    setWebsite(response);
                    setError(null);
                }
            } catch (
            loadError: unknown
            ) {
                if (!cancelled) {
                    setError(
                        getWebsiteError(
                            loadError,
                            'Unable to load website.',
                        ),
                    );
                }
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
    }, [
        workspaceId,
        websiteId,
    ]);

    if (loading) {
        return (
            <div className="flex min-h-80 items-center justify-center">
                <Spinner />
            </div>
        );
    }

    if (!website) {
        return (
            <Card>
                <CardContent className="p-10 text-center">
                    <h2 className="text-lg font-semibold">
                        Website not available
                    </h2>

                    <p className="mt-2 text-sm text-red-600">
                        {error}
                    </p>
                </CardContent>
            </Card>
        );
    }

    const baseHref =
        `/workspaces/${workspaceId}/websites/${websiteId}`;

    return (
        <div className="space-y-6">
            <header>
                <Link
                    href={`/workspaces/${workspaceId}/websites`}
                    className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-slate-900"
                >
                    <ArrowLeft className="size-4" />
                    Back to websites
                </Link>

                <div className="mt-6 flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                        <div className="flex flex-wrap gap-2">
                            {website.archivedAt ? (
                                <Badge variant="slate">
                                    Archived
                                </Badge>
                            ) : website.enabled ? (
                                <Badge variant="green">
                                    Tracking enabled
                                </Badge>
                            ) : (
                                <Badge variant="orange">
                                    Tracking disabled
                                </Badge>
                            )}

                            {website.application ? (
                                <Badge variant="blue">
                                    {
                                        website.application
                                            .name
                                    }
                                </Badge>
                            ) : (
                                <Badge variant="slate">
                                    Not connected
                                </Badge>
                            )}
                        </div>

                        <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-950">
                            {website.name}
                        </h1>

                        <a
                            href={`https://${website.domain}`}
                            target="_blank"
                            rel="noreferrer"
                            className="mt-2 inline-flex items-center gap-2 text-sm font-semibold text-brand-700 hover:underline"
                        >
                            <Globe2 className="size-4" />
                            {website.domain}
                        </a>
                    </div>

                    <div className="flex flex-wrap gap-3">
                        {!website.archivedAt ? (
                            <Link
                                href={`${baseHref}/edit`}
                                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                            >
                                <Pencil className="size-4" />
                                Edit
                            </Link>
                        ) : null}

                        <Link
                            href={`${baseHref}/installation`}
                            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 text-sm font-semibold text-white hover:bg-brand-700"
                        >
                            <Code2 className="size-4" />
                            Installation
                        </Link>

                        <Link
                            href={`${baseHref}/settings`}
                            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 text-sm font-semibold text-white hover:bg-slate-800"
                        >
                            <Settings className="size-4" />
                            Settings
                        </Link>
                    </div>
                </div>
            </header>

            <div className="grid gap-5 lg:grid-cols-3">
                <Card className="lg:col-span-2">
                    <CardHeader>
                        <h2 className="font-semibold text-slate-950">
                            Allowed origins
                        </h2>
                    </CardHeader>

                    <CardContent>
                        <div className="space-y-3">
                            {website.allowedOrigins.map(
                                (origin) => (
                                    <div
                                        key={origin}
                                        className="flex items-center gap-3 rounded-xl bg-slate-50 px-4 py-3"
                                    >
                                        <Globe2 className="size-4 text-slate-400" />

                                        <code className="break-all text-sm text-slate-700">
                                            {origin}
                                        </code>
                                    </div>
                                ),
                            )}
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <h2 className="font-semibold text-slate-950">
                            Configuration
                        </h2>
                    </CardHeader>

                    <CardContent className="space-y-4">
                        <DetailRow
                            icon={
                                <Clock3 className="size-4" />
                            }
                            label="Time zone"
                            value={
                                website.timeZone
                            }
                        />

                        <DetailRow
                            icon={
                                <KeyRound className="size-4" />
                            }
                            label="Key prefix"
                            value={
                                website.trackingKeyPrefix
                            }
                            mono
                        />

                        <DetailRow
                            icon={
                                <Link2 className="size-4" />
                            }
                            label="Application"
                            value={
                                website.application
                                    ?.name ??
                                'Not connected'
                            }
                        />

                        <DetailRow
                            label="Key rotated"
                            value={formatWebsiteDate(
                                website.trackingKeyRotatedAt,
                            )}
                        />

                        <DetailRow
                            label="Last event"
                            value={formatWebsiteDate(
                                website.lastEventAt,
                            )}
                        />

                        <DetailRow
                            label="Created"
                            value={formatWebsiteDate(
                                website.createdAt,
                            )}
                        />
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

function DetailRow({
    icon,
    label,
    value,
    mono = false,
}: {
    icon?: React.ReactNode;
    label: string;
    value: string;
    mono?: boolean;
}) {
    return (
        <div className="border-b border-slate-100 pb-3 last:border-0 last:pb-0">
            <div className="flex items-center gap-2 text-xs font-medium text-slate-400">
                {icon}
                {label}
            </div>

            <p
                className={`mt-1 break-all text-sm font-semibold text-slate-800 ${mono
                        ? 'font-mono'
                        : ''
                    }`}
            >
                {value}
            </p>
        </div>
    );
}