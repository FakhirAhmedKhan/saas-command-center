'use client';

import { getUnreadNotificationCount } from './team-operations-api';
import { usePageVisibility } from '@/hooks/use-page-visibility';
import Link from 'next/link';
import { useEffect, useState } from 'react';

export function NotificationBell() {
  const [count, setCount] = useState(0);

  const visible = usePageVisibility();

  useEffect(() => {
    if (!visible) {
      return;
    }

    let active = true;

    async function load(): Promise<void> {
      try {
        const result = await getUnreadNotificationCount();

        if (active) {
          setCount(result.count);
        }
      } catch {
        if (active) {
          setCount(0);
        }
      }
    }

    void load();

    const timer = window.setInterval(
      () => {
        void load();
      },

      30_000,
    );

    return () => {
      active = false;

      window.clearInterval(timer);
    };
  }, [visible]);

  return (
    <Link
      href='/notifications'
      aria-label={`Notifications, ${count} unread`}
      className='relative inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-300 bg-white'
    >
      <span aria-hidden='true' className='text-lg'>
        🔔
      </span>

      {count > 0 ? (
        <span className='absolute -right-1 -top-1 min-w-5 rounded-full bg-red-600 px-1.5 py-0.5 text-center text-[10px] font-bold text-white'>
          {count > 99 ? '99+' : count}
        </span>
      ) : null}
    </Link>
  );
}
