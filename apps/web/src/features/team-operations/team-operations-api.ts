import type { InvitationMutationResponse, InvitationPreview, UserNotification, WorkspaceInvitation, WorkspaceRole } from './team-operations.types';
import { apiRequest } from '../lib/api/api-client';

export function getWorkspaceInvitations(
  workspaceId: string,

  signal?: AbortSignal,
): Promise<WorkspaceInvitation[]> {
  return apiRequest<WorkspaceInvitation[]>(
    `/workspaces/${workspaceId}/invitations`,

    {
      method: 'GET',

      signal,
    },
  );
}

export function createWorkspaceInvitation(
  workspaceId: string,
  input: {
    email: string;
    role: WorkspaceRole;
  },
): Promise<InvitationMutationResponse> {
  return apiRequest<InvitationMutationResponse>(
    `/workspaces/${workspaceId}/invitations`,

    {
      method: 'POST',
      body: input,
    },
  );
}

export function resendWorkspaceInvitation(workspaceId: string, invitationId: string): Promise<InvitationMutationResponse> {
  return apiRequest<InvitationMutationResponse>(
    `/workspaces/${workspaceId}/invitations/${invitationId}/resend`,

    {
      method: 'POST',
    },
  );
}

export function revokeWorkspaceInvitation(
  workspaceId: string,
  invitationId: string,
): Promise<{
  success: true;
}> {
  return apiRequest(
    `/workspaces/${workspaceId}/invitations/${invitationId}/revoke`,

    {
      method: 'POST',
    },
  );
}

export function getInvitationPreview(
  token: string,

  signal?: AbortSignal,
): Promise<InvitationPreview> {
  return apiRequest<InvitationPreview>(
    `/invitations/${encodeURIComponent(token)}`,

    {
      method: 'GET',

      signal,

      skipAuthentication: true,
      skipRefresh: true,
    },
  );
}

export function acceptInvitation(token: string): Promise<{
  success: true;
  workspaceId: string;
}> {
  return apiRequest(
    `/invitations/${encodeURIComponent(token)}/accept`,

    {
      method: 'POST',
    },
  );
}

export function declineInvitation(token: string): Promise<{
  success: true;
}> {
  return apiRequest(
    `/invitations/${encodeURIComponent(token)}/decline`,

    {
      method: 'POST',
    },
  );
}

export function getNotifications(
  options: {
    unreadOnly?: boolean;

    page?: number;

    limit?: number;
  } = {},

  signal?: AbortSignal,
) {
  const params = new URLSearchParams({
    page: String(options.page ?? 1),
    limit: String(options.limit ?? 20),
  });

  if (options.unreadOnly) {
    params.set('unreadOnly', 'true');
  }

  return apiRequest<{
    items: UserNotification[];

    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }>(
    `/notifications?${params.toString()}`,

    {
      method: 'GET',

      signal,
    },
  );
}

export function getUnreadNotificationCount(signal?: AbortSignal): Promise<{
  count: number;
}> {
  return apiRequest(
    '/notifications/unread-count',

    {
      method: 'GET',

      signal,
    },
  );
}

export function markNotificationRead(notificationId: string): Promise<{
  success: true;
}> {
  return apiRequest(
    `/notifications/${notificationId}/read`,

    {
      method: 'POST',
    },
  );
}

export function markAllNotificationsRead(): Promise<{
  success: true;
  updated: number;
}> {
  return apiRequest(
    '/notifications/mark-all-read',

    {
      method: 'POST',
    },
  );
}
