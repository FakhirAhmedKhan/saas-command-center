'use client';

import { DesktopReleases } from '@/features/desktop-apps/desktop-releases';
import { useParams } from 'next/navigation';

export default function DesktopReleasesPage() {
  const params = useParams<{
    workspaceId: string;
    desktopAppId: string;
  }>();

  return (
    <div className='space-y-6'>
      <div>
        <h2 className='text-lg font-semibold text-slate-950'>Releases & Update Channels</h2>
        <p className='mt-1 max-w-3xl text-sm text-slate-600'>Track versioned desktop releases across Dev, Alpha, Beta, Stable, and LTS channels while preserving the exact build and artifact source.</p>
      </div>

      <DesktopReleases workspaceId={params.workspaceId} desktopAppId={params.desktopAppId} />
    </div>
  );
}
