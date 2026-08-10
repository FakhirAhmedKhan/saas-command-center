'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { cn } from '@/features/lib/api/cn';

interface ApplicationSubNavProps {
  workspaceId: string;
  applicationId: string;
}

export function ApplicationSubNav({ workspaceId, applicationId }: ApplicationSubNavProps) {
  const pathname = usePathname();

  const baseHref = `/workspaces/${workspaceId}/applications/${applicationId}`;

  const tabs = [
    { label: 'Overview', href: baseHref },
    { label: 'Development', href: `${baseHref}/development` },
    { label: 'Releases', href: `${baseHref}/releases` },
    { label: 'Settings', href: `${baseHref}/settings` },
  ];

  return (
    <nav aria-label="Application sections" className="flex gap-1 border-b border-slate-200">
      {tabs.map((tab) => {
        const isActive = tab.href === baseHref ? pathname === baseHref : pathname.startsWith(tab.href);

        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={isActive ? 'page' : undefined}
            className={cn(
              'relative flex h-10 items-center px-3 text-sm font-medium transition',
              isActive ? 'text-brand-700' : 'text-slate-500 hover:text-slate-800',
            )}
          >
            {tab.label}
            {isActive ? <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-brand-600" aria-hidden="true" /> : null}
          </Link>
        );
      })}
    </nav>
  );
}
