'use client';

import { workspaceOnboardingApi } from '../api/workspace-onboarding-api';
import type { WorkspaceOnboardingSessionResponse } from '@command-center/shared-types';
import { useRouter } from 'next/navigation';
import { useRef, useState } from 'react';

export function WorkspaceCreationProgress({ session }: { session: WorkspaceOnboardingSessionResponse }) {
  const router = useRouter();
  const idempotencyKey = useRef(crypto.randomUUID());
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const confirm = async () => {
    if (!session.blueprintHash) {
      setError('Blueprint must be validated before confirmation');
      return;
    }

    setCreating(true);
    setError(null);

    try {
      const result = await workspaceOnboardingApi.confirm(session.id, {
        expectedRevision: session.blueprintRevision,
        blueprintHash: session.blueprintHash,
        idempotencyKey: idempotencyKey.current,
      });
      router.replace(`/workspaces/${result.workspaceId}`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Creation failed');
    } finally {
      setCreating(false);
    }
  };

  return (
    <section className='mx-auto max-w-xl p-6 text-center'>
      <h1 className='text-2xl font-bold'>Create this workspace?</h1>
      <p className='mt-2 text-slate-600'>Creation is transactional. A failed database operation will not leave a partial workspace.</p>
      {error && (
        <p className='mt-4 text-red-700' role='alert'>
          {error}
        </p>
      )}
      <button className='mt-6 rounded-xl bg-slate-950 px-6 py-3 text-white disabled:opacity-50' disabled={creating} onClick={confirm} type='button'>
        {creating ? 'Creating workspace…' : 'Confirm and create'}
      </button>
    </section>
  );
}
