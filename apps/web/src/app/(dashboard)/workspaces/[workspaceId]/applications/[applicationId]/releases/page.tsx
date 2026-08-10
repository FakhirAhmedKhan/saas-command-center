'use client';

import { useParams } from 'next/navigation';

import { ReleaseDeploymentDashboard } from '@/features/releases/release-deployment-dashboard';
import { ApplicationSubNav } from '@/features/applications/components/application-sub-nav';

interface RouteParameters extends Record<string, string> {
  workspaceId: string;

  applicationId: string;
}

export default function ApplicationReleasesPage() {
  const params = useParams<RouteParameters>();

  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-5 p-4 sm:p-6 lg:p-8">
      <ApplicationSubNav workspaceId={params.workspaceId} applicationId={params.applicationId} />

      <ReleaseDeploymentDashboard workspaceId={params.workspaceId} applicationId={params.applicationId} />
    </div>
  );
}
