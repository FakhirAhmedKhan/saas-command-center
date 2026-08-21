// @vitest-environment jsdom
import NewWorkspacePage from '@/app/(dashboard)/workspaces/new/new-workspace-client';
import { listImportableRepositories } from '@/features/workspaces/github-import/github-import-api';
import { createWorkspace } from '@/features/workspaces/workspace-api';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { useSearchParamsMock } = vi.hoisted(() => ({
  useSearchParamsMock: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useSearchParams: useSearchParamsMock,
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
  vi.mocked(createWorkspace).mockReset();
  vi.mocked(listImportableRepositories).mockReset().mockResolvedValue({ installations: [], repositories: [] });
});

describe('NewWorkspacePage', () => {
  it('shows the method selector by default, with manual workspace creation still available', () => {
    render(<NewWorkspacePage />);

    expect(screen.getByText('How would you like to create your workspace?')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Create Manually/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Import from GitHub/ })).toBeInTheDocument();
  });

  it('shows the manual workspace form after choosing Create Manually', async () => {
    render(<NewWorkspacePage />);

    await userEvent.click(screen.getByRole('button', { name: /Create Manually/ }));

    expect(screen.getByRole('heading', { name: 'Create your workspace' })).toBeInTheDocument();
    expect(screen.getByLabelText('Workspace name')).toBeInTheDocument();
  });

  it('shows the GitHub import wizard after choosing Import from GitHub', async () => {
    render(<NewWorkspacePage />);

    await userEvent.click(screen.getByRole('button', { name: /Import from GitHub/ }));

    expect(await screen.findByText('Import from GitHub')).toBeInTheDocument();
  });

  it('jumps straight into the GitHub wizard when returning with ?method=github', () => {
    useSearchParamsMock.mockReturnValue(new URLSearchParams('method=github'));

    render(<NewWorkspacePage />);

    expect(screen.getByText('Import from GitHub')).toBeInTheDocument();
    expect(screen.queryByText('How would you like to create your workspace?')).not.toBeInTheDocument();
  });
});
