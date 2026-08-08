'use client';

import { useParams } from 'next/navigation';

import { AnalyticsReportsDashboard } from '@/features/analytics-reports/analytics-reports-dashboard';

export default function AnalyticsReportsPage() {
  const params = useParams<{
    workspaceId: string;
    websiteId: string;
  }>();

  return (
    <AnalyticsReportsDashboard workspaceId={params.workspaceId} websiteId={params.websiteId} />
  );
}
