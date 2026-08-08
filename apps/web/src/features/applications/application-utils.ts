export function formatApplicationDate(value: string | null | undefined): string {
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

export function toDateInputValue(value: string | null | undefined): string {
  if (!value) {
    return '';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return date.toISOString().slice(0, 10);
}

export function toApiDateValue(value: string): string | null {
  if (!value) {
    return null;
  }

  return new Date(`${value}T00:00:00.000Z`).toISOString();
}

export function getApplicationInitials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0))
    .join('')
    .toUpperCase();
}

export function getErrorMessage(error: unknown, fallback = 'Something went wrong'): string {
  if (error instanceof Error) {
    return error.message;
  }

  return fallback;
}
