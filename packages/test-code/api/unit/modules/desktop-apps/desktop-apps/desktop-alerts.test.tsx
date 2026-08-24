import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DesktopAlerts } from '@/features/desktop-apps/desktop-alerts';
import * as api from '@/features/desktop-apps/desktop-apps-api';

vi.mock('@/features/desktop-apps/desktop-apps-api', () => ({
  createDesktopAlertRule: vi.fn(),
  deleteDesktopAlertRule: vi.fn(),
  evaluateDesktopAlerts: vi.fn(),
  getDesktopPermissions: vi.fn(),
  listDesktopAlertIncidents: vi.fn(),
  listDesktopAlertRules: vi.fn(),
  updateDesktopAlertRule: vi.fn(),
}));

const W = '11111111-1111-4111-8111-111111111111';
const A = '22222222-2222-4222-8222-222222222222';

describe('DesktopAlerts', () => {
  beforeEach(() => {
    vi.resetAllMocks();

    vi.mocked(api.listDesktopAlertRules).mockResolvedValue([]);
    vi.mocked(api.listDesktopAlertIncidents).mockResolvedValue([]);
    vi.mocked(api.getDesktopPermissions).mockResolvedValue({
      role: 'ADMIN',
      canRead: true,
      canWrite: true,
      canManage: true,
      canAnalyze: true,
      canConfigureSecrets: true,
    });
    vi.mocked(api.createDesktopAlertRule).mockResolvedValue({} as never);
    vi.mocked(api.evaluateDesktopAlerts).mockResolvedValue({
      rulesEvaluated: 1,
      triggered: 0,
      resolved: 0,
      unchanged: 1,
    });
  });

  it('renders the empty state and creates a rule', async () => {
    render(<DesktopAlerts workspaceId={W} desktopAppId={A} />);

    expect(await screen.findByText('No desktop alert rules yet.')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Alert name'), {
      target: { value: 'Build failed' },
    });
    fireEvent.change(screen.getByLabelText('Alert type'), {
      target: { value: 'BUILD_FAILED' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Create alert' }));

    await waitFor(() => {
      expect(api.createDesktopAlertRule).toHaveBeenCalledWith(W, A, {
        name: 'Build failed',
        type: 'BUILD_FAILED',
        threshold: null,
        cooldownMinutes: 60,
        enabled: true,
      });
    });
  });

  it('hides write controls from a viewer', async () => {
    vi.mocked(api.getDesktopPermissions).mockResolvedValue({
      role: 'VIEWER',
      canRead: true,
      canWrite: false,
      canManage: false,
      canAnalyze: false,
      canConfigureSecrets: false,
    });

    render(<DesktopAlerts workspaceId={W} desktopAppId={A} />);

    await screen.findByText('No desktop alert rules yet.');

    expect(screen.queryByText('Create alert rule')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Evaluate now' })).not.toBeInTheDocument();
  });
});
