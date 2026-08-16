'use client';

import { ManualWorkspaceForm } from '@/features/workspaces/components/manual-workspace-form';
import { WorkspaceCreationMethod } from '@/features/workspaces/components/workspace-creation-method';
import { GithubImportWizard } from '@/features/workspaces/github-import/github-import-wizard';
import { useSearchParams } from 'next/navigation';
import { useState } from 'react';

type CreationMethod = 'select' | 'manual' | 'github';

export default function NewWorkspacePage() {
  const searchParams = useSearchParams();

  const [method, setMethod] = useState<CreationMethod>(() => (searchParams.get('method') === 'github' ? 'github' : 'select'));

  if (method === 'manual') {
    return <ManualWorkspaceForm onBack={() => setMethod('select')} />;
  }

  if (method === 'github') {
    return (
      <GithubImportWizard
        onCancel={() => setMethod('select')}
        onImported={(workspaceId) => {
          window.location.assign(`/workspaces/${workspaceId}/applications`);
        }}
      />
    );
  }

  return <WorkspaceCreationMethod onSelectManual={() => setMethod('manual')} onSelectGithub={() => setMethod('github')} />;
}
