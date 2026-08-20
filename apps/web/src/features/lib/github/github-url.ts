const ALLOWED_GITHUB_HOSTS = new Set(['github.com', 'www.github.com']);

/**
 * Backend-issued GitHub installation/authorization URLs are trusted today,
 * but the frontend still validates before a full-page navigation so a
 * compromised or misconfigured API response can never redirect the browser
 * off github.com.
 */
export function isTrustedGithubUrl(value: string): boolean {
  let url: URL;

  try {
    url = new URL(value);
  } catch {
    return false;
  }

  return url.protocol === 'https:' && ALLOWED_GITHUB_HOSTS.has(url.hostname);
}

export function assertTrustedGithubUrl(value: string): string {
  if (!isTrustedGithubUrl(value)) {
    throw new Error('GitHub did not return a valid authorization URL. Please try again.');
  }

  return value;
}
