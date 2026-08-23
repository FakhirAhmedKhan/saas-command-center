'use client';

import { createMobileAlertRule, listMobileAlertIncidents, listMobileAlertRules, updateMobileAlertRule } from './mobile-apps-api';
import { getErrorMessage } from '@/features/lib/api/api-error';
import type { MobileAlertIncident, MobileAlertRule, MobileAlertRuleType } from '@command-center/shared-types';
import { BellRing, Plus } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

interface Props {
  workspaceId: string;
  mobileAppId: string;
}

export function MobileAlerts({ workspaceId, mobileAppId }: Props) {
  const [rules, setRules] = useState<MobileAlertRule[]>([]);

  const [incidents, setIncidents] = useState<MobileAlertIncident[]>([]);

  const [type, setType] = useState<MobileAlertRuleType>('CRASH_RATE');

  const [threshold, setThreshold] = useState('2');

  const [name, setName] = useState('Crash rate > 2%');

  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [ruleData, incidentData] = await Promise.all([listMobileAlertRules(workspaceId, mobileAppId), listMobileAlertIncidents(workspaceId, mobileAppId)]);

      setRules(ruleData);

      setIncidents(incidentData);
    } catch (loadError) {
      setError(getErrorMessage(loadError));
    }
  }, [workspaceId, mobileAppId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  async function create() {
    try {
      await createMobileAlertRule(workspaceId, mobileAppId, {
        name: name.trim(),

        type,

        threshold: type === 'BUILD_FAILED' ? null : Number(threshold),

        cooldownMinutes: 60,

        enabled: true,
      });

      await load();
    } catch (createError) {
      setError(getErrorMessage(createError));
    }
  }

  return (
    <div className='space-y-6'>
      <section className='rounded-2xl border bg-white p-5'>
        <div className='flex items-center gap-2'>
          <BellRing className='size-5' />

          <h2 className='font-semibold'>Create Alert</h2>
        </div>

        <div className='mt-4 grid gap-3 md:grid-cols-3'>
          <input aria-label='Alert name' value={name} onChange={(event) => setName(event.target.value)} className='h-10 rounded-lg border px-3' />

          <select
            aria-label='Alert type'
            value={type}
            onChange={(event) => setType(event.target.value as MobileAlertRuleType)}
            className='h-10 rounded-lg border px-3'
          >
            <option value='CRASH_RATE'>Crash Rate</option>

            <option value='ANR_HANG'>ANR/Hang</option>

            <option value='STARTUP'>Startup</option>

            <option value='API_FAILURE_RATE'>API Failure</option>

            <option value='BUILD_FAILED'>Build Failed</option>

            <option value='RELEASE_REGRESSION'>Release Regression</option>
          </select>

          {type !== 'BUILD_FAILED' ? (
            <input
              aria-label='Alert threshold'
              type='number'
              value={threshold}
              onChange={(event) => setThreshold(event.target.value)}
              className='h-10 rounded-lg border px-3'
            />
          ) : (
            <div />
          )}
        </div>

        <button
          type='button'
          onClick={() => void create()}
          className='mt-4 inline-flex h-10 items-center gap-2 rounded-lg bg-brand-600 px-4 font-semibold text-white'
        >
          <Plus className='size-4' />
          Create Alert
        </button>
      </section>

      {error ? (
        <div role='alert' className='rounded-xl bg-red-50 p-4 text-red-700'>
          {error}
        </div>
      ) : null}

      <section>
        <h2 className='font-semibold'>Rules</h2>

        <div className='mt-3 space-y-3'>
          {rules.map((rule) => (
            <div key={rule.id} className='flex items-center justify-between rounded-xl border bg-white p-4'>
              <div>
                <strong>{rule.name}</strong>

                <p className='text-sm text-slate-500'>
                  {rule.type}
                  {rule.threshold !== null ? ` â€¢ ${rule.threshold}` : ''}
                </p>
              </div>

              <button
                type='button'
                onClick={() =>
                  void updateMobileAlertRule(workspaceId, mobileAppId, rule.id, {
                    enabled: !rule.enabled,
                  }).then(load)
                }
                className='rounded-lg border px-3 py-2 text-sm'
              >
                {rule.enabled ? 'Disable' : 'Enable'}
              </button>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className='font-semibold'>Incidents</h2>

        <div className='mt-3 space-y-3'>
          {incidents.length === 0 ? (
            <div className='rounded-xl border border-dashed p-8 text-center'>No alert incidents.</div>
          ) : (
            incidents.map((incident) => (
              <div key={incident.id} className='rounded-xl border bg-white p-4'>
                <div className='flex justify-between gap-3'>
                  <strong>{incident.title}</strong>

                  <span>{incident.status}</span>
                </div>

                <p className='mt-2 text-sm text-slate-600'>{incident.message}</p>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
