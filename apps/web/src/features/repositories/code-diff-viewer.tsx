'use client';

import { DiffEditor } from '@monaco-editor/react';
import type { RepositoryDiffResponse } from './code-explorer.types';

interface CodeDiffViewerProps {
  diff: RepositoryDiffResponse;
}

export function CodeDiffViewer({ diff }: CodeDiffViewerProps) {
  if (!diff.textDiff) {
    return (
      <div className='flex h-full items-center justify-center bg-white'>
        <div className='text-center'>
          <p className='font-semibold text-slate-800'>Diff unavailable</p>

          <p className='mt-2 text-sm text-slate-500'>Binary and image files cannot be compared in Monaco.</p>
        </div>
      </div>
    );
  }

  return (
    <DiffEditor
      height='100%'
      language={diff.language}
      original={diff.original?.content ?? ''}
      modified={diff.modified?.content ?? ''}
      theme='vs-dark'
      options={{
        readOnly: true,

        originalEditable: false,

        automaticLayout: true,

        renderSideBySide: true,

        minimap: {
          enabled: false,
        },

        scrollBeyondLastLine: false,
      }}
    />
  );
}
