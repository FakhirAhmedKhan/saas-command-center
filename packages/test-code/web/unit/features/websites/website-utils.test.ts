import { describe, expect, it } from 'vitest';
import { formatWebsiteDate, getWebsiteError, originsToText, textToOrigins, websiteKeyStorageName } from '@/features/websites/website-utils';

describe('getWebsiteError', () => {
  it('returns the Error message', () => {
    expect(getWebsiteError(new Error('Domain taken'))).toBe('Domain taken');
  });

  it('uses the default fallback for non-Error values', () => {
    expect(getWebsiteError(null)).toBe('Unable to complete website action');
  });

  it('honours a custom fallback', () => {
    expect(getWebsiteError('bad', 'Could not rotate key')).toBe('Could not rotate key');
  });
});

describe('formatWebsiteDate', () => {
  it.each([[null], [undefined], ['']])('returns "Never" for %s', (value) => {
    expect(formatWebsiteDate(value)).toBe('Never');
  });

  it('returns "Invalid date" for an unparseable value', () => {
    expect(formatWebsiteDate('soon')).toBe('Invalid date');
  });

  it('formats a valid timestamp', () => {
    expect(formatWebsiteDate('2026-04-01T10:00:00.000Z')).toMatch(/2026/);
  });
});

describe('originsToText', () => {
  it('joins origins with newlines', () => {
    expect(originsToText(['https://a.com', 'https://b.com'])).toBe('https://a.com\nhttps://b.com');
  });

  it('returns an empty string for no origins', () => {
    expect(originsToText([])).toBe('');
  });
});

describe('textToOrigins', () => {
  it('splits on newlines', () => {
    expect(textToOrigins('https://a.com\nhttps://b.com')).toEqual(['https://a.com', 'https://b.com']);
  });

  it('splits on commas', () => {
    expect(textToOrigins('https://a.com,https://b.com')).toEqual(['https://a.com', 'https://b.com']);
  });

  it('handles CRLF line endings', () => {
    expect(textToOrigins('https://a.com\r\nhttps://b.com')).toEqual(['https://a.com', 'https://b.com']);
  });

  it('trims surrounding whitespace', () => {
    expect(textToOrigins('  https://a.com  ,  https://b.com  ')).toEqual(['https://a.com', 'https://b.com']);
  });

  it('drops empty entries', () => {
    expect(textToOrigins('https://a.com\n\n\nhttps://b.com')).toEqual(['https://a.com', 'https://b.com']);
  });

  it('removes duplicates while preserving first-seen order', () => {
    expect(textToOrigins('https://b.com\nhttps://a.com\nhttps://b.com')).toEqual(['https://b.com', 'https://a.com']);
  });

  it('returns an empty array for blank input', () => {
    expect(textToOrigins('')).toEqual([]);
    expect(textToOrigins('  \n , \n ')).toEqual([]);
  });

  it('round-trips with originsToText', () => {
    const origins = ['https://a.com', 'https://b.com'];

    expect(textToOrigins(originsToText(origins))).toEqual(origins);
  });
});

describe('websiteKeyStorageName', () => {
  it('namespaces the storage key by website id', () => {
    expect(websiteKeyStorageName('site-1')).toBe('command-center:website-key:site-1');
  });
});
