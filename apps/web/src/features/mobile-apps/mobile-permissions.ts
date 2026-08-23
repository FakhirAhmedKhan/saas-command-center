'use client';

import { apiRequest } from '@/features/lib/api/api-client';
import type { MobilePermissionSnapshot } from '@command-center/shared-types';
import { useCallback, useEffect, useState } from 'react';

export function getMobilePermissions(workspaceId: string) {
  return apiRequest<MobilePermissionSnapshot>(`/workspaces/${workspaceId}/mobile-security/permissions`);
}

export function useMobilePermissions(workspaceId: string) {
  const [permissions, setPermissions] = useState<MobilePermissionSnapshot | null>(null);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState<unknown>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      setPermissions(await getMobilePermissions(workspaceId));
    } catch (loadError) {
      setPermissions(null);

      setError(loadError);
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void reload();
  }, [reload]);

  return {
    permissions,
    loading,
    error,
    reload,
  };
}
