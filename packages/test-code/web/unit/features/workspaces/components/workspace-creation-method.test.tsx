// @vitest-environment jsdom
import { WorkspaceCreationMethod } from '@/features/workspaces/components/workspace-creation-method';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

describe('WorkspaceCreationMethod', () => {
  it('shows both creation options', () => {
    render(<WorkspaceCreationMethod onSelectManual={vi.fn()} onSelectGithub={vi.fn()} />);

    expect(screen.getByRole('button', { name: /Create Manually/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Import from GitHub/ })).toBeInTheDocument();
  });

  it('calls onSelectManual when Create Manually is clicked', async () => {
    const onSelectManual = vi.fn();

    render(<WorkspaceCreationMethod onSelectManual={onSelectManual} onSelectGithub={vi.fn()} />);

    await userEvent.click(screen.getByRole('button', { name: /Create Manually/ }));

    expect(onSelectManual).toHaveBeenCalledTimes(1);
  });

  it('calls onSelectGithub when Import from GitHub is clicked', async () => {
    const onSelectGithub = vi.fn();

    render(<WorkspaceCreationMethod onSelectManual={vi.fn()} onSelectGithub={onSelectGithub} />);

    await userEvent.click(screen.getByRole('button', { name: /Import from GitHub/ }));

    expect(onSelectGithub).toHaveBeenCalledTimes(1);
  });
});
