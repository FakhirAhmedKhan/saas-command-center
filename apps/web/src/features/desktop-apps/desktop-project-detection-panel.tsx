'use client';

import { applyDetectedDesktopConfiguration, detectDesktopProject } from './desktop-apps-api';
import { getErrorMessage } from '@/features/lib/api/api-error';
import type {
  DesktopApplicationDetails,
  DesktopArchitecture,
  DesktopFramework,
  DesktopPlatform,
  DesktopProjectDetectionCandidate,
} from '@command-center/shared-types';
import { Loader2, SearchCode } from 'lucide-react';
import { useState } from 'react';

interface Props {
  workspaceId: string;
  desktopApp: DesktopApplicationDetails;
  onApplied?: (desktopApp: DesktopApplicationDetails) => void;
}

export function DesktopProjectDetectionPanel({ workspaceId, desktopApp, onApplied }: Props) {
  const [running, setRunning] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [candidate, setCandidate] = useState<DesktopProjectDetectionCandidate | null>(null);

  async function detect(): Promise<void> {
    setRunning(true);
    setError(null);

    try {
      const result = await detectDesktopProject(workspaceId, desktopApp.id);
      setCandidate(result.primary);

      if (!result.primary) {
        setError('No supported desktop project was detected. You can keep the current manual configuration.');
      }
    } catch (caught: unknown) {
      setError(getErrorMessage(caught));
    } finally {
      setRunning(false);
    }
  }

  async function apply(): Promise<void> {
    if (!candidate) return;

    setSaving(true);
    setError(null);

    try {
      const updated = await applyDetectedDesktopConfiguration(workspaceId, desktopApp.id, {
        platform: candidate.platform,
        framework: candidate.framework,
        architecture: candidate.architecture ?? desktopApp.architecture,
        packageName: candidate.packageName ?? desktopApp.packageName ?? undefined,
        currentVersion: candidate.version ?? desktopApp.currentVersion ?? undefined,
        currentBuildNumber: candidate.buildNumber ?? desktopApp.currentBuildNumber ?? undefined,
        minimumOsVersion: candidate.minimumOsVersion ?? desktopApp.minimumOsVersion ?? undefined,
      });

      onApplied?.(updated);
    } catch (caught: unknown) {
      setError(getErrorMessage(caught));
    } finally {
      setSaving(false);
    }
  }

  function updateCandidate<K extends keyof DesktopProjectDetectionCandidate>(key: K, value: DesktopProjectDetectionCandidate[K]): void {
    setCandidate((current) =>
      current
        ? {
            ...current,
            [key]: value,
          }
        : current,
    );
  }

  return (
    <section className='rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6'>
      <div className='flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between'>
        <div>
          <h2 className='text-lg font-semibold text-slate-950'>Project detection</h2>
          <p className='mt-1 max-w-2xl text-sm leading-6 text-slate-500'>
            Analyze the linked repository for Electron, Tauri, .NET, Qt, Java desktop, or native macOS project metadata.
          </p>
        </div>

        <button
          type='button'
          disabled={running || saving}
          onClick={() => void detect()}
          className='inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 text-sm font-semibold text-white disabled:opacity-50'
        >
          {running ? <Loader2 className='size-4 animate-spin' aria-hidden='true' /> : <SearchCode className='size-4' aria-hidden='true' />}
          {running ? 'Analyzing...' : 'Analyze Repository'}
        </button>
      </div>

      {error ? (
        <div role='alert' className='mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800'>
          {error}
        </div>
      ) : null}

      {candidate ? (
        <div className='mt-5 space-y-5 border-t border-slate-200 pt-5'>
          <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-4'>
            <label className='text-sm font-medium text-slate-700'>
              Platform
              <select
                aria-label='Detected platform'
                value={candidate.platform}
                onChange={(event) => updateCandidate('platform', event.target.value as DesktopPlatform)}
                className='mt-1.5 h-10 w-full rounded-lg border border-slate-300 bg-white px-3'
              >
                <option value='WINDOWS'>Windows</option>
                <option value='MACOS'>macOS</option>
                <option value='LINUX'>Linux</option>
                <option value='CROSS_PLATFORM'>Cross-platform</option>
              </select>
            </label>

            <label className='text-sm font-medium text-slate-700'>
              Framework
              <select
                aria-label='Detected framework'
                value={candidate.framework}
                onChange={(event) => updateCandidate('framework', event.target.value as DesktopFramework)}
                className='mt-1.5 h-10 w-full rounded-lg border border-slate-300 bg-white px-3'
              >
                <option value='ELECTRON'>Electron</option>
                <option value='TAURI'>Tauri</option>
                <option value='DOTNET'>.NET</option>
                <option value='QT'>Qt</option>
                <option value='JAVA'>Java</option>
                <option value='NATIVE_WINDOWS'>Native Windows</option>
                <option value='NATIVE_MACOS'>Native macOS</option>
                <option value='OTHER'>Other</option>
              </select>
            </label>

            <label className='text-sm font-medium text-slate-700'>
              Architecture
              <select
                aria-label='Detected architecture'
                value={candidate.architecture ?? desktopApp.architecture}
                onChange={(event) => updateCandidate('architecture', event.target.value as DesktopArchitecture)}
                className='mt-1.5 h-10 w-full rounded-lg border border-slate-300 bg-white px-3'
              >
                <option value='X64'>x64</option>
                <option value='ARM64'>ARM64</option>
                <option value='X86'>x86</option>
                <option value='UNIVERSAL'>Universal</option>
              </select>
            </label>

            <div className='text-sm'>
              <p className='font-medium text-slate-700'>Confidence</p>
              <p className='mt-1.5 flex h-10 items-center'>
                <span className='rounded-full bg-slate-100 px-3 py-1 font-semibold text-slate-700'>
                  {candidate.confidence} · {candidate.score}%
                </span>
              </p>
            </div>
          </div>

          <div className='grid gap-4 sm:grid-cols-2'>
            <label className='text-sm font-medium text-slate-700'>
              Package / app identifier
              <input
                aria-label='Detected package name'
                value={candidate.packageName ?? ''}
                onChange={(event) => updateCandidate('packageName', event.target.value || null)}
                className='mt-1.5 h-10 w-full rounded-lg border border-slate-300 px-3'
              />
            </label>

            <label className='text-sm font-medium text-slate-700'>
              Version
              <input
                aria-label='Detected version'
                value={candidate.version ?? ''}
                onChange={(event) => updateCandidate('version', event.target.value || null)}
                className='mt-1.5 h-10 w-full rounded-lg border border-slate-300 px-3'
              />
            </label>
          </div>

          <div>
            <p className='text-sm font-medium text-slate-700'>Evidence</p>
            <div className='mt-2 flex flex-wrap gap-2'>
              {candidate.evidence.map((item) => (
                <span key={item} className='rounded-md bg-slate-100 px-2 py-1 text-xs text-slate-600'>
                  {item}
                </span>
              ))}
            </div>
          </div>

          <button
            type='button'
            disabled={saving}
            onClick={() => void apply()}
            className='inline-flex h-10 items-center justify-center rounded-lg bg-brand-600 px-4 text-sm font-semibold text-white disabled:opacity-50'
          >
            {saving ? 'Saving...' : 'Use Detected Configuration'}
          </button>
        </div>
      ) : null}
    </section>
  );
}
