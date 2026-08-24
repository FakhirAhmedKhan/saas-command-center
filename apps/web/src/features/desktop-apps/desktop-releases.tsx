/* eslint-disable react-hooks/set-state-in-effect */
'use client';

import { createDesktopRelease, listDesktopBuilds, listDesktopReleases, updateDesktopReleaseStatus } from './desktop-apps-api';
import { shortSha } from './desktop-build-utils';
import { DESKTOP_RELEASE_CHANNEL_LABELS, DESKTOP_RELEASE_STATUS_LABELS, formatReleaseDate, formatReleaseTarget, nextDesktopReleaseActions } from './desktop-release-utils';
import { getErrorMessage } from '@/features/lib/api/api-error';
import type { CreateDesktopReleaseInput, DesktopArchitecture, DesktopBuild, DesktopPlatform, DesktopRelease, DesktopReleaseChannel, DesktopReleaseFilters, DesktopReleaseStatus } from '@command-center/shared-types';
import { AlertTriangle, CheckCircle2, ExternalLink, PackageCheck, RefreshCw, RotateCcw, Rocket } from 'lucide-react';
import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';

interface Props {
  workspaceId: string;
  desktopAppId: string;
}

const CHANNELS: DesktopReleaseChannel[] = ['DEV', 'ALPHA', 'BETA', 'STABLE', 'LTS'];
const STATUSES: DesktopReleaseStatus[] = ['DRAFT', 'READY', 'PUBLISHED', 'FAILED', 'ROLLED_BACK'];
const PLATFORMS: DesktopPlatform[] = ['WINDOWS', 'MACOS', 'LINUX', 'CROSS_PLATFORM'];
const ARCHITECTURES: DesktopArchitecture[] = ['X64', 'ARM64', 'X86', 'UNIVERSAL'];

function releaseStatusClasses(status: DesktopReleaseStatus): string {
  switch (status) {
    case 'PUBLISHED':
      return 'border-emerald-200 bg-emerald-50 text-emerald-700';

    case 'READY':
      return 'border-blue-200 bg-blue-50 text-blue-700';

    case 'FAILED':
      return 'border-red-200 bg-red-50 text-red-700';

    case 'ROLLED_BACK':
      return 'border-amber-200 bg-amber-50 text-amber-700';

    case 'DRAFT':
    default:
      return 'border-slate-200 bg-slate-100 text-slate-700';
  }
}

function buildLabel(build: DesktopBuild): string {
  const version = build.version ?? 'No version';
  const number = build.buildNumber ? ` #${build.buildNumber}` : '';

  return `${version}${number} • ${build.platform} • ${build.architecture} • ${shortSha(build.commitSha)}`;
}

export function DesktopReleases({ workspaceId, desktopAppId }: Props) {
  const [releases, setReleases] = useState<DesktopRelease[]>([]);
  const [successfulBuilds, setSuccessfulBuilds] = useState<DesktopBuild[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [transitioningId, setTransitioningId] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [filters, setFilters] = useState<DesktopReleaseFilters>({});
  const [buildId, setBuildId] = useState('');
  const [channel, setChannel] = useState<DesktopReleaseChannel>('STABLE');
  const [version, setVersion] = useState('');
  const [buildNumber, setBuildNumber] = useState('');
  const [releaseNotes, setReleaseNotes] = useState('');
  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [releaseRows, builds] = await Promise.all([
        listDesktopReleases(workspaceId, desktopAppId, filters),
        listDesktopBuilds(workspaceId, desktopAppId, {
          status: 'SUCCESS',
        }),
      ]);

      setReleases(releaseRows);
      setSuccessfulBuilds(builds);
    } catch (caughtError: unknown) {
      setError(getErrorMessage(caughtError));
    } finally {
      setLoading(false);
    }
  }, [workspaceId, desktopAppId, filters]);

  useEffect(() => {
    void load();
  }, [load]);

  const selectedBuild = useMemo(() => successfulBuilds.find((build) => build.id === buildId) ?? null, [successfulBuilds, buildId]);

  useEffect(() => {
    if (!selectedBuild) {
      return;
    }

    setVersion(selectedBuild.version ?? '');
    setBuildNumber(selectedBuild.buildNumber ?? '');
  }, [selectedBuild]);

  const availableBuilds = useMemo(() => {
    const used = new Set(releases.filter((release) => release.channel === channel).map((release) => release.buildId));

    return successfulBuilds.filter((build) => !used.has(build.id));
  }, [successfulBuilds, releases, channel]);

  async function submitRelease(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!buildId) {
      setActionError('Select a successful build.');
      return;
    }

    setSubmitting(true);
    setActionError(null);

    const payload: CreateDesktopReleaseInput = {
      buildId,
      channel,
      ...(version.trim()
        ? {
            version: version.trim(),
          }
        : {}),
      ...(buildNumber.trim()
        ? {
            buildNumber: buildNumber.trim(),
          }
        : {}),
      ...(releaseNotes.trim()
        ? {
            releaseNotes: releaseNotes.trim(),
          }
        : {}),
    };

    try {
      await createDesktopRelease(workspaceId, desktopAppId, payload);

      setBuildId('');
      setVersion('');
      setBuildNumber('');
      setReleaseNotes('');
      setShowCreateForm(false);

      await load();
    } catch (caughtError: unknown) {
      setActionError(getErrorMessage(caughtError));
    } finally {
      setSubmitting(false);
    }
  }

  async function transition(release: DesktopRelease, status: DesktopReleaseStatus) {
    const confirmed = window.confirm(status === 'ROLLED_BACK' ? `Roll back ${release.version} on ${DESKTOP_RELEASE_CHANNEL_LABELS[release.channel]}?` : `${DESKTOP_RELEASE_STATUS_LABELS[status]} ${release.version}?`);

    if (!confirmed) {
      return;
    }

    setTransitioningId(release.id);
    setActionError(null);

    try {
      await updateDesktopReleaseStatus(workspaceId, desktopAppId, release.id, status);

      await load();
    } catch (caughtError: unknown) {
      setActionError(getErrorMessage(caughtError));
    } finally {
      setTransitioningId(null);
    }
  }

  if (loading) {
    return (
      <section aria-label='Desktop releases loading' className='space-y-4'>
        <div className='h-28 animate-pulse rounded-2xl bg-slate-100' />
        <div className='h-44 animate-pulse rounded-2xl bg-slate-100' />
        <div className='h-44 animate-pulse rounded-2xl bg-slate-100' />
      </section>
    );
  }

  if (error) {
    return (
      <section className='rounded-2xl border border-red-200 bg-red-50 p-6'>
        <div className='flex items-start gap-3'>
          <AlertTriangle className='mt-0.5 h-5 w-5 text-red-600' />
          <div className='min-w-0 flex-1'>
            <h2 className='font-semibold text-red-900'>Releases could not be loaded</h2>
            <p className='mt-1 text-sm text-red-700'>{error}</p>
            <button type='button' onClick={() => void load()} className='mt-4 inline-flex items-center gap-2 rounded-lg border border-red-300 bg-white px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-100'>
              <RefreshCw className='h-4 w-4' />
              Retry
            </button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className='space-y-6'>
      <div className='flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:flex-row lg:items-center lg:justify-between'>
        <div>
          <div className='flex items-center gap-2'>
            <Rocket className='h-5 w-5 text-slate-700' />
            <h2 className='text-lg font-semibold text-slate-950'>Desktop Releases</h2>
          </div>
          <p className='mt-1 text-sm text-slate-600'>Promote successful builds through Dev, Alpha, Beta, Stable, and LTS update channels.</p>
        </div>

        <button
          type='button'
          onClick={() => {
            setActionError(null);
            setShowCreateForm((current) => !current);
          }}
          className='inline-flex items-center justify-center gap-2 rounded-lg bg-slate-950 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800'
        >
          <PackageCheck className='h-4 w-4' />
          {showCreateForm ? 'Close Form' : 'Create Release'}
        </button>
      </div>

      {actionError ? (
        <div role='alert' className='rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700'>
          {actionError}
        </div>
      ) : null}

      {showCreateForm ? (
        <form onSubmit={submitRelease} className='space-y-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm'>
          <div>
            <h3 className='font-semibold text-slate-950'>Create release from successful build</h3>
            <p className='mt-1 text-sm text-slate-600'>Platform and architecture are inherited from the selected build and cannot be forged by the browser.</p>
          </div>

          <div className='grid gap-4 lg:grid-cols-2'>
            <label className='space-y-1.5 text-sm font-medium text-slate-700'>
              <span>Successful build</span>
              <select aria-label='Successful build' value={buildId} onChange={(event) => setBuildId(event.target.value)} required className='h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm'>
                <option value=''>Select build</option>
                {availableBuilds.map((build) => (
                  <option key={build.id} value={build.id}>
                    {buildLabel(build)}
                  </option>
                ))}
              </select>
            </label>

            <label className='space-y-1.5 text-sm font-medium text-slate-700'>
              <span>Update channel</span>
              <select
                aria-label='Update channel'
                value={channel}
                onChange={(event) => setChannel(event.target.value as DesktopReleaseChannel)}
                className='h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm'
              >
                {CHANNELS.map((value) => (
                  <option key={value} value={value}>
                    {DESKTOP_RELEASE_CHANNEL_LABELS[value]}
                  </option>
                ))}
              </select>
            </label>

            <label className='space-y-1.5 text-sm font-medium text-slate-700'>
              <span>Version</span>
              <input
                aria-label='Release version'
                value={version}
                onChange={(event) => setVersion(event.target.value)}
                maxLength={64}
                placeholder='Defaults to build version'
                className='h-10 w-full rounded-lg border border-slate-300 px-3 text-sm'
              />
            </label>

            <label className='space-y-1.5 text-sm font-medium text-slate-700'>
              <span>Build number</span>
              <input
                aria-label='Release build number'
                value={buildNumber}
                onChange={(event) => setBuildNumber(event.target.value)}
                maxLength={64}
                placeholder='Defaults to build number'
                className='h-10 w-full rounded-lg border border-slate-300 px-3 text-sm'
              />
            </label>
          </div>

          {selectedBuild ? (
            <div className='rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700'>
              <div className='font-semibold text-slate-900'>Build source</div>
              <div className='mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-4'>
                <span>{selectedBuild.platform}</span>
                <span>{selectedBuild.architecture}</span>
                <span>{selectedBuild.branch}</span>
                <span>{shortSha(selectedBuild.commitSha)}</span>
              </div>
            </div>
          ) : null}

          <label className='block space-y-1.5 text-sm font-medium text-slate-700'>
            <span>Release notes</span>
            <textarea
              aria-label='Release notes'
              value={releaseNotes}
              onChange={(event) => setReleaseNotes(event.target.value)}
              maxLength={20_000}
              rows={5}
              placeholder='What changed in this desktop release?'
              className='w-full rounded-lg border border-slate-300 px-3 py-2 text-sm'
            />
          </label>

          <div className='flex flex-wrap gap-3'>
            <button
              type='submit'
              disabled={submitting || !buildId}
              className='inline-flex items-center justify-center rounded-lg bg-slate-950 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50'
            >
              {submitting ? 'Creating...' : 'Create Desktop Release'}
            </button>

            <button type='button' onClick={() => setShowCreateForm(false)} className='rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50'>
              Cancel
            </button>
          </div>
        </form>
      ) : null}

      <div className='grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:grid-cols-2 lg:grid-cols-4'>
        <select
          aria-label='Release channel filter'
          value={filters.channel ?? ''}
          onChange={(event) =>
            setFilters((current) => ({
              ...current,
              channel: (event.target.value as DesktopReleaseChannel) || undefined,
            }))
          }
          className='h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm'
        >
          <option value=''>All channels</option>
          {CHANNELS.map((value) => (
            <option key={value} value={value}>
              {DESKTOP_RELEASE_CHANNEL_LABELS[value]}
            </option>
          ))}
        </select>

        <select
          aria-label='Release status filter'
          value={filters.status ?? ''}
          onChange={(event) =>
            setFilters((current) => ({
              ...current,
              status: (event.target.value as DesktopReleaseStatus) || undefined,
            }))
          }
          className='h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm'
        >
          <option value=''>All statuses</option>
          {STATUSES.map((value) => (
            <option key={value} value={value}>
              {DESKTOP_RELEASE_STATUS_LABELS[value]}
            </option>
          ))}
        </select>

        <select
          aria-label='Release platform filter'
          value={filters.platform ?? ''}
          onChange={(event) =>
            setFilters((current) => ({
              ...current,
              platform: (event.target.value as DesktopPlatform) || undefined,
            }))
          }
          className='h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm'
        >
          <option value=''>All platforms</option>
          {PLATFORMS.map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>

        <select
          aria-label='Release architecture filter'
          value={filters.architecture ?? ''}
          onChange={(event) =>
            setFilters((current) => ({
              ...current,
              architecture: (event.target.value as DesktopArchitecture) || undefined,
            }))
          }
          className='h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm'
        >
          <option value=''>All architectures</option>
          {ARCHITECTURES.map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>
      </div>

      {releases.length === 0 ? (
        <div className='rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center'>
          <Rocket className='mx-auto h-8 w-8 text-slate-400' />
          <h3 className='mt-3 font-semibold text-slate-950'>No desktop releases yet</h3>
          <p className='mx-auto mt-1 max-w-xl text-sm text-slate-600'>Create a release from a successful desktop build. The release will keep its build, commit, target, and artifact history traceable.</p>
        </div>
      ) : (
        <div className='space-y-4'>
          {releases.map((release) => {
            const actions = nextDesktopReleaseActions(release.status);
            const busy = transitioningId === release.id;

            return (
              <article key={release.id} className='rounded-2xl border border-slate-200 bg-white p-5 shadow-sm'>
                <div className='flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between'>
                  <div className='min-w-0'>
                    <div className='flex flex-wrap items-center gap-2'>
                      <h3 className='text-lg font-semibold text-slate-950'>{release.version}</h3>

                      <span className='rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-700'>{DESKTOP_RELEASE_CHANNEL_LABELS[release.channel]}</span>

                      <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${releaseStatusClasses(release.status)}`}>{DESKTOP_RELEASE_STATUS_LABELS[release.status]}</span>
                    </div>

                    <div className='mt-2 flex flex-wrap gap-x-5 gap-y-1 text-sm text-slate-600'>
                      <span>{formatReleaseTarget(release)}</span>
                      <span>Build #{release.buildNumber}</span>
                      <span>Branch {release.build.branch}</span>
                      <span>Commit {shortSha(release.build.commitSha)}</span>
                    </div>

                    <p className='mt-2 text-xs text-slate-500'>Published: {formatReleaseDate(release.releasedAt)}</p>
                  </div>

                  {actions.length > 0 ? (
                    <div className='flex flex-wrap gap-2'>
                      {actions.map((action) => (
                        <button
                          key={action.status}
                          type='button'
                          disabled={busy}
                          onClick={() => void transition(release, action.status)}
                          className='inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50'
                        >
                          {action.status === 'ROLLED_BACK' ? <RotateCcw className='h-4 w-4' /> : action.status === 'PUBLISHED' ? <Rocket className='h-4 w-4' /> : <CheckCircle2 className='h-4 w-4' />}
                          {busy ? 'Updating...' : action.label}
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>

                {release.releaseNotes ? (
                  <div className='mt-4 rounded-xl bg-slate-50 p-4'>
                    <div className='text-xs font-semibold uppercase tracking-wide text-slate-500'>Release notes</div>
                    <p className='mt-2 whitespace-pre-wrap text-sm text-slate-700'>{release.releaseNotes}</p>
                  </div>
                ) : null}

                <div className='mt-4 border-t border-slate-100 pt-4'>
                  <div className='flex flex-wrap items-center justify-between gap-2'>
                    <h4 className='text-sm font-semibold text-slate-900'>Source → Build → Artifact → Release</h4>
                    <span className='text-xs text-slate-500'>Workflow run {release.build.workflowRunId}</span>
                  </div>

                  {release.build.artifacts.length === 0 ? (
                    <p className='mt-3 text-sm text-slate-500'>This release is traceable to its build, but that build has no artifact metadata recorded.</p>
                  ) : (
                    <ul className='mt-3 grid gap-2 md:grid-cols-2'>
                      {release.build.artifacts.map((artifact) => (
                        <li key={artifact.id} className='rounded-xl border border-slate-200 bg-slate-50 p-3'>
                          <div className='flex items-start justify-between gap-3'>
                            <div className='min-w-0'>
                              <div className='truncate text-sm font-semibold text-slate-900'>{artifact.fileName}</div>
                              <div className='mt-1 text-xs text-slate-500'>
                                {artifact.type} • {artifact.platform} • {artifact.architecture}
                              </div>
                            </div>

                            {artifact.externalUrl ? (
                              <a href={artifact.externalUrl} target='_blank' rel='noreferrer' aria-label={`Open ${artifact.fileName}`} className='rounded-md p-1.5 text-slate-500 hover:bg-white hover:text-slate-900'>
                                <ExternalLink className='h-4 w-4' />
                              </a>
                            ) : null}
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
