'use client';

import { connectMobileTelemetry, disconnectMobileTelemetry, getMobileTelemetryIntegration, syncMobileTelemetry } from './mobile-apps-api';
import { getErrorMessage } from '@/features/lib/api/api-error';
import type { MobileTelemetryIntegration, MobileTelemetryProvider } from '@command-center/shared-types';
import { Activity, RefreshCw, Unplug } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

interface Props {
  workspaceId: string;
  mobileAppId: string;
}

const PROVIDERS: MobileTelemetryProvider[] = ['FIREBASE', 'SENTRY', 'DATADOG', 'NEW_RELIC', 'CUSTOM'];

export function MobileTelemetrySettings({ workspaceId, mobileAppId }: Props) {
  const [integration, setIntegration] = useState<MobileTelemetryIntegration | null>(null);
  const [provider, setProvider] = useState<MobileTelemetryProvider>('SENTRY');
  const [externalProjectId, setExternalProjectId] = useState('');
  const [config, setConfig] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      setIntegration(await getMobileTelemetryIntegration(workspaceId, mobileAppId));
    } catch (loadError) {
      setError(getErrorMessage(loadError));
    } finally {
      setLoading(false);
    }
  }, [workspaceId, mobileAppId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setConfig({});
  }, [provider]);

  async function connect() {
    if (!externalProjectId.trim()) {
      setError('Project ID is required.');

      return;
    }

    setSaving(true);
    setError(null);

    try {
      await connectMobileTelemetry(workspaceId, mobileAppId, {
        provider,

        externalProjectId: externalProjectId.trim(),

        config,
      });

      /*
       * Never keep secrets in state
       * after successful submission.
       */

      setConfig({});

      await load();
    } catch (connectError) {
      setError(getErrorMessage(connectError));
    } finally {
      setSaving(false);
    }
  }

  async function sync() {
    setSaving(true);
    setError(null);

    try {
      await syncMobileTelemetry(workspaceId, mobileAppId);

      await load();
    } catch (syncError) {
      setError(getErrorMessage(syncError));
    } finally {
      setSaving(false);
    }
  }

  async function disconnect() {
    if (!window.confirm('Disconnect performance provider?')) {
      return;
    }

    setSaving(true);

    try {
      await disconnectMobileTelemetry(workspaceId, mobileAppId);

      await load();
    } catch (disconnectError) {
      setError(getErrorMessage(disconnectError));
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className='rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6'>
      <div className='flex items-start gap-3'>
        <div className='flex size-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600'>
          <Activity className='size-5' />
        </div>

        <div>
          <h2 className='font-semibold text-slate-950'>Performance Integration</h2>

          <p className='mt-1 text-sm text-slate-500'>Connect a runtime telemetry provider.</p>
        </div>
      </div>

      {error ? (
        <div role='alert' className='mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700'>
          {error}
        </div>
      ) : null}

      {loading ? <div className='mt-5 h-28 animate-pulse rounded-xl bg-slate-100' /> : null}

      {!loading && integration && integration.status !== 'DISCONNECTED' ? (
        <div className='mt-5 rounded-xl border border-slate-200 p-4'>
          <div className='grid gap-4 sm:grid-cols-3'>
            <Info label='Provider' value={formatEnum(integration.provider)} />

            <Info label='Status' value={integration.status} />

            <Info label='Last sync' value={integration.lastSyncedAt ? new Date(integration.lastSyncedAt).toLocaleString() : 'Never'} />
          </div>

          <p className='mt-4 text-sm text-slate-500'>Project: {integration.externalProjectId}</p>

          <div className='mt-4 flex flex-wrap gap-2'>
            <button type='button' disabled={saving} onClick={() => void sync()} className='inline-flex h-9 items-center gap-2 rounded-lg border border-slate-300 px-3 text-sm font-semibold'>
              <RefreshCw className='size-4' />
              Sync
            </button>

            <button type='button' disabled={saving} onClick={() => void disconnect()} className='inline-flex h-9 items-center gap-2 rounded-lg border border-red-200 px-3 text-sm font-semibold text-red-600'>
              <Unplug className='size-4' />
              Disconnect
            </button>
          </div>

          <p className='mt-4 text-xs text-slate-400'>Provider credentials are stored encrypted and are never returned to the browser.</p>
        </div>
      ) : null}

      {!loading && (!integration || integration.status === 'DISCONNECTED') ? (
        <div className='mt-5 space-y-4'>
          <label className='block'>
            <span className='mb-2 block text-sm font-medium'>Provider</span>

            <select aria-label='Telemetry provider' value={provider} onChange={(event) => setProvider(event.target.value as MobileTelemetryProvider)} className='h-10 w-full rounded-lg border border-slate-300 px-3'>
              {PROVIDERS.map((value) => (
                <option key={value} value={value}>
                  {formatEnum(value)}
                </option>
              ))}
            </select>
          </label>

          <label className='block'>
            <span className='mb-2 block text-sm font-medium'>External Project ID</span>

            <input aria-label='Telemetry project ID' value={externalProjectId} onChange={(event) => setExternalProjectId(event.target.value)} className='h-10 w-full rounded-lg border border-slate-300 px-3' />
          </label>

          <ProviderFields provider={provider} config={config} onChange={setConfig} />

          <button type='button' disabled={saving} onClick={() => void connect()} className='h-10 rounded-lg bg-brand-600 px-4 text-sm font-semibold text-white disabled:opacity-50'>
            Connect Provider
          </button>
        </div>
      ) : null}
    </section>
  );
}

function ProviderFields({
  provider,
  config,
  onChange,
}: {
  provider: MobileTelemetryProvider;

  config: Record<string, string>;

  onChange(value: Record<string, string>): void;
}) {
  const fields =
    provider === 'FIREBASE'
      ? [['serviceAccountJson', 'Service Account JSON']]
      : provider === 'SENTRY'
        ? [['authToken', 'Auth Token']]
        : provider === 'DATADOG'
          ? [
              ['apiKey', 'API Key'],

              ['appKey', 'Application Key'],
            ]
          : provider === 'NEW_RELIC'
            ? [['apiKey', 'API Key']]
            : [
                ['baseUrl', 'Base URL'],

                ['token', 'Token'],
              ];

  return (
    <div className='space-y-4'>
      {fields.map(([key, label]) => (
        <label key={key} className='block'>
          <span className='mb-2 block text-sm font-medium'>{label}</span>

          {key === 'serviceAccountJson' ? (
            <textarea
              aria-label={label}
              value={config[key ?? ''] ?? ''}
              onChange={(event) =>
                onChange({
                  ...config,

                  [key ?? '']: event.target.value,
                })
              }
              className='min-h-28 w-full rounded-lg border border-slate-300 p-3 font-mono text-xs'
            />
          ) : (
            <input
              aria-label={label}
              type={(key ?? '').toLowerCase().includes('key') || (key ?? '').toLowerCase().includes('token') ? 'password' : 'text'}
              autoComplete='off'
              value={config[key ?? ''] ?? ''}
              onChange={(event) =>
                onChange({
                  ...config,

                  [key ?? '']: event.target.value,
                })
              }
              className='h-10 w-full rounded-lg border border-slate-300 px-3'
            />
          )}
        </label>
      ))}
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className='text-xs uppercase text-slate-400'>{label}</p>

      <p className='mt-1 text-sm font-semibold'>{value}</p>
    </div>
  );
}

function formatEnum(value: string) {
  return value
    .replaceAll('_', ' ')
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}
