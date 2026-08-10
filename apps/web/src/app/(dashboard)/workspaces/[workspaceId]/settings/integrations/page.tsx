'use client';

import { useParams } from 'next/navigation';
import { WebhookIntegrationsDashboard } from '@/features/integrations/webhook-integrations-dashboard';
import { WorkspaceSettingsNav } from '@/features/workspaces/components/workspace-settings-nav';

export default function IntegrationsPage() {
  const params = useParams<{
    workspaceId: string;
  }>();

  return (
    <div className='mx-auto w-full max-w-[1600px] space-y-5 p-4 sm:p-6 lg:p-8'>
      <div>
        <h1 className='text-[26px] font-semibold tracking-tight text-slate-950'>Settings</h1>
        <p className='mt-1 text-sm leading-6 text-slate-500'>Manage workspace information, members and integrations.</p>
      </div>

      <WorkspaceSettingsNav workspaceId={params.workspaceId} />

      <WebhookIntegrationsDashboard workspaceId={params.workspaceId} />
    </div>
  );
}
