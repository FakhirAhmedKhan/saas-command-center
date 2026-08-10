'use client';

import Editor from '@monaco-editor/react';
import Image from 'next/image';
import type { RepositoryCodeFile } from './code-explorer.types';

interface CodeViewerProps {
  file: RepositoryCodeFile | null;
}

export function CodeViewer({ file }: CodeViewerProps) {
  if (!file) {
    return (
      <div className='flex h-full items-center justify-center bg-white'>
        <div className='text-center'>
          <p className='text-sm font-semibold text-slate-700'>Select a file</p>

          <p className='mt-1 text-xs text-slate-500'>Choose a file from the explorer to view its contents.</p>
        </div>
      </div>
    );
  }

  if (file.kind === 'image' && file.content && file.mimeType) {
    return (
      <div className='flex h-full items-center justify-center overflow-auto bg-slate-950 p-10'>
        <div className='relative min-h-80 w-full max-w-4xl'>
          <Image src={`data:${file.mimeType};base64,${file.content}`} alt={file.name} fill unoptimized className='object-contain' />
        </div>
      </div>
    );
  }

  if (file.kind === 'binary') {
    return (
      <div className='flex h-full items-center justify-center bg-white'>
        <div className='text-center'>
          <p className='font-semibold text-slate-800'>Binary file</p>

          <p className='mt-2 text-sm text-slate-500'>This file cannot be displayed in the code editor.</p>
        </div>
      </div>
    );
  }

  return (
    <Editor
      height='100%'
      language={file.language}
      value={file.content ?? ''}
      path={`${file.branch}/${file.path}`}
      theme='vs-dark'
      options={{
        readOnly: true,

        minimap: {
          enabled: true,
        },

        fontSize: 14,

        wordWrap: 'off',

        automaticLayout: true,

        scrollBeyondLastLine: false,

        renderWhitespace: 'selection',

        folding: true,

        lineNumbers: 'on',

        bracketPairColorization: {
          enabled: true,
        },
      }}
    />
  );
}
