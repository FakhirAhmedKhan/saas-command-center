import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apiRequest } from '@/features/lib/api/api-client';
import {
  acceptInvitation,
  createWorkspaceInvitation,
  declineInvitation,
  getInvitationPreview,
  getNotifications,
  getUnreadNotificationCount,
  getWorkspaceInvitations,
  markAllNotificationsRead,
  markNotificationRead,
  resendWorkspaceInvitation,
  revokeWorkspaceInvitation,
} from '@/features/team-operations/team-operations-api';

vi.mock('@/features/lib/api/api-client', () => ({
  apiRequest: vi.fn(),
}));

const apiRequestMock = vi.mocked(apiRequest);
const WORKSPACE = 'workspace-1';

beforeEach(() => {
  apiRequestMock.mockReset();
});

describe('team-operations-api invitations', () => {
  it('gets workspace invitations', async () => {
    apiRequestMock.mockResolvedValue([]);

    await getWorkspaceInvitations(WORKSPACE);

    expect(apiRequestMock).toHaveBeenCalledWith(`/workspaces/${WORKSPACE}/invitations`, { method: 'GET', signal: undefined });
  });

  it('creates an invitation with a POST carrying email and role', async () => {
    apiRequestMock.mockResolvedValue({} as never);

    await createWorkspaceInvitation(WORKSPACE, { email: 'dev@example.com', role: 'DEVELOPER' });

    expect(apiRequestMock).toHaveBeenCalledWith(`/workspaces/${WORKSPACE}/invitations`, {
      method: 'POST',
      body: { email: 'dev@example.com', role: 'DEVELOPER' },
    });
  });

  it('resends an invitation via POST /resend', async () => {
    apiRequestMock.mockResolvedValue({} as never);

    await resendWorkspaceInvitation(WORKSPACE, 'invitation-1');

    expect(apiRequestMock).toHaveBeenCalledWith(`/workspaces/${WORKSPACE}/invitations/invitation-1/resend`, { method: 'POST' });
  });

  it('revokes an invitation via POST /revoke', async () => {
    apiRequestMock.mockResolvedValue({ success: true });

    await revokeWorkspaceInvitation(WORKSPACE, 'invitation-1');

    expect(apiRequestMock).toHaveBeenCalledWith(`/workspaces/${WORKSPACE}/invitations/invitation-1/revoke`, { method: 'POST' });
  });

  it('gets an invitation preview by token without authentication or refresh', async () => {
    apiRequestMock.mockResolvedValue({} as never);

    await getInvitationPreview('raw token/with slash');

    expect(apiRequestMock).toHaveBeenCalledWith(`/invitations/${encodeURIComponent('raw token/with slash')}`, {
      method: 'GET',
      signal: undefined,
      skipAuthentication: true,
      skipRefresh: true,
    });
  });

  it('accepts an invitation by encoded token', async () => {
    apiRequestMock.mockResolvedValue({ success: true, workspaceId: WORKSPACE });

    await acceptInvitation('token/with slash');

    expect(apiRequestMock).toHaveBeenCalledWith(`/invitations/${encodeURIComponent('token/with slash')}/accept`, { method: 'POST' });
  });

  it('declines an invitation by encoded token', async () => {
    apiRequestMock.mockResolvedValue({ success: true });

    await declineInvitation('token/with slash');

    expect(apiRequestMock).toHaveBeenCalledWith(`/invitations/${encodeURIComponent('token/with slash')}/decline`, { method: 'POST' });
  });
});

describe('team-operations-api notifications', () => {
  it('defaults notifications pagination to page 1 and limit 20', async () => {
    apiRequestMock.mockResolvedValue({ items: [], pagination: {} } as never);

    await getNotifications();

    expect(apiRequestMock).toHaveBeenCalledWith('/notifications?page=1&limit=20', { method: 'GET', signal: undefined });
  });

  it('adds unreadOnly to the query only when true', async () => {
    apiRequestMock.mockResolvedValue({ items: [], pagination: {} } as never);

    await getNotifications({ unreadOnly: true, page: 2, limit: 5 });

    expect(apiRequestMock).toHaveBeenCalledWith('/notifications?page=2&limit=5&unreadOnly=true', { method: 'GET', signal: undefined });
  });

  it('omits unreadOnly from the query when false', async () => {
    apiRequestMock.mockResolvedValue({ items: [], pagination: {} } as never);

    await getNotifications({ unreadOnly: false });

    const [path] = apiRequestMock.mock.calls[0] ?? [];

    expect(path).toBe('/notifications?page=1&limit=20');
  });

  it('gets the unread notification count', async () => {
    apiRequestMock.mockResolvedValue({ count: 3 });

    await getUnreadNotificationCount();

    expect(apiRequestMock).toHaveBeenCalledWith('/notifications/unread-count', { method: 'GET', signal: undefined });
  });

  it('marks a single notification as read via POST', async () => {
    apiRequestMock.mockResolvedValue({ success: true });

    await markNotificationRead('notification-1');

    expect(apiRequestMock).toHaveBeenCalledWith('/notifications/notification-1/read', { method: 'POST' });
  });

  it('marks all notifications as read via POST', async () => {
    apiRequestMock.mockResolvedValue({ success: true, updated: 4 });

    await markAllNotificationsRead();

    expect(apiRequestMock).toHaveBeenCalledWith('/notifications/mark-all-read', { method: 'POST' });
  });
});
