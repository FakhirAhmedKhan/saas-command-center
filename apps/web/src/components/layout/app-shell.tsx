'use client';

import { useState } from 'react';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

import { Activity, Boxes, Building2, GitBranch, Globe2, LayoutDashboard, LogOut, Menu, Radio, Settings, X } from 'lucide-react';

import { useAuth } from '@/features/auth/auth-provider';
import { NotificationBell } from '@/features/team-operations/notification-bell';
import { cn } from '@/features/lib/api/cn';

import { WorkspaceSwitcher } from './workspace-switcher';

interface AppShellProps {
  children: React.ReactNode;
}

interface NavItem {
  label: string;
  href: string;
  icon: typeof Boxes;
  match: (pathname: string, workspaceId: string) => boolean;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    label: 'Workspace',
    items: [
      {
        label: 'Overview',
        href: '',
        icon: Building2,
        match: (pathname, workspaceId) => pathname === `/workspaces/${workspaceId}`,
      },
      {
        label: 'Applications',
        href: '/applications',
        icon: Boxes,
        match: (pathname, workspaceId) => pathname.startsWith(`/workspaces/${workspaceId}/applications`),
      },
      {
        label: 'Websites',
        href: '/websites',
        icon: Globe2,
        match: (pathname, workspaceId) => pathname.startsWith(`/workspaces/${workspaceId}/websites`),
      },
      {
        label: 'Activity',
        href: '/activity',
        icon: Activity,
        match: (pathname, workspaceId) => pathname === `/workspaces/${workspaceId}/activity` || pathname.startsWith(`/workspaces/${workspaceId}/activity/`),
      },
    ],
  },
  {
    label: 'Operations',
    items: [
      {
        label: 'Monitoring',
        href: '/monitoring',
        icon: Radio,
        match: (pathname, workspaceId) => pathname.startsWith(`/workspaces/${workspaceId}/monitoring`),
      },
      {
        label: 'Repositories',
        href: '/repositories',
        icon: GitBranch,
        match: (pathname, workspaceId) => pathname.startsWith(`/workspaces/${workspaceId}/repositories`),
      },
    ],
  },
  {
    label: 'Configuration',
    items: [
      {
        label: 'Settings',
        href: '/settings',
        icon: Settings,
        match: (pathname, workspaceId) => pathname.startsWith(`/workspaces/${workspaceId}/settings`),
      },
    ],
  },
];

interface SidebarContentProps {
  pathname: string;
  workspaceId: string;
  onNavigate?: () => void;
}

function SidebarContent({ pathname, workspaceId, onNavigate }: SidebarContentProps) {
  const { user, logout } = useAuth();

  const router = useRouter();

  async function handleLogout(): Promise<void> {
    await logout();
    router.replace('/login');
  }

  return (
    <div className="flex h-full flex-col gap-1 px-3 py-4">
      <Link href="/dashboard" onClick={onNavigate} className="mb-3 flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-slate-950 transition hover:bg-slate-100">
        <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-brand-600 text-[11px] font-bold text-white">SC</span>

        <span className="truncate text-[13px] font-bold leading-tight">SaaS Command Center</span>
      </Link>

      {workspaceId ? (
        <div className="mb-3">
          <WorkspaceSwitcher workspaceId={workspaceId} />
        </div>
      ) : null}

      <nav className="flex-1 space-y-4 overflow-y-auto" aria-label="Primary">
        <Link
          href="/dashboard"
          onClick={onNavigate}
          className={cn(
            'flex h-9 items-center gap-2.5 rounded-lg px-2.5 text-sm font-medium transition',
            pathname === '/dashboard' ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
          )}
        >
          <LayoutDashboard className="size-[17px] shrink-0" aria-hidden="true" />
          Overview
        </Link>

        {workspaceId
          ? NAV_GROUPS.map((group) => (
              <div key={group.label}>
                <p className="mb-1 px-2.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400">{group.label}</p>

                <div className="space-y-0.5">
                  {group.items.map((item) => {
                    const Icon = item.icon;

                    const isActive = item.match(pathname, workspaceId);

                    return (
                      <Link
                        key={item.label}
                        href={`/workspaces/${workspaceId}${item.href}`}
                        onClick={onNavigate}
                        aria-current={isActive ? 'page' : undefined}
                        className={cn(
                          'flex h-9 items-center gap-2.5 rounded-lg px-2.5 text-sm font-medium transition',
                          isActive ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
                        )}
                      >
                        <Icon className="size-[17px] shrink-0" aria-hidden="true" />
                        {item.label}
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))
          : null}
      </nav>

      <div className="mt-2 flex items-center gap-2.5 border-t border-slate-100 pt-3">
        <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-slate-900 text-xs font-bold text-white">
          {(user?.displayName || user?.email || 'U').charAt(0).toUpperCase()}
        </div>

        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-semibold text-slate-900">{user?.displayName || 'Account owner'}</p>
          <p className="truncate text-xs text-slate-400">{user?.email}</p>
        </div>

        <button
          type="button"
          onClick={() => void handleLogout()}
          aria-label="Sign out"
          className="flex size-8 shrink-0 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
        >
          <LogOut className="size-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();

  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const workspaceId = pathname.match(/\/workspaces\/([^/]+)/)?.[1] ?? '';

  return (
    <div className="min-h-screen bg-app-bg">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-white focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-slate-900 focus:shadow-float"
      >
        Skip to content
      </a>

      <div className="mx-auto flex min-h-screen w-full max-w-[1920px]">
        <aside className="sticky top-0 hidden h-screen w-62 shrink-0 border-r border-slate-200 bg-white lg:block">
          <SidebarContent pathname={pathname} workspaceId={workspaceId} />
        </aside>

        {mobileNavOpen ? (
          <div className="fixed inset-0 z-40 lg:hidden">
            <button type="button" aria-label="Close navigation" className="absolute inset-0 bg-slate-950/40" onClick={() => setMobileNavOpen(false)} />

            <div className="relative flex h-full w-72 max-w-[80vw] flex-col bg-white shadow-float">
              <button
                type="button"
                onClick={() => setMobileNavOpen(false)}
                aria-label="Close navigation"
                className="absolute right-3 top-3 flex size-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <X className="size-4" aria-hidden="true" />
              </button>

              <SidebarContent pathname={pathname} workspaceId={workspaceId} onNavigate={() => setMobileNavOpen(false)} />
            </div>
          </div>
        ) : null}

        <div className="flex min-h-screen min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center justify-between gap-3 border-b border-slate-200 bg-white/85 px-4 backdrop-blur sm:px-6">
            <div className="flex min-w-0 items-center gap-2.5">
              <button
                type="button"
                onClick={() => setMobileNavOpen(true)}
                aria-label="Open navigation"
                className="flex size-9 shrink-0 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900 lg:hidden"
              >
                <Menu className="size-5" aria-hidden="true" />
              </button>

              <button
                type="button"
                disabled
                title="Global search is coming soon"
                className="hidden min-w-56 cursor-not-allowed items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-left text-sm text-slate-400 opacity-70 sm:flex"
              >
                <svg className="size-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <circle cx="11" cy="11" r="7" />
                  <path d="m21 21-4.3-4.3" />
                </svg>

                <span className="flex-1 truncate">Search applications, websites…</span>

                <kbd className="rounded border border-slate-200 bg-white px-1.5 py-0.5 text-[10px] font-semibold text-slate-400">Ctrl K</kbd>
              </button>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <NotificationBell />
            </div>
          </header>

          <main id="main-content" className="min-w-0 flex-1">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
