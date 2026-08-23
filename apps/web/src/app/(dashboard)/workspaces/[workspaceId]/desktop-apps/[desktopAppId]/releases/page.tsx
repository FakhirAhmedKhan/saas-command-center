'use client';

import { DesktopAppSubNav } from '@/features/desktop-apps/desktop-app-sub-nav';
import { DesktopReleases } from '@/features/desktop-apps/desktop-releases';
import { useParams } from 'next/navigation';

export default function DesktopReleasesPage() {
  const params = useParams<{
    workspaceId: string;
    desktopAppId: string;
  }>();

  return (
    <main className='mx-auto w-full max-w-7xl space-y-6 p-4 pt-8 sm:p-6 sm:pt-10 lg:p-8'>
      <header>
        <p className='text-sm font-medium text-slate-500'>Desktop Application</p>
        <h1 className='mt-1 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl'>Releases & Update Channels</h1>
        <p className='mt-2 max-w-3xl text-sm text-slate-600'>
          Track versioned desktop releases across Dev, Alpha, Beta, Stable, and LTS channels while preserving the exact build and artifact source.
        </p>
      </header>

      <DesktopAppSubNav workspaceId={params.workspaceId} desktopAppId={params.desktopAppId} />

      <DesktopReleases workspaceId={params.workspaceId} desktopAppId={params.desktopAppId} />
    </main>
  );
}
