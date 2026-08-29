'use client';

import { GuidedWorkspaceBuilder } from '@/features/workspace-onboarding/components/guided-workspace-builder';
import { ManualWorkspaceForm } from '@/features/workspaces/components/manual-workspace-form';
import { WorkspaceCreationMethod } from '@/features/workspaces/components/workspace-creation-method';
import { GithubImportWizard } from '@/features/workspaces/github-import/github-import-wizard';
import { useSearchParams } from 'next/navigation';
import { useState } from 'react';

type CreationMethod = 'select' | 'manual' | 'github';

export default function NewWorkspacePage() {
  const searchParams = useSearchParams();
  const [method, setMethod] = useState<CreationMethod>(() => (searchParams.get('method') === 'github' ? 'github' : 'select'));
  params: Promise<{ sessionId: string }>;

  if (method === 'manual') {
    return <ManualWorkspaceForm onBack={() => setMethod('select')} />;
  }
  if (method === 'github') {
    return <GuidedWorkspaceBuilder sessionId={sessionId} />;
  }
  if (method === 'github') {
    return (
      <GithubImportWizard
        onCancel={() => setMethod('select')}
        onImported={(workspaceId) => {
          // eslint-disable-next-line @next/next/no-location-assign-relative-destination
          window.location.assign(`/workspaces/${workspaceId}/applications`);
        }}
      />
    );
  }

  return <WorkspaceCreationMethod onSelectManual={() => setMethod('manual')} onSelectGithub={() => setMethod('github')} />;
}
