import { assertTrustedGithubUrl, isTrustedGithubUrl } from '@/features/lib/github/github-url';
import { describe, expect, it } from 'vitest';

describe('isTrustedGithubUrl', () => {
  it('accepts an https github.com URL', () => {
    expect(isTrustedGithubUrl('https://github.com/apps/command-center/installations/new?state=abc')).toBe(true);
  });

  it('accepts an https www.github.com URL', () => {
    expect(isTrustedGithubUrl('https://www.github.com/login/oauth/authorize?client_id=abc')).toBe(true);
  });

  it('rejects http (non-TLS) github.com', () => {
    expect(isTrustedGithubUrl('http://github.com/apps/command-center')).toBe(false);
  });

  it('rejects a look-alike host', () => {
    expect(isTrustedGithubUrl('https://github.com.attacker.example/phish')).toBe(false);
  });

  it('rejects an unrelated host', () => {
    expect(isTrustedGithubUrl('https://attacker.example.com/phish')).toBe(false);
  });

  it('rejects a javascript: URL', () => {
    expect(isTrustedGithubUrl('javascript:alert(1)')).toBe(false);
  });

  it('rejects a malformed URL', () => {
    expect(isTrustedGithubUrl('not a url')).toBe(false);
  });
});

describe('assertTrustedGithubUrl', () => {
  it('returns the URL unchanged when trusted', () => {
    const url = 'https://github.com/apps/command-center/installations/new?state=abc';

    expect(assertTrustedGithubUrl(url)).toBe(url);
  });

  it('throws for an untrusted URL', () => {
    expect(() => assertTrustedGithubUrl('https://attacker.example.com/phish')).toThrow(/did not return a valid authorization URL/);
  });
});
