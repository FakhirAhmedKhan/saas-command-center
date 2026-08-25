import { WorkspaceSwitcher } from './workspace-switcher';
import { NAV_GROUPS } from '@/app/DynmicIndex';
import { LogoMark } from '@/components/brand/logo-mark';
import { useAuth } from '@/features/auth/auth-provider';
import { cn } from '@command-center/ui';
import { LayoutDashboard, LogOut } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { memo, useMemo, useCallback } from 'react';

interface SidebarProps {
  collapsed: boolean;
  onNavigate?: () => void;
  pathname: string;
  workspaceId: string;
}

export const Sidebar = memo(function Sidebar({ collapsed, onNavigate, pathname, workspaceId }: SidebarProps) {
  const { logout, user } = useAuth();
  const router = useRouter();
  const activeItems = useMemo(() => new Set(NAV_GROUPS.flatMap((group) => group.items.filter((item) => item.isActive(pathname, workspaceId)).map((item) => item.label))), [pathname, workspaceId]);
  const handleLogout = useCallback(async (): Promise<void> => {
    await logout();
    router.replace('/login');
  }, [logout, router]);
  const accountName = user?.displayName || 'Account owner';
  const initial = (user?.displayName || user?.email || 'U').charAt(0).toUpperCase();

  return (
    <div className={cn('flex h-full min-h-0 flex-col px-3 py-4', collapsed && 'items-center px-2')}>
      <Link
        href='/dashboard'
        onClick={onNavigate}
        title={collapsed ? 'SaaS Command Center' : undefined}
        className={cn('mb-4 flex h-9 items-center gap-2.5 rounded-lg px-2 text-slate-950 transition hover:bg-slate-100', collapsed && 'justify-center px-0')}
      >
        <LogoMark className='size-7 shrink-0 rounded-md' />
        {!collapsed ? <span className='truncate text-[13px] font-bold'>SaaS Command Center</span> : null}
      </Link>

      {workspaceId && !collapsed ? (
        <div className='mb-4'>
          <WorkspaceSwitcher workspaceId={workspaceId} />
        </div>
      ) : null}

      <nav className='min-h-0 flex-1 space-y-4 overflow-y-auto' aria-label='Primary navigation'>
        <Link
          href='/dashboard'
          onClick={onNavigate}
          title={collapsed ? 'Dashboard' : undefined}
          aria-current={pathname === '/dashboard' ? 'page' : undefined}
          className={cn(
            'flex h-9 items-center gap-2.5 rounded-lg px-2.5 text-sm font-medium transition',
            collapsed && 'justify-center px-0',
            pathname === '/dashboard' ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
          )}
        >
          <LayoutDashboard className='size-4.25 shrink-0' aria-hidden />
          {!collapsed ? 'Dashboard' : null}
        </Link>

        {workspaceId
          ? NAV_GROUPS.map((group) => (
              <section key={group.label} aria-label={group.label}>
                {!collapsed ? <p className='mb-1 px-2.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400'>{group.label}</p> : null}
                <div className='space-y-0.5'>
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    const active = activeItems.has(item.label);
                    return (
                      <Link
                        key={item.label}
                        href={`/workspaces/${workspaceId}${item.href}`}
                        onClick={onNavigate}
                        title={collapsed ? item.label : undefined}
                        aria-current={active ? 'page' : undefined}
                        className={cn(
                          'flex h-9 items-center gap-2.5 rounded-lg px-2.5 text-sm font-medium transition',
                          collapsed && 'justify-center px-0',
                          active ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
                        )}
                      >
                        <Icon className='size-4.25 shrink-0' aria-hidden />
                        {!collapsed ? item.label : null}
                      </Link>
                    );
                  })}
                </div>
              </section>
            ))
          : null}
      </nav>

      <div className={cn('mt-3 flex items-center gap-2.5 border-t border-slate-100 pt-3', collapsed && 'justify-center')}>
        <div title={collapsed ? accountName : undefined} className='flex size-8 shrink-0 items-center justify-center rounded-full bg-slate-900 text-xs font-bold text-white'>
          {initial}
        </div>
        {!collapsed ? (
          <div className='min-w-0 flex-1'>
            <p className='truncate text-[13px] font-semibold text-slate-900'>{accountName}</p>
            <p className='truncate text-xs text-slate-400'>{user?.email}</p>
          </div>
        ) : null}
        <button
          type='button'
          onClick={() => void handleLogout()}
          aria-label='Sign out'
          title={collapsed ? 'Sign out' : undefined}
          className='flex size-8 shrink-0 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700'
        >
          <LogOut className='size-4' aria-hidden />
        </button>
      </div>
    </div>
  );
});
