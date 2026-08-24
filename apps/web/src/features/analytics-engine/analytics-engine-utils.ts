export function formatAnalyticsDate(value: string | null | undefined): string {
  if (!value) {
    return 'Never';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'Invalid date';
  }

  return new Intl.DateTimeFormat('en', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

export function formatDuration(durationMs: number): string {
  if (durationMs <= 0) {
    return '0s';
  }

  const seconds = Math.round(durationMs / 1000);

  if (seconds < 60) {
    return `${seconds}s`;
  }

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  return `${minutes}m ${remainingSeconds}s`;
}

export function calculateBounceRate(sessions: number, bounces: number): string {
  if (sessions <= 0) {
    return '0%';
  }

  return `${((bounces / sessions) * 100).toFixed(1)}%`;
}

export function getAnalyticsEngineError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return 'Unable to complete analytics-engine action';
}
