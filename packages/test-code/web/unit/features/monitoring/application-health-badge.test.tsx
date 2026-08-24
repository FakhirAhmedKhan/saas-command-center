// @vitest-environment jsdom
import { act, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apiRequest } from '@/features/lib/api/api-client';
import { ApplicationHealthBadge } from '@/features/monitoring/application-health-badge';

vi.mock('@/features/lib/api/api-client', () => ({
  apiRequest: vi.fn(),
}));

const apiRequestMock = vi.mocked(apiRequest);

beforeEach(() => {
  apiRequestMock.mockReset();
});

describe('ApplicationHealthBadge', () => {
  it('renders nothing before the summary has loaded', () => {
    apiRequestMock.mockReturnValue(new Promise(() => {})); // never resolves

    const { container } = render(<ApplicationHealthBadge workspaceId='workspace-1' applicationId='app-1' />);

    expect(container).toBeEmptyDOMElement();
  });

  it('requests the per-application monitoring summary and renders the resulting status', async () => {
    apiRequestMock.mockResolvedValue({ status: 'DEGRADED', checks: 3, averageResponseTimeMs: 220, lastCheckedAt: '2026-01-01T00:00:00.000Z' });

    await act(async () => {
      render(<ApplicationHealthBadge workspaceId='workspace-1' applicationId='app-1' />);
    });

    expect(apiRequestMock).toHaveBeenCalledWith('/workspaces/workspace-1/monitoring/applications/app-1/summary', {
      method: 'GET',
      signal: expect.any(AbortSignal),
    });
    expect(screen.getByText('Degraded')).toBeInTheDocument();
  });

  it('renders nothing (rather than a broken badge) when the summary request fails', async () => {
    apiRequestMock.mockRejectedValue(new Error('not found'));

    const { container } = await act(async () => {
      return render(<ApplicationHealthBadge workspaceId='workspace-1' applicationId='app-1' />);
    });

    expect(container).toBeEmptyDOMElement();
  });
});
