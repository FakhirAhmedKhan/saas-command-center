import { apiRequest } from '@/features/lib/api/api-client';
import { ApiError } from '@/features/lib/api/api-error';
import type {
  ConfirmWorkspaceBlueprintInput,
  UpdateWorkspaceBlueprintInput,
  WorkspaceBlueprintValidationResult,
  WorkspaceCreationResult,
  WorkspaceOnboardingAnswers,
  WorkspaceOnboardingSessionResponse,
  WorkspaceQuestionFlowResponse,
} from '@command-center/shared-types';

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

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  try {
    const response: unknown = await apiRequest<unknown>(path, {
      ...init,
      body: init.body,
    });

    if (typeof response === 'object' && response !== null && 'data' in response) {
      return (response as { data: T }).data;
    }

    return response as T;
  } catch (error) {
    if (error instanceof ApiError) {
      const body = typeof error.details === 'object' && error.details !== null ? (error.details as ApiErrorBody) : null;

      throw new WorkspaceOnboardingApiError(error.status, error.message, body);
    }

    throw error;
  }
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
