import {
  analyzeDesktopApplication,
  createDesktopAlertRule,
  deleteDesktopAlertRule,
  evaluateDesktopAlerts,
  getDesktopPermissions,
  listDesktopAlertIncidents,
  listDesktopAlertRules,
  updateDesktopAlertRule,
} from '@/features/desktop-apps/desktop-apps-api';
import { apiRequest } from '@/features/lib/api/api-client';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/features/lib/api/api-client', () => ({
  apiRequest: vi.fn(),
}));

const mockedApiRequest = vi.mocked(apiRequest);
const W = '11111111-1111-4111-8111-111111111111';
const A = '22222222-2222-4222-8222-222222222222';
const R = '33333333-3333-4333-8333-333333333333';

describe('desktop Phase 15-17 API client', () => {
  beforeEach(() => {
    mockedApiRequest.mockReset();
  });

  it('uses the alert endpoints', async () => {
    await listDesktopAlertRules(W, A);
    await listDesktopAlertIncidents(W, A);
    await evaluateDesktopAlerts(W, A);

    expect(mockedApiRequest).toHaveBeenNthCalledWith(1, `/workspaces/${W}/desktop-apps/${A}/alerts/rules`);
    expect(mockedApiRequest).toHaveBeenNthCalledWith(2, `/workspaces/${W}/desktop-apps/${A}/alerts/incidents`);
    expect(mockedApiRequest).toHaveBeenNthCalledWith(3, `/workspaces/${W}/desktop-apps/${A}/alerts/evaluate`, { method: 'POST' });
  });

  it('creates, updates, and deletes alert rules', async () => {
    await createDesktopAlertRule(W, A, {
      name: 'Build failed',
      type: 'BUILD_FAILED',
      enabled: true,
    });

    await updateDesktopAlertRule(W, A, R, { enabled: false });
    await deleteDesktopAlertRule(W, A, R);

    expect(mockedApiRequest).toHaveBeenNthCalledWith(1, `/workspaces/${W}/desktop-apps/${A}/alerts/rules`, {
      method: 'POST',
      body: {
        name: 'Build failed',
        type: 'BUILD_FAILED',
        enabled: true,
      },
    });

    expect(mockedApiRequest).toHaveBeenNthCalledWith(2, `/workspaces/${W}/desktop-apps/${A}/alerts/rules/${R}`, { method: 'PATCH', body: { enabled: false } });

    expect(mockedApiRequest).toHaveBeenNthCalledWith(3, `/workspaces/${W}/desktop-apps/${A}/alerts/rules/${R}`, { method: 'DELETE' });
  });

  it('uses the AI analysis and permissions endpoints', async () => {
    await analyzeDesktopApplication(W, A, {
      action: 'RELEASE_HEALTH',
      question: 'Healthy?',
    });
    await getDesktopPermissions(W, A);

    expect(mockedApiRequest).toHaveBeenNthCalledWith(1, `/workspaces/${W}/desktop-apps/${A}/analysis`, {
      method: 'POST',
      body: {
        action: 'RELEASE_HEALTH',
        question: 'Healthy?',
      },
    });

    expect(mockedApiRequest).toHaveBeenNthCalledWith(2, `/workspaces/${W}/desktop-apps/${A}/permissions`);
  });
});
