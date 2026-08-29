'use client';

import { OnboardingQuestionCard } from './onboarding-question-card';
import { workspaceOnboardingApi } from '../api/workspace-onboarding-api';
import type { WorkspaceOnboardingSessionResponse, WorkspaceQuestionFlowResponse } from '@command-center/shared-types';
import { useCallback, useEffect, useState } from 'react';

export function GuidedWorkspaceBuilder({ sessionId }: { sessionId: string }) {
  const [session, setSession] = useState<WorkspaceOnboardingSessionResponse | null>(null);
  const [flow, setFlow] = useState<WorkspaceQuestionFlowResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const load = useCallback(async () => {
    try {
      const [nextSession, nextFlow] = await Promise.all([workspaceOnboardingApi.get(sessionId), workspaceOnboardingApi.questions(sessionId)]);
      setSession(nextSession);
      setFlow(nextFlow);
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to load session');
    }
  }, [sessionId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  if (error) {
    return <div role='alert'>{error}</div>;
  }

  if (!session || !flow) {
    return <div aria-live='polite'>Loading guided builder…</div>;
  }

  if (!flow.currentQuestion) {
    return <div data-testid='answers-complete'>Answers complete</div>;
  }

  return (
    <main className='mx-auto w-full max-w-3xl p-4 sm:p-8'>
      <header className='mb-6'>
        <p className='text-sm text-slate-600'>
          {flow.completed} of {flow.total} completed
        </p>
        <progress className='mt-2 w-full' max={100} value={flow.percent} />
      </header>

      <OnboardingQuestionCard
        disabled={saving}
        key={flow.currentQuestion.key}
        onSubmit={async (value) => {
          setSaving(true);
          setError(null);

          try {
            await workspaceOnboardingApi.updateAnswers(sessionId, {
              [flow.currentQuestion!.key]: value,
            });
            await load();
          } catch (cause) {
            setError(cause instanceof Error ? cause.message : 'Save failed');
          } finally {
            setSaving(false);
          }
        }}
        question={flow.currentQuestion}
      />
    </main>
  );
}
