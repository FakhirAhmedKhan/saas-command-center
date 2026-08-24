'use client';

import {
  createDesktopAlertRule,
  deleteDesktopAlertRule,
  evaluateDesktopAlerts,
  getDesktopPermissions,
  listDesktopAlertIncidents,
  listDesktopAlertRules,
  updateDesktopAlertRule,
} from './desktop-apps-api';
import { DesktopPermissionGate } from './desktop-permission-gate';
import { getErrorMessage } from '@/features/lib/api/api-error';
import type { DesktopAlertIncident, DesktopAlertRule, DesktopAlertRuleType, DesktopPermissions } from '@command-center/shared-types';
import { BellRing, RefreshCcw, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';

interface Props {
  workspaceId: string;
  desktopAppId: string;
}

const TYPES: Array<{
  value: DesktopAlertRuleType;
  label: string;
  threshold: boolean;
  defaultThreshold: string;
}> = [
  {
    value: 'BUILD_FAILED',
    label: 'Build failed',
    threshold: false,
    defaultThreshold: '',
  },
  {
    value: 'CRASH_RATE',
    label: 'Crash rate',
    threshold: true,
    defaultThreshold: '2',
  },
  {
    value: 'STARTUP',
    label: 'Startup time',
    threshold: true,
    defaultThreshold: '1500',
  },
  {
    value: 'MEMORY',
    label: 'Memory usage',
    threshold: true,
    defaultThreshold: '800',
  },
  {
    value: 'CPU',
    label: 'CPU usage',
    threshold: true,
    defaultThreshold: '80',
  },
  {
    value: 'RELEASE_REGRESSION',
    label: 'Release regression',
    threshold: true,
    defaultThreshold: '20',
  },
  {
    value: 'SIGNING_FAILURE',
    label: 'Signing failure',
    threshold: false,
    defaultThreshold: '',
  },
  {
    value: 'TELEMETRY_UNAVAILABLE',
    label: 'Telemetry unavailable',
    threshold: false,
    defaultThreshold: '',
  },
];

function incidentTone(status: DesktopAlertIncident['status']) {
  return status === 'OPEN' ? 'border-red-200 bg-red-50 text-red-800' : 'border-emerald-200 bg-emerald-50 text-emerald-800';
}

export function DesktopAlerts({ workspaceId, desktopAppId }: Props) {
  const [rules, setRules] = useState<DesktopAlertRule[]>([]);
  const [incidents, setIncidents] = useState<DesktopAlertIncident[]>([]);
  const [permissions, setPermissions] = useState<DesktopPermissions | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [evaluating, setEvaluating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState('Crash rate above 2%');
  const [type, setType] = useState<DesktopAlertRuleType>('CRASH_RATE');
  const [threshold, setThreshold] = useState('2');
  const [cooldownMinutes, setCooldownMinutes] = useState('60');

  const selected = useMemo(() => TYPES.find((candidate) => candidate.value === type) ?? TYPES[0]!, [type]);

  const load = useCallback(async () => {
    try {
      const [ruleData, incidentData, permissionData] = await Promise.all([
        listDesktopAlertRules(workspaceId, desktopAppId),
        listDesktopAlertIncidents(workspaceId, desktopAppId),
        getDesktopPermissions(workspaceId, desktopAppId),
      ]);

      setRules(ruleData);
      setIncidents(incidentData);
      setPermissions(permissionData);
    } catch (loadError) {
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

  async function createRule() {
    if (!name.trim()) {
      setError('Alert name is required.');
      return;
    }

    if (selected.threshold) {
      const number = Number(threshold);

      if (!Number.isFinite(number)) {
        setError('A valid threshold is required.');
        return;
      }
    }

    setSaving(true);
    setError(null);

    try {
      await createDesktopAlertRule(workspaceId, desktopAppId, {
        name: name.trim(),
        type,
        threshold: selected.threshold ? Number(threshold) : null,
        cooldownMinutes: Number(cooldownMinutes),
        enabled: true,
      });

      await load();
    } catch (createError) {
      setError(getErrorMessage(createError));
    } finally {
      setSaving(false);
    }
  }

  async function setEnabled(rule: DesktopAlertRule, enabled: boolean) {
    setError(null);

    try {
      await updateDesktopAlertRule(workspaceId, desktopAppId, rule.id, { enabled });
      await load();
    } catch (updateError) {
      setError(getErrorMessage(updateError));
    }
  }

  async function remove(ruleId: string) {
    setError(null);

    try {
      await deleteDesktopAlertRule(workspaceId, desktopAppId, ruleId);
      await load();
    } catch (deleteError) {
      setError(getErrorMessage(deleteError));
    }
  }

  async function evaluate() {
    setEvaluating(true);
    setError(null);

    try {
      await evaluateDesktopAlerts(workspaceId, desktopAppId);
      await load();
    } catch (evaluateError) {
      setError(getErrorMessage(evaluateError));
    } finally {
      setEvaluating(false);
    }
  }

  if (loading) {
    return (
      <div className='rounded-2xl border bg-white p-6 text-sm text-slate-500' data-testid='desktop-alerts-loading'>
        Loading desktop alerts…
      </div>
    );
  }

  return (
    <div className='space-y-6'>
      <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
        <div>
          <div className='flex items-center gap-2'>
            <BellRing className='size-5' aria-hidden='true' />
            <h1 className='text-xl font-semibold'>Desktop Alerts</h1>
          </div>
          <p className='mt-1 text-sm text-slate-500'>Build, runtime, release, signing, and telemetry alert rules.</p>
        </div>

        <DesktopPermissionGate permissions={permissions} require='write'>
          <button
            type='button'
            onClick={() => void evaluate()}
            disabled={evaluating}
            className='inline-flex h-10 items-center justify-center gap-2 rounded-lg border px-3 text-sm font-medium disabled:opacity-50'
          >
            <RefreshCcw className='size-4' aria-hidden='true' />
            {evaluating ? 'Evaluating…' : 'Evaluate now'}
          </button>
        </DesktopPermissionGate>
      </div>

      {error ? (
        <div role='alert' className='rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800'>
          {error}
        </div>
      ) : null}

      <DesktopPermissionGate permissions={permissions} require='write'>
        <section className='rounded-2xl border bg-white p-5'>
          <h2 className='font-semibold'>Create alert rule</h2>

          <div className='mt-4 grid gap-3 lg:grid-cols-4'>
            <label className='space-y-1 text-sm'>
              <span>Name</span>
              <input aria-label='Alert name' value={name} onChange={(event) => setName(event.target.value)} className='h-10 w-full rounded-lg border px-3' />
            </label>

            <label className='space-y-1 text-sm'>
              <span>Type</span>
              <select
                aria-label='Alert type'
                value={type}
                onChange={(event) => {
                  const value = event.target.value as DesktopAlertRuleType;
                  const next = TYPES.find((item) => item.value === value);
                  setType(value);
                  setThreshold(next?.defaultThreshold ?? '');
                  setName(next?.label ?? 'Desktop alert');
                }}
                className='h-10 w-full rounded-lg border px-3'
              >
                {TYPES.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>

            <label className='space-y-1 text-sm'>
              <span>Threshold</span>
              <input
                aria-label='Alert threshold'
                type='number'
                value={threshold}
                disabled={!selected.threshold}
                onChange={(event) => setThreshold(event.target.value)}
                className='h-10 w-full rounded-lg border px-3 disabled:bg-slate-50'
              />
            </label>

            <label className='space-y-1 text-sm'>
              <span>Cooldown (minutes)</span>
              <input
                aria-label='Cooldown minutes'
                type='number'
                min='1'
                max='10080'
                value={cooldownMinutes}
                onChange={(event) => setCooldownMinutes(event.target.value)}
                className='h-10 w-full rounded-lg border px-3'
              />
            </label>
          </div>

          <button
            type='button'
            onClick={() => void createRule()}
            disabled={saving}
            className='mt-4 h-10 rounded-lg bg-slate-950 px-4 text-sm font-medium text-white disabled:opacity-50'
          >
            {saving ? 'Saving…' : 'Create alert'}
          </button>
        </section>
      </DesktopPermissionGate>

      <section className='rounded-2xl border bg-white p-5'>
        <h2 className='font-semibold'>Rules</h2>

        {rules.length === 0 ? (
          <p className='mt-4 text-sm text-slate-500' data-testid='desktop-alerts-empty'>
            No desktop alert rules yet.
          </p>
        ) : (
          <div className='mt-4 divide-y'>
            {rules.map((rule) => (
              <div key={rule.id} className='flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between'>
                <div>
                  <p className='font-medium'>{rule.name}</p>
                  <p className='text-sm text-slate-500'>
                    {rule.type}
                    {rule.threshold === null ? '' : ` · threshold ${rule.threshold}`}
                    {` · ${rule.cooldownMinutes}m cooldown`}
                  </p>
                </div>

                <DesktopPermissionGate permissions={permissions} require='write'>
                  <div className='flex items-center gap-2'>
                    <button
                      type='button'
                      aria-label={`${rule.enabled ? 'Disable' : 'Enable'} ${rule.name}`}
                      onClick={() => void setEnabled(rule, !rule.enabled)}
                      className='h-9 rounded-lg border px-3 text-sm'
                    >
                      {rule.enabled ? 'Disable' : 'Enable'}
                    </button>

                    <DesktopPermissionGate permissions={permissions} require='manage'>
                      <button
                        type='button'
                        aria-label={`Delete ${rule.name}`}
                        onClick={() => void remove(rule.id)}
                        className='inline-flex size-9 items-center justify-center rounded-lg border'
                      >
                        <Trash2 className='size-4' aria-hidden='true' />
                      </button>
                    </DesktopPermissionGate>
                  </div>
                </DesktopPermissionGate>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className='rounded-2xl border bg-white p-5'>
        <h2 className='font-semibold'>Incidents</h2>

        {incidents.length === 0 ? (
          <p className='mt-4 text-sm text-slate-500'>No alert incidents.</p>
        ) : (
          <div className='mt-4 space-y-3'>
            {incidents.map((incident) => (
              <article key={incident.id} className='rounded-xl border p-4'>
                <div className='flex flex-wrap items-center gap-2'>
                  <span className={`rounded-full border px-2 py-0.5 text-xs font-medium ${incidentTone(incident.status)}`}>{incident.status}</span>
                  <span className='font-medium'>{incident.title}</span>
                </div>

                <p className='mt-2 text-sm text-slate-600'>{incident.message}</p>
                <p className='mt-2 text-xs text-slate-400'>
                  Triggered {new Date(incident.triggeredAt).toLocaleString()}
                  {incident.resolvedAt ? ` · resolved ${new Date(incident.resolvedAt).toLocaleString()}` : ''}
                </p>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
