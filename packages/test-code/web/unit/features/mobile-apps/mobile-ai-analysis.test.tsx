// @vitest-environment jsdom

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it, vi } from 'vitest';
import { MobileAiAnalysis } from '@/features/mobile-apps/mobile-ai-analysis';
import { analyzeMobileApp } from '@/features/mobile-apps/mobile-apps-api';

vi.mock('@/features/mobile-apps/mobile-apps-api', () => ({
  analyzeMobileApp: vi.fn(),
}));

it('renders grounded analysis and evidence', async () => {
  vi.mocked(analyzeMobileApp).mockResolvedValue({
    id: 'analysis-1',

    action: 'PERFORMANCE_REGRESSION',

    confidence: 'SUPPORTED',

    answer: 'Startup regression correlates with release 6.14.0; causation is not proven.',

    evidence: [
      {
        type: 'RELEASE',

        id: 'release-1',

        label: 'Release 6.14.0',
      },
    ],

    createdAt: '2026-08-22',
  });

  const user = userEvent.setup();

  render(<MobileAiAnalysis workspaceId='workspace-1' mobileAppId='mobile-1' />);

  await user.click(
    screen.getByRole('button', {
      name: 'Explain regression',
    }),
  );

  expect(await screen.findByText(/causation is not proven/i)).toBeInTheDocument();

  expect(screen.getByText(/Release 6.14.0/)).toBeInTheDocument();
});
