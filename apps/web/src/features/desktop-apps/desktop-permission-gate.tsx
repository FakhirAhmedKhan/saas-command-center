import type { DesktopPermissions } from '@command-center/shared-types';
import type { ReactNode } from 'react';

type DesktopPermissionRequirement = 'read' | 'write' | 'manage' | 'analyze' | 'secrets';

interface Props {
  permissions: DesktopPermissions | null;
  require: DesktopPermissionRequirement;
  children: ReactNode;
  fallback?: ReactNode;
}

function allowed(permissions: DesktopPermissions, requirement: DesktopPermissionRequirement) {
  switch (requirement) {
    case 'read':
      return permissions.canRead;
    case 'write':
      return permissions.canWrite;
    case 'manage':
      return permissions.canManage;
    case 'analyze':
      return permissions.canAnalyze;
    case 'secrets':
      return permissions.canConfigureSecrets;
  }
}

export function DesktopPermissionGate({ permissions, require, children, fallback = null }: Props) {
  if (!permissions || !allowed(permissions, require)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}