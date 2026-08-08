'use client';

import {
  useParams,
} from 'next/navigation';

import {
  AnalyticsOverviewDashboard,
} from '@/features/analytics-overview/analytics-overview-dashboard';

type AnalyticsRouteParams = {
  workspaceId: string;
  websiteId: string;
};

export default function WebsiteAnalyticsPage() {
  const params =
    useParams<AnalyticsRouteParams>();

  return (
    <div className="mx-auto w-full max-w-[1600px] p-4 sm:p-6 lg:p-8">
      <AnalyticsOverviewDashboard
        workspaceId={
          params.workspaceId
        }
        websiteId={
          params.websiteId
        }
      />
    </div>
  );
}
