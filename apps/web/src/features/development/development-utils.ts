export function formatDevelopmentDate(value: string | null | undefined): string {
  if (!value) {
    return 'Not set';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'Invalid date';
  }

  return new Intl.DateTimeFormat('en', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(date);
}

export function toDateInput(value: string | null | undefined): string {
  if (!value) {
    return '';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return date.toISOString().slice(0, 10);
}

export function toApiDate(value: string): string | null {
  if (!value) {
    return null;
  }

  return new Date(`${value}T00:00:00.000Z`).toISOString();
}

export function getDevelopmentError(
  error: unknown,
  fallback = 'Unable to complete this action',
): string {
  if (error instanceof Error) {
    return error.message;
  }

  return fallback;
}
