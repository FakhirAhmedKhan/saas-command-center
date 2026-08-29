import type {
  ConfirmWorkspaceBlueprintInput,
  UpdateWorkspaceBlueprintInput,
  WorkspaceBlueprintValidationResult,
  WorkspaceCreationResult,
  WorkspaceOnboardingAnswers,
  WorkspaceOnboardingSessionResponse,
  WorkspaceQuestionFlowResponse,
} from '@command-center/shared-types';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1';

interface ApiErrorBody {
  message?: string;
  issues?: unknown;
}

export interface WorkspaceOnboardingFeatureState {
  guidedWorkspaceBuilderEnabled: boolean;
}

export class WorkspaceOnboardingApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly body: ApiErrorBody | null,
  ) {
    super(message);
    this.name = 'WorkspaceOnboardingApiError';
  }
}

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
    const body = (await response.json().catch(() => null)) as ApiErrorBody | null;

    throw new WorkspaceOnboardingApiError(response.status, body?.message ?? `Request failed with ${response.status}`, body);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

const sessionPath = (id: string): string => `/workspace-onboarding/sessions/${id}`;

export const workspaceOnboardingApi = {
  featureState: () => request<WorkspaceOnboardingFeatureState>('/features/guided-workspace-builder'),

  create: () =>
    request<WorkspaceOnboardingSessionResponse>('/workspace-onboarding/sessions', {
      method: 'POST',
    }),

  get: (id: string) => request<WorkspaceOnboardingSessionResponse>(sessionPath(id)),

  questions: (id: string) => request<WorkspaceQuestionFlowResponse>(`${sessionPath(id)}/questions`),

  updateAnswers: (id: string, answers: Partial<WorkspaceOnboardingAnswers>) =>
    request<WorkspaceOnboardingSessionResponse>(`${sessionPath(id)}/answers`, {
      method: 'PATCH',
      body: JSON.stringify({ answers }),
    }),

  generateBlueprint: (id: string) =>
    request<WorkspaceOnboardingSessionResponse>(`${sessionPath(id)}/blueprint`, {
      method: 'POST',
    }),

  updateBlueprint: (id: string, input: UpdateWorkspaceBlueprintInput) =>
    request<WorkspaceOnboardingSessionResponse>(`${sessionPath(id)}/blueprint`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    }),

  validateBlueprint: (id: string) =>
    request<WorkspaceBlueprintValidationResult>(`${sessionPath(id)}/validate`, {
      method: 'POST',
    }),

  confirm: (id: string, input: ConfirmWorkspaceBlueprintInput) =>
    request<WorkspaceCreationResult>(`${sessionPath(id)}/confirm`, {
      method: 'POST',
      body: JSON.stringify(input),
    }),

  remove: (id: string) =>
    request<void>(sessionPath(id), {
      method: 'DELETE',
    }),
};
