// @vitest-environment jsdom
import type { WorkspaceBlueprint, WorkspaceOnboardingSessionResponse } from '@command-center/shared-types';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BlueprintReview } from '@/features/workspace-onboarding/components/blueprint-review';

const { listRepositoriesMock, updateBlueprintMock, validateBlueprintMock } = vi.hoisted(() => ({
  listRepositoriesMock: vi.fn(),
  updateBlueprintMock: vi.fn(),
  validateBlueprintMock: vi.fn(),
}));

vi.mock('@/features/workspaces/github-import/github-import-api', () => ({
  listImportableRepositories: listRepositoriesMock,
}));

vi.mock('@/features/workspace-onboarding/api/workspace-onboarding-api', () => ({
  workspaceOnboardingApi: {
    updateBlueprint: updateBlueprintMock,
    validateBlueprint: validateBlueprintMock,
  },
}));

vi.mock('@/features/workspace-onboarding/components/blueprint-application-editor', () => ({
  BlueprintApplicationEditor: ({
    application,
  }: {
    application: {
      type: string;
    };
  }) => <div>{application.type} application</div>,
}));

const blueprint: WorkspaceBlueprint = {
  schemaVersion: 1,
  generator: {
    provider: 'rules',
    version: 'test',
  },
  workspace: {
    name: 'Guided Runtime',
    slug: 'guided-runtime',
    description: 'Secure task management product',
    productType: 'PRODUCTIVITY_SAAS',
  },
  applications: [
    {
      type: 'WEB',
      name: 'Guided Runtime Web',
      platforms: ['WEB'],
      stack: ['NEXT_JS', 'TYPESCRIPT'],
      source: 'RULE',
    },
  ],
  services: {
    backend: [],
    database: [],
    cache: [],
    authentication: [],
  },
  features: ['TASKS'],
  environments: ['DEVELOPMENT'],
  engineeringSystems: ['SECURITY'],
  recommendations: [],
  repositories: [],
  engineeringConfigurations: [],
};

function session(overrides: Partial<WorkspaceOnboardingSessionResponse> = {}): WorkspaceOnboardingSessionResponse {
  return {
    id: '11111111-1111-4111-8111-111111111111',
    status: 'BLUEPRINT_READY',
    currentStep: null,
    answers: {
      repositories: 'CONNECT_NOW',
    },
    blueprint,
    schemaVersion: 1,
    ruleSetVersion: 'test',
    generatorProvider: 'rules',
    workspaceId: null,
    expiresAt: '2099-01-01T00:00:00.000Z',
    createdAt: '2026-08-28T00:00:00.000Z',
    blueprintRevision: 1,
    blueprintHash: 'a'.repeat(64),
    updatedAt: '2026-08-28T00:00:00.000Z',
    ...overrides,
  };
}

describe('BlueprintReview repository selection', () => {
  beforeEach(() => {
    listRepositoriesMock.mockReset();
    updateBlueprintMock.mockReset();
    validateBlueprintMock.mockReset();

    listRepositoriesMock.mockResolvedValue({
      installations: [
        {
          id: '7001',
          accountLogin: 'acme',
          accountType: 'Organization',
        },
      ],
      repositories: [
        {
          id: 9001,
          name: 'guided-runtime',
          fullName: 'acme/guided-runtime',
          description: null,
          private: true,
          defaultBranch: 'main',
          htmlUrl: 'https://github.com/acme/guided-runtime',
          updatedAt: '2026-08-28T00:00:00.000Z',
          owner: {
            login: 'acme',
            avatarUrl: 'https://avatars.example.test/acme',
          },
        },
      ],
    });
  });

  it('requires a verified repository for every application', async () => {
    const initial = session();
    const saved = session({
      blueprintRevision: 2,
      blueprintHash: 'b'.repeat(64),
    });
    const onReady = vi.fn();

    updateBlueprintMock.mockResolvedValue(saved);
    validateBlueprintMock.mockResolvedValue({
      valid: true,
      revision: 2,
      hash: 'b'.repeat(64),
      issues: [],
    });

    render(<BlueprintReview initialSession={initial} onReady={onReady} />);

    const select = await screen.findByLabelText('Repository for WEB');
    const saveButton = screen.getByRole('button', {
      name: 'Save and continue',
    });

    expect(saveButton).toBeDisabled();

    await waitFor(() => {
      expect(select).toBeEnabled();
    });

    fireEvent.change(select, {
      target: {
        value: '9001',
      },
    });

    await waitFor(() => {
      expect(saveButton).toBeEnabled();
    });

    fireEvent.click(saveButton);

    await vi.waitFor(() => {
      expect(updateBlueprintMock).toHaveBeenCalledWith(initial.id, {
        expectedRevision: 1,
        blueprint: expect.objectContaining({
          repositories: [
            {
              applicationType: 'WEB',
              strategy: 'CONNECT_NOW',
              repositoryId: '9001',
            },
          ],
        }),
      });
      expect(onReady).toHaveBeenCalledWith(saved);
    });
  });
});
