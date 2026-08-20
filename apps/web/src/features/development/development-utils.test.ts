import { formatDevelopmentDate, getDevelopmentError, toApiDate, toDateInput } from './development-utils';
import { describe, expect, it } from 'vitest';

describe('formatDevelopmentDate', () => {
  it.each([[null], [undefined], ['']])('returns "Not set" for %s', (value) => {
    expect(formatDevelopmentDate(value)).toBe('Not set');
  });

  it('returns "Invalid date" for an unparseable value', () => {
    expect(formatDevelopmentDate('whenever')).toBe('Invalid date');
  });

  it('formats a valid date', () => {
    expect(formatDevelopmentDate('2026-02-20T00:00:00.000Z')).toMatch(/2026/);
  });
});

describe('toDateInput', () => {
  it.each([[null], [undefined], ['']])('returns an empty string for %s', (value) => {
    expect(toDateInput(value)).toBe('');
  });

  it('returns an empty string for an invalid date', () => {
    expect(toDateInput('bad')).toBe('');
  });

  it('returns the YYYY-MM-DD portion', () => {
    expect(toDateInput('2026-02-20T09:15:00.000Z')).toBe('2026-02-20');
  });
});

describe('toApiDate', () => {
  it('returns null for an empty string', () => {
    expect(toApiDate('')).toBeNull();
  });

  it('expands a date-only value to UTC midnight', () => {
    expect(toApiDate('2026-02-20')).toBe('2026-02-20T00:00:00.000Z');
  });

  it('round-trips with toDateInput', () => {
    expect(toDateInput(toApiDate('2026-11-05'))).toBe('2026-11-05');
  });
});

describe('getDevelopmentError', () => {
  it('returns the Error message', () => {
    expect(getDevelopmentError(new Error('Milestone locked'))).toBe('Milestone locked');
  });

  it('uses the default fallback for non-Error values', () => {
    expect(getDevelopmentError({ code: 500 })).toBe('Unable to complete this action');
  });

  it('honours a custom fallback', () => {
    expect(getDevelopmentError(null, 'Task update failed')).toBe('Task update failed');
  });
});
