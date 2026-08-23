'use client';

import { analyzeMobileApp } from './mobile-apps-api';
import { getErrorMessage } from '@/features/lib/api/api-error';
import type { MobileAnalysisAction, MobileAnalysisResult } from '@command-center/shared-types';
import { BrainCircuit } from 'lucide-react';
import { useState } from 'react';

interface Props {
  workspaceId: string;
  mobileAppId: string;
}

export function MobileAiAnalysis({ workspaceId, mobileAppId }: Props) {
  const [question, setQuestion] = useState('');

  const [result, setResult] = useState<MobileAnalysisResult | null>(null);

  const [loading, setLoading] = useState(false);

  const [error, setError] = useState<string | null>(null);

  async function analyze(action: MobileAnalysisAction) {
    setLoading(true);
    setError(null);

    try {
      setResult(
        await analyzeMobileApp(workspaceId, mobileAppId, {
          action,

          question: question.trim() || undefined,
        }),
      );
    } catch (analysisError) {
      setError(getErrorMessage(analysisError));
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className='rounded-2xl border bg-white p-5'>
      <div className='flex gap-3'>
        <BrainCircuit className='size-6 text-brand-600' />

        <div>
          <h2 className='font-semibold'>AI Mobile Analysis</h2>

          <p className='text-sm text-slate-500'>Analyze builds, regressions and release health using project evidence.</p>
        </div>
      </div>

      <textarea
        aria-label='AI analysis question'
        maxLength={2000}
        value={question}
        onChange={(event) => setQuestion(event.target.value)}
        placeholder='Why did performance become worse after 6.14.0?'
        className='mt-5 min-h-24 w-full rounded-lg border p-3'
      />

      <div className='mt-3 flex flex-wrap gap-2'>
        <Action label='Analyze build failure' disabled={loading} onClick={() => void analyze('BUILD_FAILURE')} />

        <Action label='Explain regression' disabled={loading} onClick={() => void analyze('PERFORMANCE_REGRESSION')} />

        <Action label='Summarize release health' disabled={loading} onClick={() => void analyze('RELEASE_HEALTH')} />
      </div>

      {error ? (
        <div role='alert' className='mt-4 rounded-lg bg-red-50 p-3 text-red-700'>
          {error}
        </div>
      ) : null}

      {result ? (
        <div className='mt-5 rounded-xl bg-slate-50 p-4'>
          <div className='flex justify-between'>
            <strong>Analysis</strong>

            <span className='text-xs'>{result.confidence}</span>
          </div>

          <p className='mt-3 whitespace-pre-wrap text-sm leading-6'>{result.answer}</p>

          <div className='mt-5'>
            <p className='text-xs font-semibold uppercase text-slate-400'>Supporting Evidence</p>

            <ul className='mt-2 space-y-1 text-sm'>
              {result.evidence.map((evidence) => (
                <li key={`${evidence.type}:${evidence.id}`}>
                  {evidence.type}
                  {' â€” '}
                  {evidence.label}
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : null}
    </section>
  );
}

function Action({ label, disabled, onClick }: { label: string; disabled: boolean; onClick(): void }) {
  return (
    <button type='button' disabled={disabled} onClick={onClick} className='rounded-lg border px-3 py-2 text-sm font-semibold disabled:opacity-50'>
      {label}
    </button>
  );
}
