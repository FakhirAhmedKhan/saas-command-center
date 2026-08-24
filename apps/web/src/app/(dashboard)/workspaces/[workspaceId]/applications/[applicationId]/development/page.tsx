'use client';

import { ApplicationSubNav } from '@/features/applications/components/application-sub-nav';
import { DevelopmentBoard } from '@/features/development/components/development-board';
import { useParams } from 'next/navigation';

export default function ApplicationDevelopmentPage() {
  const params = useParams<{
    workspaceId: string;
    applicationId: string;
  }>();
  const { workspaceId, applicationId } = params;

  return (
    <div className='mx-auto w-full max-w-[1600px] space-y-5 p-4 sm:p-6 lg:p-8'>
      <ApplicationSubNav workspaceId={workspaceId} applicationId={applicationId} />

      <DevelopmentBoard workspaceId={workspaceId} applicationId={applicationId} />
    </div>
  );
}
