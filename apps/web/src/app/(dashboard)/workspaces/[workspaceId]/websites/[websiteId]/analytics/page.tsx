'use client';

import { AnalyticsOverviewDashboard } from '@/features/analytics-overview/analytics-overview-dashboard';
import { WebsiteSubNav } from '@/features/websites/components/website-sub-nav';
import { useParams } from 'next/navigation';

type AnalyticsRouteParams = {
  workspaceId: string;
  websiteId: string;
};

export default function WebsiteAnalyticsPage() {
  const params = useParams<AnalyticsRouteParams>();

  return (
    <div className='mx-auto w-full max-w-[1600px] space-y-5 p-4 sm:p-6 lg:p-8'>
      <WebsiteSubNav workspaceId={params.workspaceId} websiteId={params.websiteId} />

      <AnalyticsOverviewDashboard workspaceId={params.workspaceId} websiteId={params.websiteId} />
    </div>
  );
}
