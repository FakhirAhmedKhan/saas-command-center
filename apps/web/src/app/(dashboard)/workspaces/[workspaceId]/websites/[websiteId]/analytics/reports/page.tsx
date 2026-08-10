'use client';

import { useParams } from 'next/navigation';

import { AnalyticsReportsDashboard } from '@/features/analytics-reports/analytics-reports-dashboard';
import { WebsiteSubNav } from '@/features/websites/components/website-sub-nav';

export default function AnalyticsReportsPage() {
  const params = useParams<{
    workspaceId: string;
    websiteId: string;
  }>();

  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-5 p-4 sm:p-6 lg:p-8">
      <WebsiteSubNav workspaceId={params.workspaceId} websiteId={params.websiteId} />

      <AnalyticsReportsDashboard workspaceId={params.workspaceId} websiteId={params.websiteId} />
    </div>
  );
}
