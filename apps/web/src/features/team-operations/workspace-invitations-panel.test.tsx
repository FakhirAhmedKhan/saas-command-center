// @vitest-environment jsdom
import { createWorkspaceInvitation, getWorkspaceInvitations, resendWorkspaceInvitation, revokeWorkspaceInvitation } from './team-operations-api';
import type { WorkspaceInvitation } from './team-operations.types';
import { WorkspaceInvitationsPanel } from './workspace-invitations-panel';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./team-operations-api', () => ({
  getWorkspaceInvitations: vi.fn(),
  createWorkspaceInvitation: vi.fn(),
  resendWorkspaceInvitation: vi.fn(),
  revokeWorkspaceInvitation: vi.fn(),
}));

const getWorkspaceInvitationsMock = vi.mocked(getWorkspaceInvitations);
const createWorkspaceInvitationMock = vi.mocked(createWorkspaceInvitation);
const resendWorkspaceInvitationMock = vi.mocked(resendWorkspaceInvitation);
const revokeWorkspaceInvitationMock = vi.mocked(revokeWorkspaceInvitation);

function invitation(overrides: Partial<WorkspaceInvitation> = {}): WorkspaceInvitation {
  return {
    id: 'invitation-1',
    workspaceId: 'workspace-1',
    email: 'dev@example.com',
    role: 'DEVELOPER',
    status: 'PENDING',
    deliveryStatus: 'SENT',
    deliveryError: null,
    expiresAt: '2026-02-01T00:00:00.000Z',
    acceptedAt: null,
    declinedAt: null,
    revokedAt: null,
    lastSentAt: '2026-01-01T00:00:00.000Z',
    sendCount: 1,
    createdAt: '2026-01-01T00:00:00.000Z',
    invitedBy: {
      id: 'user-1',
      name: 'Workspace Owner',
      email: 'owner@example.com',
    },
    acceptedBy: null,
    ...overrides,
  };
}

beforeEach(() => {
  getWorkspaceInvitationsMock.mockReset().mockResolvedValue([]);
  createWorkspaceInvitationMock.mockReset();
  resendWorkspaceInvitationMock.mockReset();
  revokeWorkspaceInvitationMock.mockReset();
});

describe('WorkspaceInvitationsPanel permission gating', () => {
  it('hides the invite form when the viewer cannot manage members', async () => {
    await act(async () => {
      render(<WorkspaceInvitationsPanel workspaceId='workspace-1' canManageMembers={false} />);
    });

    expect(screen.queryByRole('button', { name: 'Send invitation' })).not.toBeInTheDocument();
  });

  it('shows the invite form when the viewer can manage members', async () => {
    await act(async () => {
      render(<WorkspaceInvitationsPanel workspaceId='workspace-1' canManageMembers />);
    });

    expect(screen.getByRole('button', { name: 'Send invitation' })).toBeInTheDocument();
  });

  it('hides Resend/Revoke actions on a pending invitation for a viewer who cannot manage members', async () => {
    getWorkspaceInvitationsMock.mockResolvedValue([invitation({ status: 'PENDING' })]);

    await act(async () => {
      render(<WorkspaceInvitationsPanel workspaceId='workspace-1' canManageMembers={false} />);
    });

    expect(screen.queryByRole('button', { name: 'Resend' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Revoke' })).not.toBeInTheDocument();
    // The invitation row itself is still visible (read-only), just without mutation controls.
    expect(screen.getByText('dev@example.com')).toBeInTheDocument();
  });

  it('shows Resend/Revoke actions on a pending invitation for a viewer who can manage members', async () => {
    getWorkspaceInvitationsMock.mockResolvedValue([invitation({ status: 'PENDING' })]);

    await act(async () => {
      render(<WorkspaceInvitationsPanel workspaceId='workspace-1' canManageMembers />);
    });

    expect(screen.getByRole('button', { name: 'Resend' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Revoke' })).toBeInTheDocument();
  });

  it('hides Resend/Revoke actions for a non-pending invitation even when the viewer can manage members', async () => {
    getWorkspaceInvitationsMock.mockResolvedValue([invitation({ status: 'ACCEPTED' })]);

    await act(async () => {
      render(<WorkspaceInvitationsPanel workspaceId='workspace-1' canManageMembers />);
    });

    expect(screen.queryByRole('button', { name: 'Resend' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Revoke' })).not.toBeInTheDocument();
  });
});

describe('WorkspaceInvitationsPanel invite flow', () => {
  it('shows the one-time invitation link after a successful invite and calls the API with email and role', async () => {
    createWorkspaceInvitationMock.mockResolvedValue({
      invitation: invitation(),
      invitationUrl: 'http://localhost:3000/invitations/test-token',
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
    const user = userEvent.setup();

    await act(async () => {
      render(<WorkspaceInvitationsPanel workspaceId='workspace-1' canManageMembers />);
    });

    await user.type(screen.getByPlaceholderText('developer@example.com'), 'newmember@example.com');
    await user.selectOptions(screen.getByDisplayValue('Viewer'), 'ADMIN');

    await act(async () => {
      await user.click(screen.getByRole('button', { name: 'Send invitation' }));
    });

    expect(createWorkspaceInvitationMock).toHaveBeenCalledWith('workspace-1', { email: 'newmember@example.com', role: 'ADMIN' });
    expect(screen.getByDisplayValue('http://localhost:3000/invitations/test-token')).toBeInTheDocument();
  });

  it('shows an inline error message when invitation creation fails, and does not show a link', async () => {
    createWorkspaceInvitationMock.mockRejectedValue(new Error('Email already invited'));
    const user = userEvent.setup();

    await act(async () => {
      render(<WorkspaceInvitationsPanel workspaceId='workspace-1' canManageMembers />);
    });

    await user.type(screen.getByPlaceholderText('developer@example.com'), 'dup@example.com');

    await act(async () => {
      await user.click(screen.getByRole('button', { name: 'Send invitation' }));
    });

    expect(screen.getByRole('alert')).toHaveTextContent('Email already invited');
    expect(screen.queryByDisplayValue(/invitations\//)).not.toBeInTheDocument();
  });
});

describe('WorkspaceInvitationsPanel empty and loading states', () => {
  it('shows an empty-state message when there are no invitations', async () => {
    getWorkspaceInvitationsMock.mockResolvedValue([]);

    await act(async () => {
      render(<WorkspaceInvitationsPanel workspaceId='workspace-1' canManageMembers />);
    });

    expect(screen.getByText('No workspace invitations have been created.')).toBeInTheDocument();
  });
});
