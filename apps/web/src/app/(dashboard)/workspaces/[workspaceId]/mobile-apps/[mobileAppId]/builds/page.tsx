'use client';

import { MobileAppSubNav } from '@/features/mobile-apps/mobile-app-sub-nav';
import { MobileBuilds } from '@/features/mobile-apps/mobile-builds';
import { useParams } from 'next/navigation';

export default function MobileBuildsPage() {
  const params = useParams<{
    workspaceId: string;
    mobileAppId: string;
  }>();

  return (
    <main className='mx-auto w-full max-w-7xl space-y-6 p-4 pt-8 sm:p-6 lg:p-8'>
      <div>
        <h1 className='text-2xl font-bold text-slate-950'>Builds</h1>

        <p className='mt-1 text-sm text-slate-500'>CI/CD build history for this mobile application.</p>
      </div>

      <MobileAppSubNav workspaceId={params.workspaceId} mobileAppId={params.mobileAppId} />

      <MobileBuilds workspaceId={params.workspaceId} mobileAppId={params.mobileAppId} />
    </main>
  );
}
