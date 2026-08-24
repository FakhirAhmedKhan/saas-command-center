'use client';

import { WorkspaceSwitcher } from './workspace-switcher';
import { useAuth } from '@/features/auth/auth-provider';
import { NotificationBell } from '@/features/team-operations/notification-bell';
import { cn } from '@command-center/ui';
import {
  Activity,
  Boxes,
  Building2,
  GitBranch,
  Globe2,
  LayoutDashboard,
  LogOut,
  Menu,
  Monitor,
  PanelLeftClose,
  PanelLeftOpen,
  Radio,
  Search,
  Settings,
  Smartphone,
  X,
  type LucideIcon,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';

interface AppShellProps {
  children: React.ReactNode;
}

interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
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
        label: 'Mobile Apps',
        href: '/mobile-apps',
        icon: Smartphone,
        match: (pathname, workspaceId) => pathname.startsWith(`/workspaces/${workspaceId}/mobile-apps`),
      },
      {
        label: 'Desktop Apps',
        href: '/desktop-apps',
        icon: Monitor,
        match: (pathname, workspaceId) => pathname.startsWith(`/workspaces/${workspaceId}/desktop-apps`),
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
  collapsed?: boolean;
  onNavigate?: () => void;
}

function SidebarContent({ pathname, workspaceId, collapsed = false, onNavigate }: SidebarContentProps) {
  const { user, logout } = useAuth();

  const router = useRouter();

  async function handleLogout(): Promise<void> {
    await logout();

    router.replace('/login');
  }

  return (
    <div className='flex h-full min-h-0 flex-col bg-white'>
      <div className={cn('shrink-0 pt-4', collapsed ? 'px-2' : 'px-3')}>
        <Link
          href='/dashboard'
          onClick={onNavigate}
          title={collapsed ? 'SaaS Command Center' : undefined}
          className={cn('flex h-11 items-center rounded-xl transition hover:bg-slate-50', collapsed ? 'justify-center' : 'gap-3 px-2')}
        >
          <span className='flex size-9 shrink-0 items-center justify-center rounded-xl bg-brand-600 text-[11px] font-bold text-white shadow-sm'>SC</span>

          {!collapsed ? (
            <div className='min-w-0'>
              <p className='truncate text-[13px] font-bold text-slate-950'>SaaS Command Center</p>
            </div>
          ) : null}
        </Link>

        {workspaceId && !collapsed ? (
          <div className='mt-4'>
            <WorkspaceSwitcher workspaceId={workspaceId} />
          </div>
        ) : null}
      </div>

      <nav aria-label='Primary navigation' className={cn('mt-5 min-h-0 flex-1 overflow-y-auto overflow-x-hidden pb-5', collapsed ? 'px-2' : 'px-3')}>
        <Link
          href='/dashboard'
          onClick={onNavigate}
          title={collapsed ? 'Dashboard' : undefined}
          className={cn(
            'mb-4 flex h-10 items-center rounded-xl text-sm font-medium transition',
            collapsed ? 'justify-center' : 'gap-3 px-3',
            pathname === '/dashboard' ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-950',
          )}
        >
          <LayoutDashboard className='size-[18px] shrink-0' aria-hidden='true' />

          {!collapsed ? <span>Dashboard</span> : null}
        </Link>

        {workspaceId
          ? NAV_GROUPS.map((group) => (
              <section key={group.label} className='mb-5 last:mb-0'>
                {!collapsed ? (
                  <p className='mb-2 px-3 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400'>{group.label}</p>
                ) : (
                  <div className='mx-auto mb-2 h-px w-7 bg-slate-200' />
                )}

                <div className='space-y-1'>
                  {group.items.map((item) => {
                    const Icon = item.icon;

                    const isActive = item.match(pathname, workspaceId);

                    return (
                      <Link
                        key={`${group.label}-${item.href}-${item.label}`}
                        href={`/workspaces/${workspaceId}${item.href}`}
                        onClick={onNavigate}
                        aria-current={isActive ? 'page' : undefined}
                        title={collapsed ? item.label : undefined}
                        className={cn(
                          'relative flex h-10 items-center rounded-xl text-sm font-medium transition',
                          collapsed ? 'justify-center' : 'gap-3 px-3',
                          isActive ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-950',
                        )}
                      >
                        {isActive && collapsed ? <span aria-hidden='true' className='absolute left-0 h-5 w-[3px] rounded-r-full bg-brand-600' /> : null}

                        <Icon className='size-[18px] shrink-0' aria-hidden='true' />

                        {!collapsed ? <span className='truncate'>{item.label}</span> : null}
                      </Link>
                    );
                  })}
                </div>
              </section>
            ))
          : null}
      </nav>

      <div className={cn('shrink-0 border-t border-slate-200 bg-white py-4', collapsed ? 'px-2' : 'px-3')}>
        <div className={cn('flex items-center rounded-xl', collapsed ? 'flex-col gap-2' : 'gap-2.5 px-2')}>
          <div
            title={collapsed ? user?.displayName || user?.email || 'Account' : undefined}
            className='flex size-9 shrink-0 items-center justify-center rounded-full bg-slate-900 text-xs font-bold text-white'
          >
            {(user?.displayName || user?.email || 'U').charAt(0).toUpperCase()}
          </div>

          {!collapsed ? (
            <div className='min-w-0 flex-1'>
              <p className='truncate text-[13px] font-semibold text-slate-900'>{user?.displayName || 'Account'}</p>

              <p className='truncate text-xs text-slate-400'>{user?.email}</p>
            </div>
          ) : null}

          <button
            type='button'
            onClick={() => void handleLogout()}
            aria-label='Sign out'
            title='Sign out'
            className='flex size-9 shrink-0 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-900'
          >
            <LogOut className='size-4' aria-hidden='true' />
          </button>
        </div>
      </div>
    </div>
  );
}

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();

  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const [desktopNavCollapsed, setDesktopNavCollapsed] = useState(false);

  const workspaceId = pathname.match(/\/workspaces\/([^/]+)/)?.[1] ?? '';

  return (
    <div className='min-h-dvh bg-slate-50'>
      <a
        href='#main-content'
        className='sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-white focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-slate-900 focus:shadow-lg'
      >
        Skip to content
      </a>

      <div className='flex min-h-dvh w-full'>
        <aside
          className={cn(
            'sticky top-0 z-40 hidden h-dvh shrink-0 self-start overflow-visible border-r border-slate-200 bg-white transition-[width] duration-200 ease-out lg:block',
            desktopNavCollapsed ? 'w-[76px]' : 'w-[280px]',
          )}
        >
          <SidebarContent pathname={pathname} workspaceId={workspaceId} collapsed={desktopNavCollapsed} />

          <button
            type='button'
            onClick={() => setDesktopNavCollapsed((current) => !current)}
            aria-label={desktopNavCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            title={desktopNavCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className='absolute -right-3.5 top-6 z-50 flex size-7 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900'
          >
            {desktopNavCollapsed ? <PanelLeftOpen className='size-4' aria-hidden='true' /> : <PanelLeftClose className='size-4' aria-hidden='true' />}
          </button>
        </aside>

        {mobileNavOpen ? (
          <div className='fixed inset-0 z-50 lg:hidden'>
            <button
              type='button'
              aria-label='Close navigation'
              className='absolute inset-0 bg-slate-950/40 backdrop-blur-[1px]'
              onClick={() => setMobileNavOpen(false)}
            />

            <aside className='absolute inset-y-0 left-0 h-dvh w-[300px] max-w-[86vw] bg-white shadow-2xl'>
              <SidebarContent pathname={pathname} workspaceId={workspaceId} onNavigate={() => setMobileNavOpen(false)} />

              <button
                type='button'
                onClick={() => setMobileNavOpen(false)}
                aria-label='Close navigation'
                className='absolute right-3 top-3 flex size-9 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-800'
              >
                <X className='size-4' aria-hidden='true' />
              </button>
            </aside>
          </div>
        ) : null}

        <div className='flex min-h-dvh min-w-0 flex-1 flex-col'>
          <header className='sticky top-0 z-30 h-16 shrink-0 border-b border-slate-200 bg-white/95 shadow-[0_1px_2px_rgba(15,23,42,0.03)] backdrop-blur-xl'>
            <div className='flex h-full min-w-0 items-center gap-3 px-4 sm:px-6'>
              <button
                type='button'
                onClick={() => setMobileNavOpen(true)}
                aria-label='Open navigation'
                className='flex size-10 shrink-0 items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 lg:hidden'
              >
                <Menu className='size-5' aria-hidden='true' />
              </button>

              {/* <div className='flex min-w-0 flex-1 items-center'>
                <button
                  type='button'
                  disabled
                  aria-label='Search workspace - coming soon'
                  title='Workspace search is coming soon'
                  className='hidden h-10 w-full max-w-xl cursor-not-allowed items-center gap-2.5 rounded-xl border border-slate-200 bg-slate-50/80 px-3.5 text-left text-sm text-slate-400 md:flex'
                >
                  <Search className='size-4 shrink-0 text-slate-400' aria-hidden='true' />

                  <span className='min-w-0 flex-1 truncate'>Search workspace</span>

                  <span className='shrink-0 rounded-md border border-slate-200 bg-white px-2 py-1 text-[9px] font-bold uppercase tracking-wide text-slate-400'>
                    Coming soon
                  </span>
                </button>
              </div> */}

              {/* <div className='flex shrink-0 items-center gap-2'>
                <NotificationBell />
              </div> */}
            </div>
          </header>

          <main id='main-content' className='min-w-0 flex-1 overflow-x-hidden bg-slate-50'>
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
