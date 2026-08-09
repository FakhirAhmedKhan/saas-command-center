export interface RepositoryApplicationSummary {
  id: string;
  name: string;
  slug: string;
  archivedAt: string | null;
}

export interface RepositoryInstallationSummary {
  id: string;
  externalInstallationId: string;
  accountLogin: string;
  accountType: string;
  connectedAt: string;
  lastSyncedAt: string | null;
}

export interface RepositoryConnection {
  id: string;
  workspaceId: string;
  installationId: string;
  applicationId: string | null;
  provider: 'GITHUB';
  externalRepoId: string;

  owner: string;
  name: string;
  fullName: string;
  defaultBranch: string;
  isPrivate: boolean;
  htmlUrl: string;
  archived: boolean;
  isAvailable: boolean;

  lastSyncedAt: string | null;
  createdAt: string;
  updatedAt: string;

  application: RepositoryApplicationSummary | null;

  installation: RepositoryInstallationSummary;
}

export interface RepositoryListResponse {
  installations: RepositoryInstallationSummary[];
  repositories: RepositoryConnection[];
}

export interface GithubConnectStart {
  installationUrl: string;
}

export interface GithubSetupResult {
  authorizationUrl: string;
}

export interface GithubCallbackResult {
  workspaceId: string;
  repositoryCount: number;
}