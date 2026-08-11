/* eslint-disable react-hooks/set-state-in-effect */
'use client';

import { beginGithubConnect, disconnectGithubInstallation, listRepositories, syncRepositories, syncRepository } from './repositories-api';
import type { RepositoryConnection, RepositoryInstallationSummary } from './repository.types';
import {
  ExternalLink,
  FolderGit2,
  //   FolderGit2,
  Lock,
  RefreshCw,
  Unlock,
  Unplug,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';

interface RepositoriesDashboardProps {
  workspaceId: string;
}

function formatDate(value: string | null): string {
  if (!value) {
    return 'Never';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'Unknown';
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

export function RepositoriesDashboard({ workspaceId }: RepositoriesDashboardProps) {
  const [repositories, setRepositories] = useState<RepositoryConnection[]>([]);

  const [installations, setInstallations] = useState<RepositoryInstallationSummary[]>([]);

  const [loading, setLoading] = useState(true);

  const [busyKey, setBusyKey] = useState<string | null>(null);

  const [error, setError] = useState<string | null>(null);

  const privateRepositoryCount = useMemo(() => repositories.filter((repository) => repository.isPrivate).length, [repositories]);

  const load = useCallback(async () => {
    setError(null);

    const result = await listRepositories(workspaceId);

    setRepositories(result.repositories);

    setInstallations(result.installations);
  }, [workspaceId]);

  useEffect(() => {
    let active = true;

    void load()
      .catch((caughtError: unknown) => {
        if (!active) {
          return;
        }

        setError(caughtError instanceof Error ? caughtError.message : 'Unable to load repositories.');
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [load]);

  async function handleConnect(): Promise<void> {
    setError(null);
    setBusyKey('connect');

    try {
      const result = await beginGithubConnect(workspaceId);

      window.location.assign(result.installationUrl);
    } catch (caughtError: unknown) {
      setError(caughtError instanceof Error ? caughtError.message : 'Unable to start the GitHub connection.');

      setBusyKey(null);
    }
  }

  async function handleSyncAll(): Promise<void> {
    setError(null);
    setBusyKey('sync-all');

    try {
      await syncRepositories(workspaceId);

      await load();
    } catch (caughtError: unknown) {
      setError(caughtError instanceof Error ? caughtError.message : 'Unable to synchronize repositories.');
    } finally {
      setBusyKey(null);
    }
  }

  async function handleSyncRepository(repositoryId: string): Promise<void> {
    setError(null);
    setBusyKey(`repo:${repositoryId}`);

    try {
      await syncRepository(workspaceId, repositoryId);

      await load();
    } catch (caughtError: unknown) {
      setError(caughtError instanceof Error ? caughtError.message : 'Unable to synchronize the repository.');
    } finally {
      setBusyKey(null);
    }
  }

  async function handleDisconnect(installation: RepositoryInstallationSummary): Promise<void> {
    const confirmed = window.confirm(`Disconnect ${installation.accountLogin} from this Command Center workspace?`);

    if (!confirmed) {
      return;
    }

    setError(null);

    setBusyKey(`installation:${installation.id}`);

    try {
      await disconnectGithubInstallation(workspaceId, installation.id);

      await load();
    } catch (caughtError: unknown) {
      setError(caughtError instanceof Error ? caughtError.message : 'Unable to disconnect the GitHub installation.');
    } finally {
      setBusyKey(null);
    }
  }

  if (loading) {
    return (
      <div className='space-y-4'>
        <div className='h-28 animate-pulse rounded-2xl bg-slate-100' />

        <div className='h-48 animate-pulse rounded-2xl bg-slate-100' />

        <div className='h-48 animate-pulse rounded-2xl bg-slate-100' />
      </div>
    );
  }

  return (
    <div className='mx-auto w-full max-w-[1600px] space-y-5 p-4 sm:p-6 lg:p-8'>
      <header className='flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between'>
        <div>
          <h1 className='text-[26px] font-semibold tracking-tight text-slate-950'>Repositories</h1>

          <p className='mt-1 text-sm leading-6 text-slate-500'>Connect and manage repositories for this workspace.</p>
        </div>

        <div className='flex shrink-0 gap-2.5'>
          <button
            type='button'
            onClick={() => {
              void handleSyncAll();
            }}
            disabled={busyKey !== null || installations.length === 0}
            className='inline-flex h-9 items-center gap-2 rounded-lg border border-slate-300 bg-white px-3.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50'
          >
            <RefreshCw className={`size-3.5 ${busyKey === 'sync-all' ? 'animate-spin' : ''}`} />
            Sync
          </button>

          <button
            type='button'
            onClick={() => {
              void handleConnect();
            }}
            disabled={busyKey !== null}
            className='inline-flex h-9 items-center gap-2 rounded-lg bg-brand-600 px-3.5 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50'
          >
            <FolderGit2 className='size-3.5' />
            Connect GitHub
          </button>
        </div>
      </header>

      {error ? (
        <section className='rounded-lg border border-red-200 bg-red-50 p-3.5'>
          <p className='text-sm font-medium text-red-800'>{error}</p>
        </section>
      ) : null}

      <section className='grid gap-3 md:grid-cols-3'>
        <article className='rounded-xl border border-slate-200 bg-white p-3.5'>
          <p className='text-xs font-medium text-slate-500'>Connected repositories</p>

          <p className='mt-1.5 text-xl font-semibold text-slate-950'>{repositories.length}</p>
        </article>

        <article className='rounded-xl border border-slate-200 bg-white p-3.5'>
          <p className='text-xs font-medium text-slate-500'>Private repositories</p>

          <p className='mt-1.5 text-xl font-semibold text-slate-950'>{privateRepositoryCount}</p>
        </article>

        <article className='rounded-xl border border-slate-200 bg-white p-3.5'>
          <p className='text-xs font-medium text-slate-500'>GitHub installations</p>

          <p className='mt-1.5 text-xl font-semibold text-slate-950'>{installations.length}</p>
        </article>
      </section>

      {installations.length > 0 ? (
        <section className='space-y-3'>
          <div>
            <h2 className='text-lg font-semibold text-slate-950'>GitHub connections</h2>

            <p className='mt-1 text-sm text-slate-500'>Accounts currently connected to this workspace.</p>
          </div>

          <div className='grid gap-3 lg:grid-cols-2'>
            {installations.map((installation) => (
              <article key={installation.id} className='rounded-2xl border border-slate-200 bg-white p-5 shadow-sm'>
                <div className='flex items-start justify-between gap-4'>
                  <div className='flex min-w-0 items-center gap-3'>
                    <div className='flex size-10 shrink-0 items-center justify-center rounded-xl bg-slate-100'>
                      <FolderGit2 className='size-5 text-slate-700' />
                    </div>

                    <div className='min-w-0'>
                      <p className='truncate font-semibold text-slate-950'>{installation.accountLogin}</p>

                      <p className='mt-1 text-xs text-slate-500'>
                        {installation.accountType}
                        {' Â· '}
                        installation #{installation.externalInstallationId}
                      </p>
                    </div>
                  </div>

                  <button
                    type='button'
                    onClick={() => {
                      void handleDisconnect(installation);
                    }}
                    disabled={busyKey !== null}
                    className='inline-flex size-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:border-red-200 hover:bg-red-50 hover:text-red-700 disabled:opacity-50'
                    aria-label={`Disconnect ${installation.accountLogin}`}
                  >
                    <Unplug className='size-4' />
                  </button>
                </div>

                <p className='mt-4 text-xs text-slate-500'>Last synced: {formatDate(installation.lastSyncedAt)}</p>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      <section className='space-y-3'>
        <div>
          <h2 className='text-lg font-semibold text-slate-950'>Available repositories</h2>

          <p className='mt-1 text-sm text-slate-500'>Repositories available through your GitHub App installation.</p>
        </div>

        {repositories.length === 0 ? (
          <div className='rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center'>
            <div className='mx-auto flex size-12 items-center justify-center rounded-2xl bg-slate-100'>
              <FolderGit2 className='size-6 text-slate-600' />
            </div>

            <h3 className='mt-4 font-semibold text-slate-950'>No repositories connected</h3>

            <p className='mx-auto mt-2 max-w-md text-sm text-slate-500'>
              Connect the Command Center GitHub App and choose the repositories this workspace should be allowed to access.
            </p>

            <button
              type='button'
              onClick={() => {
                void handleConnect();
              }}
              disabled={busyKey !== null}
              className='mt-5 inline-flex h-10 items-center gap-2 rounded-xl bg-slate-950 px-4 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-50'
            >
              <FolderGit2 className='size-4' />
              Connect GitHub
            </button>
          </div>
        ) : (
          <div className='grid gap-4 xl:grid-cols-2'>
            {repositories.map((repository) => (
              <RepositoryCard
                key={repository.id}
                repository={repository}
                busy={busyKey === `repo:${repository.id}`}
                onSync={() => handleSyncRepository(repository.id)}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

interface RepositoryCardProps {
  repository: RepositoryConnection;

  busy: boolean;

  onSync(): Promise<void>;
}

function RepositoryCard({ repository, busy, onSync }: RepositoryCardProps) {
  return (
    <article className='rounded-2xl border border-slate-200 bg-white p-5 shadow-sm'>
      <div className='flex items-start justify-between gap-4'>
        <div className='min-w-0'>
          <div className='flex items-center gap-2'>
            {repository.isPrivate ? <Lock className='size-4 shrink-0 text-amber-600' /> : <Unlock className='size-4 shrink-0 text-emerald-600' />}

            <h3 className='truncate font-semibold text-slate-950'>{repository.fullName}</h3>
          </div>

          <p className='mt-2 text-xs text-slate-500'>
            Default branch: <span className='font-medium text-slate-700'>{repository.defaultBranch}</span>
          </p>
        </div>

        <a
          href={repository.htmlUrl}
          target='_blank'
          rel='noreferrer'
          className='inline-flex size-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-slate-50 hover:text-slate-950'
          aria-label={`Open ${repository.fullName} on GitHub`}
        >
          <ExternalLink className='size-4' />
        </a>
      </div>

      <div className='mt-5 grid gap-3 sm:grid-cols-2'>
        <div className='rounded-xl bg-slate-50 p-3'>
          <p className='text-xs font-medium uppercase tracking-wide text-slate-400'>Visibility</p>

          <p className='mt-1 text-sm font-semibold text-slate-700'>{repository.isPrivate ? 'Private' : 'Public'}</p>
        </div>

        <div className='rounded-xl bg-slate-50 p-3'>
          <p className='text-xs font-medium uppercase tracking-wide text-slate-400'>Application</p>

          <p className='mt-1 truncate text-sm font-semibold text-slate-700'>{repository.application?.name ?? 'Not linked'}</p>
        </div>
      </div>

      <div className='mt-5 flex items-center justify-between gap-3 border-t border-slate-100 pt-4'>
        <p className='text-xs text-slate-500'>Last synced: {formatDate(repository.lastSyncedAt)}</p>

        <button
          type='button'
          onClick={() => {
            void onSync();
          }}
          disabled={busy}
          className='inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50'
        >
          <RefreshCw className={`size-3.5 ${busy ? 'animate-spin' : ''}`} />
          Sync
        </button>
      </div>
    </article>
  );
}
