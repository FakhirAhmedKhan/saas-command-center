export interface PersonalGithubConnectStart {
  installationUrl: string;
}

export interface PersonalGithubSetupResult {
  authorizationUrl: string;
}

export interface PersonalGithubCallbackResult {
  installationId: string;
  accountLogin: string;
  accountType: string;
  repositoryCount: number;
}

export interface ImportableGithubInstallation {
  id: string;
  accountLogin: string;
  accountType: string;
}

export interface ImportableGithubRepositoryOwner {
  login: string;
  avatarUrl: string;
}

export interface ImportableGithubRepository {
  id: number;
  name: string;
  fullName: string;
  description: string | null;
  private: boolean;
  defaultBranch: string;
  htmlUrl: string;
  owner: ImportableGithubRepositoryOwner;
  updatedAt: string;
}

export interface ImportableRepositoryListResponse {
  installations: ImportableGithubInstallation[];
  repositories: ImportableGithubRepository[];
}

export const PACKAGE_MANAGERS = ['pnpm', 'npm', 'yarn', 'bun', 'unknown'] as const;

export type PackageManager = (typeof PACKAGE_MANAGERS)[number];

export const REPOSITORY_TYPES = ['single-app', 'monorepo'] as const;

export type RepositoryType = (typeof REPOSITORY_TYPES)[number];

export interface AnalyzeRepositoryInput {
  repositoryId: number;
  installationId?: string;
}

export interface DetectedApplicationCommands {
  dev?: string;
  build?: string;
  start?: string;
  test?: string;
  lint?: string;
}

export interface DetectedApplication {
  name: string;
  rootDirectory: string;
  framework: string | null;
  language: string | null;
  packageName: string | null;
  commands: DetectedApplicationCommands;
  technologies: string[];
  runnable: boolean;
  confidence: number;
}

export interface AnalyzedRepositorySummary {
  id: number;
  installationId: string;
  owner: string;
  name: string;
  fullName: string;
  defaultBranch: string;
  htmlUrl: string;
  private: boolean;
}

export interface SuggestedWorkspace {
  name: string;
  slug: string;
  description: string | null;
}

export interface RepositoryAnalysisResult {
  repository: AnalyzedRepositorySummary;
  repositoryType: RepositoryType;
  suggestedWorkspace: SuggestedWorkspace;
  packageManager: PackageManager;
  applications: DetectedApplication[];
  analyzedAt: string;
}

export interface ImportApplicationSelection {
  name: string;
  slug?: string;
  rootDirectory: string;
  framework?: string | null;
  language?: string | null;
  commands?: DetectedApplicationCommands;
  technologies?: string[];
}

export interface ImportWorkspaceFromGithubInput {
  installationId: string;
  repositoryId: number;
  defaultBranch?: string;
  workspace: {
    name: string;
    slug?: string;
    description?: string | null;
  };
  applications: ImportApplicationSelection[];
}

export interface ImportedApplicationSummary {
  id: string;
  name: string;
  slug: string;
  rootDirectory: string;
}

export interface ImportWorkspaceFromGithubResult {
  workspaceId: string;
  workspaceSlug: string;
  repositoryConnectionId: string;
  applications: ImportedApplicationSummary[];
}
