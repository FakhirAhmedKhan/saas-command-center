export type GuidedBuilderErrorKind = 'EXPIRED' | 'RATE_LIMITED' | 'FORBIDDEN' | 'STALE' | 'VALIDATION' | 'UNAVAILABLE' | 'UNKNOWN';

export interface GuidedBuilderError {
  kind: GuidedBuilderErrorKind;
  message: string;
  retryable: boolean;
}

export function normalizeGuidedBuilderError(error: unknown): GuidedBuilderError {
  const status = typeof error === 'object' && error && 'status' in error ? Number(error.status) : 0;

  if (status === 410) {
    return { kind: 'EXPIRED', message: 'This guided session expired.', retryable: false };
  }
  if (status === 429) {
    return { kind: 'RATE_LIMITED', message: 'Too many requests. Try again shortly.', retryable: true };
  }
  if (status === 401 || status === 403 || status === 404) {
    return { kind: 'FORBIDDEN', message: 'This guided session is unavailable.', retryable: false };
  }
  if (status === 409) {
    return { kind: 'STALE', message: 'The blueprint changed. Reload before continuing.', retryable: true };
  }
  if (status === 422 || status === 400) {
    return { kind: 'VALIDATION', message: 'Some guided configuration is invalid.', retryable: false };
  }
  if (status >= 500) {
    return { kind: 'UNAVAILABLE', message: 'The guided builder is temporarily unavailable.', retryable: true };
  }

  return { kind: 'UNKNOWN', message: 'Something went wrong.', retryable: true };
}
