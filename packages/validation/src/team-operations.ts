import { NOTIFICATION_TYPES, WORKSPACE_ROLES } from '@command-center/shared-types';

import type { CreateWorkspaceInvitationInput, InvitationListQueryInput, NotificationListQueryInput } from '@command-center/shared-types';

import { z } from 'zod';

const workspaceRoleSchema = z.enum(WORKSPACE_ROLES);

const invitationStatusSchema = z.enum(['PENDING', 'ACCEPTED', 'DECLINED', 'REVOKED', 'EXPIRED']);

const notificationTypeSchema = z.enum(NOTIFICATION_TYPES);

export const createWorkspaceInvitationSchema: z.ZodType<CreateWorkspaceInvitationInput> = z.object({
  email: z.string().email().max(320),
  role: workspaceRoleSchema,
});

export const invitationListQuerySchema: z.ZodType<InvitationListQueryInput> = z.object({
  status: invitationStatusSchema.optional(),
});

export const notificationListQuerySchema: z.ZodType<NotificationListQueryInput> = z.object({
  unreadOnly: z.boolean().optional(),
  type: notificationTypeSchema.optional(),
  page: z.number().int().min(1).optional(),
  limit: z.number().int().min(1).max(100).optional(),
});
