'use client';

import { MobileAlerts } from '@/features/mobile-apps/mobile-alerts';
import { MobileAppSubNav } from '@/features/mobile-apps/mobile-app-sub-nav';
import { useParams } from 'next/navigation';

export default function MobileAlertsPage() {
  const params = useParams<{
    workspaceId: string;
    mobileAppId: string;
  }>();

  return (
    <main className='mx-auto max-w-7xl space-y-6 p-6'>
      <h1 className='text-2xl font-bold'>Alerts</h1>

      <MobileAppSubNav workspaceId={params.workspaceId} mobileAppId={params.mobileAppId} />

      <MobileAlerts workspaceId={params.workspaceId} mobileAppId={params.mobileAppId} />
    </main>
  );
}
