'use client';

import type { HealthResponse } from '@command-center/shared-types';
import { StatusBadge } from '@command-center/ui';
import { useEffect, useState } from 'react';

type HealthState =
  | { kind: 'checking' }
  | { kind: 'connected'; data: HealthResponse }
  | { kind: 'unavailable'; message: string };

export function ApiHealthCard() {
  const [state, setState] = useState<HealthState>({ kind: 'checking' });
  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1';

  useEffect(() => {
    const controller = new AbortController();

    async function checkHealth(): Promise<void> {
      try {
        const response = await fetch(`${apiUrl}/health`, {
          cache: 'no-store',
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error(`API returned HTTP ${response.status}`);
        }

        const data = (await response.json()) as HealthResponse;
        setState({ kind: 'connected', data });
      } catch (error) {
        if (controller.signal.aborted) return;
        setState({
          kind: 'unavailable',
          message: error instanceof Error ? error.message : 'Unknown connection error',
        });
      }
    }

    void checkHealth();
    return () => controller.abort();
  }, [apiUrl]);

  return (
    <section className="health-card" aria-live="polite">
      <div>
        <p className="eyebrow">API FOUNDATION</p>
        <h2>Backend connection</h2>
      </div>

      {state.kind === 'checking' && <StatusBadge>Checking</StatusBadge>}
      {state.kind === 'connected' && <StatusBadge tone="success">Connected</StatusBadge>}
      {state.kind === 'unavailable' && <StatusBadge tone="danger">Unavailable</StatusBadge>}

      <p className="health-copy">
        {state.kind === 'checking' && 'Checking the NestJS health endpoint…'}
        {state.kind === 'connected' &&
          `${state.data.service} is healthy in ${state.data.environment}.`}
        {state.kind === 'unavailable' &&
          `Start the API on port 4000. ${state.message}`}
      </p>
    </section>
  );
}
