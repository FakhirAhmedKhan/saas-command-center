/* eslint-disable react-hooks/set-state-in-effect */
'use client';

import { Sidebar } from './sideBar';
import { NotificationBell } from '@/features/team-operations/notification-bell';
import { cn } from '@command-center/ui';
import { ChevronLeft, ChevronRight, Menu, X } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';

interface AppShellProps {
  children: ReactNode;
}

function workspaceIdFromPath(pathname: string): string {
  return pathname.match(/^\/workspaces\/([^/]+)/)?.[1] ?? '';
}

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const drawerRef = useRef<HTMLDialogElement>(null);
  const openerRef = useRef<HTMLButtonElement>(null);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const workspaceId = workspaceIdFromPath(pathname);

  useEffect(() => {
    setIsCollapsed(window.localStorage.getItem('command-center.sidebar-collapsed') === 'true');
  }, []);

  useEffect(() => {
    const drawer = drawerRef.current;
    if (!drawer) return;
    if (isMobileNavOpen) drawer.showModal();
    else if (drawer.open) drawer.close();
  }, [isMobileNavOpen]);

  useEffect(() => {
    setIsMobileNavOpen(false);
  }, [pathname]);

  const toggleSidebar = useCallback(() => {
    setIsCollapsed((current) => {
      const next = !current;
      window.localStorage.setItem('command-center.sidebar-collapsed', String(next));
      return next;
    });
  }, []);
  const closeMobileNav = useCallback(() => {
    setIsMobileNavOpen(false);
    openerRef.current?.focus();
  }, []);

  return (
    <div className='min-h-screen bg-app-bg'>
      <a
        href='#main-content'
        className='sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-white focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-slate-900 focus:shadow-float'
      >
        Skip to content
      </a>
      <div className='mx-auto flex min-h-screen w-full max-w-[1920px]'>
        <aside className={cn('sticky top-0 hidden h-screen shrink-0 border-r border-slate-200 bg-white transition-[width] duration-200 lg:block', isCollapsed ? 'w-16' : 'w-64')}>
          <button
            type='button'
            onClick={toggleSidebar}
            aria-label={isCollapsed ? 'Expand navigation' : 'Collapse navigation'}
            className='absolute -right-3 top-5 z-10 flex size-6 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:text-slate-950'
          >
            <span className='sr-only'>{isCollapsed ? 'Expand navigation' : 'Collapse navigation'}</span>
            {isCollapsed ? <ChevronRight className='size-3.5' aria-hidden /> : <ChevronLeft className='size-3.5' aria-hidden />}
          </button>
          <Sidebar collapsed={isCollapsed} pathname={pathname} workspaceId={workspaceId} />
        </aside>

        <dialog
          ref={drawerRef}
          aria-label='Navigation menu'
          onCancel={closeMobileNav}
          onClick={(event) => {
            if (event.target === event.currentTarget) closeMobileNav();
          }}
          className='m-0 h-dvh max-h-none w-80 max-w-[86vw] border-0 bg-transparent p-0 backdrop:bg-slate-950/40 lg:hidden'
        >
          <div className='relative h-full bg-white shadow-2xl'>
            <button
              type='button'
              onClick={closeMobileNav}
              aria-label='Close navigation'
              className='absolute right-3 top-3 z-10 flex size-9 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700'
            >
              <X className='size-4' aria-hidden />
            </button>
            <Sidebar collapsed={false} pathname={pathname} workspaceId={workspaceId} onNavigate={closeMobileNav} />
          </div>
        </dialog>

        <div className='flex min-h-screen min-w-0 flex-1 flex-col'>
          <header className='sticky top-0 z-30 flex h-14 shrink-0 items-center justify-between gap-3 border-b border-slate-200 bg-white/85 px-4 backdrop-blur sm:px-6'>
            <button
              ref={openerRef}
              type='button'
              onClick={() => setIsMobileNavOpen(true)}
              aria-label='Open navigation'
              className='flex size-9 shrink-0 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 lg:hidden'
            >
              <Menu className='size-5' aria-hidden />
            </button>
            <div className='ml-auto flex shrink-0 items-center gap-2'>
              <NotificationBell />
            </div>
          </header>
          <main id='main-content' className='min-w-0 flex-1'>
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
