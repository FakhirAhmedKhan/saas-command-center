'use client';

import {
    useEffect,
    useMemo,
    useState,
} from 'react';

import Link from 'next/link';

import {
    useParams,
} from 'next/navigation';

import {
    ArrowLeft,
    Check,
    Clipboard,
    Code2,
    KeyRound,
} from 'lucide-react';

import {
    Button,
} from '@/components/ui/button';

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
    getWebsiteError,
    websiteKeyStorageName,
} from '@/features/websites/website-utils';

const TRACKER_SCRIPT_URL =
    process.env
        .NEXT_PUBLIC_TRACKER_SCRIPT_URL ??
    'http://localhost:3002/tracker.js';

export default function WebsiteInstallationPage() {
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

    const [
        trackingKey,
        setTrackingKey,
    ] = useState<string | null>(
        null,
    );

    const [loading, setLoading] =
        useState(true);

    const [error, setError] =
        useState<string | null>(
            null,
        );

    const [copied, setCopied] =
        useState<
            'key' | 'snippet' | null
        >(null);

    useEffect(() => {
        let cancelled = false;

        async function load(): Promise<void> {
            try {
                const response =
                    await getWebsite(
                        workspaceId,
                        websiteId,
                    );

                const storedKey =
                    sessionStorage.getItem(
                        websiteKeyStorageName(
                            websiteId,
                        ),
                    );

                if (!cancelled) {
                    setWebsite(response);
                    setTrackingKey(
                        storedKey,
                    );
                    setError(null);
                }
            } catch (
            loadError: unknown
            ) {
                if (!cancelled) {
                    setError(
                        getWebsiteError(
                            loadError,
                            'Unable to load installation configuration.',
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

    const snippet =
        useMemo(() => {
            const key =
                trackingKey ??
                'YOUR_TRACKING_KEY';

            return `<script
  async
  src="${TRACKER_SCRIPT_URL}"
  data-website-id="${websiteId}"
  data-tracking-key="${key}"
></script>`;
        }, [
            trackingKey,
            websiteId,
        ]);

    async function copy(
        type: 'key' | 'snippet',
        value: string,
    ): Promise<void> {
        await navigator.clipboard
            .writeText(value);

        setCopied(type);

        window.setTimeout(
            () => {
                setCopied(null);
            },
            1500,
        );
    }

    if (loading) {
        return (
            <div className="flex min-h-80 items-center justify-center">
                <Spinner />
            </div>
        );
    }

    if (!website) {
        return (
            <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
                {error}
            </div>
        );
    }

    const baseHref =
        `/workspaces/${workspaceId}/websites/${websiteId}`;

    return (
        <div className="mx-auto max-w-5xl space-y-6">
            <Link
                href={baseHref}
                className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-slate-900"
            >
                <ArrowLeft className="size-4" />
                Back to website
            </Link>

            <header>
                <div className="flex items-start gap-4">
                    <div className="flex size-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
                        <Code2 className="size-6" />
                    </div>

                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-slate-950">
                            Tracker installation
                        </h1>

                        <p className="mt-2 text-sm leading-6 text-slate-500">
                            Add the tracker to{' '}
                            <strong>
                                {website.domain}
                            </strong>
                            . Event ingestion will become
                            active in Phase 9.
                        </p>
                    </div>
                </div>
            </header>

            {!trackingKey ? (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-900">
                    The complete tracking key is shown
                    only after website creation or key
                    rotation. Open{' '}
                    <Link
                        href={`${baseHref}/settings`}
                        className="font-semibold underline"
                    >
                        Website Settings
                    </Link>{' '}
                    and rotate the key to generate a new
                    installation key.
                </div>
            ) : (
                <Card>
                    <CardHeader>
                        <div className="flex items-center gap-2">
                            <KeyRound className="size-5 text-brand-600" />
                            <h2 className="font-semibold text-slate-950">
                                Tracking key
                            </h2>
                        </div>
                    </CardHeader>

                    <CardContent>
                        <div className="flex flex-col gap-3 sm:flex-row">
                            <code className="min-w-0 flex-1 break-all rounded-xl bg-slate-950 p-4 text-sm text-slate-100">
                                {trackingKey}
                            </code>

                            <Button
                                variant="outline"
                                onClick={() =>
                                    void copy(
                                        'key',
                                        trackingKey,
                                    )
                                }
                            >
                                {copied === 'key' ? (
                                    <Check className="size-4" />
                                ) : (
                                    <Clipboard className="size-4" />
                                )}

                                {copied === 'key'
                                    ? 'Copied'
                                    : 'Copy'}
                            </Button>
                        </div>

                        <p className="mt-3 text-sm text-red-600">
                            Store this key securely. Do not
                            commit it to a public repository.
                        </p>
                    </CardContent>
                </Card>
            )}

            <Card>
                <CardHeader>
                    <h2 className="font-semibold text-slate-950">
                        HTML installation
                    </h2>

                    <p className="mt-1 text-sm text-slate-500">
                        Add this code before the closing
                        body tag on your website.
                    </p>
                </CardHeader>

                <CardContent>
                    <pre className="overflow-x-auto rounded-2xl bg-slate-950 p-5 text-sm leading-6 text-slate-100">
                        <code>
                            {snippet}
                        </code>
                    </pre>

                    <Button
                        className="mt-4"
                        variant="outline"
                        onClick={() =>
                            void copy(
                                'snippet',
                                snippet,
                            )
                        }
                    >
                        {copied === 'snippet' ? (
                            <Check className="size-4" />
                        ) : (
                            <Clipboard className="size-4" />
                        )}

                        {copied === 'snippet'
                            ? 'Copied'
                            : 'Copy snippet'}
                    </Button>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <h2 className="font-semibold text-slate-950">
                        Allowed origins
                    </h2>
                </CardHeader>

                <CardContent className="space-y-3">
                    {website.allowedOrigins.map(
                        (origin) => (
                            <code
                                key={origin}
                                className="block rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-700"
                            >
                                {origin}
                            </code>
                        ),
                    )}
                </CardContent>
            </Card>
        </div>
    );
}