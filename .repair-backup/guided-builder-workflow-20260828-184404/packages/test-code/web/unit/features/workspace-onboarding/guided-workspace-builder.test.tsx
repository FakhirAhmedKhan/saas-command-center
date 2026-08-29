// @vitest-environment jsdom
import type { WorkspaceBlueprint, WorkspaceOnboardingSessionResponse, WorkspaceQuestionFlowResponse } from '@command-center/shared-types';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GuidedWorkspaceBuilder } from '@/features/workspace-onboarding/components/guided-workspace-builder';

const { generateBlueprintMock, getMock, questionsMock, replaceMock, updateAnswersMock } = vi.hoisted(() => ({
  generateBlueprintMock: vi.fn(),
  getMock: vi.fn(),
  questionsMock: vi.fn(),
  replaceMock: vi.fn(),
  updateAnswersMock: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    replace: replaceMock,
  }),
}));

vi.mock('@/features/workspace-onboarding/api/workspace-onboarding-api', () => ({
  workspaceOnboardingApi: {
    generateBlueprint: generateBlueprintMock,
    get: getMock,
    questions: questionsMock,
    updateAnswers: updateAnswersMock,
  },
}));

vi.mock('@/features/workspace-onboarding/components/onboarding-question-card', () => ({
  OnboardingQuestionCard: ({ onSubmit }: { onSubmit(value: unknown): Promise<void> }) => (
    <button
      onClick={() => {
        void onSubmit('TodoFlow');
      }}
      type='button'
    >
      Submit mocked answer
    </button>
  ),
}));

vi.mock('@/features/workspace-onboarding/components/blueprint-review', () => ({
  BlueprintReview: ({ initialSession, onReady }: { initialSession: WorkspaceOnboardingSessionResponse; onReady(session: WorkspaceOnboardingSessionResponse): void }) => (
    <button data-testid='blueprint-review' onClick={() => onReady(initialSession)} type='button'>
      Complete blueprint review
    </button>
  ),
}));

vi.mock('@/features/workspace-onboarding/components/workspace-creation-progress', () => ({
  WorkspaceCreationProgress: () => <div data-testid='creation-progress'>Creation confirmation</div>,
}));

const blueprint: WorkspaceBlueprint = {
  schemaVersion: 1,
  generator: {
    provider: 'rules',
    version: 'test',
  },
  workspace: {
    name: 'TodoFlow',
    slug: 'todoflow',
    description: 'Task management product',
    productType: 'PRODUCTIVITY_SAAS',
  },
  applications: [],
  services: {
    backend: [],
    database: [],
    cache: [],
    authentication: [],
  },
  features: [],
  environments: ['DEVELOPMENT'],
  engineeringSystems: [],
  recommendations: [],
  repositories: [],
  engineeringConfigurations: [],
};

function session(overrides: Partial<WorkspaceOnboardingSessionResponse> = {}): WorkspaceOnboardingSessionResponse {
  return {
    id: '11111111-1111-4111-8111-111111111111',
    status: 'IN_PROGRESS',
    currentStep: null,
    answers: {},
    blueprint: null,
    schemaVersion: 1,
    ruleSetVersion: null,
    generatorProvider: 'rules',
    workspaceId: null,
    expiresAt: '2099-01-01T00:00:00.000Z',
    createdAt: '2026-08-28T00:00:00.000Z',
    blueprintRevision: 0,
    blueprintHash: null,
    updatedAt: '2026-08-28T00:00:00.000Z',
    ...overrides,
  };
}

function flow(overrides: Partial<WorkspaceQuestionFlowResponse> = {}): WorkspaceQuestionFlowResponse {
  return {
    questions: [],
    currentQuestion: null,
    completed: 10,
    total: 10,
    percent: 100,
    ...overrides,
  };
}

describe('GuidedWorkspaceBuilder', () => {
  beforeEach(() => {
    getMock.mockReset();
    questionsMock.mockReset();
    updateAnswersMock.mockReset();
    generateBlueprintMock.mockReset();
    replaceMock.mockReset();
  });

  it('generates, reviews and advances to confirmation', async () => {
    getMock.mockResolvedValue(session());
    questionsMock.mockResolvedValue(flow());

    generateBlueprintMock.mockResolvedValue(
      session({
        status: 'BLUEPRINT_READY',
        blueprint,
        blueprintRevision: 1,
        blueprintHash: 'a'.repeat(64),
      }),
    );

    render(<GuidedWorkspaceBuilder sessionId='session-1' />);

    fireEvent.click(
      await screen.findByRole('button', {
        name: 'Generate guided recommendations',
      }),
    );

    expect(await screen.findByTestId('blueprint-review')).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole('button', {
        name: 'Complete blueprint review',
      }),
    );

    expect(screen.getByTestId('creation-progress')).toBeInTheDocument();
  });

  it('submits a question answer and reloads the flow', async () => {
    const currentQuestion = {
      key: 'workspaceName' as const,
      prompt: 'What should the workspace be called?',
      type: 'TEXT' as const,
      required: true,
    };

    getMock.mockResolvedValue(session());
    questionsMock.mockResolvedValue(
      flow({
        questions: [currentQuestion],
        currentQuestion,
        completed: 0,
        total: 1,
        percent: 0,
      }),
    );
    updateAnswersMock.mockResolvedValue(session());

    render(<GuidedWorkspaceBuilder sessionId='session-1' />);

    fireEvent.click(
      await screen.findByRole('button', {
        name: 'Submit mocked answer',
      }),
    );

    await vi.waitFor(() => {
      expect(updateAnswersMock).toHaveBeenCalledWith('session-1', {
        workspaceName: 'TodoFlow',
      });
    });
  });

  it('redirects an already completed session', async () => {
    const onCompleted = vi.fn();

    getMock.mockResolvedValue(
      session({
        status: 'COMPLETED',
        workspaceId: 'workspace-1',
      }),
    );
    questionsMock.mockResolvedValue(flow());

    render(<GuidedWorkspaceBuilder onCompleted={onCompleted} sessionId='session-1' />);

    await vi.waitFor(() => {
      expect(onCompleted).toHaveBeenCalledWith('workspace-1');
      expect(replaceMock).toHaveBeenCalledWith('/workspaces/workspace-1');
    });
  });
});
