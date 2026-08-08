'use client';

import {
    useEffect,
    useState,
} from 'react';

import Link from 'next/link';

import {
    getErrorMessage,
} from '@/lib/api/api-error';

import {
    getNotifications,
    markAllNotificationsRead,
    markNotificationRead,
} from '@/features/team-operations/team-operations-api';

import type {
    UserNotification,
} from '@/features/team-operations/team-operations.types';

function formatDateTime(
    value: string,
): string {
    return new Intl
        .DateTimeFormat(
            'en-US',
            {
                dateStyle:
                    'medium',

                timeStyle:
                    'short',
            },
        )
        .format(
            new Date(value),
        );
}

export default function NotificationsPage() {
    const [
        notifications,
        setNotifications,
    ] =
        useState<
            UserNotification[]
        >([]);

    const [
        unreadOnly,
        setUnreadOnly,
    ] =
        useState(false);

    const [
        loading,
        setLoading,
    ] =
        useState(true);

    const [
        error,
        setError,
    ] =
        useState<
            string | null
        >(null);

    async function load():
        Promise<void> {
        setLoading(true);

        try {
            const result =
                await getNotifications({
                    unreadOnly,

                    limit: 100,
                });

            setNotifications(
                result.items,
            );

            setError(null);
        } catch (
        caughtError
        ) {
            setError(
                getErrorMessage(
                    caughtError,
                ),
            );
        } finally {
            setLoading(false);
        }
    }

    useEffect(
        () => {
            void load();
        },
        [
            unreadOnly,
        ],
    );

    async function openNotification(
        notification:
            UserNotification,
    ): Promise<void> {
        if (
            !notification.readAt
        ) {
            await markNotificationRead(
                notification.id,
            );
        }
    }

    async function markAll():
        Promise<void> {
        await markAllNotificationsRead();
        await load();
    }

    return (
        <div className="mx-auto w-full max-w-4xl p-4 sm:p-6 lg:p-8">
            <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-950">
                        Notifications
                    </h1>

                    <p className="mt-1 text-sm text-slate-600">
                        Invitations, incidents,
                        deployments and processing
                        failures.
                    </p>
                </div>

                <button
                    type="button"
                    onClick={() => {
                        void markAll();
                    }}
                    className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium"
                >
                    Mark all read
                </button>
            </header>

            <label className="mt-5 flex items-center gap-2 text-sm font-medium">
                <input
                    type="checkbox"
                    checked={
                        unreadOnly
                    }
                    onChange={(
                        event,
                    ) => {
                        setUnreadOnly(
                            event.target
                                .checked,
                        );
                    }}
                />

                Unread only
            </label>

            {error ? (
                <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
                    {error}
                </div>
            ) : null}

            {loading ? (
                <div className="mt-5 h-72 animate-pulse rounded-2xl bg-slate-200" />
            ) : notifications.length ===
                0 ? (
                <div className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
                    <h2 className="font-semibold">
                        No notifications
                    </h2>

                    <p className="mt-2 text-sm text-slate-500">
                        You are up to date.
                    </p>
                </div>
            ) : (
                <section className="mt-5 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                    {notifications.map(
                        (
                            notification,
                        ) => {
                            const content = (
                                <article
                                    className={`border-b border-slate-100 p-5 last:border-0 ${notification.readAt
                                            ? 'bg-white'
                                            : 'bg-blue-50/50'
                                        }`}
                                >
                                    <div className="flex items-start justify-between gap-4">
                                        <div>
                                            <div className="flex items-center gap-2">
                                                {!notification.readAt ? (
                                                    <span className="h-2 w-2 rounded-full bg-blue-600" />
                                                ) : null}

                                                <h2 className="font-semibold text-slate-950">
                                                    {
                                                        notification.title
                                                    }
                                                </h2>
                                            </div>

                                            <p className="mt-2 text-sm text-slate-700">
                                                {
                                                    notification.message
                                                }
                                            </p>

                                            <p className="mt-2 text-xs text-slate-500">
                                                {formatDateTime(
                                                    notification.createdAt,
                                                )}
                                            </p>
                                        </div>

                                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium">
                                            {
                                                notification.priority
                                            }
                                        </span>
                                    </div>
                                </article>
                            );

                            return notification.actionUrl ? (
                                <Link
                                    key={
                                        notification.id
                                    }
                                    href={
                                        notification.actionUrl
                                    }
                                    onClick={() => {
                                        void openNotification(
                                            notification,
                                        );
                                    }}
                                >
                                    {content}
                                </Link>
                            ) : (
                                <button
                                    key={
                                        notification.id
                                    }
                                    type="button"
                                    className="block w-full text-left"
                                    onClick={() => {
                                        void openNotification(
                                            notification,
                                        );

                                        void load();
                                    }}
                                >
                                    {content}
                                </button>
                            );
                        },
                    )}
                </section>
            )}
        </div>
    );
}