'use client';

import type { MobilePermissionSnapshot } from '@command-center/shared-types';
import type { ReactNode } from 'react';

type Permission = 'write' | 'admin' | 'secrets';

export function MobilePermissionGate({
  permissions,
  permission,
  children,
  fallback = null,
}: {
  permissions: MobilePermissionSnapshot | null;

  permission: Permission;

  children: ReactNode;

  fallback?: ReactNode;
}) {
  if (!permissions) {
    return fallback;
  }

  const allowed = permission === 'write' ? permissions.canWrite : permission === 'admin' ? permissions.canAdmin : permissions.canManageSecrets;

  return allowed ? children : fallback;
}
