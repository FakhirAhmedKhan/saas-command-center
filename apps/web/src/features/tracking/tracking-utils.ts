export function formatTrackingDate(value: string | null | undefined): string {
  if (!value) {
    return 'Never';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'Invalid date';
  }

  return new Intl.DateTimeFormat('en', {
    dateStyle: 'medium',
    timeStyle: 'medium',
  }).format(date);
}

export function getTrackingError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return 'Unable to load tracking information';
}
