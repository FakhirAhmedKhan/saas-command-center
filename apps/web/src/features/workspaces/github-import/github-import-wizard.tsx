/* eslint-disable react-hooks/set-state-in-effect */
'use client';

import { AnalysisProgress } from './components/analysis-progress';
import { ConnectGithubStep } from './components/connect-github-step';
import { RepositoryPicker } from './components/repository-picker';
import { ReviewConfiguration } from './components/review-configuration';
import { analyzeRepository, importWorkspaceFromGithub, listImportableRepositories } from './github-import-api';
import type { ImportableGithubRepository, RepositoryAnalysisResult } from './github-import-types';
import { ApiError } from '@/features/lib/api/api-error';
import { ArrowLeft } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

type WizardStep = 'connect' | 'select-repository' | 'analyzing' | 'review';

interface GithubImportWizardProps {
  onCancel: () => void;
  onImported: (workspaceId: string) => void;
}

function analysisErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 403) {
      return 'This repository is not accessible through your connected GitHub installation. Reconnect GitHub and try again.';
    }

    if (error.status === 429) {
      return 'GitHub is rate-limiting requests right now. Wait a moment and try again.';
    }

    return error.message;
  }

  return 'Unable to analyze this repository. Please try again.';
}

export function GithubImportWizard({ onCancel, onImported }: GithubImportWizardProps) {
  const [step, setStep] = useState<WizardStep>('connect');
  const [checkingConnection, setCheckingConnection] = useState(true);
  const [selectedRepository, setSelectedRepository] = useState<ImportableGithubRepository | null>(null);
  const [analysis, setAnalysis] = useState<RepositoryAnalysisResult | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const checkExistingConnection = useCallback(async () => {
    setCheckingConnection(true);

    try {
      const result = await listImportableRepositories();

      if (result.installations.length > 0) {
        setStep('select-repository');
      }
    } catch {
      // Stay on the connect step; the user can retry the connection there.
    } finally {
      setCheckingConnection(false);
    }
  }, []);

  useEffect(() => {
    void checkExistingConnection();
  }, [checkExistingConnection]);

  async function runAnalysis(repository: ImportableGithubRepository): Promise<void> {
    setSelectedRepository(repository);
    setAnalysis(null);
    setAnalysisError(null);
    setStep('analyzing');

    try {
      const result = await analyzeRepository({ repositoryId: repository.id });

      setAnalysis(result);
      setStep('review');
    } catch (error: unknown) {
      setAnalysisError(analysisErrorMessage(error));
      setStep('select-repository');
    }
  }

  function handleBackToRepositories(): void {
    setAnalysis(null);
    setAnalysisError(null);
    setStep('select-repository');
  }

  return (
    <div className='mx-auto w-full max-w-3xl p-4 pt-16 sm:p-6 sm:pt-24'>
      <button
        type='button'
        onClick={step === 'connect' || step === 'select-repository' ? onCancel : handleBackToRepositories}
        className='inline-flex items-center gap-1.5 text-[13px] font-medium text-slate-500 transition hover:text-slate-800'
      >
        <ArrowLeft className='size-3.5' aria-hidden='true' />
        {step === 'connect' || step === 'select-repository' ? 'Back to workspace creation' : 'Back to repositories'}
      </button>

      <h1 className='mt-5 text-2xl font-semibold tracking-tight text-slate-950'>Import from GitHub</h1>

      <p className='mt-1.5 text-sm leading-6 text-slate-500'>Connect a repository and we&apos;ll suggest a workspace and application configuration for you to review.</p>

      <div className='mt-8'>
        {step === 'connect' ? <ConnectGithubStep checking={checkingConnection} /> : null}

        {step === 'select-repository' ? <RepositoryPicker error={analysisError} onSelect={(repository) => void runAnalysis(repository)} onReconnect={() => setStep('connect')} /> : null}

        {step === 'analyzing' && selectedRepository ? <AnalysisProgress repository={selectedRepository} /> : null}

        {step === 'review' && analysis ? (
          <ReviewConfiguration
            analysis={analysis}
            onSubmit={async (input) => {
              const result = await importWorkspaceFromGithub(input);

              onImported(result.workspaceId);
            }}
          />
        ) : null}
      </div>
    </div>
  );
}
