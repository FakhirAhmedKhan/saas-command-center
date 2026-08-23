'use client';

import { MOBILE_FRAMEWORK_LABELS, MOBILE_PLATFORM_LABELS } from './mobile-app.constants';
import { detectMobileProject, updateMobileApp } from './mobile-apps-api';
import { getErrorMessage } from '@/features/lib/api/api-error';
import type {
  MobileApplicationDetails,
  MobileFramework,
  MobilePlatform,
  MobileProjectDetection,
  MobileProjectDetectionResponse,
} from '@command-center/shared-types';
import { CheckCircle2, Loader2, ScanSearch } from 'lucide-react';
import { useEffect, useState } from 'react';

interface MobileProjectDetectionPanelProps {
  workspaceId: string;

  mobileApp: MobileApplicationDetails;

  onApplied?: () => void;
}

export function MobileProjectDetectionPanel({ workspaceId, mobileApp, onApplied }: MobileProjectDetectionPanelProps) {
  const [result, setResult] = useState<MobileProjectDetectionResponse | null>(null);

  const [selectedIndex, setSelectedIndex] = useState(0);

  const [draft, setDraft] = useState<MobileProjectDetection | null>(null);

  const [detecting, setDetecting] = useState(false);

  const [applying, setApplying] = useState(false);

  const [error, setError] = useState<string | null>(null);

  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!result) {
      return;
    }

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDraft(result.projects[selectedIndex] ?? null);
  }, [result, selectedIndex]);

  async function detect(): Promise<void> {
    setDetecting(true);
    setError(null);
    setSuccess(false);

    try {
      const response = await detectMobileProject(workspaceId, mobileApp.id);

      setResult(response);

      setSelectedIndex(0);

      setDraft(response.primaryProject);
    } catch (detectError: unknown) {
      setError(getErrorMessage(detectError));
    } finally {
      setDetecting(false);
    }
  }

  function updateDraft<K extends keyof MobileProjectDetection>(key: K, value: MobileProjectDetection[K]): void {
    setDraft((current) => {
      if (!current) {
        return current;
      }

      return {
        ...current,
        [key]: value,
      };
    });
  }

  async function apply(): Promise<void> {
    if (!draft) {
      return;
    }

    setApplying(true);
    setError(null);
    setSuccess(false);

    try {
      await updateMobileApp(workspaceId, mobileApp.id, {
        platform: draft.platform,

        framework: draft.framework,

        packageId: draft.packageId,

        bundleId: draft.bundleId,

        minOsVersion: draft.minOsVersion,

        targetOsVersion: draft.targetOsVersion,

        currentVersion: draft.currentVersion,

        currentBuildNumber: draft.currentBuildNumber,
      });

      setSuccess(true);

      onApplied?.();
    } catch (applyError: unknown) {
      setError(getErrorMessage(applyError));
    } finally {
      setApplying(false);
    }
  }

  return (
    <section className='rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6'>
      <div className='flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between'>
        <div className='flex items-start gap-3'>
          <div className='flex size-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600'>
            <ScanSearch className='size-5' />
          </div>

          <div>
            <h2 className='font-semibold text-slate-950'>Project Detection</h2>

            <p className='mt-1 text-sm text-slate-500'>Detect platform, framework and mobile metadata from the linked repository.</p>
          </div>
        </div>

        <button
          type='button'
          disabled={detecting}
          onClick={() => void detect()}
          className='inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 text-sm font-semibold text-white disabled:opacity-50'
        >
          {detecting ? <Loader2 className='size-4 animate-spin' /> : <ScanSearch className='size-4' />}

          {detecting ? 'Analyzing...' : 'Analyze Repository'}
        </button>
      </div>

      {error ? (
        <div role='alert' className='mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700'>
          {error}
        </div>
      ) : null}

      {success ? (
        <div className='mt-5 flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700'>
          <CheckCircle2 className='size-4' />
          Detected configuration applied.
        </div>
      ) : null}

      {result && !result.mobileDetected ? (
        <div className='mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4'>
          <p className='font-medium text-slate-800'>No mobile project detected</p>

          <p className='mt-1 text-sm text-slate-500'>No supported Android, iOS, Flutter, React Native or Kotlin Multiplatform project markers were found.</p>
        </div>
      ) : null}

      {result && result.projects.length > 1 ? (
        <div className='mt-6'>
          <label className='text-sm font-medium text-slate-700'>Detected project</label>

          <select
            aria-label='Detected project'
            value={selectedIndex}
            onChange={(event) => setSelectedIndex(Number(event.target.value))}
            className='mt-2 h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm'
          >
            {result.projects.map((project, index) => (
              <option key={project.projectRoot + project.framework} value={index}>
                {project.projectRoot}
                {' â€” '}
                {MOBILE_FRAMEWORK_LABELS[project.framework]}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      {draft ? (
        <div className='mt-6 space-y-5'>
          <div className='grid gap-3 sm:grid-cols-3'>
            <Info label='Project root' value={draft.projectRoot} />

            <Info label='Confidence' value={draft.confidence} />

            <Info label='Build system' value={draft.buildSystem} />
          </div>

          <div className='grid gap-4 md:grid-cols-2'>
            <Field label='Platform'>
              <select
                aria-label='Detected platform'
                value={draft.platform}
                onChange={(event) => updateDraft('platform', event.target.value as MobilePlatform)}
                className='h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm'
              >
                {Object.entries(MOBILE_PLATFORM_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </Field>

            <Field label='Framework'>
              <select
                aria-label='Detected framework'
                value={draft.framework}
                onChange={(event) => updateDraft('framework', event.target.value as MobileFramework)}
                className='h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm'
              >
                {Object.entries(MOBILE_FRAMEWORK_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </Field>

            <TextField label='Package ID' value={draft.packageId ?? ''} onChange={(value) => updateDraft('packageId', value || null)} />

            <TextField label='Bundle ID' value={draft.bundleId ?? ''} onChange={(value) => updateDraft('bundleId', value || null)} />

            <TextField label='Minimum OS' value={draft.minOsVersion ?? ''} onChange={(value) => updateDraft('minOsVersion', value || null)} />

            <TextField label='Target OS' value={draft.targetOsVersion ?? ''} onChange={(value) => updateDraft('targetOsVersion', value || null)} />

            <TextField label='Version' value={draft.currentVersion ?? ''} onChange={(value) => updateDraft('currentVersion', value || null)} />

            <TextField label='Build number' value={draft.currentBuildNumber ?? ''} onChange={(value) => updateDraft('currentBuildNumber', value || null)} />
          </div>

          <div>
            <p className='text-xs font-semibold uppercase tracking-wide text-slate-400'>Detection evidence</p>

            <ul className='mt-2 space-y-1'>
              {draft.evidence.map((evidence) => (
                <li key={evidence} className='font-mono text-xs text-slate-600'>
                  {evidence}
                </li>
              ))}
            </ul>
          </div>

          {draft.warnings.length > 0 ? (
            <div className='rounded-xl border border-amber-200 bg-amber-50 p-4'>
              {draft.warnings.map((warning) => (
                <p key={warning} className='text-sm text-amber-800'>
                  {warning}
                </p>
              ))}
            </div>
          ) : null}

          <button
            type='button'
            disabled={applying}
            onClick={() => void apply()}
            className='inline-flex h-10 items-center rounded-lg bg-brand-600 px-4 text-sm font-semibold text-white disabled:opacity-50'
          >
            {applying ? 'Applying...' : 'Use Detected Configuration'}
          </button>
        </div>
      ) : null}
    </section>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className='rounded-xl bg-slate-50 p-3'>
      <p className='text-xs text-slate-400'>{label}</p>

      <p className='mt-1 text-sm font-medium text-slate-800'>{value}</p>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label>
      <span className='mb-2 block text-sm font-medium text-slate-700'>{label}</span>

      {children}
    </label>
  );
}

function TextField({ label, value, onChange }: { label: string; value: string; onChange(value: string): void }) {
  return (
    <label>
      <span className='mb-2 block text-sm font-medium text-slate-700'>{label}</span>

      <input
        aria-label={label}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className='h-10 w-full rounded-lg border border-slate-300 px-3 text-sm'
      />
    </label>
  );
}
