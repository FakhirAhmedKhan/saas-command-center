'use client';

import { GuidedWorkspaceBuilder } from './guided-workspace-builder';
import { workspaceOnboardingApi } from '../api/workspace-onboarding-api';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';

type StartState = { kind: 'loading' } | { kind: 'ready'; sessionId: string } | { kind: 'disabled' } | { kind: 'error'; message: string };

export function GuidedWorkspaceBuilderStart() {
  const started = useRef(false);
  const [state, setState] = useState<StartState>({
    kind: 'loading',
  });

  useEffect(() => {
    if (started.current) {
      return;
    }

    started.current = true;
    let active = true;

    void (async () => {
      try {
        const feature = await workspaceOnboardingApi.featureState();

        if (!active) {
          return;
        }

        if (!feature.guidedWorkspaceBuilderEnabled) {
          setState({ kind: 'disabled' });

          return;
        }

        const session = await workspaceOnboardingApi.create();

        if (active) {
          setState({
            kind: 'ready',
            sessionId: session.id,
          });
        }
      } catch (error) {
        if (active) {
          setState({
            kind: 'error',
            message: error instanceof Error ? error.message : 'Unable to start guided setup.',
          });
        }
      }
    })();

    return () => {
      active = false;
    };
  }, []);

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

        <Link className='mt-6 inline-flex rounded-xl bg-slate-950 px-4 py-3 text-white' href='/workspaces/new'>
          Choose another method
        </Link>
      </main>
    );
  }

  if (state.kind === 'error') {
    return (
      <main className='mx-auto max-w-xl p-8' role='alert'>
        <h1 className='text-2xl font-semibold'>Unable to start guided setup</h1>

        <p className='mt-2 text-red-700'>{state.message}</p>

        <Link className='mt-6 inline-flex rounded-xl bg-slate-950 px-4 py-3 text-white' href='/workspaces/new'>
          Return to workspace creation
        </Link>
      </main>
    );
  }

  return <GuidedWorkspaceBuilder sessionId={state.sessionId} />;
}
