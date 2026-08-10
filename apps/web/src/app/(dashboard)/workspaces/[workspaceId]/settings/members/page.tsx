'use client';

import { useParams } from 'next/navigation';
import { WorkspaceInvitationsPanel } from '@/features/team-operations/workspace-invitations-panel';
import { WorkspaceSettingsNav } from '@/features/workspaces/components/workspace-settings-nav';

export default function WorkspaceMembersSettingsPage() {
  const params = useParams<{
    workspaceId: string;
  }>();

  /*
   * Replace this with the existing workspace
   * membership/permission value returned by your
   * workspace settings endpoint.
   */
  const canManageMembers = true;

  return (
    <div className='mx-auto w-full max-w-[1600px] space-y-5 p-4 sm:p-6 lg:p-8'>
      <div>
        <h1 className='text-[26px] font-semibold tracking-tight text-slate-950'>Settings</h1>
        <p className='mt-1 text-sm leading-6 text-slate-500'>Manage workspace information, members and integrations.</p>
      </div>

      <WorkspaceSettingsNav workspaceId={params.workspaceId} />

      <WorkspaceInvitationsPanel workspaceId={params.workspaceId} canManageMembers={canManageMembers} />
    </div>
  );
}
