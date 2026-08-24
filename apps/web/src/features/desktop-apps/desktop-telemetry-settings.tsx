'use client';

import { connectDesktopTelemetry, disconnectDesktopTelemetry, listDesktopTelemetryIntegrations, previewDesktopTelemetry, syncDesktopTelemetry } from './desktop-apps-api';
import { getErrorMessage } from '@/features/lib/api/api-error';
import type { DesktopTelemetryIntegration, DesktopTelemetryProvider, DesktopTelemetrySnapshot } from '@command-center/shared-types';
import { Activity, CheckCircle2, Loader2, RefreshCw, Trash2 } from 'lucide-react';
import { type FormEvent, useCallback, useEffect, useState } from 'react';

interface Props {
  workspaceId: string;
  desktopAppId: string;
}

const PROVIDERS: Array<{
  value: DesktopTelemetryProvider;
  label: string;
}> = [
  { value: 'SENTRY', label: 'Sentry' },
  { value: 'DATADOG', label: 'Datadog' },
  { value: 'NEW_RELIC', label: 'New Relic' },
  { value: 'OPENTELEMETRY', label: 'OpenTelemetry' },
  { value: 'CUSTOM', label: 'Custom' },
];

export function DesktopTelemetrySettings({ workspaceId, desktopAppId }: Props) {
  const [integrations, setIntegrations] = useState<DesktopTelemetryIntegration[]>([]);
  const [provider, setProvider] = useState<DesktopTelemetryProvider>('SENTRY');
  const [externalProjectId, setExternalProjectId] = useState('');
  const [endpointUrl, setEndpointUrl] = useState('');
  const [secret, setSecret] = useState('');
  const [preview, setPreview] = useState<DesktopTelemetrySnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(async () => {
    try {
      setIntegrations(await listDesktopTelemetryIntegrations(workspaceId, desktopAppId));
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

  async function connect(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setPreview(null);

    try {
      await connectDesktopTelemetry(workspaceId, desktopAppId, {
        provider,
        externalProjectId: externalProjectId.trim(),
        endpointUrl: endpointUrl.trim(),
        secret,
      });

      setSecret('');
      await load();
    } catch (connectError: unknown) {
      setError(getErrorMessage(connectError));
    } finally {
      setSaving(false);
    }
  }

  async function previewIntegration(integrationId: string) {
    setSaving(true);
    setError(null);

    try {
      setPreview(await previewDesktopTelemetry(workspaceId, desktopAppId, integrationId));
      await load();
    } catch (previewError: unknown) {
      setError(getErrorMessage(previewError));
    } finally {
      setSaving(false);
    }
  }

  async function sync(integrationId: string) {
    setSaving(true);
    setError(null);

    try {
      await syncDesktopTelemetry(workspaceId, desktopAppId, integrationId);
      await load();
    } catch (syncError: unknown) {
      setError(getErrorMessage(syncError));
    } finally {
      setSaving(false);
    }
  }

  async function disconnect(integrationId: string) {
    setSaving(true);
    setError(null);

    try {
      await disconnectDesktopTelemetry(workspaceId, desktopAppId, integrationId);
      await load();
    } catch (disconnectError: unknown) {
      setError(getErrorMessage(disconnectError));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className='space-y-6'>
      <section className='rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6'>
        <div className='flex items-start gap-3'>
          <div className='flex size-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600'>
            <Activity className='size-5' aria-hidden='true' />
          </div>

          <div>
            <h2 className='text-lg font-semibold text-slate-950'>Runtime Monitoring</h2>
            <p className='mt-1 text-sm leading-6 text-slate-500'>Connect a provider through the normalized telemetry adapter. Provider tokens are encrypted by the API and never returned to the browser.</p>
          </div>
        </div>

        {error ? (
          <div role='alert' className='mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700'>
            {error}
          </div>
        ) : null}

        <form onSubmit={connect} className='mt-6 grid gap-4 md:grid-cols-2'>
          <label className='text-sm font-medium text-slate-800'>
            Provider
            <select
              aria-label='Telemetry provider'
              value={provider}
              onChange={(event) => setProvider(event.target.value as DesktopTelemetryProvider)}
              disabled={saving}
              className='mt-1.5 h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm'
            >
              {PROVIDERS.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>

          <label className='text-sm font-medium text-slate-800'>
            External project ID
            <input
              aria-label='External project ID'
              value={externalProjectId}
              onChange={(event) => setExternalProjectId(event.target.value)}
              required
              maxLength={255}
              className='mt-1.5 h-10 w-full rounded-lg border border-slate-300 px-3 text-sm'
              placeholder='organization/project'
            />
          </label>

          <label className='text-sm font-medium text-slate-800 md:col-span-2'>
            Normalized adapter endpoint
            <input
              aria-label='Telemetry endpoint URL'
              value={endpointUrl}
              onChange={(event) => setEndpointUrl(event.target.value)}
              required
              className='mt-1.5 h-10 w-full rounded-lg border border-slate-300 px-3 text-sm'
              placeholder='https://telemetry.example.com/desktop-snapshot'
            />
          </label>

          <label className='text-sm font-medium text-slate-800 md:col-span-2'>
            Provider secret
            <input
              aria-label='Telemetry provider secret'
              type='password'
              autoComplete='new-password'
              value={secret}
              onChange={(event) => setSecret(event.target.value)}
              required
              minLength={8}
              className='mt-1.5 h-10 w-full rounded-lg border border-slate-300 px-3 text-sm'
              placeholder='Stored encrypted; never returned'
            />
          </label>

          <div className='md:col-span-2 flex justify-end'>
            <button type='submit' disabled={saving} className='inline-flex h-10 items-center gap-2 rounded-lg bg-slate-900 px-4 text-sm font-semibold text-white disabled:opacity-50'>
              {saving ? <Loader2 className='size-4 animate-spin' /> : null}
              Connect Provider
            </button>
          </div>
        </form>
      </section>

      <section className='rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6'>
        <div className='flex items-center justify-between gap-3'>
          <div>
            <h2 className='text-lg font-semibold text-slate-950'>Configured providers</h2>
            <p className='mt-1 text-sm text-slate-500'>Provider status and last sync are safe metadata only.</p>
          </div>
          <button type='button' onClick={() => void load()} className='inline-flex items-center gap-2 text-sm font-semibold text-slate-600'>
            <RefreshCw className='size-4' /> Refresh
          </button>
        </div>

        {loading ? (
          <div className='mt-5 flex items-center gap-2 text-sm text-slate-500'>
            <Loader2 className='size-4 animate-spin' /> Loading telemetry...
          </div>
        ) : integrations.length === 0 ? (
          <div className='mt-5 rounded-xl border border-dashed border-slate-300 p-5 text-sm text-slate-500'>No telemetry provider configured.</div>
        ) : (
          <div className='mt-5 space-y-3'>
            {integrations.map((integration) => (
              <article key={integration.id} className='rounded-xl border border-slate-200 p-4'>
                <div className='flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between'>
                  <div>
                    <div className='flex items-center gap-2'>
                      <CheckCircle2 className='size-4 text-emerald-600' />
                      <p className='font-semibold text-slate-950'>{integration.provider}</p>
                      <span className='rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600'>{integration.status}</span>
                    </div>
                    <p className='mt-2 text-sm text-slate-500'>Project: {integration.externalProjectId}</p>
                    <p className='mt-1 text-sm text-slate-500'>Secret: {integration.hasSecret ? 'Configured' : 'Removed'}</p>
                    <p className='mt-1 text-sm text-slate-500'>Last sync: {integration.lastSyncedAt ? new Date(integration.lastSyncedAt).toLocaleString() : 'Never'}</p>
                    {integration.lastError ? <p className='mt-2 text-sm text-red-600'>{integration.lastError}</p> : null}
                  </div>

                  <div className='flex flex-wrap gap-2'>
                    <button
                      type='button'
                      disabled={saving || integration.status === 'DISCONNECTED'}
                      onClick={() => void previewIntegration(integration.id)}
                      className='h-9 rounded-lg border border-slate-300 px-3 text-sm font-semibold text-slate-700 disabled:opacity-50'
                    >
                      Preview
                    </button>
                    <button
                      type='button'
                      disabled={saving || integration.status === 'DISCONNECTED'}
                      onClick={() => void sync(integration.id)}
                      className='h-9 rounded-lg bg-slate-900 px-3 text-sm font-semibold text-white disabled:opacity-50'
                    >
                      Sync Now
                    </button>
                    <button
                      type='button'
                      disabled={saving || integration.status === 'DISCONNECTED'}
                      onClick={() => void disconnect(integration.id)}
                      className='inline-flex h-9 items-center gap-2 rounded-lg border border-red-200 px-3 text-sm font-semibold text-red-700 disabled:opacity-50'
                    >
                      <Trash2 className='size-4' /> Disconnect
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {preview ? (
        <section className='rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6'>
          <h2 className='text-lg font-semibold text-slate-950'>Normalized Preview</h2>
          <div className='mt-4 grid gap-3 sm:grid-cols-3'>
            <CountCard label='Performance samples' value={preview.performance.length} />
            <CountCard label='Crash groups' value={preview.crashes.length} />
            <CountCard label='Versions' value={preview.versions.length} />
          </div>
        </section>
      ) : null}
    </div>
  );
}

function CountCard({ label, value }: { label: string; value: number }) {
  return (
    <div className='rounded-xl bg-slate-50 p-4'>
      <p className='text-xs font-medium uppercase tracking-wide text-slate-400'>{label}</p>
      <p className='mt-1 text-2xl font-bold text-slate-950'>{value}</p>
    </div>
  );
}
