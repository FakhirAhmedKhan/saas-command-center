import { getIdentity } from 'src/common/rate-limit/shared-rate-limit.guard';
import type { Request } from 'express';

function buildRequest(overrides: { userId?: string; workspaceId?: string; headers?: Record<string, string>; ip?: string }): Request {
  const headers = overrides.headers ?? {};

  return {
    user: overrides.userId ? { id: overrides.userId } : undefined,
    params: overrides.workspaceId ? { workspaceId: overrides.workspaceId } : {},
    header(name: string) {
      return headers[name.toLowerCase()];
    },
    ip: overrides.ip,
    socket: {},
  } as unknown as Request;
}

describe('getIdentity (SharedRateLimitGuard)', () => {
  describe('authenticated requests (request.user set by JwtAuthGuard)', () => {
    it('keys on the server-verified user id, ignoring any tracking/API key header', () => {
      const request = buildRequest({
        userId: 'user-1',
        headers: { 'x-tracking-key': 'attacker-supplied-key', 'x-api-key': 'attacker-supplied-key' },
      });

      expect(getIdentity(request)).toBe('user:user-1');
    });

    it('cannot be reset by rotating X-Tracking-Key between calls', () => {
      const first = getIdentity(buildRequest({ userId: 'user-1', headers: { 'x-tracking-key': 'key-a' } }));

      const second = getIdentity(buildRequest({ userId: 'user-1', headers: { 'x-tracking-key': 'key-b' } }));

      expect(first).toBe(second);
    });

    it('cannot be reset by rotating X-Api-Key between calls', () => {
      const first = getIdentity(buildRequest({ userId: 'user-1', headers: { 'x-api-key': 'key-a' } }));

      const second = getIdentity(buildRequest({ userId: 'user-1', headers: { 'x-api-key': 'key-b' } }));

      expect(first).toBe(second);
    });

    it('gives different authenticated users independent identities', () => {
      const first = getIdentity(buildRequest({ userId: 'user-1' }));

      const second = getIdentity(buildRequest({ userId: 'user-2' }));

      expect(first).not.toBe(second);
    });

    it('includes the workspace route param so the same user is isolated per workspace', () => {
      const workspaceA = getIdentity(buildRequest({ userId: 'user-1', workspaceId: 'workspace-a' }));

      const workspaceB = getIdentity(buildRequest({ userId: 'user-1', workspaceId: 'workspace-b' }));

      const noWorkspace = getIdentity(buildRequest({ userId: 'user-1' }));

      expect(workspaceA).not.toBe(workspaceB);

      expect(workspaceA).not.toBe(noWorkspace);

      expect(workspaceA).toBe('user:user-1:workspace:workspace-a');
    });

    it('gives the same user in the same workspace the same identity across calls', () => {
      const first = getIdentity(buildRequest({ userId: 'user-1', workspaceId: 'workspace-a' }));

      const second = getIdentity(buildRequest({ userId: 'user-1', workspaceId: 'workspace-a' }));

      expect(first).toBe(second);
    });
  });

  describe('unauthenticated requests (e.g. the public analytics collector)', () => {
    it('falls back to the tracking key when no verified user is present', () => {
      expect(getIdentity(buildRequest({ headers: { 'x-tracking-key': 'cc_live_abc' } }))).toBe('tracking:cc_live_abc');
    });

    it('falls back to the API key when no tracking key or user is present', () => {
      expect(getIdentity(buildRequest({ headers: { 'x-api-key': 'some-api-key' } }))).toBe('apikey:some-api-key');
    });

    it('falls back to the request IP when no user or header identity is available', () => {
      expect(getIdentity(buildRequest({ ip: '203.0.113.7' }))).toBe('ip:203.0.113.7');
    });

    it('falls back to "unknown" when neither IP nor socket address is available', () => {
      expect(getIdentity(buildRequest({}))).toBe('ip:unknown');
    });
  });
});
