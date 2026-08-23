import type { MobileBuildStatus, MobileTestStatus, MobileTestType } from '@command-center/shared-types';

export const MOBILE_BUILD_STATUS_LABELS: Record<MobileBuildStatus, string> = {
  QUEUED: 'Queued',
  BUILDING: 'Building',
  SUCCESS: 'Success',
  FAILED: 'Failed',
  CANCELLED: 'Cancelled',
};

export const MOBILE_TEST_TYPE_LABELS: Record<MobileTestType, string> = {
  UNIT: 'Unit Tests',
  UI: 'UI Tests',
  INTEGRATION: 'Integration Tests',
  INSTRUMENTATION: 'Instrumentation',
  SNAPSHOT: 'Snapshot Tests',
  OTHER: 'Other Tests',
};

export const MOBILE_TEST_STATUS_LABELS: Record<MobileTestStatus, string> = {
  PASSED: 'Passed',
  FAILED: 'Failed',
  CANCELLED: 'Cancelled',

  PENDING: 'Pending',
  RUNNING: 'Running',
  SKIPPED: 'Skipped',
};

export function formatDuration(durationMs: number | null): string {
  if (durationMs === null || durationMs < 0) {
    return 'â€”';
  }

  const seconds = Math.round(durationMs / 1000);

  const minutes = Math.floor(seconds / 60);

  const remaining = seconds % 60;

  if (minutes === 0) {
    return `${remaining}s`;
  }

  return `${minutes}m ${remaining}s`;
}

export function shortSha(sha: string): string {
  return sha.slice(0, 7);
}
