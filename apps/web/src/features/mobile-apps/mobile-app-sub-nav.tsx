'use client';

import { Activity, Blocks, Code2, Gauge, Rocket, Settings, TestTube2 } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface MobileAppSubNavProps {
  workspaceId: string;

  mobileAppId: string;
}

export function MobileAppSubNav({ workspaceId, mobileAppId }: MobileAppSubNavProps) {
  const pathname = usePathname();
  const base = `/workspaces/${workspaceId}` + `/mobile-apps/${mobileAppId}`;
  const items = [
    {
      label: 'Overview',
      href: base,
      icon: Activity,
      enabled: true,
    },

    {
      label: 'Code',
      href: `${base}/code`,
      icon: Code2,
      enabled: true,
    },

    {
      label: 'Builds',
      icon: Blocks,
      enabled: false,
    },

    {
      label: 'Tests',
      icon: TestTube2,
      enabled: false,
    },

    {
      label: 'Releases',
      icon: Rocket,
      enabled: false,
    },

    {
      label: 'Performance',
      icon: Gauge,
      enabled: false,
    },

    {
      label: 'Settings',
      href: `${base}#settings`,
      icon: Settings,
      enabled: true,
    },
  ] as const;

  return (
    <nav aria-label='Mobile application navigation' className='overflow-x-auto border-b border-slate-200'>
      <div className='flex min-w-max gap-1'>
        {items.map((item) => {
          const Icon = item.icon;

          if (!item.enabled || !('href' in item)) {
            return (
              <span
                key={item.label}
                aria-disabled='true'
                title='Coming in a later phase'
                className='inline-flex cursor-not-allowed items-center gap-2 border-b-2 border-transparent px-3 py-3 text-sm font-medium text-slate-300'
              >
                <Icon className='size-4' />

                {item.label}
              </span>
            );
          }

          const active = item.label === 'Overview' ? pathname === base : item.label === 'Code' ? pathname.startsWith(`${base}/code`) : false;

          return (
            <Link
              key={item.label}
              href={item.href}
              className={
                active
                  ? 'inline-flex items-center gap-2 border-b-2 border-brand-600 px-3 py-3 text-sm font-semibold text-brand-700'
                  : 'inline-flex items-center gap-2 border-b-2 border-transparent px-3 py-3 text-sm font-medium text-slate-500 transition hover:border-slate-300 hover:text-slate-900'
              }
            >
              <Icon className='size-4' />

              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
