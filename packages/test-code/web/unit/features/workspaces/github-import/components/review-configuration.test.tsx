// @vitest-environment jsdom
import { ReviewConfiguration } from '@/features/workspaces/github-import/components/review-configuration';
import type { RepositoryAnalysisResult } from '@/features/workspaces/github-import/github-import-types';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

function monorepoAnalysis(): RepositoryAnalysisResult {
  return {
    repository: {
      id: 42,
      installationId: '123',
      owner: 'acme',
      name: 'monorepo',
      fullName: 'acme/monorepo',
      defaultBranch: 'main',
      htmlUrl: 'https://github.com/acme/monorepo',
      private: true,
    },

    repositoryType: 'monorepo',
    suggestedWorkspace: {
      name: 'Monorepo',
      slug: 'monorepo',
      description: 'Imported from acme/monorepo',
    },

    packageManager: 'pnpm',
    applications: [
      {
        name: 'Web',
        rootDirectory: 'apps/web',
        framework: 'Next.js',
        language: 'TypeScript',
        packageName: '@acme/web',
        commands: { dev: 'pnpm run dev', build: 'pnpm run build' },
        technologies: ['TypeScript', 'Tailwind CSS'],
        runnable: true,
        confidence: 0.9,
      },
      {
        name: 'Shared Types',
        rootDirectory: 'packages/shared-types',
        framework: null,
        language: 'TypeScript',
        packageName: '@acme/shared-types',
        commands: { build: 'pnpm run build' },
        technologies: ['TypeScript'],
        runnable: false,
        confidence: 0.1,
      },
    ],

    analyzedAt: '2026-08-16T00:00:00.000Z',
  };
}

describe('ReviewConfiguration', () => {
  it('pre-fills workspace fields from the analysis and lets the user edit them', async () => {
    render(<ReviewConfiguration analysis={monorepoAnalysis()} onSubmit={vi.fn()} />);

    const nameInput = screen.getByLabelText('Workspace name') as HTMLInputElement;

    expect(nameInput.value).toBe('Monorepo');

    await userEvent.clear(nameInput);
    await userEvent.type(nameInput, 'Custom Workspace Name');

    expect(nameInput.value).toBe('Custom Workspace Name');
  });

  it('pre-selects only runnable applications', () => {
    render(<ReviewConfiguration analysis={monorepoAnalysis()} onSubmit={vi.fn()} />);

    const checkboxes = screen.getAllByRole('checkbox') as HTMLInputElement[];

    expect(checkboxes[0]?.checked).toBe(true);
    expect(checkboxes[1]?.checked).toBe(false);
  });

  it('marks the non-runnable package as not runnable', () => {
    render(<ReviewConfiguration analysis={monorepoAnalysis()} onSubmit={vi.fn()} />);

    expect(screen.getByText('Not runnable')).toBeInTheDocument();
  });

  it('lets the user toggle which applications are imported', async () => {
    render(<ReviewConfiguration analysis={monorepoAnalysis()} onSubmit={vi.fn()} />);

    const checkboxes = screen.getAllByRole('checkbox') as HTMLInputElement[];

    await userEvent.click(checkboxes[1]!);

    expect(checkboxes[1]?.checked).toBe(true);
    expect(screen.getByText('2 application(s) selected')).toBeInTheDocument();
  });

  it('submits the selected applications with the edited workspace details', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);

    render(<ReviewConfiguration analysis={monorepoAnalysis()} onSubmit={onSubmit} />);

    await userEvent.click(screen.getByRole('button', { name: /Create workspace/ }));

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        installationId: '123',
        repositoryId: 42,
        workspace: expect.objectContaining({ name: 'Monorepo' }),
        applications: [expect.objectContaining({ name: 'Web', rootDirectory: 'apps/web' })],
      }),
    );
  });

  it('blocks submission when no applications are selected', async () => {
    const onSubmit = vi.fn();

    const analysis = monorepoAnalysis();

    render(<ReviewConfiguration analysis={{ ...analysis, applications: [{ ...analysis.applications[0]!, runnable: false }] }} onSubmit={onSubmit} />);

    await userEvent.click(screen.getByRole('button', { name: /Create workspace/ }));

    expect(screen.getByText('Select at least one application to import.')).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
