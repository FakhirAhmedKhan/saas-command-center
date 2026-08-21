// @vitest-environment jsdom
import { ConnectGithubStep } from '@/features/workspaces/github-import/components/connect-github-step';
import { beginPersonalGithubConnect } from '@/features/workspaces/github-import/github-import-api';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/features/workspaces/github-import/github-import-api', () => ({
  beginPersonalGithubConnect: vi.fn(),
}));

const mockedBegin = vi.mocked(beginPersonalGithubConnect);

beforeEach(() => {
  mockedBegin.mockReset();

  Object.defineProperty(window, 'location', {
    value: { assign: vi.fn(), pathname: '/workspaces/new' },
    writable: true,
  });
});

describe('ConnectGithubStep', () => {
  it('shows a checking state while verifying the existing connection', () => {
    render(<ConnectGithubStep checking />);

    expect(screen.getByText(/Checking your GitHub connection/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Connect GitHub/ })).not.toBeInTheDocument();
  });

  it('shows the disconnected state with a Connect GitHub button', () => {
    render(<ConnectGithubStep checking={false} />);

    expect(screen.getByRole('button', { name: /Connect GitHub/ })).toBeInTheDocument();
    expect(screen.getByText(/never store your GitHub access token/)).toBeInTheDocument();
  });

  it('redirects to the installation URL on successful connect', async () => {
    mockedBegin.mockResolvedValue({ installationUrl: 'https://github.com/apps/command-center/installations/new?state=abc' });

    render(<ConnectGithubStep checking={false} />);

    await userEvent.click(screen.getByRole('button', { name: /Connect GitHub/ }));

    await waitFor(() => {
      expect(window.location.assign).toHaveBeenCalledWith('https://github.com/apps/command-center/installations/new?state=abc');
    });
  });

  it('shows an error message when the connect request fails', async () => {
    mockedBegin.mockRejectedValue(new Error('GitHub App is not configured.'));

    render(<ConnectGithubStep checking={false} />);

    await userEvent.click(screen.getByRole('button', { name: /Connect GitHub/ }));

    expect(await screen.findByText('GitHub App is not configured.')).toBeInTheDocument();
  });

  it('refuses to navigate to a non-GitHub installation URL and shows an error', async () => {
    mockedBegin.mockResolvedValue({ installationUrl: 'https://attacker.example.com/phish' });

    render(<ConnectGithubStep checking={false} />);

    await userEvent.click(screen.getByRole('button', { name: /Connect GitHub/ }));

    expect(await screen.findByText(/did not return a valid authorization URL/)).toBeInTheDocument();
    expect(window.location.assign).not.toHaveBeenCalled();
  });
});
