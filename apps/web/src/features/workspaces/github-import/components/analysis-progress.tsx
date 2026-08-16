/* eslint-disable react-hooks/set-state-in-effect */
'use client';

import type { ImportableGithubRepository } from '../github-import-types';
import { Card, CardContent } from '@command-center/ui';
import { Check, FolderGit2 } from 'lucide-react';
import { useEffect, useState } from 'react';

interface AnalysisProgressProps {
  repository: ImportableGithubRepository;
}

const STEPS = ['Repository structure loaded', 'Package manager detected', 'Applications discovered', 'Frameworks detected', 'Commands detected'];

const STEP_INTERVAL_MS = 550;

export function AnalysisProgress({ repository }: AnalysisProgressProps) {
  const [completedSteps, setCompletedSteps] = useState(0);

  useEffect(() => {
    setCompletedSteps(0);

    const interval = window.setInterval(() => {
      setCompletedSteps((current) => (current >= STEPS.length ? current : current + 1));
    }, STEP_INTERVAL_MS);

    return () => window.clearInterval(interval);
  }, [repository.id]);

  return (
    <Card>
      <CardContent className='flex flex-col items-center px-6 py-14 text-center'>
        <div className='flex size-12 items-center justify-center rounded-2xl bg-slate-950 text-white'>
          <FolderGit2 className='size-6' />
        </div>

        <h2 className='mt-5 text-lg font-semibold text-slate-950'>Analyzing {repository.fullName}...</h2>

        <p className='mt-1.5 max-w-sm text-sm leading-6 text-slate-500'>
          We&apos;re statically inspecting the repository&apos;s structure. No code is executed and no scripts are run.
        </p>

        <ul className='mt-6 w-full max-w-xs space-y-2.5 text-left'>
          {STEPS.map((label, index) => {
            const isComplete = index < completedSteps;

            const isActive = index === completedSteps;

            return (
              <li key={label} className='flex items-center gap-2.5 text-sm'>
                <span
                  className={`flex size-5 shrink-0 items-center justify-center rounded-full border transition ${
                    isComplete ? 'border-emerald-500 bg-emerald-500 text-white' : isActive ? 'border-brand-500 text-brand-600' : 'border-slate-200 text-transparent'
                  }`}
                >
                  {isComplete ? (
                    <Check className='size-3' strokeWidth={3} />
                  ) : isActive ? (
                    <span className='size-2 animate-pulse rounded-full bg-brand-500' />
                  ) : null}
                </span>

                <span className={isComplete ? 'text-slate-700' : isActive ? 'font-medium text-slate-950' : 'text-slate-400'}>{label}</span>
              </li>
            );
          })}
        </ul>

        <p className='mt-6 text-xs text-slate-400'>Preparing configuration...</p>
      </CardContent>
    </Card>
  );
}
