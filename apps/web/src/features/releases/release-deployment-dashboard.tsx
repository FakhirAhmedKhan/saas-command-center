/* eslint-disable react-hooks/set-state-in-effect */
'use client';

import { DeploymentStatusBadge } from './deployment-status-badge';
import {
  createDeployment,
  createRelease,
  getCurrentVersions,
  getDeployments,
  getReleaseOptions,
  getReleases,
  transitionDeployment,
} from './release-management-api';
import type { CurrentEnvironmentVersion, Deployment, DeploymentOptions, DeploymentStatus, Release } from './release-management.types';
import { getErrorMessage } from '../applications/application-utils';
import { PageError } from '@/components/states/page-error';
import { ApiError } from '@/features/lib/api/api-error';
import { EmptyState } from '@command-center/ui';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

interface DashboardProps {
  workspaceId: string;

  applicationId: string;
}

interface DashboardData {
  options: DeploymentOptions;

  releases: Release[];

  deployments: Deployment[];

  currentVersions: CurrentEnvironmentVersion[];
}

const STATUS_OPTIONS: DeploymentStatus[] = ['DRAFT', 'SCHEDULED', 'IN_PROGRESS', 'SUCCESSFUL', 'FAILED', 'ROLLED_BACK'];

function formatDateTime(value: string | null): string {
  if (!value) {
    return 'â€”';
  }

  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

function formatDuration(durationMs: number | null): string {
  if (durationMs === null) {
    return 'â€”';
  }

  const totalSeconds = Math.round(durationMs / 1_000);

  if (totalSeconds < 60) {
    return `${totalSeconds}s`;
  }

  const minutes = Math.floor(totalSeconds / 60);

  const seconds = totalSeconds % 60;

  return `${minutes}m ${seconds}s`;
}

function ReleaseForm({
  submitting,
  onSave,
  onCancel,
}: {
  submitting: boolean;

  onSave: (input: { version: string; name?: string; notes?: string; commitRef?: string; repositoryUrl?: string; scheduledAt?: string }) => Promise<void>;

  onCancel: () => void;
}) {
  const [version, setVersion] = useState('');

  const [name, setName] = useState('');

  const [notes, setNotes] = useState('');

  const [commitRef, setCommitRef] = useState('');

  const [repositoryUrl, setRepositoryUrl] = useState('');

  const [scheduledAt, setScheduledAt] = useState('');

  return (
    <form
      className='rounded-2xl border border-slate-200 bg-white p-5 shadow-sm'
      onSubmit={(event) => {
        event.preventDefault();

        void onSave({
          version,

          name: name || undefined,
          notes: notes || undefined,
          commitRef: commitRef || undefined,
          repositoryUrl: repositoryUrl || undefined,
          scheduledAt: scheduledAt ? new Date(scheduledAt).toISOString() : undefined,
        });
      }}
    >
      <div className='flex items-start justify-between gap-4'>
        <div>
          <h2 className='font-semibold text-slate-950'>Create release</h2>

          <p className='mt-1 text-sm text-slate-600'>Create the version before deploying it to an environment.</p>
        </div>

        <button type='button' onClick={onCancel} className='text-sm font-medium text-slate-500'>
          Cancel
        </button>
      </div>

      <div className='mt-5 grid gap-4 md:grid-cols-2'>
        <label>
          <span className='text-sm font-medium'>Version</span>

          <input
            required
            value={version}
            onChange={(event) => {
              setVersion(event.target.value);
            }}
            placeholder='1.4.0'
            className='mt-1 w-full rounded-lg border border-slate-300 px-3 py-2'
          />
        </label>

        <label>
          <span className='text-sm font-medium'>Release name</span>

          <input
            value={name}
            onChange={(event) => {
              setName(event.target.value);
            }}
            placeholder='August release'
            className='mt-1 w-full rounded-lg border border-slate-300 px-3 py-2'
          />
        </label>

        <label>
          <span className='text-sm font-medium'>Commit reference</span>

          <input
            value={commitRef}
            onChange={(event) => {
              setCommitRef(event.target.value);
            }}
            placeholder='a8f21d4'
            className='mt-1 w-full rounded-lg border border-slate-300 px-3 py-2'
          />
        </label>

        <label>
          <span className='text-sm font-medium'>Repository URL</span>

          <input
            type='url'
            value={repositoryUrl}
            onChange={(event) => {
              setRepositoryUrl(event.target.value);
            }}
            className='mt-1 w-full rounded-lg border border-slate-300 px-3 py-2'
          />
        </label>

        <label>
          <span className='text-sm font-medium'>Scheduled time</span>

          <input
            type='datetime-local'
            value={scheduledAt}
            onChange={(event) => {
              setScheduledAt(event.target.value);
            }}
            className='mt-1 w-full rounded-lg border border-slate-300 px-3 py-2'
          />
        </label>

        <label className='md:col-span-2'>
          <span className='text-sm font-medium'>Release notes</span>

          <textarea
            rows={5}
            value={notes}
            onChange={(event) => {
              setNotes(event.target.value);
            }}
            className='mt-1 w-full rounded-lg border border-slate-300 px-3 py-2'
          />
        </label>
      </div>

      <button type='submit' disabled={submitting} className='mt-5 rounded-lg bg-slate-950 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50'>
        {submitting ? 'Creatingâ€¦' : 'Create release'}
      </button>
    </form>
  );
}

function DeploymentForm({
  releases,
  options,
  submitting,
  onSave,
  onCancel,
}: {
  releases: Release[];

  options: DeploymentOptions;

  submitting: boolean;

  onSave: (input: {
    releaseId: string;
    environmentId: string;
    ciJobUrl?: string;
    liveUrl?: string;
    deploymentNotes?: string;
    healthIncidentId?: string;
  }) => Promise<void>;

  onCancel: () => void;
}) {
  const [releaseId, setReleaseId] = useState('');

  const [environmentId, setEnvironmentId] = useState('');

  const [ciJobUrl, setCiJobUrl] = useState('');

  const [liveUrl, setLiveUrl] = useState('');

  const [deploymentNotes, setDeploymentNotes] = useState('');

  const [healthIncidentId, setHealthIncidentId] = useState('');

  return (
    <form
      className='rounded-2xl border border-slate-200 bg-white p-5 shadow-sm'
      onSubmit={(event) => {
        event.preventDefault();

        void onSave({
          releaseId,

          environmentId,

          ciJobUrl: ciJobUrl || undefined,
          liveUrl: liveUrl || undefined,
          deploymentNotes: deploymentNotes || undefined,
          healthIncidentId: healthIncidentId || undefined,
        });
      }}
    >
      <div className='flex items-start justify-between'>
        <h2 className='font-semibold text-slate-950'>Create deployment</h2>

        <button type='button' onClick={onCancel} className='text-sm font-medium text-slate-500'>
          Cancel
        </button>
      </div>

      <div className='mt-5 grid gap-4 md:grid-cols-2'>
        <label>
          <span className='text-sm font-medium'>Release</span>

          <select
            required
            value={releaseId}
            onChange={(event) => {
              setReleaseId(event.target.value);
            }}
            className='mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2'
          >
            <option value=''>Select release</option>

            {releases.map((release) => (
              <option key={release.id} value={release.id}>
                {release.version}
                {release.name ? ` â€” ${release.name}` : ''}
              </option>
            ))}
          </select>
        </label>

        <label>
          <span className='text-sm font-medium'>Environment</span>

          <select
            required
            value={environmentId}
            onChange={(event) => {
              setEnvironmentId(event.target.value);
            }}
            className='mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2'
          >
            <option value=''>Select environment</option>

            {options.environments.map((environment) => (
              <option key={environment.id} value={environment.id}>
                {environment.name}
              </option>
            ))}
          </select>
        </label>

        <label>
          <span className='text-sm font-medium'>CI job URL</span>

          <input
            type='url'
            value={ciJobUrl}
            onChange={(event) => {
              setCiJobUrl(event.target.value);
            }}
            className='mt-1 w-full rounded-lg border border-slate-300 px-3 py-2'
          />
        </label>

        <label>
          <span className='text-sm font-medium'>Live environment URL</span>

          <input
            type='url'
            value={liveUrl}
            onChange={(event) => {
              setLiveUrl(event.target.value);
            }}
            className='mt-1 w-full rounded-lg border border-slate-300 px-3 py-2'
          />
        </label>

        <label className='md:col-span-2'>
          <span className='text-sm font-medium'>Related health incident</span>

          <select
            value={healthIncidentId}
            onChange={(event) => {
              setHealthIncidentId(event.target.value);
            }}
            className='mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2'
          >
            <option value=''>No linked incident</option>

            {options.openIncidents.map((incident) => (
              <option key={incident.id} value={incident.id}>
                {incident.name}
                {' â€” '}
                {incident.summary}
              </option>
            ))}
          </select>
        </label>

        <label className='md:col-span-2'>
          <span className='text-sm font-medium'>Deployment notes</span>

          <textarea
            rows={4}
            value={deploymentNotes}
            onChange={(event) => {
              setDeploymentNotes(event.target.value);
            }}
            className='mt-1 w-full rounded-lg border border-slate-300 px-3 py-2'
          />
        </label>
      </div>

      <button type='submit' disabled={submitting} className='mt-5 rounded-lg bg-slate-950 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50'>
        {submitting ? 'Creatingâ€¦' : 'Create deployment'}
      </button>
    </form>
  );
}

export function ReleaseDeploymentDashboard({ workspaceId, applicationId }: DashboardProps) {
  const [data, setData] = useState<DashboardData | null>(null);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState<unknown>(null);

  const [environmentFilter, setEnvironmentFilter] = useState('');

  const [statusFilter, setStatusFilter] = useState<DeploymentStatus | ''>('');

  const [showReleaseForm, setShowReleaseForm] = useState(false);

  const [showDeploymentForm, setShowDeploymentForm] = useState(false);

  const [submitting, setSubmitting] = useState(false);

  const [actionError, setActionError] = useState<string | null>(null);

  const controllerRef = useRef<AbortController | null>(null);

  const load = useCallback(async () => {
    controllerRef.current?.abort();

    const controller = new AbortController();

    controllerRef.current = controller;

    setLoading(true);

    setError(null);

    try {
      const [options, releases, deployments, currentVersions] = await Promise.all([
        getReleaseOptions(workspaceId, applicationId, controller.signal),

        getReleases(workspaceId, applicationId, controller.signal),

        getDeployments(
          workspaceId,
          applicationId,
          {
            environmentId: environmentFilter || undefined,
            status: statusFilter || undefined,
          },

          controller.signal,
        ),

        getCurrentVersions(workspaceId, applicationId, controller.signal),
      ]);

      if (controller.signal.aborted) {
        return;
      }

      setData({
        options,

        releases: releases.items,
        deployments: deployments.items,

        currentVersions,
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
  }, [workspaceId, applicationId, environmentFilter, statusFilter]);

  useEffect(() => {
    void load();

    return () => {
      controllerRef.current?.abort();
    };
  }, [load]);

  const successfulDeployments = useMemo(() => (data?.deployments ?? []).filter((deployment) => deployment.status === 'SUCCESSFUL'), [data]);

  async function saveRelease(input: Parameters<typeof createRelease>[2]): Promise<void> {
    setSubmitting(true);

    setActionError(null);

    try {
      await createRelease(workspaceId, applicationId, input);

      setShowReleaseForm(false);

      await load();
    } catch (caughtError) {
      setActionError(getErrorMessage(caughtError));
    } finally {
      setSubmitting(false);
    }
  }

  async function saveDeployment(input: Parameters<typeof createDeployment>[2]): Promise<void> {
    setSubmitting(true);

    setActionError(null);

    try {
      await createDeployment(workspaceId, applicationId, input);

      setShowDeploymentForm(false);

      await load();
    } catch (caughtError) {
      setActionError(getErrorMessage(caughtError));
    } finally {
      setSubmitting(false);
    }
  }

  async function changeStatus(deployment: Deployment, target: DeploymentStatus): Promise<void> {
    const input: {
      status: DeploymentStatus;

      scheduledAt?: string;

      failureReason?: string;

      rollbackToDeploymentId?: string;
    } = {
      status: target,
    };

    if (target === 'SCHEDULED') {
      const value = window.prompt('Enter scheduled date and time, for example 2026-08-10T10:00:00Z');

      if (!value) {
        return;
      }

      input.scheduledAt = new Date(value).toISOString();
    }

    if (target === 'FAILED') {
      const reason = window.prompt('Enter the deployment failure reason.');

      if (!reason?.trim()) {
        return;
      }

      input.failureReason = reason.trim();
    }

    if (target === 'ROLLED_BACK') {
      const candidates = successfulDeployments.filter((candidate) => candidate.environmentId === deployment.environmentId && candidate.id !== deployment.id);

      if (candidates.length === 0) {
        setActionError('No earlier successful deployment exists for this environment.');

        return;
      }

      const list = candidates.map((candidate, index) => `${index + 1}. ${candidate.release.version}`).join('\n');

      const selection = window.prompt(`Select rollback target:\n${list}`, '1');

      const index = Number(selection) - 1;

      const selected = candidates[index];

      if (!selected) {
        return;
      }

      input.rollbackToDeploymentId = selected.id;
    }

    const confirmed = window.confirm(`Change deployment from ${deployment.status} to ${target}?`);

    if (!confirmed) {
      return;
    }

    setActionError(null);

    try {
      await transitionDeployment(workspaceId, applicationId, deployment.id, input);

      await load();
    } catch (caughtError) {
      setActionError(getErrorMessage(caughtError));
    }
  }

  if (loading && !data) {
    return (
      <div className='space-y-5'>
        <div className='h-24 animate-pulse rounded-2xl bg-slate-200' />

        <div className='h-80 animate-pulse rounded-2xl bg-slate-200' />
      </div>
    );
  }

  if (error || !data) {
    return (
      <PageError
        title='Release tracking unavailable'
        message={getErrorMessage(error)}
        requestId={error instanceof ApiError ? error.requestId : undefined}
        onRetry={() => {
          void load();
        }}
      />
    );
  }

  return (
    <main className='space-y-6'>
      <header className='flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:flex-row md:items-center md:justify-between'>
        <div>
          <p className='text-sm font-medium text-slate-500'>Application operations</p>

          <h1 className='mt-1 text-2xl font-bold text-slate-950'>Releases and deployments</h1>

          <p className='mt-2 text-sm text-slate-600'>Track which version is running in each environment.</p>
        </div>

        {data.options.canManage ? (
          <div className='flex flex-wrap gap-2'>
            <button
              type='button'
              onClick={() => {
                setShowReleaseForm(true);
              }}
              className='rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium'
            >
              New release
            </button>

            <button
              type='button'
              disabled={data.releases.length === 0 || data.options.environments.length === 0}
              onClick={() => {
                setShowDeploymentForm(true);
              }}
              className='rounded-lg bg-slate-950 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50'
            >
              New deployment
            </button>
          </div>
        ) : null}
      </header>

      {actionError ? (
        <div role='alert' className='rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800'>
          {actionError}
        </div>
      ) : null}

      {showReleaseForm ? (
        <ReleaseForm
          submitting={submitting}
          onSave={saveRelease}
          onCancel={() => {
            setShowReleaseForm(false);
          }}
        />
      ) : null}

      {showDeploymentForm ? (
        <DeploymentForm
          releases={data.releases}
          options={data.options}
          submitting={submitting}
          onSave={saveDeployment}
          onCancel={() => {
            setShowDeploymentForm(false);
          }}
        />
      ) : null}

      <section>
        <h2 className='text-lg font-semibold text-slate-950'>Current versions</h2>

        {data.currentVersions.length === 0 ? (
          <div className='mt-3'>
            <EmptyState title='No environments' description='Create an application environment before recording deployments.' icon={undefined} />
          </div>
        ) : (
          <div className='mt-3 grid gap-4 sm:grid-cols-2 xl:grid-cols-4'>
            {data.currentVersions.map((item) => (
              <article key={item.environmentId} className='rounded-2xl border border-slate-200 bg-white p-5 shadow-sm'>
                <p className='text-sm font-medium text-slate-500'>{item.environmentName}</p>

                <p className='mt-2 text-2xl font-bold text-slate-950'>{item.version ?? 'Not deployed'}</p>

                {item.status ? (
                  <div className='mt-3'>
                    <DeploymentStatusBadge status={item.status} />
                  </div>
                ) : null}

                <p className='mt-3 text-xs text-slate-500'>{formatDateTime(item.deployedAt)}</p>

                {item.liveUrl ? (
                  <a href={item.liveUrl} target='_blank' rel='noreferrer' className='mt-3 inline-block text-sm font-medium text-blue-700 underline'>
                    Open environment
                  </a>
                ) : null}
              </article>
            ))}
          </div>
        )}
      </section>

      <section className='rounded-2xl border border-slate-200 bg-white p-4 shadow-sm'>
        <div className='grid gap-3 sm:grid-cols-2'>
          <label>
            <span className='text-xs font-medium uppercase tracking-wide text-slate-500'>Environment</span>

            <select
              value={environmentFilter}
              onChange={(event) => {
                setEnvironmentFilter(event.target.value);
              }}
              className='mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2'
            >
              <option value=''>All environments</option>

              {data.options.environments.map((environment) => (
                <option key={environment.id} value={environment.id}>
                  {environment.name}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span className='text-xs font-medium uppercase tracking-wide text-slate-500'>Status</span>

            <select
              value={statusFilter}
              onChange={(event) => {
                setStatusFilter(event.target.value as DeploymentStatus | '');
              }}
              className='mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2'
            >
              <option value=''>All statuses</option>

              {STATUS_OPTIONS.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>

      {data.deployments.length === 0 ? (
        <EmptyState title='No deployments' description='Create a release and record its first deployment.' icon={undefined} />
      ) : (
        <section className='space-y-4'>
          <h2 className='text-lg font-semibold text-slate-950'>Deployment timeline</h2>

          {data.deployments.map((deployment) => (
            <article key={deployment.id} className='rounded-2xl border border-slate-200 bg-white p-5 shadow-sm'>
              <div className='flex flex-col gap-4 md:flex-row md:items-start md:justify-between'>
                <div>
                  <div className='flex flex-wrap items-center gap-2'>
                    <h3 className='text-lg font-semibold text-slate-950'>{deployment.release.version}</h3>

                    <DeploymentStatusBadge status={deployment.status} />

                    <span className='text-xs text-slate-500'>Attempt {deployment.attempt}</span>
                  </div>

                  <p className='mt-2 text-sm text-slate-600'>{deployment.environment.name}</p>

                  <p className='mt-1 text-xs text-slate-500'>Changed {formatDateTime(deployment.statusChangedAt)}</p>
                </div>

                {data.options.canManage && deployment.allowedTransitions.length > 0 ? (
                  <div className='flex flex-wrap gap-2'>
                    {deployment.allowedTransitions.map((status) => (
                      <button
                        key={status}
                        type='button'
                        onClick={() => {
                          void changeStatus(deployment, status);
                        }}
                        className='rounded-lg border border-slate-300 px-3 py-2 text-xs font-medium'
                      >
                        Mark {status.replace(/_/g, ' ')}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>

              <dl className='mt-5 grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-4'>
                <div>
                  <dt className='text-slate-500'>Commit</dt>

                  <dd className='mt-1 font-medium text-slate-900'>{deployment.commitRef ?? 'â€”'}</dd>
                </div>

                <div>
                  <dt className='text-slate-500'>Duration</dt>

                  <dd className='mt-1 font-medium text-slate-900'>{formatDuration(deployment.durationMs)}</dd>
                </div>

                <div>
                  <dt className='text-slate-500'>Started</dt>

                  <dd className='mt-1 font-medium text-slate-900'>{formatDateTime(deployment.startedAt)}</dd>
                </div>

                <div>
                  <dt className='text-slate-500'>Finished</dt>

                  <dd className='mt-1 font-medium text-slate-900'>{formatDateTime(deployment.finishedAt)}</dd>
                </div>
              </dl>

              {deployment.release.notes ? (
                <div className='mt-5 rounded-xl bg-slate-50 p-4'>
                  <p className='text-xs font-medium uppercase tracking-wide text-slate-500'>Release notes</p>

                  <p className='mt-2 whitespace-pre-wrap text-sm text-slate-700'>{deployment.release.notes}</p>
                </div>
              ) : null}

              {deployment.failureReason ? (
                <div className='mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800'>{deployment.failureReason}</div>
              ) : null}

              {deployment.healthIncident ? (
                <div className='mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4'>
                  <p className='text-xs font-medium uppercase tracking-wide text-amber-700'>Related health incident</p>

                  <p className='mt-2 text-sm text-amber-900'>{deployment.healthIncident.summary}</p>
                </div>
              ) : null}

              {deployment.rollbackTo ? (
                <div className='mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900'>
                  Rolled back to version <strong>{deployment.rollbackTo.release.version}</strong>
                  {' in '}
                  {deployment.rollbackTo.environment.name}.
                </div>
              ) : null}

              <div className='mt-4 flex flex-wrap gap-4 text-sm'>
                {deployment.repositoryUrl ? (
                  <a href={deployment.repositoryUrl} target='_blank' rel='noreferrer' className='font-medium text-blue-700 underline'>
                    Repository
                  </a>
                ) : null}

                {deployment.ciJobUrl ? (
                  <a href={deployment.ciJobUrl} target='_blank' rel='noreferrer' className='font-medium text-blue-700 underline'>
                    CI job
                  </a>
                ) : null}

                {deployment.liveUrl ? (
                  <a href={deployment.liveUrl} target='_blank' rel='noreferrer' className='font-medium text-blue-700 underline'>
                    Live environment
                  </a>
                ) : null}
              </div>

              {deployment.activities.length > 0 ? (
                <div className='mt-5 border-t border-slate-200 pt-4'>
                  <p className='text-xs font-medium uppercase tracking-wide text-slate-500'>Activity</p>

                  <div className='mt-3 space-y-3'>
                    {deployment.activities.map((activity) => (
                      <div key={activity.id} className='text-sm'>
                        <p className='text-slate-800'>{activity.message ?? activity.action}</p>

                        <p className='mt-1 text-xs text-slate-500'>
                          {activity.actor.name ?? activity.actor.email}
                          {' Â· '}
                          {formatDateTime(activity.createdAt)}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </article>
          ))}
        </section>
      )}
    </main>
  );
}
