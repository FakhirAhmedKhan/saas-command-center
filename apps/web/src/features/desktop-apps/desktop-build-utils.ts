import type { DesktopBuildArtifactType, DesktopBuildStatus, DesktopTestType } from '@command-center/shared-types';

export function shortSha(value: string): string {
  return value.slice(0, 8);
}

export function formatDuration(durationMs: number | null): string {
  if (durationMs === null) return '—';

  const seconds = Math.round(durationMs / 1000);

  if (seconds < 60) {
    return `${seconds}s`;
  }

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  return `${minutes}m ${remainingSeconds}s`;
}

export const DESKTOP_BUILD_STATUS_LABELS: Record<DesktopBuildStatus, string> = {
  QUEUED: 'Queued',
  BUILDING: 'Building',
  SUCCESS: 'Success',
  FAILED: 'Failed',
  CANCELLED: 'Cancelled',
};

export const DESKTOP_ARTIFACT_TYPE_LABELS: Record<DesktopBuildArtifactType, string> = {
  EXE: 'EXE',
  MSI: 'MSI',
  MSIX: 'MSIX',
  DMG: 'DMG',
  PKG: 'PKG',
  APP: 'APP',
  APPIMAGE: 'AppImage',
  DEB: 'DEB',
  RPM: 'RPM',
  ZIP: 'ZIP',
  OTHER: 'Other',
};

export const DESKTOP_TEST_TYPE_LABELS: Record<DesktopTestType, string> = {
  UNIT: 'Unit',
  INTEGRATION: 'Integration',
  UI: 'UI',
  E2E: 'E2E',
  INSTALLER: 'Installer',
  OTHER: 'Other',
};
