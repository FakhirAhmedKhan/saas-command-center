/* eslint-disable react-hooks/set-state-in-effect */
'use client';

import { DesktopAppSubNav } from '@/features/desktop-apps/desktop-app-sub-nav';
import { DESKTOP_ARCHITECTURE_LABELS, DESKTOP_FRAMEWORK_LABELS, DESKTOP_PLATFORM_LABELS } from '@/features/desktop-apps/desktop-app.constants';
import { getDesktopApp } from '@/features/desktop-apps/desktop-apps-api';
import type { DesktopApplicationDetails } from '@command-center/shared-types';
import { ArrowLeft, Monitor } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';

/*
 * Every desktop-app sub-tab (Overview, Code, Builds, Tests, Releases, ...) is
 * a separate route with no shared layout previously, so switching tabs
 * unmounted the whole page -- sub-nav, app name/badges, everything -- and
 * remounted it from scratch, flashing a full loading state on every click.
 * This layout renders the identity chrome (back link, app name/badges) and
 * the sub-nav ONCE; Next.js keeps a layout mounted across navigations within
 * its own route subtree, so only `children` (the tab-specific content, which
 * already manages its own narrower loading state) swaps out.
 */
export default function DesktopAppLayout({ children }: { children: ReactNode }) {
  const params = useParams<{
    workspaceId: string;
    desktopAppId: string;
  }>();
  const workspaceId = params.workspaceId;
  const desktopAppId = params.desktopAppId;
  const listHref = `/workspaces/${workspaceId}/desktop-apps`;
  const [desktopApp, setDesktopApp] = useState<DesktopApplicationDetails | null>(null);

  useEffect(() => {
    let active = true;

    setDesktopApp(null);

    void getDesktopApp(workspaceId, desktopAppId).then(
      (response) => {
        if (active) {
          setDesktopApp(response);
        }
      },
      () => {
        // Swallowed: the tab-specific content component below independently
        // fetches its own data and surfaces its own error state if the
        // desktop app can't be loaded. This header is a secondary display.
      },
    );

    return () => {
      active = false;
    };
  }, [workspaceId, desktopAppId]);

  return (
    <div className='mx-auto w-full max-w-7xl space-y-6 p-4 pt-8 sm:p-6 sm:pt-10 lg:p-8'>
      <header>
        <Link href={listHref} className='inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 transition hover:text-slate-900'>
          <ArrowLeft className='size-4' />
          Desktop Apps
        </Link>

        <div className='mt-5 flex items-start gap-4'>
          <div className='flex size-12 shrink-0 items-center justify-center rounded-2xl bg-brand-50 text-brand-600'>
            <Monitor className='size-6' />
          </div>

          <div className='min-w-0'>
            {desktopApp ? (
              <>
                <h1 className='truncate text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl'>{desktopApp.application.name}</h1>

                <div className='mt-3 flex flex-wrap gap-2'>
                  <span className='rounded-md bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700'>{DESKTOP_PLATFORM_LABELS[desktopApp.platform]}</span>

                  <span className='rounded-md bg-violet-50 px-2.5 py-1 text-xs font-semibold text-violet-700'>{DESKTOP_FRAMEWORK_LABELS[desktopApp.framework]}</span>

                  <span className='rounded-md bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600'>{DESKTOP_ARCHITECTURE_LABELS[desktopApp.architecture]}</span>
                </div>
              </>
            ) : (
              <>
                <div className='h-8 w-48 animate-pulse rounded bg-slate-100' />
                <div className='mt-3 h-6 w-64 animate-pulse rounded bg-slate-100' />
              </>
            )}
          </div>
        </div>
      </header>

      <DesktopAppSubNav workspaceId={workspaceId} desktopAppId={desktopAppId} />

      {children}
    </div>
  );
}
