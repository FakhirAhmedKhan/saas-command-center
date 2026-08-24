/* eslint-disable react-hooks/set-state-in-effect */
'use client';

import { getAnalyticsOverview } from './analytics-overview-api';
import type { AnalyticsOverviewResponse, AnalyticsPreset } from './analytics-overview.types';
import { useCallback, useEffect, useState } from 'react';

interface UseAnalyticsOverviewInput {
  workspaceId: string;

  websiteId: string;

  preset: AnalyticsPreset;

  from?: string;

  to?: string;
}

interface AnalyticsOverviewState {
  data: AnalyticsOverviewResponse | null;

  loading: boolean;

  error: unknown | null;
}

export function useAnalyticsOverview({ workspaceId, websiteId, preset, from, to }: UseAnalyticsOverviewInput) {
  const [reloadKey, setReloadKey] = useState(0);
  const [state, setState] = useState<AnalyticsOverviewState>({
    data: null,
    loading: true,
    error: null,
  });
  const reload = useCallback(() => {
    setReloadKey((current) => current + 1);
  }, []);

  useEffect(() => {
    if (!workspaceId || !websiteId) {
      return;
    }

    const controller = new AbortController();

    setState((previous) => ({
      ...previous,

      loading: true,
      error: null,
    }));

    void getAnalyticsOverview({
      workspaceId,

      websiteId,

      preset,

      from,

      to,

      signal: controller.signal,
    })
      .then((data) => {
        setState({
          data,

          loading: false,
          error: null,
        });
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) {
          return;
        }

        setState({
          data: null,
          loading: false,

          error,
        });
      });

    return () => {
      controller.abort();
    };
  }, [workspaceId, websiteId, preset, from, to, reloadKey]);

  return {
    ...state,
    reload,
  };
}
