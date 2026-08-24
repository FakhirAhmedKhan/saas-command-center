// @vitest-environment jsdom
import type { ImportableGithubRepository } from '@/features/workspaces/github-import/github-import-types';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { RepositoryPicker } from '@/features/workspaces/github-import/components/repository-picker';
import { listImportableRepositories } from '@/features/workspaces/github-import/github-import-api';

vi.mock('@/features/workspaces/github-import/github-import-api', () => ({
  listImportableRepositories: vi.fn(),
}));

const mockedList = vi.mocked(listImportableRepositories);

function repository(overrides: Partial<ImportableGithubRepository> = {}): ImportableGithubRepository {
  return {
    id: 1,
    name: 'demo-app',
    fullName: 'acme/demo-app',
    description: 'A demo application',
    private: true,
    defaultBranch: 'main',
    htmlUrl: 'https://github.com/acme/demo-app',
    updatedAt: '2026-08-01T00:00:00.000Z',
    owner: { login: 'acme', avatarUrl: 'https://avatars.githubusercontent.com/u/1' },
    ...overrides,
  };
}

beforeEach(() => {
  mockedList.mockReset();
});

describe('RepositoryPicker', () => {
  it('shows a loading state before repositories resolve', () => {
    mockedList.mockReturnValue(new Promise(() => {}));

    const { container } = render(<RepositoryPicker error={null} onSelect={vi.fn()} onReconnect={vi.fn()} />);

    expect(container.querySelector('.animate-pulse')).not.toBeNull();
  });

  it('shows an empty state when there are no repositories', async () => {
    mockedList.mockResolvedValue({ installations: [], repositories: [] });

    render(<RepositoryPicker error={null} onSelect={vi.fn()} onReconnect={vi.fn()} />);

    expect(await screen.findByText('No repositories found')).toBeInTheDocument();
  });

  it('shows an error state when loading fails, with a retry action', async () => {
    mockedList.mockRejectedValueOnce(new Error('GitHub is unavailable.'));
    mockedList.mockResolvedValueOnce({ installations: [], repositories: [] });

    render(<RepositoryPicker error={null} onSelect={vi.fn()} onReconnect={vi.fn()} />);

    expect(await screen.findByText('GitHub is unavailable.')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));

    await waitFor(() => {
      expect(mockedList).toHaveBeenCalledTimes(2);
    });
  });

  it('lists repositories and calls onSelect when one is clicked', async () => {
    const repo = repository();

    mockedList.mockResolvedValue({ installations: [], repositories: [repo] });

    const onSelect = vi.fn();

    render(<RepositoryPicker error={null} onSelect={onSelect} onReconnect={vi.fn()} />);

    const item = await screen.findByRole('button', { name: /acme\/demo-app/ });

    await userEvent.click(item);

    expect(onSelect).toHaveBeenCalledWith(repo);
  });

  it('filters repositories by search text', async () => {
    mockedList.mockResolvedValue({
      installations: [],
      repositories: [repository({ id: 1, fullName: 'acme/web-app' }), repository({ id: 2, fullName: 'acme/api-service' })],
    });

    render(<RepositoryPicker error={null} onSelect={vi.fn()} onReconnect={vi.fn()} />);

    await screen.findByRole('button', { name: /acme\/web-app/ });

    await userEvent.type(screen.getByPlaceholderText('Search repositories...'), 'api');

    expect(screen.queryByRole('button', { name: /acme\/web-app/ })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /acme\/api-service/ })).toBeInTheDocument();
  });

  it('surfaces an analyzer error passed in from the wizard', async () => {
    mockedList.mockResolvedValue({ installations: [], repositories: [repository()] });

    render(<RepositoryPicker error='This repository does not contain a runnable application.' onSelect={vi.fn()} onReconnect={vi.fn()} />);

    expect(await screen.findByText('This repository does not contain a runnable application.')).toBeInTheDocument();
  });
});
