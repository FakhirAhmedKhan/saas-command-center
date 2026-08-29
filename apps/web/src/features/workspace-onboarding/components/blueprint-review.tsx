'use client';

import { BlueprintApplicationEditor } from './blueprint-application-editor';
import { BlueprintValidationSummary } from './blueprint-validation-summary';
import { workspaceOnboardingApi } from '../api/workspace-onboarding-api';
import type { WorkspaceBlueprint, WorkspaceBlueprintValidationIssue, WorkspaceOnboardingSessionResponse } from '@command-center/shared-types';
import { useState } from 'react';

export function BlueprintReview({ initialSession, onReady }: { initialSession: WorkspaceOnboardingSessionResponse; onReady(session: WorkspaceOnboardingSessionResponse): void }) {
  const [blueprint, setBlueprint] = useState<WorkspaceBlueprint>(initialSession.blueprint!);
  const [issues, setIssues] = useState<WorkspaceBlueprintValidationIssue[]>([]);
  const [saving, setSaving] = useState(false);
  const save = async () => {
    setSaving(true);

    try {
      const session = await workspaceOnboardingApi.updateBlueprint(initialSession.id, {
        expectedRevision: initialSession.blueprintRevision,
        blueprint,
      });
      const validation = await workspaceOnboardingApi.validateBlueprint(initialSession.id);
      setIssues(validation.issues);

      if (validation.valid) onReady(session);
    } catch (error) {
      setIssues([
        {
          path: 'blueprint',
          code: 'SAVE_FAILED',
          message: error instanceof Error ? error.message : 'Save failed',
        },
      ]);
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className='mx-auto grid max-w-5xl gap-6 p-4 lg:grid-cols-[1fr_18rem] lg:p-8'>
      <section className='space-y-4'>
        <h1 className='text-2xl font-bold'>Review guided recommendations</h1>
        <BlueprintValidationSummary issues={issues} />
        {blueprint.applications.map((application, index) => (
          <BlueprintApplicationEditor
            application={application}
            disabled={saving}
            key={application.type}
            onChange={(next) => {
              const applications = [...blueprint.applications];
              applications[index] = next;
              setBlueprint({ ...blueprint, applications });
            }}
          />
        ))}
      </section>

      <aside className='h-fit rounded-2xl border p-5 lg:sticky lg:top-6'>
        <p className='text-sm text-slate-600'>Revision {initialSession.blueprintRevision}</p>
        <button className='mt-4 w-full rounded-xl bg-slate-950 px-4 py-3 text-white disabled:opacity-50' disabled={saving} onClick={save} type='button'>
          {saving ? 'Validating…' : 'Save and continue'}
        </button>
      </aside>
    </main>
  );
}
