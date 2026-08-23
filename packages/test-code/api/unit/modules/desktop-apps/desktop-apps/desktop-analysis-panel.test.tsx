import { DesktopAnalysisPanel } from '@/features/desktop-apps/desktop-analysis-panel';
import * as api from '@/features/desktop-apps/desktop-apps-api';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/features/desktop-apps/desktop-apps-api', () => ({
  analyzeDesktopApplication: vi.fn(),
  getDesktopPermissions: vi.fn(),
}));

const W = '11111111-1111-4111-8111-111111111111';
const A = '22222222-2222-4222-8222-222222222222';

describe('DesktopAnalysisPanel', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(api.getDesktopPermissions).mockResolvedValue({
      role: 'DEVELOPER',
      canRead: true,
      canWrite: true,
      canManage: false,
      canAnalyze: true,
      canConfigureSecrets: false,
    });
  });

  it('runs an evidence-grounded analysis and renders evidence', async () => {
    vi.mocked(api.analyzeDesktopApplication).mockResolvedValue({
      id: '33333333-3333-4333-8333-333333333333',
      action: 'RELEASE_HEALTH',
      answer: [
        'Evidence:',
        '- build 100 succeeded',
        'Correlation:',
        '- no regression observed',
        'Likely cause:',
        '- none supported',
        'Unknown cause:',
        '- not applicable',
      ].join('\n'),
      confidence: 'SUPPORTED',
      evidence: [
        {
          type: 'BUILD',
          id: '44444444-4444-4444-8444-444444444444',
          label: 'Build 100',
          href: `/workspaces/${W}/desktop-apps/${A}/builds/44444444-4444-4444-8444-444444444444`,
        },
      ],
      createdAt: '2026-08-23T00:00:00.000Z',
    });

    render(<DesktopAnalysisPanel workspaceId={W} desktopAppId={A} />);

    await waitFor(() => expect(api.getDesktopPermissions).toHaveBeenCalledWith(W, A));

    fireEvent.click(screen.getByRole('button', { name: 'Analyze' }));

    expect(await screen.findByText('SUPPORTED')).toBeInTheDocument();
    expect(screen.getByText(/Evidence:/)).toBeInTheDocument();
    expect(screen.getByText('Build 100')).toBeInTheDocument();
  });

  it('shows read-only state for viewer', async () => {
    vi.mocked(api.getDesktopPermissions).mockResolvedValue({
      role: 'VIEWER',
      canRead: true,
      canWrite: false,
      canManage: false,
      canAnalyze: false,
      canConfigureSecrets: false,
    });

    render(<DesktopAnalysisPanel workspaceId={W} desktopAppId={A} />);

    expect(await screen.findByText('Your workspace role has read-only access to AI analysis.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Analyze' })).not.toBeInTheDocument();
  });
});