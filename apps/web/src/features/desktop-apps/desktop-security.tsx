'use client';

import { getDesktopSecurity, scanDesktopSecurity } from './desktop-apps-api';
import { getErrorMessage } from '@/features/lib/api/api-error';
import type { DesktopSecuritySummary } from '@command-center/shared-types';
import { Loader2, RefreshCw, ShieldCheck } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

interface Props {
  workspaceId: string;
  desktopAppId: string;
}

export function DesktopSecurity({ workspaceId, desktopAppId }: Props) {
  const [data, setData] = useState<DesktopSecuritySummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setData(await getDesktopSecurity(workspaceId, desktopAppId));
    } catch (loadError: unknown) {
      setError(getErrorMessage(loadError));
    } finally {
      setLoading(false);
    }
  }, [workspaceId, desktopAppId]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void load();
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [load]);

  async function scan() {
    setScanning(true);
    setError(null);

    try {
      setData(await scanDesktopSecurity(workspaceId, desktopAppId));
    } catch (scanError: unknown) {
      setError(getErrorMessage(scanError));
    } finally {
      setScanning(false);
    }
  }

  return (
    <section className='space-y-5'>
      <div className='rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6'>
        <div className='flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between'>
          <div className='flex items-start gap-3'>
            <div className='flex size-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600'>
              <ShieldCheck className='size-5' />
            </div>
            <div>
              <h2 className='text-lg font-semibold text-slate-950'>Security Health</h2>
              <p className='mt-1 text-sm text-slate-500'>Signing, notarization, packaging and dependency risk metadata. Secret values are never rendered.</p>
            </div>
          </div>
          <button
            type='button'
            disabled={scanning}
            onClick={() => void scan()}
            className='inline-flex h-10 items-center gap-2 rounded-lg bg-slate-900 px-4 text-sm font-semibold text-white disabled:opacity-50'
          >
            {scanning ? <Loader2 className='size-4 animate-spin' /> : <RefreshCw className='size-4' />}
            Run Security Scan
          </button>
        </div>

        {error ? (
          <div role='alert' className='mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700'>
            {error}
          </div>
        ) : null}

        {loading ? (
          <div className='mt-6 flex items-center gap-2 text-sm text-slate-500'>
            <Loader2 className='size-4 animate-spin' /> Loading security health...
          </div>
        ) : data ? (
          <>
            <div className='mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5'>
              <SecurityCard label='Windows signing' value={data.windowsSigning} />
              <SecurityCard label='macOS signing' value={data.macosSigning} />
              <SecurityCard label='Notarization' value={data.notarization} />
              <SecurityCard label='Critical risks' value={String(data.criticalRisks)} />
              <SecurityCard label='High risks' value={String(data.highRisks)} />
            </div>

            {data.findings.length === 0 ? (
              <div className='mt-6 rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500'>No security scan results yet.</div>
            ) : (
              <div className='mt-6 space-y-3'>
                {data.findings.map((finding) => (
                  <article key={finding.id} className='rounded-xl border border-slate-200 p-4'>
                    <div className='flex flex-wrap items-center gap-2'>
                      <h3 className='font-semibold text-slate-950'>{finding.title}</h3>
                      <span className='rounded-md bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700'>{finding.status}</span>
                      <span className='rounded-md bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-700'>{finding.severity}</span>
                    </div>
                    <p className='mt-2 text-sm leading-6 text-slate-600'>{finding.message}</p>
                    {finding.sourcePath ? <p className='mt-2 break-all text-xs text-slate-400'>Source: {finding.sourcePath}</p> : null}
                  </article>
                ))}
              </div>
            )}
          </>
        ) : null}
      </div>
    </section>
  );
}

function SecurityCard({ label, value }: { label: string; value: string }) {
  return (
    <div className='rounded-xl bg-slate-50 p-4'>
      <p className='text-xs font-medium uppercase tracking-wide text-slate-400'>{label}</p>
      <p className='mt-1 text-lg font-bold text-slate-950'>{value}</p>
    </div>
  );
}
