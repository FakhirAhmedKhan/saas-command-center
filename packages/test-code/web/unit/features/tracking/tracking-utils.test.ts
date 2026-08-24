import { describe, expect, it } from 'vitest';
import { formatTrackingDate, getTrackingError } from '@/features/tracking/tracking-utils';

describe('formatTrackingDate', () => {
  it.each([[null], [undefined], ['']])('returns "Never" for %s', (value) => {
    expect(formatTrackingDate(value)).toBe('Never');
  });

  it('returns "Invalid date" for an unparseable value', () => {
    expect(formatTrackingDate('yesterday')).toBe('Invalid date');
  });

  it('formats a valid timestamp', () => {
    expect(formatTrackingDate('2026-05-10T08:30:00.000Z')).toMatch(/2026/);
  });
});

describe('getTrackingError', () => {
  it('returns the Error message', () => {
    expect(getTrackingError(new Error('Key rotation failed'))).toBe('Key rotation failed');
  });

  it('falls back for non-Error values', () => {
    expect(getTrackingError(undefined)).toBe('Unable to load tracking information');
  });
});
