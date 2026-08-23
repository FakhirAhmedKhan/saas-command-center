'use client';

import { analyzeDesktopApplication, getDesktopPermissions } from './desktop-apps-api';
import { DesktopPermissionGate } from './desktop-permission-gate';
import { getErrorMessage } from '@/features/lib/api/api-error';
import type { DesktopAnalysisResult, DesktopAnalysisAction, DesktopPermissions } from '@command-center/shared-types';
import { Bot, ExternalLink } from 'lucide-react';
import { useEffect, useState } from 'react';

interface Props {
  workspaceId: string;
  desktopAppId: string;
  buildId?: string;
  releaseId?: string;
  crashId?: string;
}

const ACTIONS: Array<{
  value: DesktopAnalysisAction;
  label: string;
}> = [
  { value: 'BUILD_FAILURE', label: 'Why did this build fail?' },
  { value: 'CRASH_INCREASE', label: 'Why did crashes increase?' },
  {
    value: 'PERFORMANCE_REGRESSION',
    label: 'What caused the performance regression?',
  },
  { value: 'RELEASE_HEALTH', label: 'Is this release healthy?' },
  { value: 'CUSTOM', label: 'Ask a custom question' },
];

export function DesktopAnalysisPanel({ workspaceId, desktopAppId, buildId, releaseId, crashId }: Props) {
  const [permissions, setPermissions] = useState<DesktopPermissions | null>(null);
  const [action, setAction] = useState<DesktopAnalysisAction>('RELEASE_HEALTH');
  const [question, setQuestion] = useState('');
  const [analysis, setAnalysis] = useState<DesktopAnalysisResult | null>(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    void getDesktopPermissions(workspaceId, desktopAppId)
      .then((value) => {
        if (!cancelled) {
          setPermissions(value);
        }
      })
      .catch((loadError) => {
        if (!cancelled) {
          setError(getErrorMessage(loadError));
        }
      });

    return () => {
      cancelled = true;
    };
  }, [workspaceId, desktopAppId]);

  async function run() {
    setRunning(true);
    setError(null);

    try {
      const result = await analyzeDesktopApplication(workspaceId, desktopAppId, {
        action,
        question: question.trim() || undefined,
        buildId,
        releaseId,
        crashId,
      });

      setAnalysis(result);
    } catch (runError) {
      setError(getErrorMessage(runError));
    } finally {
      setRunning(false);
    }
  }

  return (
    <section className='rounded-2xl border bg-white p-5' data-testid='desktop-ai-panel'>
      <div className='flex items-center gap-2'>
        <Bot className='size-5' aria-hidden='true' />
        <div>
          <h2 className='font-semibold'>AI Desktop Analysis</h2>
          <p className='text-sm text-slate-500'>Evidence-grounded analysis from your desktop engineering data.</p>
        </div>
      </div>

      {error ? (
        <div role='alert' className='mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800'>
          {error}
        </div>
      ) : null}

      <DesktopPermissionGate
        permissions={permissions}
        require='analyze'
        fallback={permissions ? <p className='mt-4 text-sm text-slate-500'>Your workspace role has read-only access to AI analysis.</p> : null}
      >
        <div className='mt-4 grid gap-3 md:grid-cols-[280px_1fr]'>
          <label className='space-y-1 text-sm'>
            <span>Analysis</span>
            <select
              aria-label='Analysis action'
              value={action}
              onChange={(event) => setAction(event.target.value as DesktopAnalysisAction)}
              className='h-10 w-full rounded-lg border px-3'
            >
              {ACTIONS.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>

          <label className='space-y-1 text-sm'>
            <span>Question</span>
            <input
              aria-label='AI question'
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              placeholder='Optional: focus the analysis on a specific symptom or release.'
              className='h-10 w-full rounded-lg border px-3'
            />
          </label>
        </div>

        <button
          type='button'
          onClick={() => void run()}
          disabled={running}
          className='mt-3 h-10 rounded-lg bg-slate-950 px-4 text-sm font-medium text-white disabled:opacity-50'
        >
          {running ? 'Analyzing…' : 'Analyze'}
        </button>
      </DesktopPermissionGate>

      {analysis ? (
        <div className='mt-5 space-y-4'>
          <div className='flex items-center gap-2 text-sm'>
            <span className='rounded-full border px-2 py-0.5'>{analysis.confidence}</span>
            <span className='text-slate-500'>{analysis.action}</span>
          </div>

          <pre className='whitespace-pre-wrap rounded-xl bg-slate-950 p-4 text-sm leading-6 text-slate-100'>{analysis.answer}</pre>

          <div>
            <h3 className='text-sm font-semibold'>Evidence</h3>
            {analysis.evidence.length === 0 ? (
              <p className='mt-2 text-sm text-slate-500'>No evidence references were available.</p>
            ) : (
              <ul className='mt-2 space-y-2'>
                {analysis.evidence.map((item) => (
                  <li key={`${item.type}:${item.id}`} className='flex items-center justify-between gap-3 rounded-lg border px-3 py-2 text-sm'>
                    <span>
                      <span className='font-medium'>{item.type}</span>
                      <span className='ml-2 text-slate-500'>{item.label}</span>
                    </span>

                    {item.href ? (
                      <a href={item.href} className='inline-flex items-center gap-1 text-xs font-medium underline'>
                        Open
                        <ExternalLink className='size-3' aria-hidden='true' />
                      </a>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      ) : null}
    </section>
  );
}