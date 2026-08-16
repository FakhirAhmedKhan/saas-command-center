'use client';

import { getErrorMessage } from '@/features/applications/application-utils';
import { getNotifications, markAllNotificationsRead, markNotificationRead } from '@/features/team-operations/team-operations-api';
import type { UserNotification } from '@/features/team-operations/team-operations.types';
import { Skeleton, EmptyState } from '@command-center/ui';
import { Bell } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';

type NotificationTab = 'all' | 'unread' | 'critical';

function formatRelativeTime(value: string): string {
  const date = new Date(value);

  const difference = date.getTime() - Date.now();

  const absoluteDifference = Math.abs(difference);

  const formatter = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });

  if (absoluteDifference < 60_000) {
    return 'just now';
  }

  if (absoluteDifference < 3_600_000) {
    return formatter.format(Math.round(difference / 60_000), 'minute');
  }

  if (absoluteDifference < 86_400_000) {
    return formatter.format(Math.round(difference / 3_600_000), 'hour');
  }

  return new Intl.DateTimeFormat('en-US', { dateStyle: 'medium' }).format(date);
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<UserNotification[]>([]);

  const [tab, setTab] = useState<NotificationTab>('all');

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState<string | null>(null);

  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function load(): Promise<void> {
      setLoading(true);

      try {
        const result = await getNotifications({
          unreadOnly: tab === 'unread',
          limit: 100,
        });

        if (cancelled) {
          return;
        }

        setNotifications(result.items);
        setError(null);
      } catch (caughtError) {
        if (!cancelled) {
          setError(getErrorMessage(caughtError));
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
  }, [tab, reloadKey]);

  function refresh(): void {
    setReloadKey((current) => current + 1);
  }

  async function openNotification(notification: UserNotification): Promise<void> {
    if (!notification.readAt) {
      await markNotificationRead(notification.id);
      refresh();
    }
  }

  async function markAll(): Promise<void> {
    await markAllNotificationsRead();
    refresh();
  }

  const visibleNotifications = tab === 'critical' ? notifications.filter((notification) => notification.priority === 'CRITICAL') : notifications;

  const tabs: { key: NotificationTab; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'unread', label: 'Unread' },
    { key: 'critical', label: 'Critical' },
  ];

  return (
    <div className='mx-auto w-full max-w-2xl space-y-5 p-4 sm:p-6 lg:p-8'>
      <header className='flex items-start justify-between gap-3'>
        <div>
          <h1 className='text-[26px] font-semibold tracking-tight text-slate-950'>Notifications</h1>
          <p className='mt-1 text-sm leading-6 text-slate-500'>Invitations, incidents, deployments and processing failures.</p>
        </div>

        <button type='button' onClick={() => void markAll()} className='shrink-0 text-sm font-medium text-brand-700 hover:text-brand-800'>
          Mark all read
        </button>
      </header>

      <div className='flex gap-1 border-b border-slate-200'>
        {tabs.map((tabItem) => (
          <button
            key={tabItem.key}
            type='button'
            onClick={() => setTab(tabItem.key)}
            aria-current={tab === tabItem.key ? 'page' : undefined}
            className={`relative flex h-9 items-center px-3 text-sm font-medium transition ${
              tab === tabItem.key ? 'text-brand-700' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            {tabItem.label}
            {tab === tabItem.key ? <span className='absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-brand-600' aria-hidden='true' /> : null}
          </button>
        ))}
      </div>

      {error ? <div className='rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800'>{error}</div> : null}

      {loading ? (
        <div className='space-y-2'>
          {Array.from({ length: 5 }).map((_, index) => (
            <Skeleton key={index} className='h-16 w-full rounded-lg' />
          ))}
        </div>
      ) : visibleNotifications.length === 0 ? (
        <EmptyState icon={<Bell className='size-5' />} title='No notifications' description='You are up to date.' />
      ) : (
        <section className='overflow-hidden rounded-xl border border-slate-200 bg-white'>
          {visibleNotifications.map((notification, index) => {
            const content = (
              <div
                className={`flex items-start gap-3 px-4 py-3 ${index > 0 ? 'border-t border-slate-100' : ''} ${notification.readAt ? '' : 'bg-brand-50/40'}`}
              >
                <span className={`mt-1.5 size-1.5 shrink-0 rounded-full ${notification.readAt ? 'bg-transparent' : 'bg-brand-600'}`} aria-hidden='true' />

                <div className='min-w-0 flex-1'>
                  <div className='flex items-start justify-between gap-3'>
                    <p className='text-sm font-medium text-slate-900'>{notification.title}</p>
                    <time className='shrink-0 text-xs text-slate-400'>{formatRelativeTime(notification.createdAt)}</time>
                  </div>

                  <p className='mt-0.5 text-sm leading-5 text-slate-500'>{notification.message}</p>
                </div>
              </div>
            );

            return notification.actionUrl ? (
              <Link key={notification.id} href={notification.actionUrl} onClick={() => void openNotification(notification)} className='block hover:bg-slate-50'>
                {content}
              </Link>
            ) : (
              <button
                key={notification.id}
                type='button'
                className='block w-full text-left hover:bg-slate-50'
                onClick={() => void openNotification(notification)}
              >
                {content}
              </button>
            );
          })}
        </section>
      )}
    </div>
  );
}
