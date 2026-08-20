import type {
  AnalyzeRepositoryInput,
  ImportableRepositoryListResponse,
  ImportWorkspaceFromGithubInput,
  ImportWorkspaceFromGithubResult,
  PersonalGithubCallbackResult,
  PersonalGithubConnectStart,
  PersonalGithubSetupResult,
  RepositoryAnalysisResult,
} from './github-import-types';
import { apiRequest } from '@/features/lib/api/api-client';

export function beginPersonalGithubConnect(): Promise<PersonalGithubConnectStart> {
  return apiRequest<PersonalGithubConnectStart>('/repositories/github/personal/connect', {
    method: 'POST',
  });
}

export function completePersonalGithubSetup(installState: string, installationId: string): Promise<PersonalGithubSetupResult> {
  return apiRequest<PersonalGithubSetupResult>('/repositories/github/personal/setup', {
    method: 'POST',
    body: JSON.stringify({ installState, installationId }),
  });
}

export function completePersonalGithubCallback(code: string, state: string): Promise<PersonalGithubCallbackResult> {
  return apiRequest<PersonalGithubCallbackResult>('/repositories/github/personal/callback', {
    method: 'POST',
    body: JSON.stringify({ code, state }),
  });
}

export function listImportableRepositories(): Promise<ImportableRepositoryListResponse> {
  return apiRequest<ImportableRepositoryListResponse>('/repositories/github/personal');
}

export function analyzeRepository(input: AnalyzeRepositoryInput): Promise<RepositoryAnalysisResult> {
  return apiRequest<RepositoryAnalysisResult>('/repositories/github/personal/analyze', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function importWorkspaceFromGithub(input: ImportWorkspaceFromGithubInput): Promise<ImportWorkspaceFromGithubResult> {
  return apiRequest<ImportWorkspaceFromGithubResult>('/workspaces/import/github', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}
