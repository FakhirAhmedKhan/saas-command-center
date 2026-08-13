import { calculateBounceRate, formatAnalyticsDate, formatDuration, getAnalyticsEngineError } from './analytics-engine-utils';
import { describe, expect, it } from 'vitest';

describe('formatAnalyticsDate', () => {
  it.each([[null], [undefined], ['']])('returns "Never" for %s', (value) => {
    expect(formatAnalyticsDate(value)).toBe('Never');
  });

  it('returns "Invalid date" for an unparseable value', () => {
    expect(formatAnalyticsDate('not-a-date')).toBe('Invalid date');
  });

  it('formats a valid ISO timestamp', () => {
    const formatted = formatAnalyticsDate('2026-03-04T15:30:00.000Z');

    expect(formatted).not.toBe('Invalid date');
    expect(formatted).toMatch(/2026/);
  });
});

describe('formatDuration', () => {
  it.each([
    [0, '0s'],
    [-500, '0s'],
  ])('returns "0s" for non-positive input %i', (input, expected) => {
    expect(formatDuration(input)).toBe(expected);
  });

  it('formats sub-minute durations in seconds', () => {
    expect(formatDuration(1_000)).toBe('1s');
    expect(formatDuration(59_000)).toBe('59s');
  });

  it('rounds to the nearest second', () => {
    expect(formatDuration(1_600)).toBe('2s');
  });

  it('formats durations of a minute or more as minutes and seconds', () => {
    expect(formatDuration(60_000)).toBe('1m 0s');
    expect(formatDuration(90_000)).toBe('1m 30s');
    expect(formatDuration(3_661_000)).toBe('61m 1s');
  });
});

describe('calculateBounceRate', () => {
  it.each([
    [0, 5],
    [-1, 5],
  ])('returns "0%%" when sessions is %i', (sessions, bounces) => {
    expect(calculateBounceRate(sessions, bounces)).toBe('0%');
  });

  it('computes the percentage to one decimal place', () => {
    expect(calculateBounceRate(200, 50)).toBe('25.0%');
    expect(calculateBounceRate(3, 1)).toBe('33.3%');
  });

  it('handles the no-bounce and all-bounce extremes', () => {
    expect(calculateBounceRate(10, 0)).toBe('0.0%');
    expect(calculateBounceRate(10, 10)).toBe('100.0%');
  });
});

describe('getAnalyticsEngineError', () => {
  it('returns the underlying Error message', () => {
    expect(getAnalyticsEngineError(new Error('Engine offline'))).toBe('Engine offline');
  });

  it('falls back for non-Error values', () => {
    expect(getAnalyticsEngineError('oops')).toBe('Unable to complete analytics-engine action');
  });
});
