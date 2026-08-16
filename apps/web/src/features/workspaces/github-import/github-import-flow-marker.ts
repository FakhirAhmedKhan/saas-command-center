/**
 * The GitHub App has a single registered callback URL, so /github/setup
 * and /github/callback must serve both the workspace-scoped "Connect
 * GitHub" flow and this pre-workspace import flow. This sessionStorage
 * flag, set immediately before redirecting to GitHub, lets those shared
 * pages branch to the right backend endpoints on return.
 */
const GITHUB_IMPORT_FLOW_KEY = 'command-center:github-import-flow';

const GITHUB_IMPORT_RETURN_KEY = 'command-center:github-import-return-to';

export function markGithubImportFlow(returnTo: string): void {
  sessionStorage.setItem(GITHUB_IMPORT_FLOW_KEY, '1');
  sessionStorage.setItem(GITHUB_IMPORT_RETURN_KEY, returnTo);
}

export function isGithubImportFlow(): boolean {
  return sessionStorage.getItem(GITHUB_IMPORT_FLOW_KEY) === '1';
}

export function githubImportReturnPath(): string {
  return sessionStorage.getItem(GITHUB_IMPORT_RETURN_KEY) ?? '/workspaces/new';
}

export function clearGithubImportFlow(): void {
  sessionStorage.removeItem(GITHUB_IMPORT_FLOW_KEY);
  sessionStorage.removeItem(GITHUB_IMPORT_RETURN_KEY);
}
