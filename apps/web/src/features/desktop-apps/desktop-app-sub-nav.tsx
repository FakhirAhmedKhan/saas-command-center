'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface Props {
  workspaceId: string;
  desktopAppId: string;
}

const LIVE_TABS = [
  { label: 'Overview', path: '' },
  { label: 'Code', path: '/code' },
  { label: 'Builds', path: '/builds' },
  { label: 'Tests', path: '/tests' },
  { label: 'Releases', path: '/releases' },
  { label: 'Performance', path: '/performance' },
  { label: 'Crashes', path: '/crashes' },
  { label: 'Dependencies', path: '/dependencies' },
  { label: 'Security', path: '/security' },
  { label: 'Alerts', path: '/alerts' },
  { label: 'Settings', path: '/settings' },
] as const;
const FUTURE_TABS = [] as const;

// const FUTURE_TABS = ['Performance', 'Crashes', 'Dependencies', 'Security'] as const;

export function DesktopAppSubNav({ workspaceId, desktopAppId }: Props) {
  const pathname = usePathname();
  const base = `/workspaces/${workspaceId}/desktop-apps/${desktopAppId}`;

  return (
    <nav aria-label='Desktop application navigation' className='flex gap-1 overflow-x-auto rounded-xl border border-slate-200 bg-white p-1'>
      {LIVE_TABS.map((tab) => {
        const href = `${base}${tab.path}`;
        const active = tab.path === '' ? pathname === base : pathname === href || pathname.startsWith(`${href}/`);

        return (
          <Link
            key={tab.label}
            href={href}
            aria-current={active ? 'page' : undefined}
            className={active ? 'whitespace-nowrap rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white' : 'whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100'}
          >
            {tab.label}
          </Link>
        );
      })}

      {FUTURE_TABS.map((tab) => (
        <span key={tab} aria-disabled='true' title='Available in a later desktop support phase' className='cursor-not-allowed whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium text-slate-300'>
          {tab}
        </span>
      ))}
    </nav>
  );
}
