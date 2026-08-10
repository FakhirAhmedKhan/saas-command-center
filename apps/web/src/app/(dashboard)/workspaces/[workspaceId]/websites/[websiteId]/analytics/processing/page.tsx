'use client';

import { useParams } from 'next/navigation';
import { AnalyticsProcessingPanel } from '@/features/analytics-processing/analytics-processing-panel';
import { WebsiteSubNav } from '@/features/websites/components/website-sub-nav';

interface RouteParameters extends Record<string, string> {
  workspaceId: string;

  websiteId: string;
}

export default function AnalyticsProcessingPage() {
  const params = useParams<RouteParameters>();

  return (
    <div className='mx-auto w-full max-w-[1600px] space-y-5 p-4 sm:p-6 lg:p-8'>
      <WebsiteSubNav workspaceId={params.workspaceId} websiteId={params.websiteId} />

      <AnalyticsProcessingPanel workspaceId={params.workspaceId} websiteId={params.websiteId} />
    </div>
  );
}
