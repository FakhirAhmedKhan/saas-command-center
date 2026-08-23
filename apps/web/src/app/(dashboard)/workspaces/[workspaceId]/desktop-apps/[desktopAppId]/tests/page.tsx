'use client';

import { DesktopAppSubNav } from '@/features/desktop-apps/desktop-app-sub-nav';
import { DesktopTests } from '@/features/desktop-apps/desktop-tests';
import { useParams } from 'next/navigation';

export default function DesktopTestsPage() {
  const params = useParams<{
    workspaceId: string;
    desktopAppId: string;
  }>();

  return (
    <main className='space-y-6 p-4 sm:p-6 lg:p-8'>
      <header>
        <p className='text-sm font-medium text-slate-500'>Desktop App</p>
        <h1 className='mt-1 text-2xl font-bold text-slate-950'>Tests</h1>
      </header>

      <DesktopAppSubNav workspaceId={params.workspaceId} desktopAppId={params.desktopAppId} />

      <DesktopTests workspaceId={params.workspaceId} desktopAppId={params.desktopAppId} />
    </main>
  );
}
