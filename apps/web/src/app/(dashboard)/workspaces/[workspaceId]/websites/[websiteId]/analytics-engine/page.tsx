'use client';

import { useParams } from 'next/navigation';
import { AnalyticsEnginePanel } from '@/features/analytics-engine/components/analytics-engine-panel';
import { WebsiteSubNav } from '@/features/websites/components/website-sub-nav';

export default function AnalyticsEnginePage() {
  const params = useParams<{
    workspaceId: string;
    websiteId: string;
  }>();

  const { workspaceId, websiteId } = params;

  return (
    <div className='mx-auto w-full max-w-[1600px] space-y-5 p-4 sm:p-6 lg:p-8'>
      <WebsiteSubNav workspaceId={workspaceId} websiteId={websiteId} />

      <AnalyticsEnginePanel workspaceId={workspaceId} websiteId={websiteId} />
    </div>
  );
}
