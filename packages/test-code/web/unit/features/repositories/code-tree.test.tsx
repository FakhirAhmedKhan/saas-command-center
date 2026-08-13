// @vitest-environment jsdom
import type { CodeTreeNode } from '@/features/repositories/code-explorer.types';
import { CodeTree } from '@/features/repositories/code-tree';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

function file(overrides: Partial<CodeTreeNode> = {}): CodeTreeNode {
  return { name: 'index.ts', path: 'src/index.ts', type: 'file', sha: 'sha-1', size: 100, ...overrides };
}

function directory(overrides: Partial<CodeTreeNode> = {}): CodeTreeNode {
  return { name: 'src', path: 'src', type: 'directory', sha: null, size: null, children: [], ...overrides };
}

describe('CodeTree', () => {
  it('calls onOpenFile with the file path when a file row is clicked', async () => {
    const onOpenFile = vi.fn();
    const user = userEvent.setup();

    render(<CodeTree nodes={[file({ name: 'README.md', path: 'README.md' })]} activePath={null} onOpenFile={onOpenFile} />);

    await user.click(screen.getByText('README.md'));

    expect(onOpenFile).toHaveBeenCalledWith('README.md');
  });

  it('does not call onOpenFile when a directory row is clicked — it only toggles expansion', async () => {
    const onOpenFile = vi.fn();
    const user = userEvent.setup();

    render(
      <CodeTree
        nodes={[directory({ name: 'src', path: 'src', children: [file({ name: 'index.ts', path: 'src/index.ts' })] })]}
        activePath={null}
        onOpenFile={onOpenFile}
      />,
    );

    await user.click(screen.getByText('src'));

    expect(onOpenFile).not.toHaveBeenCalled();
  });

  it('renders top-level directory children expanded by default', () => {
    render(
      <CodeTree
        nodes={[directory({ name: 'src', path: 'src', children: [file({ name: 'index.ts', path: 'src/index.ts' })] })]}
        activePath={null}
        onOpenFile={vi.fn()}
      />,
    );

    expect(screen.getByText('index.ts')).toBeInTheDocument();
  });

  it('collapses a directory after clicking it once, hiding its children', async () => {
    const user = userEvent.setup();

    render(
      <CodeTree
        nodes={[directory({ name: 'src', path: 'src', children: [file({ name: 'index.ts', path: 'src/index.ts' })] })]}
        activePath={null}
        onOpenFile={vi.fn()}
      />,
    );

    expect(screen.getByText('index.ts')).toBeInTheDocument();

    await user.click(screen.getByText('src'));

    expect(screen.queryByText('index.ts')).not.toBeInTheDocument();
  });

  it('does not call onOpenFile for a submodule row, since only file nodes are clickable', async () => {
    const onOpenFile = vi.fn();
    const user = userEvent.setup();

    render(<CodeTree nodes={[file({ name: 'vendor-lib', path: 'vendor-lib', type: 'submodule' })]} activePath={null} onOpenFile={onOpenFile} />);

    await user.click(screen.getByText('vendor-lib'));

    expect(onOpenFile).not.toHaveBeenCalled();
  });

  it('does not render nested grandchildren for a second-level directory until it is expanded, even though the tree itself is expanded', () => {
    render(
      <CodeTree
        nodes={[
          directory({
            name: 'src',
            path: 'src',
            children: [directory({ name: 'nested', path: 'src/nested', children: [file({ name: 'deep.ts', path: 'src/nested/deep.ts' })] })],
          }),
        ]}
        activePath={null}
        onOpenFile={vi.fn()}
      />,
    );

    // depth-1 directories default to collapsed (expanded state seeds from `depth < 1`).
    expect(screen.getByText('nested')).toBeInTheDocument();
    expect(screen.queryByText('deep.ts')).not.toBeInTheDocument();
  });
});
