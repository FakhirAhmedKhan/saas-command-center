// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import NewWorkspacePage from '@/app/(dashboard)/workspaces/new/new-workspace-client';
import { listImportableRepositories } from '@/features/workspaces/github-import/github-import-api';
import { createWorkspace } from '@/features/workspaces/workspace-api';

const { featureStateMock, routerPushMock, useSearchParamsMock } = vi.hoisted(() => ({
  featureStateMock: vi.fn(),
  routerPushMock: vi.fn(),
  useSearchParamsMock: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: routerPushMock,
  }),
  useSearchParams: useSearchParamsMock,
}));

vi.mock('@/features/workspace-onboarding/api/workspace-onboarding-api', () => ({
  workspaceOnboardingApi: {
    featureState: featureStateMock,
  },
}));

vi.mock('@/features/workspaces/workspace-api', () => ({
  createWorkspace: vi.fn(),
}));

vi.mock('@/features/workspaces/github-import/github-import-api', () => ({
  listImportableRepositories: vi.fn(),
  beginPersonalGithubConnect: vi.fn(),
}));

beforeEach(() => {
  useSearchParamsMock.mockReturnValue(new URLSearchParams());
  routerPushMock.mockReset();
  featureStateMock.mockReset().mockResolvedValue({
    guidedWorkspaceBuilderEnabled: false,
  });
  vi.mocked(createWorkspace).mockReset();
  vi.mocked(listImportableRepositories).mockReset().mockResolvedValue({
    installations: [],
    repositories: [],
  });
});

describe('NewWorkspacePage', () => {
  it('hides guided setup when the flag is disabled', async () => {
    render(<NewWorkspacePage />);

    await vi.waitFor(() => {
      expect(featureStateMock).toHaveBeenCalledTimes(1);
    });

    expect(
      screen.queryByRole('link', {
        name: /Start guided builder/,
      }),
    ).not.toBeInTheDocument();
  });

  it('shows the guided route when enabled', async () => {
    featureStateMock.mockResolvedValue({
      guidedWorkspaceBuilderEnabled: true,
    });

    render(<NewWorkspacePage />);

    const link = await screen.findByRole('link', {
      name: /Start guided builder/,
    });

    expect(link).toHaveAttribute('href', '/workspaces/new/guided');
  });

  it('shows the manual workspace form', async () => {
    render(<NewWorkspacePage />);

    await userEvent.click(
      screen.getByRole('button', {
        name: /Create Manually/,
      }),
    );

    expect(
      screen.getByRole('heading', {
        name: 'Create your workspace',
      }),
    ).toBeInTheDocument();
  });

  it('shows the GitHub import wizard', async () => {
    render(<NewWorkspacePage />);

    await userEvent.click(
      screen.getByRole('button', {
        name: /Import from GitHub/,
      }),
    );

    expect(await screen.findByText('Import from GitHub')).toBeInTheDocument();
  });

  it('opens GitHub from its query method', () => {
    useSearchParamsMock.mockReturnValue(new URLSearchParams('method=github'));

    render(<NewWorkspacePage />);

    expect(screen.getByText('Import from GitHub')).toBeInTheDocument();
  });
});
