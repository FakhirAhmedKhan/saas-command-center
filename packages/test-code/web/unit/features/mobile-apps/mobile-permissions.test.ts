import { expect, it, vi } from 'vitest';
import { apiRequest } from '@/features/lib/api/api-client';
import { getMobilePermissions } from '@/features/mobile-apps/mobile-permissions';

vi.mock('@/features/lib/api/api-client', () => ({
  apiRequest: vi.fn(),
}));

it('requests current mobile permissions', async () => {
  await getMobilePermissions('workspace-1');

  expect(vi.mocked(apiRequest)).toHaveBeenCalledWith('/workspaces/workspace-1/mobile-security/permissions');
});
