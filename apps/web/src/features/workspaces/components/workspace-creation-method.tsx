'use client';

import { ArrowLeft, FolderGit2, Pencil } from 'lucide-react';
import Link from 'next/link';

interface WorkspaceCreationMethodProps {
  onSelectManual: () => void;
  onSelectGithub: () => void;
}

export function WorkspaceCreationMethod({ onSelectManual, onSelectGithub }: WorkspaceCreationMethodProps) {
  return (
    <div className='mx-auto w-full max-w-xl p-4 pt-16 sm:p-6 sm:pt-24'>
      <Link href='/dashboard' className='inline-flex items-center gap-1.5 text-[13px] font-medium text-slate-500 transition hover:text-slate-800'>
        <ArrowLeft className='size-3.5' aria-hidden='true' />
        Back to dashboard
      </Link>

      <h1 className='mt-5 text-2xl font-semibold tracking-tight text-slate-950'>Create Workspace</h1>

      <p className='mt-1.5 text-sm leading-6 text-slate-500'>How would you like to create your workspace?</p>

      <div className='mt-6 grid gap-4 sm:grid-cols-2'>
        <button type='button' onClick={onSelectManual} className='flex flex-col items-start rounded-2xl border border-slate-200 bg-white p-5 text-left transition hover:border-brand-300 hover:shadow-sm'>
          <div className='flex size-10 items-center justify-center rounded-xl bg-slate-100'>
            <Pencil className='size-5 text-slate-700' />
          </div>

          <h2 className='mt-4 font-semibold text-slate-950'>Create Manually</h2>

          <p className='mt-1.5 text-sm leading-6 text-slate-500'>Configure the workspace yourself.</p>
        </button>

        <button type='button' onClick={onSelectGithub} className='flex flex-col items-start rounded-2xl border border-slate-200 bg-white p-5 text-left transition hover:border-brand-300 hover:shadow-sm'>
          <div className='flex size-10 items-center justify-center rounded-xl bg-slate-950'>
            <FolderGit2 className='size-5 text-white' />
          </div>

          <h2 className='mt-4 font-semibold text-slate-950'>Import from GitHub</h2>

          <p className='mt-1.5 text-sm leading-6 text-slate-500'>Analyze a repository and automatically configure your workspace.</p>
        </button>
      </div>
    </div>
  );
}
