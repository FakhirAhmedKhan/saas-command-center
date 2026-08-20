// @vitest-environment jsdom
import { CodeDiffViewer } from './code-diff-viewer';
import type { RepositoryDiffResponse } from './code-explorer.types';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@monaco-editor/react', () => ({
  DiffEditor: ({ original, modified, language }: { original: string; modified: string; language: string }) => (
    <div data-testid='monaco-diff-editor' data-language={language} data-original={original} data-modified={modified} />
  ),
}));

function diff(overrides: Partial<RepositoryDiffResponse> = {}): RepositoryDiffResponse {
  return {
    path: 'src/index.ts',
    base: 'main',
    head: 'feature',
    textDiff: true,
    language: 'typescript',
    original: {
      name: 'index.ts',
      path: 'src/index.ts',
      branch: 'main',
      sha: 's1',
      size: 10,
      kind: 'text',
      language: 'typescript',
      mimeType: null,
      content: 'old',
      encoding: 'utf8',
    },
    modified: {
      name: 'index.ts',
      path: 'src/index.ts',
      branch: 'feature',
      sha: 's2',
      size: 12,
      kind: 'text',
      language: 'typescript',
      mimeType: null,
      content: 'new',
      encoding: 'utf8',
    },
    ...overrides,
  };
}

describe('CodeDiffViewer', () => {
  it('shows a "diff unavailable" message instead of the editor when textDiff is false', () => {
    render(<CodeDiffViewer diff={diff({ textDiff: false })} />);

    expect(screen.getByText('Diff unavailable')).toBeInTheDocument();
    expect(screen.queryByTestId('monaco-diff-editor')).not.toBeInTheDocument();
  });

  it('renders the diff editor with original and modified content when textDiff is true', () => {
    const baseline = diff();

    render(
      <CodeDiffViewer
        diff={{
          ...baseline,
          original: { ...baseline.original!, content: 'old content' },
          modified: { ...baseline.modified!, content: 'new content' },
        }}
      />,
    );

    const editor = screen.getByTestId('monaco-diff-editor');

    expect(editor).toHaveAttribute('data-original', 'old content');
    expect(editor).toHaveAttribute('data-modified', 'new content');
  });

  it('falls back to empty strings when original or modified content is null', () => {
    render(<CodeDiffViewer diff={diff({ original: null, modified: null })} />);

    const editor = screen.getByTestId('monaco-diff-editor');

    expect(editor).toHaveAttribute('data-original', '');
    expect(editor).toHaveAttribute('data-modified', '');
  });
});
