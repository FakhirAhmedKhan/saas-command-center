import { WorkspaceOnboardingApiError } from './api/workspace-onboarding-api';

export type GuidedBuilderErrorKind = 'EXPIRED' | 'RATE_LIMITED' | 'FORBIDDEN' | 'STALE' | 'VALIDATION' | 'UNAVAILABLE' | 'UNKNOWN';

export interface GuidedBuilderError {
  kind: GuidedBuilderErrorKind;
  message: string;
  retryable: boolean;
}

export function normalizeGuidedBuilderError(error: unknown): GuidedBuilderError {
  const status = error instanceof WorkspaceOnboardingApiError ? error.status : 0;
  const fallbackMessage = error instanceof Error ? error.message : 'Something went wrong.';

  if (status === 410) {
    return {
      kind: 'EXPIRED',
      message: 'This guided session expired.',
      retryable: false,
    };
  }

  if (status === 429) {
    return {
      kind: 'RATE_LIMITED',
      message: 'Too many requests. Try again shortly.',
      retryable: true,
    };
  }

  if ([401, 403, 404].includes(status)) {
    return {
      kind: 'FORBIDDEN',
      message: 'This guided session is unavailable.',
      retryable: false,
    };
  }

  if (status === 409) {
    return {
      kind: 'STALE',
      message: 'The blueprint changed. Reload before continuing.',
      retryable: true,
    };
  }

  if (status === 400 || status === 422) {
    return {
      kind: 'VALIDATION',
      message: fallbackMessage,
      retryable: false,
    };
  }

  if (status >= 500) {
    return {
      kind: 'UNAVAILABLE',
      message: 'The guided builder is temporarily unavailable.',
      retryable: true,
    };
  }

  return {
    kind: 'UNKNOWN',
    message: fallbackMessage,
    retryable: true,
  };
}
