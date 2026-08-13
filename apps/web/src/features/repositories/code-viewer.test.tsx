// @vitest-environment jsdom
import type { RepositoryCodeFile } from './code-explorer.types';
import { CodeViewer } from './code-viewer';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@monaco-editor/react', () => ({
  default: ({ value, language, path }: { value: string; language: string; path: string }) => (
    <div data-testid='monaco-editor' data-language={language} data-path={path}>
      {value}
    </div>
  ),
}));

vi.mock('next/image', () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  default: (props: any) => <img alt={props.alt} src={props.src} />,
}));

function textFile(overrides: Partial<RepositoryCodeFile> = {}): RepositoryCodeFile {
  return {
    name: 'index.ts',
    path: 'src/index.ts',
    branch: 'main',
    sha: 'sha-1',
    size: 100,
    kind: 'text',
    language: 'typescript',
    mimeType: null,
    content: 'export const x = 1;',
    encoding: 'utf8',
    ...overrides,
  };
}

describe('CodeViewer', () => {
  it('shows a placeholder prompting file selection when no file is given', () => {
    render(<CodeViewer file={null} />);

    expect(screen.getByText('Select a file')).toBeInTheDocument();
  });

  it('renders the Monaco editor with the file content and language for a text file', () => {
    render(<CodeViewer file={textFile({ content: 'const value = 42;', language: 'typescript' })} />);

    const editor = screen.getByTestId('monaco-editor');

    expect(editor).toHaveTextContent('const value = 42;');
    expect(editor).toHaveAttribute('data-language', 'typescript');
  });

  it('renders an image preview instead of the editor for an image file with content and a mime type', () => {
    render(textAsImage());

    expect(screen.queryByTestId('monaco-editor')).not.toBeInTheDocument();
    expect(screen.getByRole('img')).toHaveAttribute('src', expect.stringContaining('data:image/png;base64,'));

    function textAsImage() {
      return <CodeViewer file={textFile({ kind: 'image', mimeType: 'image/png', content: 'ZmFrZS1pbWFnZS1kYXRh', name: 'logo.png' })} />;
    }
  });

  it('shows a "binary file" message instead of the editor for a binary file', () => {
    render(<CodeViewer file={textFile({ kind: 'binary', content: null })} />);

    expect(screen.getByText('Binary file')).toBeInTheDocument();
    expect(screen.queryByTestId('monaco-editor')).not.toBeInTheDocument();
  });

  it('falls back to the Monaco editor when kind is "image" but content or mimeType is missing', () => {
    render(<CodeViewer file={textFile({ kind: 'image', mimeType: null, content: null })} />);

    expect(screen.getByTestId('monaco-editor')).toBeInTheDocument();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });
});
