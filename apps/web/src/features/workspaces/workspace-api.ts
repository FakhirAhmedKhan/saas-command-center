import type { CreatedWorkspace, CreateWorkspacePayload } from './workspace-types';
import { apiRequest } from '@/features/lib/api/api-client';

export function createWorkspace(payload: CreateWorkspacePayload) {
  return apiRequest<CreatedWorkspace>('/workspaces', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}
