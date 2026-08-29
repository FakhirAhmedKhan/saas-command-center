'use client';

import { workspaceOnboardingApi } from '../api/workspace-onboarding-api';
import { normalizeGuidedBuilderError, type GuidedBuilderError } from '../workspace-onboarding-errors';
import { BlueprintReview } from './blueprint-review';
import { GuidedBuilderErrorState } from './guided-builder-error';
import { OnboardingQuestionCard } from './onboarding-question-card';
import { WorkspaceCreationProgress } from './workspace-creation-progress';
import type { WorkspaceOnboardingSessionResponse, WorkspaceQuestionFlowResponse } from '@command-center/shared-types';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

type WorkflowStage = 'questions' | 'review' | 'confirmation';

interface GuidedWorkspaceBuilderProps {
  sessionId: string;
  onCompleted?: (workspaceId: string) => void;
}

export function GuidedWorkspaceBuilder({ sessionId, onCompleted }: GuidedWorkspaceBuilderProps) {
  const router = useRouter();
  const [session, setSession] = useState<WorkspaceOnboardingSessionResponse | null>(null);
  const [flow, setFlow] = useState<WorkspaceQuestionFlowResponse | null>(null);
  const [stage, setStage] = useState<WorkflowStage>('questions');
  const [error, setError] = useState<GuidedBuilderError | null>(null);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const load = useCallback(async () => {
    try {
      const [nextSession, nextFlow] = await Promise.all([workspaceOnboardingApi.get(sessionId), workspaceOnboardingApi.questions(sessionId)]);

      setSession(nextSession);
      setFlow(nextFlow);
      setError(null);

      if (nextSession.status === 'BLUEPRINT_READY' && nextSession.blueprint) {
        setStage('review');
      } else {
        setStage('questions');
      }
    } catch (cause) {
      setError(normalizeGuidedBuilderError(cause));
    }
  }, [sessionId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (session?.status !== 'COMPLETED' || !session.workspaceId) {
      return;
    }

    onCompleted?.(session.workspaceId);
    router.replace(`/workspaces/${session.workspaceId}`);
  }, [onCompleted, router, session]);

  if (error) {
    return (
      <main className='mx-auto max-w-3xl p-4 sm:p-8'>
        <GuidedBuilderErrorState
          error={error}
          onRetry={() => {
            setError(null);
            void load();
          }}
        />
      </main>
    );
  }

  if (!session || !flow) {
    return (
      <main aria-live='polite' className='mx-auto max-w-3xl p-4 sm:p-8'>
        Loading guided builder…
      </main>
    );
  }

  if (session.status === 'COMPLETED' && session.workspaceId) {
    return (
      <main aria-live='polite' className='mx-auto max-w-3xl p-4 sm:p-8'>
        Opening your workspace…
      </main>
    );
  }

  if (stage === 'confirmation' && session.blueprint) {
    return <WorkspaceCreationProgress onCompleted={onCompleted} session={session} />;
  }

  if (stage === 'review' && session.blueprint) {
    return (
      <BlueprintReview
        initialSession={session}
        key={`${session.id}:${session.blueprintRevision}`}
        onReady={(validatedSession) => {
          setSession(validatedSession);
          setStage('confirmation');
        }}
      />
    );
  }

  if (!flow.currentQuestion) {
    return (
      <main className='mx-auto max-w-3xl p-4 sm:p-8'>
        <section className='rounded-2xl border border-slate-200 bg-white p-6 shadow-sm'>
          <h1 className='text-2xl font-semibold text-slate-950'>Your answers are complete</h1>

          <p className='mt-2 text-sm text-slate-600'>Generate a workspace blueprint from the information you provided.</p>

          <button
            className='mt-6 rounded-xl bg-violet-600 px-5 py-3 font-medium text-white disabled:opacity-50'
            disabled={generating}
            onClick={() => {
              setGenerating(true);
              setError(null);

              void workspaceOnboardingApi
                .generateBlueprint(sessionId)
                .then((generatedSession) => {
                  setSession(generatedSession);
                  setStage('review');
                })
                .catch((cause: unknown) => {
                  setError(normalizeGuidedBuilderError(cause));
                })
                .finally(() => {
                  setGenerating(false);
                });
            }}
            type='button'
          >
            {generating ? 'Generating recommendations…' : 'Generate guided recommendations'}
          </button>
        </section>
      </main>
    );
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
            setError(normalizeGuidedBuilderError(cause));
          } finally {
            setSaving(false);
          }
        }}
        question={flow.currentQuestion}
      />
    </main>
  );
}
