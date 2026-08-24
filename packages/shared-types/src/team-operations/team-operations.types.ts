import type { WorkspaceRole } from '../common/common.types.js';

export type InvitationStatus = 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'REVOKED' | 'EXPIRED';

export type InvitationDeliveryStatus = 'NOT_REQUESTED' | 'SENT' | 'FAILED';

export interface WorkspaceInvitation {
  id: string;
  workspaceId: string;

  email: string;
  role: WorkspaceRole;

  status: InvitationStatus;

  deliveryStatus: InvitationDeliveryStatus;

  deliveryError: string | null;

  expiresAt: string;
  acceptedAt: string | null;
  declinedAt: string | null;
  revokedAt: string | null;

  lastSentAt: string | null;

  sendCount: number;

  createdAt: string;

  invitedBy: {
    id: string;
    name: string | null;
    email: string;
  };

  acceptedBy: {
    id: string;
    name: string | null;
    email: string;
  } | null;
}

export interface InvitationMutationResponse {
  invitation: WorkspaceInvitation;

  invitationUrl: string;
}

export interface InvitationPreview {
  id: string;
  email: string;
  role: WorkspaceRole;
  status: InvitationStatus;

  workspace: {
    id: string;
    name: string;
  };

  invitedBy: {
    name: string | null;
    email: string;
  };

  expiresAt: string;
}

export type NotificationPriority = 'INFO' | 'WARNING' | 'CRITICAL';

export interface UserNotification {
  id: string;
  workspaceId: string;

  applicationId: string | null;

  type: string;

  priority: NotificationPriority;

  title: string;
  message: string;

  resourceType: string | null;

  resourceId: string | null;

  actionUrl: string | null;

  readAt: string | null;

  expiresAt: string | null;

  createdAt: string;
}

export const NOTIFICATION_TYPES = ['WORKSPACE_INVITATION', 'WORKSPACE_INVITATION_ACCEPTED', 'ASSIGNMENT', 'DEPLOYMENT_FAILED', 'HEALTH_INCIDENT_OPENED', 'ANALYTICS_PROCESSING_FAILED', 'SYSTEM'] as const;

export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export interface CreateWorkspaceInvitationInput {
  email: string;
  role: WorkspaceRole;
}

export interface InvitationListQueryInput {
  status?: InvitationStatus;
}

export interface NotificationListQueryInput {
  unreadOnly?: boolean;
  type?: NotificationType;
  page?: number;
  limit?: number;
}
