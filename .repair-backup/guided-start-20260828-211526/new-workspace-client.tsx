'use client';

import { workspaceOnboardingApi } from '@/features/workspace-onboarding/api/workspace-onboarding-api';
import { GuidedBuilderEntry } from '@/features/workspace-onboarding/components/guided-builder-entry';
import { ManualWorkspaceForm } from '@/features/workspaces/components/manual-workspace-form';
import { WorkspaceCreationMethod } from '@/features/workspaces/components/workspace-creation-method';
import { GithubImportWizard } from '@/features/workspaces/github-import/github-import-wizard';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';

type CreationMethod = 'select' | 'manual' | 'github';

export default function NewWorkspacePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [guidedEnabled, setGuidedEnabled] = useState(false);
  const [method, setMethod] = useState<CreationMethod>(() => (searchParams.get('method') === 'github' ? 'github' : 'select'));

  useEffect(() => {
    let active = true;

    void workspaceOnboardingApi
      .featureState()
      .then((state) => {
        if (active) {
          setGuidedEnabled(state.guidedWorkspaceBuilderEnabled);
        }
      })
      .catch(() => {
        if (active) {
          setGuidedEnabled(false);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  if (method === 'manual') {
    return <ManualWorkspaceForm onBack={() => setMethod('select')} />;
  }

  if (method === 'github') {
    return (
      <GithubImportWizard
        onCancel={() => setMethod('select')}
        onImported={(workspaceId) => {
          router.push(`/workspaces/${workspaceId}/applications`);
        }}
      />
    );
  }

  return (
    <>
      <WorkspaceCreationMethod onSelectGithub={() => setMethod('github')} onSelectManual={() => setMethod('manual')} />

      {guidedEnabled ? (
        <div className='mx-auto -mt-12 w-full max-w-xl px-4 pb-16 sm:px-6'>
          <GuidedBuilderEntry enabled />
        </div>
      ) : null}
    </>
  );
}
