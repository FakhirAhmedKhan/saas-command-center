'use client';

import {
  useParams,
} from 'next/navigation';

import {
  WorkspaceInvitationsPanel,
} from '@/features/team-operations/workspace-invitations-panel';

export default function WorkspaceMembersSettingsPage() {
  const params =
    useParams<{
      workspaceId:
        string;
    }>();

  /*
   * Replace this with the existing workspace
   * membership/permission value returned by your
   * workspace settings endpoint.
   */
  const canManageMembers =
    true;

  return (
    <div className="mx-auto w-full max-w-[1400px] p-4 sm:p-6 lg:p-8">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-slate-950">
          Members and invitations
        </h1>
      </header>

      <WorkspaceInvitationsPanel
        workspaceId={
          params.workspaceId
        }
        canManageMembers={
          canManageMembers
        }
      />
    </div>
  );
}