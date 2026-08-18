/* eslint-disable react-hooks/set-state-in-effect */
'use client';

import { HealthStatusBadge } from './health-status-badge';
import {
  createHealthCheck,
  getHealthCheckHistory,
  getHealthChecks,
  getHealthIncidents,
  getMonitoringSummary,
  getMonitoringTargets,
  runHealthCheckNow,
  updateHealthCheck,
} from './monitoring-api';
import type {
  HealthCheck,
  HealthCheckHistory,
  HealthCheckStatus,
  HealthIncident,
  HealthTargetType,
  MonitoringSummary,
  MonitoringTarget,
  SaveHealthCheckInput,
} from './monitoring.types';
import { getErrorMessage } from '../applications/application-utils';
import { PageError } from '@/components/states/page-error';
import { ApiError } from '@/features/lib/api/api-error';
import { usePageVisibility } from '@/hooks/use-page-visibility';
import { EmptyState } from '@command-center/ui';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

interface MonitoringDashboardProps {
  workspaceId: string;
}

interface DashboardData {
  summary: MonitoringSummary;

  checks: HealthCheck[];

  incidents: HealthIncident[];

  targets: MonitoringTarget[];
}

interface HealthCheckFormState {
  targetType: HealthTargetType;

  targetId: string;

  name: string;

  url: string;

  intervalSeconds: number;

  timeoutMs: number;

  expectedStatusMin: number;

  expectedStatusMax: number;

  degradedAfterMs: number;

  failureThreshold: number;

  enabled: boolean;
}

const INITIAL_FORM: HealthCheckFormState = {
  targetType: 'APPLICATION',

  targetId: '',

  name: '',

  url: '',

  intervalSeconds: 300,

  timeoutMs: 10_000,

  expectedStatusMin: 200,

  expectedStatusMax: 399,

  degradedAfterMs: 1_500,

  failureThreshold: 3,

  enabled: true,
};

const numberFormatter = new Intl.NumberFormat('en-US');

function formatDateTime(value: string | null): string {
  if (!value) {
    return 'Never';
  }

  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',

    timeStyle: 'short',
  }).format(new Date(value));
}

function SummaryCard({
  label,
  value,
}: {
  label: string;

  value: number;
}) {
  return (
    <article className='rounded-xl border border-slate-200 bg-white p-3.5'>
      <p className='text-xs font-medium text-slate-500'>{label}</p>

      <p className='mt-1.5 text-xl font-semibold text-slate-950'>{numberFormatter.format(value)}</p>
    </article>
  );
}

function MonitoringForm({
  targets,
  editing,
  submitting,
  onCancel,
  onSave,
}: {
  targets: MonitoringTarget[];

  editing: HealthCheck | null;

  submitting: boolean;

  onCancel: () => void;

  onSave: (input: SaveHealthCheckInput) => Promise<void>;
}) {
  const [form, setForm] = useState<HealthCheckFormState>(INITIAL_FORM);

  useEffect(() => {
    if (!editing) {
      setForm(INITIAL_FORM);

      return;
    }

    setForm({
      targetType: editing.targetType,

      targetId: editing.targetId,

      name: editing.name,

      url: editing.url,

      intervalSeconds: editing.intervalSeconds,

      timeoutMs: editing.timeoutMs,

      expectedStatusMin: editing.expectedStatusMin,

      expectedStatusMax: editing.expectedStatusMax,

      degradedAfterMs: editing.degradedAfterMs,

      failureThreshold: editing.failureThreshold,

      enabled: editing.enabled,
    });
  }, [editing]);

  const filteredTargets = targets.filter((target) => target.type === form.targetType);

  async function submit(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();

    await onSave({
      targetType: form.targetType,

      applicationId: form.targetType === 'APPLICATION' ? form.targetId : undefined,

      websiteId: form.targetType === 'WEBSITE' ? form.targetId : undefined,

      name: form.name,

      url: form.url,

      intervalSeconds: form.intervalSeconds,

      timeoutMs: form.timeoutMs,

      expectedStatusMin: form.expectedStatusMin,

      expectedStatusMax: form.expectedStatusMax,

      degradedAfterMs: form.degradedAfterMs,

      failureThreshold: form.failureThreshold,

      enabled: form.enabled,
    });
  }

  return (
    <form onSubmit={submit} className='rounded-2xl border border-slate-200 bg-white p-5 shadow-sm'>
      <div className='flex items-start justify-between gap-4'>
        <div>
          <h2 className='font-semibold text-slate-950'>{editing ? 'Edit health check' : 'Add health check'}</h2>

          <p className='mt-1 text-sm text-slate-600'>Only public HTTP and HTTPS destinations are allowed.</p>
        </div>

        <button type='button' onClick={onCancel} className='text-sm font-medium text-slate-500 hover:text-slate-950'>
          Cancel
        </button>
      </div>

      <div className='mt-5 grid gap-4 md:grid-cols-2'>
        <label>
          <span className='text-sm font-medium'>Target type</span>

          <select
            value={form.targetType}
            onChange={(event) => {
              setForm((current) => ({
                ...current,

                targetType: event.target.value as HealthTargetType,

                targetId: '',
              }));
            }}
            className='mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2'
          >
            <option value='APPLICATION'>Application</option>

            <option value='WEBSITE'>Website</option>
          </select>
        </label>

        <label>
          <span className='text-sm font-medium'>Target</span>

          <select
            required
            value={form.targetId}
            onChange={(event) => {
              setForm((current) => ({
                ...current,

                targetId: event.target.value,
              }));
            }}
            className='mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2'
          >
            <option value=''>Select target</option>

            {filteredTargets.map((target) => (
              <option key={target.id} value={target.id}>
                {target.name}
                {target.subtitle ? ` â€” ${target.subtitle}` : ''}
              </option>
            ))}
          </select>
        </label>

        <label>
          <span className='text-sm font-medium'>Check name</span>

          <input
            required
            maxLength={100}
            value={form.name}
            onChange={(event) => {
              setForm((current) => ({
                ...current,

                name: event.target.value,
              }));
            }}
            className='mt-1 w-full rounded-lg border border-slate-300 px-3 py-2'
            placeholder='Production API'
          />
        </label>

        <label>
          <span className='text-sm font-medium'>Health URL</span>

          <input
            required
            type='url'
            value={form.url}
            onChange={(event) => {
              setForm((current) => ({
                ...current,

                url: event.target.value,
              }));
            }}
            className='mt-1 w-full rounded-lg border border-slate-300 px-3 py-2'
            placeholder='https://api.example.com/health'
          />
        </label>

        <label>
          <span className='text-sm font-medium'>Interval seconds</span>

          <input
            required
            type='number'
            min={60}
            max={86_400}
            value={form.intervalSeconds}
            onChange={(event) => {
              setForm((current) => ({
                ...current,

                intervalSeconds: Number(event.target.value),
              }));
            }}
            className='mt-1 w-full rounded-lg border border-slate-300 px-3 py-2'
          />
        </label>

        <label>
          <span className='text-sm font-medium'>Timeout milliseconds</span>

          <input
            required
            type='number'
            min={1_000}
            max={30_000}
            value={form.timeoutMs}
            onChange={(event) => {
              setForm((current) => ({
                ...current,

                timeoutMs: Number(event.target.value),
              }));
            }}
            className='mt-1 w-full rounded-lg border border-slate-300 px-3 py-2'
          />
        </label>

        <label>
          <span className='text-sm font-medium'>Expected status minimum</span>

          <input
            required
            type='number'
            min={100}
            max={599}
            value={form.expectedStatusMin}
            onChange={(event) => {
              setForm((current) => ({
                ...current,

                expectedStatusMin: Number(event.target.value),
              }));
            }}
            className='mt-1 w-full rounded-lg border border-slate-300 px-3 py-2'
          />
        </label>

        <label>
          <span className='text-sm font-medium'>Expected status maximum</span>

          <input
            required
            type='number'
            min={100}
            max={599}
            value={form.expectedStatusMax}
            onChange={(event) => {
              setForm((current) => ({
                ...current,

                expectedStatusMax: Number(event.target.value),
              }));
            }}
            className='mt-1 w-full rounded-lg border border-slate-300 px-3 py-2'
          />
        </label>

        <label>
          <span className='text-sm font-medium'>Degraded after milliseconds</span>

          <input
            required
            type='number'
            min={1}
            max={30_000}
            value={form.degradedAfterMs}
            onChange={(event) => {
              setForm((current) => ({
                ...current,

                degradedAfterMs: Number(event.target.value),
              }));
            }}
            className='mt-1 w-full rounded-lg border border-slate-300 px-3 py-2'
          />
        </label>

        <label>
          <span className='text-sm font-medium'>Failures before incident</span>

          <input
            required
            type='number'
            min={1}
            max={20}
            value={form.failureThreshold}
            onChange={(event) => {
              setForm((current) => ({
                ...current,

                failureThreshold: Number(event.target.value),
              }));
            }}
            className='mt-1 w-full rounded-lg border border-slate-300 px-3 py-2'
          />
        </label>
      </div>

      <label className='mt-4 flex items-center gap-2 text-sm font-medium'>
        <input
          type='checkbox'
          checked={form.enabled}
          onChange={(event) => {
            setForm((current) => ({
              ...current,

              enabled: event.target.checked,
            }));
          }}
        />
        Monitoring enabled
      </label>

      <button type='submit' disabled={submitting} className='mt-5 rounded-lg bg-slate-950 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50'>
        {submitting ? 'Savingâ€¦' : editing ? 'Save changes' : 'Create health check'}
      </button>
    </form>
  );
}

export function MonitoringDashboard({ workspaceId }: MonitoringDashboardProps) {
  const [data, setData] = useState<DashboardData | null>(null);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState<unknown>(null);

  const [statusFilter, setStatusFilter] = useState<HealthCheckStatus | 'ALL'>('ALL');

  const [targetFilter, setTargetFilter] = useState<HealthTargetType | 'ALL'>('ALL');

  const [showForm, setShowForm] = useState(false);

  const [editing, setEditing] = useState<HealthCheck | null>(null);

  const [selectedCheck, setSelectedCheck] = useState<HealthCheck | null>(null);

  const [history, setHistory] = useState<HealthCheckHistory[]>([]);

  const [historyLoading, setHistoryLoading] = useState(false);

  const [submitting, setSubmitting] = useState(false);

  const [actionError, setActionError] = useState<string | null>(null);

  const controllerRef = useRef<AbortController | null>(null);

  const visible = usePageVisibility();

  const load = useCallback(async () => {
    controllerRef.current?.abort();

    const controller = new AbortController();

    controllerRef.current = controller;

    setLoading(true);

    setError(null);

    try {
      const [summary, checks, incidents, targets] = await Promise.all([
        getMonitoringSummary(workspaceId, controller.signal),

        getHealthChecks(workspaceId, controller.signal),

        getHealthIncidents(workspaceId, controller.signal),

        getMonitoringTargets(workspaceId, controller.signal),
      ]);

      if (controller.signal.aborted) {
        return;
      }

      setData({
        summary,
        checks,
        incidents,
        targets,
      });
    } catch (caughtError) {
      if (controller.signal.aborted) {
        return;
      }

      setError(caughtError);
    } finally {
      if (!controller.signal.aborted) {
        setLoading(false);
      }
    }
  }, [workspaceId]);

  useEffect(() => {
    void load();

    return () => {
      controllerRef.current?.abort();
    };
  }, [load]);

  useEffect(() => {
    if (!visible) {
      return;
    }

    const timer = window.setInterval(() => {
      void load();
    }, 30_000);

    return () => {
      window.clearInterval(timer);
    };
  }, [load, visible]);

  const filteredChecks = useMemo(
    () =>
      (data?.checks ?? []).filter(
        (check) => (statusFilter === 'ALL' || check.latestStatus === statusFilter) && (targetFilter === 'ALL' || check.targetType === targetFilter),
      ),
    [data, statusFilter, targetFilter],
  );

  async function saveCheck(input: SaveHealthCheckInput): Promise<void> {
    setSubmitting(true);

    setActionError(null);

    try {
      if (editing) {
        await updateHealthCheck(workspaceId, editing.id, input);
      } else {
        await createHealthCheck(workspaceId, input);
      }

      setEditing(null);

      setShowForm(false);

      await load();
    } catch (caughtError) {
      setActionError(getErrorMessage(caughtError));
    } finally {
      setSubmitting(false);
    }
  }

  async function showHistory(check: HealthCheck): Promise<void> {
    setSelectedCheck(check);

    setHistoryLoading(true);

    try {
      setHistory(await getHealthCheckHistory(workspaceId, check.id));
    } finally {
      setHistoryLoading(false);
    }
  }

  async function runNow(check: HealthCheck): Promise<void> {
    setActionError(null);

    try {
      await runHealthCheckNow(workspaceId, check.id);

      await load();
    } catch (caughtError) {
      setActionError(getErrorMessage(caughtError));
    }
  }

  async function toggleEnabled(check: HealthCheck): Promise<void> {
    try {
      await updateHealthCheck(workspaceId, check.id, {
        enabled: !check.enabled,
      });

      await load();
    } catch (caughtError) {
      setActionError(getErrorMessage(caughtError));
    }
  }

  if (loading && !data) {
    return (
      <div className='space-y-5'>
        <div className='h-24 animate-pulse rounded-2xl bg-slate-200' />

        <div className='grid gap-4 sm:grid-cols-2 xl:grid-cols-6'>
          {Array.from({
            length: 6,
          }).map((_item, index) => (
            <div key={index} className='h-28 animate-pulse rounded-2xl bg-slate-200' />
          ))}
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <PageError
        title='Monitoring unavailable'
        message={getErrorMessage(error)}
        requestId={error instanceof ApiError ? error.requestId : undefined}
        onRetry={() => {
          void load();
        }}
      />
    );
  }

  return (
    <main className='mx-auto w-full max-w-[1600px] space-y-5 p-4 sm:p-6 lg:p-8'>
      <header className='flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between'>
        <div>
          <h1 className='text-[26px] font-semibold tracking-tight text-slate-950'>Monitoring</h1>

          <p className='mt-1 text-sm leading-6 text-slate-500'>Application and website availability, response times and incidents.</p>
        </div>

        {data.summary.canManage ? (
          <button
            type='button'
            onClick={() => {
              setEditing(null);

              setShowForm(true);
            }}
            className='inline-flex h-9 shrink-0 items-center justify-center rounded-lg bg-brand-600 px-3.5 text-sm font-semibold text-white transition hover:bg-brand-700'
          >
            Add health check
          </button>
        ) : null}
      </header>

      <section className='grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7'>
        <SummaryCard label='Total' value={data.summary.total} />

        <SummaryCard label='Healthy' value={data.summary.healthy} />

        <SummaryCard label='Degraded' value={data.summary.degraded} />

        <SummaryCard label='Down' value={data.summary.down} />

        <SummaryCard label='Unknown' value={data.summary.unknown} />

        <SummaryCard label='Disabled' value={data.summary.disabled} />

        <SummaryCard label='Incidents' value={data.summary.activeIncidents} />
      </section>

      {actionError ? (
        <div role='alert' className='rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800'>
          {actionError}
        </div>
      ) : null}

      {showForm ? (
        <MonitoringForm
          targets={data.targets}
          editing={editing}
          submitting={submitting}
          onCancel={() => {
            setShowForm(false);

            setEditing(null);
          }}
          onSave={saveCheck}
        />
      ) : null}

      <section className='rounded-2xl border border-slate-200 bg-white p-4 shadow-sm'>
        <div className='grid gap-3 sm:grid-cols-2'>
          <label>
            <span className='text-xs font-medium uppercase tracking-wide text-slate-500'>Status</span>

            <select
              value={statusFilter}
              onChange={(event) => {
                setStatusFilter(event.target.value as HealthCheckStatus | 'ALL');
              }}
              className='mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2'
            >
              <option value='ALL'>All statuses</option>

              <option value='HEALTHY'>Healthy</option>

              <option value='DEGRADED'>Degraded</option>

              <option value='DOWN'>Down</option>

              <option value='UNKNOWN'>Unknown</option>

              <option value='DISABLED'>Disabled</option>
            </select>
          </label>

          <label>
            <span className='text-xs font-medium uppercase tracking-wide text-slate-500'>Target type</span>

            <select
              value={targetFilter}
              onChange={(event) => {
                setTargetFilter(event.target.value as HealthTargetType | 'ALL');
              }}
              className='mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2'
            >
              <option value='ALL'>All targets</option>

              <option value='APPLICATION'>Applications</option>

              <option value='WEBSITE'>Websites</option>
            </select>
          </label>
        </div>
      </section>

      {data.checks.length === 0 ? (
        <EmptyState
          title='Monitoring is not configured'
          description='Add a health check to begin tracking application or website availability.'
          icon={undefined}
        />
      ) : filteredChecks.length === 0 ? (
        <EmptyState title='No matching health checks' description='No health checks match the selected filters.' icon={undefined} />
      ) : (
        <section className='grid gap-4 lg:grid-cols-2'>
          {filteredChecks.map((check) => (
            <article key={check.id} className='rounded-2xl border border-slate-200 bg-white p-5 shadow-sm'>
              <div className='flex items-start justify-between gap-4'>
                <div className='min-w-0'>
                  <p className='text-xs font-medium uppercase tracking-wide text-slate-500'>
                    {check.targetType}
                    {' Â· '}
                    {check.targetName}
                  </p>

                  <h2 className='mt-1 truncate text-lg font-semibold text-slate-950'>{check.name}</h2>

                  <p title={check.url} className='mt-1 truncate text-sm text-slate-500'>
                    {check.url}
                  </p>
                </div>

                <HealthStatusBadge status={check.latestStatus} />
              </div>

              <dl className='mt-5 grid grid-cols-2 gap-4 text-sm'>
                <div>
                  <dt className='text-slate-500'>Response</dt>

                  <dd className='mt-1 font-semibold text-slate-900'>{check.lastResponseTimeMs !== null ? `${check.lastResponseTimeMs}ms` : 'â€”'}</dd>
                </div>

                <div>
                  <dt className='text-slate-500'>HTTP status</dt>

                  <dd className='mt-1 font-semibold text-slate-900'>{check.lastStatusCode ?? 'â€”'}</dd>
                </div>

                <div>
                  <dt className='text-slate-500'>Last checked</dt>

                  <dd className='mt-1 font-semibold text-slate-900'>{formatDateTime(check.lastCheckedAt)}</dd>
                </div>

                <div>
                  <dt className='text-slate-500'>Failures</dt>

                  <dd className='mt-1 font-semibold text-slate-900'>
                    {check.consecutiveFailures}/{check.failureThreshold}
                  </dd>
                </div>
              </dl>

              {check.lastFailureReason ? <p className='mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-800'>{check.lastFailureReason}</p> : null}

              <div className='mt-5 flex flex-wrap gap-2'>
                <button
                  type='button'
                  onClick={() => {
                    void showHistory(check);
                  }}
                  className='rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium'
                >
                  History
                </button>

                {data.summary.canManage ? (
                  <>
                    <button
                      type='button'
                      onClick={() => {
                        void runNow(check);
                      }}
                      disabled={!check.enabled}
                      className='rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium disabled:opacity-50'
                    >
                      Run now
                    </button>

                    <button
                      type='button'
                      onClick={() => {
                        setEditing(check);

                        setShowForm(true);
                      }}
                      className='rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium'
                    >
                      Edit
                    </button>

                    <button
                      type='button'
                      onClick={() => {
                        void toggleEnabled(check);
                      }}
                      className='rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium'
                    >
                      {check.enabled ? 'Disable' : 'Enable'}
                    </button>
                  </>
                ) : null}
              </div>
            </article>
          ))}
        </section>
      )}

      <section className='overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm'>
        <div className='border-b border-slate-200 px-5 py-4'>
          <h2 className='font-semibold text-slate-950'>Incident timeline</h2>
        </div>

        {data.incidents.length === 0 ? (
          <p className='p-5 text-sm text-slate-500'>No monitoring incidents have been recorded.</p>
        ) : (
          <div className='divide-y divide-slate-100'>
            {data.incidents.map((incident) => (
              <article key={incident.id} className='p-5'>
                <div className='flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between'>
                  <div>
                    <p className='font-semibold text-slate-950'>{incident.healthCheckName}</p>

                    <p className='mt-1 text-sm text-slate-500'>{incident.targetName}</p>
                  </div>

                  <span
                    className={
                      incident.status === 'OPEN'
                        ? 'rounded-full bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700'
                        : 'rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700'
                    }
                  >
                    {incident.status}
                  </span>
                </div>

                <p className='mt-3 text-sm text-slate-700'>{incident.summary}</p>

                <div className='mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-slate-500'>
                  <span>Started: {formatDateTime(incident.startedAt)}</span>

                  <span>Failures: {incident.failureCount}</span>

                  {incident.resolvedAt ? <span>Recovered: {formatDateTime(incident.resolvedAt)}</span> : null}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {selectedCheck ? (
        <section className='rounded-2xl border border-slate-200 bg-white p-5 shadow-sm'>
          <div className='flex items-start justify-between gap-4'>
            <div>
              <h2 className='font-semibold text-slate-950'>{selectedCheck.name} history</h2>

              <p className='mt-1 text-sm text-slate-500'>Last 100 checks</p>
            </div>

            <button
              type='button'
              onClick={() => {
                setSelectedCheck(null);

                setHistory([]);
              }}
              className='text-sm font-medium text-slate-500'
            >
              Close
            </button>
          </div>

          {historyLoading ? (
            <div className='mt-5 h-40 animate-pulse rounded-xl bg-slate-200' />
          ) : history.length === 0 ? (
            <p className='mt-5 text-sm text-slate-500'>No health-check history is available.</p>
          ) : (
            <div className='mt-5 overflow-x-auto'>
              <table className='min-w-[750px] w-full text-sm'>
                <thead>
                  <tr className='border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500'>
                    <th className='px-3 py-3'>Status</th>

                    <th className='px-3 py-3'>Checked</th>

                    <th className='px-3 py-3 text-right'>HTTP</th>

                    <th className='px-3 py-3 text-right'>Response</th>

                    <th className='px-3 py-3'>Reason</th>
                  </tr>
                </thead>

                <tbody>
                  {history.map((item) => (
                    <tr key={item.id} className='border-b border-slate-100'>
                      <td className='px-3 py-3'>
                        <HealthStatusBadge status={item.status} />
                      </td>

                      <td className='px-3 py-3'>{formatDateTime(item.checkedAt)}</td>

                      <td className='px-3 py-3 text-right'>{item.statusCode ?? 'â€”'}</td>

                      <td className='px-3 py-3 text-right'>{item.responseTimeMs !== null ? `${item.responseTimeMs}ms` : 'â€”'}</td>

                      <td className='max-w-sm px-3 py-3 text-slate-600'>{item.failureReason ?? 'â€”'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      ) : null}
    </main>
  );
}
