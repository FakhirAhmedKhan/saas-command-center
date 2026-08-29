import type { WorkspaceOnboardingAnswers, WorkspaceOnboardingSessionResponse, WorkspaceQuestionFlowResponse } from '@command-center/shared-types';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    credentials: 'include',
    headers: {
      'content-type': 'application/json',
      ...init?.headers,
    },
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.message ?? `Request failed with ${response.status}`);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

export const workspaceOnboardingApi = {
  create: () =>
    request<WorkspaceOnboardingSessionResponse>('/workspace-onboarding/sessions', {
      method: 'POST',
    }),
  get: (id: string) => request<WorkspaceOnboardingSessionResponse>(`/workspace-onboarding/sessions/${id}`),
  questions: (id: string) => request<WorkspaceQuestionFlowResponse>(`/workspace-onboarding/sessions/${id}/questions`),
  updateAnswers: (id: string, answers: Partial<WorkspaceOnboardingAnswers>) =>
    request<WorkspaceOnboardingSessionResponse>(`/workspace-onboarding/sessions/${id}/answers`, {
      method: 'PATCH',
      body: JSON.stringify({ answers }),
    }),
};
