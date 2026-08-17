// @vitest-environment jsdom
import { WorkspaceSwitcher } from './workspace-switcher';
import { useAuth } from '@/features/auth/auth-provider';
import type { Workspace } from '@/features/auth/auth.types';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useRouter } from 'next/navigation';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/features/auth/auth-provider', () => ({
  useAuth: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(),
}));

const useAuthMock = vi.mocked(useAuth);
const useRouterMock = vi.mocked(useRouter);

function workspace(overrides: Partial<Workspace> = {}): Workspace {
  return {
    id: 'workspace-1',
    name: 'Acme Corp',
    slug: 'acme-corp',
    ownerId: 'user-1',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    deletedAt: null,
    ...overrides,
  };
}

const push = vi.fn();

beforeEach(() => {
  push.mockReset();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  useRouterMock.mockReturnValue({ push } as any);
});

describe('WorkspaceSwitcher', () => {
  it('offers to create a workspace and renders no listbox when the member has no workspaces', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    useAuthMock.mockReturnValue({ workspaces: [] } as any);

    render(<WorkspaceSwitcher workspaceId='workspace-1' />);

    expect(screen.getByRole('link', { name: 'Create workspace' })).toHaveAttribute('href', '/workspaces/new');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('renders only the workspaces supplied by the auth context — it cannot fabricate access to a workspace the member is not in', async () => {
    const memberWorkspaces = [workspace({ id: 'workspace-1', name: 'Acme Corp' }), workspace({ id: 'workspace-2', name: 'Globex Inc' })];

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    useAuthMock.mockReturnValue({ workspaces: memberWorkspaces } as any);

    const user = userEvent.setup();

    render(<WorkspaceSwitcher workspaceId='workspace-1' />);

    await user.click(screen.getByRole('button', { name: 'Select workspace' }));

    const options = screen.getAllByRole('option');

    expect(options).toHaveLength(2);
    expect(options.map((option) => option.textContent)).toEqual([expect.stringContaining('Acme Corp'), expect.stringContaining('Globex Inc')]);
    // A workspace id that was never in the auth-provided list has no corresponding option.
    expect(screen.queryByText('Unrelated Workspace')).not.toBeInTheDocument();
  });

  it('falls back to the first membership workspace when the current workspaceId is not among them', () => {
    const memberWorkspaces = [workspace({ id: 'workspace-1', name: 'Acme Corp' })];

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    useAuthMock.mockReturnValue({ workspaces: memberWorkspaces } as any);

    render(<WorkspaceSwitcher workspaceId='workspace-does-not-belong-to-member' />);

    // Renders the member's own workspace, not the unrecognised id from the URL.
    expect(screen.getByRole('button', { name: 'Select workspace' })).toHaveTextContent('Acme Corp');
  });

  it('marks the active workspace as selected and navigates to a different one on click', async () => {
    const memberWorkspaces = [workspace({ id: 'workspace-1', name: 'Acme Corp' }), workspace({ id: 'workspace-2', name: 'Globex Inc' })];

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    useAuthMock.mockReturnValue({ workspaces: memberWorkspaces } as any);

    const user = userEvent.setup();

    render(<WorkspaceSwitcher workspaceId='workspace-1' />);

    await user.click(screen.getByRole('button', { name: 'Select workspace' }));

    const activeOption = screen.getByRole('option', { name: /Acme Corp/ });
    const inactiveOption = screen.getByRole('option', { name: /Globex Inc/ });

    expect(activeOption).toHaveAttribute('aria-selected', 'true');
    expect(inactiveOption).toHaveAttribute('aria-selected', 'false');

    await user.click(inactiveOption);

    expect(push).toHaveBeenCalledWith('/workspaces/workspace-2');
  });

  it('does not navigate when the already-active workspace option is clicked again', async () => {
    const memberWorkspaces = [workspace({ id: 'workspace-1', name: 'Acme Corp' })];

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    useAuthMock.mockReturnValue({ workspaces: memberWorkspaces } as any);

    const user = userEvent.setup();

    render(<WorkspaceSwitcher workspaceId='workspace-1' />);

    await user.click(screen.getByRole('button', { name: 'Select workspace' }));
    await user.click(screen.getByRole('option', { name: /Acme Corp/ }));

    expect(push).not.toHaveBeenCalled();
  });
});
