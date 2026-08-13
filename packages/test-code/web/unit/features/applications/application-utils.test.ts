import {
  formatApplicationDate,
  formatRelativeApplicationDate,
  getApplicationInitials,
  getErrorMessage,
  toApiDateValue,
  toDateInputValue,
} from '@/features/applications/application-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('formatApplicationDate', () => {
  it.each([[null], [undefined], ['']])('returns "Not set" for %s', (value) => {
    expect(formatApplicationDate(value)).toBe('Not set');
  });

  it('returns "Invalid date" for an unparseable value', () => {
    expect(formatApplicationDate('nonsense')).toBe('Invalid date');
  });

  it('formats a valid date', () => {
    expect(formatApplicationDate('2026-01-15T00:00:00.000Z')).toMatch(/2026/);
  });
});

describe('toDateInputValue', () => {
  it.each([[null], [undefined], ['']])('returns an empty string for %s', (value) => {
    expect(toDateInputValue(value)).toBe('');
  });

  it('returns an empty string for an invalid date', () => {
    expect(toDateInputValue('nope')).toBe('');
  });

  it('returns the YYYY-MM-DD portion of a valid date', () => {
    expect(toDateInputValue('2026-01-15T13:45:00.000Z')).toBe('2026-01-15');
  });
});

describe('toApiDateValue', () => {
  it('returns null for an empty string', () => {
    expect(toApiDateValue('')).toBeNull();
  });

  it('expands a date-only value to an ISO timestamp at UTC midnight', () => {
    expect(toApiDateValue('2026-01-15')).toBe('2026-01-15T00:00:00.000Z');
  });

  it('round-trips with toDateInputValue', () => {
    const apiValue = toApiDateValue('2026-06-30');

    expect(toDateInputValue(apiValue)).toBe('2026-06-30');
  });
});

describe('formatRelativeApplicationDate', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-15T12:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it.each([[null], [undefined], ['']])('returns null for %s', (value) => {
    expect(formatRelativeApplicationDate(value)).toBeNull();
  });

  it('returns null for an invalid date', () => {
    expect(formatRelativeApplicationDate('not-a-date')).toBeNull();
  });

  it('reports "just now" inside the one-minute window', () => {
    expect(formatRelativeApplicationDate('2026-01-15T11:59:30.000Z')).toBe('Updated just now');
  });

  it('reports minutes below the one-hour threshold', () => {
    expect(formatRelativeApplicationDate('2026-01-15T11:30:00.000Z')).toBe('Updated 30 minutes ago');
  });

  it('reports hours below the one-day threshold', () => {
    expect(formatRelativeApplicationDate('2026-01-15T08:00:00.000Z')).toBe('Updated 4 hours ago');
  });

  it('reports days below the 30-day threshold', () => {
    expect(formatRelativeApplicationDate('2026-01-10T12:00:00.000Z')).toBe('Updated 5 days ago');
  });

  it('falls back to an absolute date beyond 30 days', () => {
    const result = formatRelativeApplicationDate('2025-01-15T12:00:00.000Z');

    expect(result).toMatch(/^Updated /);
    expect(result).toMatch(/2025/);
  });

  it('handles future dates', () => {
    expect(formatRelativeApplicationDate('2026-01-15T14:00:00.000Z')).toBe('Updated in 2 hours');
  });
});

describe('getApplicationInitials', () => {
  it('takes the first letter of the first two words', () => {
    expect(getApplicationInitials('Command Center')).toBe('CC');
  });

  it('ignores words beyond the second', () => {
    expect(getApplicationInitials('One Two Three Four')).toBe('OT');
  });

  it('handles a single word', () => {
    expect(getApplicationInitials('Tracker')).toBe('T');
  });

  it('collapses extra whitespace', () => {
    expect(getApplicationInitials('  Alpha   Beta  ')).toBe('AB');
  });

  it('uppercases lowercase input', () => {
    expect(getApplicationInitials('alpha beta')).toBe('AB');
  });

  it('returns an empty string for blank input', () => {
    expect(getApplicationInitials('')).toBe('');
    expect(getApplicationInitials('   ')).toBe('');
  });
});

describe('getErrorMessage', () => {
  it('returns the Error message', () => {
    expect(getErrorMessage(new Error('Save failed'))).toBe('Save failed');
  });

  it('uses the default fallback for non-Error values', () => {
    expect(getErrorMessage(null)).toBe('Something went wrong');
  });

  it('honours a custom fallback', () => {
    expect(getErrorMessage('bad', 'Could not save application')).toBe('Could not save application');
  });
});
