'use client';

import { WorkspaceOnboardingApiError, workspaceOnboardingApi } from '../api/workspace-onboarding-api';
import { normalizeGuidedBuilderError, type GuidedBuilderError } from '../workspace-onboarding-errors';
import { GuidedBuilderErrorState } from './guided-builder-error';
import { GuidedWorkspaceBuilder } from './guided-workspace-builder';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';

export const guidedSessionStorageKey = 'command-center:guided-workspace-session';

type StartState = { kind: 'loading' } | { kind: 'ready'; sessionId: string } | { kind: 'disabled' } | { kind: 'error'; error: GuidedBuilderError };

function isRecoverableStoredSessionError(error: unknown): boolean {
  return error instanceof WorkspaceOnboardingApiError && (error.status === 404 || error.status === 410);
}

async function initializeGuidedWorkspaceBuilder(): Promise<StartState> {
  const feature = await workspaceOnboardingApi.featureState();

  if (!feature.guidedWorkspaceBuilderEnabled) {
    return { kind: 'disabled' };
  }

  const storedSessionId = window.sessionStorage.getItem(guidedSessionStorageKey);

  if (storedSessionId) {
    try {
      await workspaceOnboardingApi.get(storedSessionId);

      return {
        kind: 'ready',
        sessionId: storedSessionId,
      };
    } catch (error) {
      if (!isRecoverableStoredSessionError(error)) {
        throw error;
      }

      window.sessionStorage.removeItem(guidedSessionStorageKey);
    }
  }

  const session = await workspaceOnboardingApi.create();

  window.sessionStorage.setItem(guidedSessionStorageKey, session.id);

  return {
    kind: 'ready',
    sessionId: session.id,
  };
}

export function GuidedWorkspaceBuilderStart() {
  const initialization = useRef<Promise<StartState> | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<StartState>({
    kind: 'loading',
  });

  useEffect(() => {
    let active = true;
    const operation = initialization.current ?? initializeGuidedWorkspaceBuilder();

    initialization.current = operation;

    void operation
      .then((nextState) => {
        if (active) {
          setState(nextState);
        }
      })
      .catch((error: unknown) => {
        if (active) {
          setState({
            kind: 'error',
            error: normalizeGuidedBuilderError(error),
          });
        }
      });

    return () => {
      active = false;
    };
  }, [attempt]);

  const retry = () => {
    initialization.current = null;
    setState({ kind: 'loading' });
    setAttempt((current) => current + 1);
  };

  if (state.kind === 'loading') {
    return (
      <main aria-live='polite' className='mx-auto max-w-3xl p-8'>
        Starting guided setup…
      </main>
    );
  }

  if (state.kind === 'disabled') {
    return (
      <main className='mx-auto max-w-xl p-8'>
        <h1 className='text-2xl font-semibold'>Guided setup is unavailable</h1>

        <p className='mt-2 text-slate-600'>This workspace creation method is not currently enabled.</p>

        <Link className='mt-6 inline-flex rounded-xl bg-slate-950 px-4 py-3' href='/workspaces/new'>
          <span className='text-white'>Choose another method</span>
        </Link>
      </main>
    );
  }

  if (state.kind === 'error') {
    return (
      <main className='mx-auto max-w-xl p-8'>
        <GuidedBuilderErrorState error={state.error} onRetry={retry} />
      </main>
    );
  }

  return (
    <GuidedWorkspaceBuilder
      onCompleted={() => {
        window.sessionStorage.removeItem(guidedSessionStorageKey);
      }}
      sessionId={state.sessionId}
    />
  );
}
