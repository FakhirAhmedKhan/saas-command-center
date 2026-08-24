import type { DesktopRelease, DesktopReleaseChannel, DesktopReleaseStatus } from '@command-center/shared-types';

export const DESKTOP_RELEASE_CHANNEL_LABELS: Record<DesktopReleaseChannel, string> = {
  DEV: 'Dev',
  ALPHA: 'Alpha',
  BETA: 'Beta',
  STABLE: 'Stable',
  LTS: 'LTS',
};

export const DESKTOP_RELEASE_STATUS_LABELS: Record<DesktopReleaseStatus, string> = {
  DRAFT: 'Draft',
  READY: 'Ready',
  PUBLISHED: 'Published',
  FAILED: 'Failed',
  ROLLED_BACK: 'Rolled Back',
};

export function nextDesktopReleaseActions(status: DesktopReleaseStatus): Array<{
  label: string;
  status: DesktopReleaseStatus;
}> {
  switch (status) {
    case 'DRAFT':
      return [
        {
          label: 'Mark Ready',
          status: 'READY',
        },
        {
          label: 'Mark Failed',
          status: 'FAILED',
        },
      ];

    case 'READY':
      return [
        {
          label: 'Publish',
          status: 'PUBLISHED',
        },
        {
          label: 'Mark Failed',
          status: 'FAILED',
        },
      ];

    case 'PUBLISHED':
      return [
        {
          label: 'Roll Back',
          status: 'ROLLED_BACK',
        },
      ];

    case 'FAILED':
    case 'ROLLED_BACK':
      return [];
  }
}

export function formatReleaseTarget(release: Pick<DesktopRelease, 'platform' | 'architecture'>): string {
  const platform = release.platform === 'MACOS' ? 'macOS' : release.platform === 'WINDOWS' ? 'Windows' : release.platform === 'LINUX' ? 'Linux' : 'Cross-platform';
  const architecture = release.architecture === 'ARM64' ? 'arm64' : release.architecture === 'X64' ? 'x64' : release.architecture === 'X86' ? 'x86' : 'Universal';

  return `${platform} • ${architecture}`;
}

export function formatReleaseDate(value: string | null): string {
  if (!value) {
    return 'Not published';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'Unknown date';
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}
