import { apiRequest } from '@/features/lib/api/api-client';
import type { CreatedWorkspace, CreateWorkspacePayload } from './workspace-types';

export function createWorkspace(payload: CreateWorkspacePayload) {
  return apiRequest<CreatedWorkspace>('/workspaces', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}
