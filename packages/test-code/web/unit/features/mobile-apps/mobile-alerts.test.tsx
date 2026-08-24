// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MobileAlerts } from '@/features/mobile-apps/mobile-alerts';
import { createMobileAlertRule, listMobileAlertIncidents, listMobileAlertRules, updateMobileAlertRule } from '@/features/mobile-apps/mobile-apps-api';

vi.mock('@/features/mobile-apps/mobile-apps-api', () => ({
  createMobileAlertRule: vi.fn(),
  listMobileAlertIncidents: vi.fn(),
  listMobileAlertRules: vi.fn(),
  updateMobileAlertRule: vi.fn(),
}));

const mockedRules = vi.mocked(listMobileAlertRules);
const mockedIncidents = vi.mocked(listMobileAlertIncidents);
const mockedCreateRule = vi.mocked(createMobileAlertRule);
const mockedUpdateRule = vi.mocked(updateMobileAlertRule);

describe('MobileAlerts', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockedRules.mockResolvedValue([] as never);
    mockedIncidents.mockResolvedValue([] as never);
    mockedCreateRule.mockResolvedValue({} as never);
    mockedUpdateRule.mockResolvedValue({} as never);
  });

  it('renders rules and incidents', async () => {
    mockedRules.mockResolvedValue([
      {
        id: 'rule-1',
        workspaceId: 'workspace-1',
        mobileAppId: 'mobile-1',
        name: 'Crash rate > 2%',
        type: 'CRASH_RATE',
        operator: 'GT',
        threshold: 2,
        cooldownMinutes: 60,
        enabled: true,
        createdAt: '2026-08-22',
        updatedAt: '2026-08-22',
      },
    ] as never);

    mockedIncidents.mockResolvedValue([
      {
        id: 'incident-1',
        ruleId: 'rule-1',
        status: 'OPEN',
        title: 'Crash rate alert',
        message: 'Crash rate 3 exceeds 2.',
        actualValue: 3,
        threshold: 2,
        version: '6.14.0',
        buildId: null,
        triggeredAt: '2026-08-22',
        resolvedAt: null,
      },
    ] as never);

    render(<MobileAlerts workspaceId='workspace-1' mobileAppId='mobile-1' />);

    expect(await screen.findByText('Crash rate > 2%')).toBeInTheDocument();

    expect(screen.getByText('Crash rate alert')).toBeInTheDocument();
  });
});
