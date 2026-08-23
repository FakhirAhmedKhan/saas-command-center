'use client';

import { getDesktopRepository, linkDesktopRepository, unlinkDesktopRepository } from './desktop-apps-api';
import { getErrorMessage } from '@/features/lib/api/api-error';
import { listRepositories } from '@/features/repositories/repositories-api';
import type { DesktopApplicationDetails, RepositoryConnection } from '@command-center/shared-types';
import { ExternalLink, GitBranch, Loader2, Unlink } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

interface DesktopRepositoryPanelProps {
  workspaceId: string;

  desktopApp: DesktopApplicationDetails;

  onRepositoryChanged?: () => void;
}

export function DesktopRepositoryPanel({ workspaceId, desktopApp, onRepositoryChanged }: DesktopRepositoryPanelProps) {
  const [linkedRepository, setLinkedRepository] = useState<RepositoryConnection | null>(null);

  const [repositories, setRepositories] = useState<RepositoryConnection[]>([]);

  const [selectedRepositoryId, setSelectedRepositoryId] = useState('');

  const [loading, setLoading] = useState(true);

  const [saving, setSaving] = useState(false);

  const [error, setError] = useState<string | null>(null);

  /*
   * Load the currently linked repository and all workspace
   * repositories together.
   *
   * The active flag prevents stale asynchronous responses from
   * changing state after unmount.
   */
  useEffect(() => {
    let active = true;

    void Promise.all([getDesktopRepository(workspaceId, desktopApp.id), listRepositories(workspaceId)])
      .then(([linked, repositoryResponse]) => {
        if (!active) {
          return;
        }

        setLinkedRepository(linked);

        setRepositories(repositoryResponse.repositories);

        setSelectedRepositoryId(linked?.id ?? '');

        setError(null);
      })
      .catch((loadError: unknown) => {
        if (!active) {
          return;
        }

        setError(getErrorMessage(loadError));
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [desktopApp.id, workspaceId]);

  /*
   * Only repositories that are:
   *
   * - active
   * - available
   * - not assigned elsewhere
   * - or already assigned to this application
   *
   * can appear in the selector.
   *
   * Backend enforcement is still authoritative.
   */
  const selectableRepositories = useMemo(
    () =>
      repositories.filter(
        (repository) =>
          !repository.archived && repository.isAvailable && (repository.applicationId === null || repository.applicationId === desktopApp.applicationId),
      ),

    [desktopApp.applicationId, repositories],
  );

  async function connect(): Promise<void> {
    if (!selectedRepositoryId) {
      setError('Select a repository first.');

      return;
    }

    setSaving(true);
    setError(null);

    try {
      const repository = await linkDesktopRepository(workspaceId, desktopApp.id, selectedRepositoryId);

      setLinkedRepository(repository);

      setSelectedRepositoryId(repository.id);

      onRepositoryChanged?.();
    } catch (connectError: unknown) {
      setError(getErrorMessage(connectError));
    } finally {
      setSaving(false);
    }
  }

  async function disconnect(): Promise<void> {
    setSaving(true);
    setError(null);

    try {
      await unlinkDesktopRepository(workspaceId, desktopApp.id);

      setLinkedRepository(null);

      setSelectedRepositoryId('');

      onRepositoryChanged?.();
    } catch (disconnectError: unknown) {
      setError(getErrorMessage(disconnectError));
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <section className='rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6'>
        <div className='flex items-center gap-3 text-sm text-slate-500'>
          <Loader2 className='size-4 animate-spin' aria-hidden='true' />
          Loading repositories...
        </div>
      </section>
    );
  }

  return (
    <section className='rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6'>
      <div>
        <h2 className='text-lg font-semibold text-slate-950'>Repository</h2>

        <p className='mt-1 max-w-2xl text-sm leading-6 text-slate-500'>
          Connect this desktop application to a repository already available through the workspace GitHub integration.
        </p>
      </div>

      {error ? (
        <div role='alert' className='mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700'>
          {error}
        </div>
      ) : null}

      {linkedRepository ? (
        <div className='mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4'>
          <div className='flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between'>
            <div className='min-w-0'>
              <div className='flex items-center gap-2'>
                <GitBranch className='size-4 shrink-0 text-slate-500' aria-hidden='true' />

                <p className='truncate font-semibold text-slate-950'>{linkedRepository.fullName}</p>
              </div>

              <div className='mt-3 flex flex-wrap gap-x-6 gap-y-2 text-sm'>
                <p className='text-slate-500'>
                  Branch: <span className='font-medium text-slate-800'>{linkedRepository.defaultBranch}</span>
                </p>

                <p className='text-slate-500'>
                  Visibility: <span className='font-medium text-slate-800'>{linkedRepository.isPrivate ? 'Private' : 'Public'}</span>
                </p>
              </div>
            </div>

            <div className='flex flex-wrap gap-2'>
              <a
                href={linkedRepository.htmlUrl}
                target='_blank'
                rel='noreferrer'
                className='inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100'
              >
                <ExternalLink className='size-4' aria-hidden='true' />
                Open on GitHub
              </a>

              <button
                type='button'
                disabled={saving}
                onClick={() => void disconnect()}
                className='inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-red-200 bg-white px-3 text-sm font-semibold text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60'
              >
                <Unlink className='size-4' aria-hidden='true' />

                {saving ? 'Unlinking...' : 'Unlink'}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className='mt-5 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-5'>
          <div className='flex items-center gap-2'>
            <GitBranch className='size-4 text-slate-400' aria-hidden='true' />

            <p className='font-semibold text-slate-900'>Not connected</p>
          </div>

          <p className='mt-2 text-sm text-slate-500'>Select an existing workspace repository to connect this desktop application.</p>
        </div>
      )}

      <div className='mt-5 border-t border-slate-200 pt-5'>
        {selectableRepositories.length > 0 ? (
          <div className='flex flex-col gap-3 sm:flex-row sm:items-end'>
            <label className='flex-1 text-sm font-medium text-slate-800'>
              Desktop repository
              <select
                aria-label='Desktop repository'
                value={selectedRepositoryId}
                disabled={saving}
                onChange={(event) => setSelectedRepositoryId(event.target.value)}
                className='mt-1.5 h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100 disabled:cursor-not-allowed disabled:bg-slate-50'
              >
                <option value=''>Select repository</option>

                {selectableRepositories.map((repository) => (
                  <option key={repository.id} value={repository.id}>
                    {repository.fullName} ({repository.defaultBranch})
                  </option>
                ))}
              </select>
            </label>

            <button
              type='button'
              disabled={saving || !selectedRepositoryId || selectedRepositoryId === linkedRepository?.id}
              onClick={() => void connect()}
              className='inline-flex h-10 shrink-0 items-center justify-center rounded-lg bg-slate-900 px-4 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50'
            >
              {saving ? 'Saving...' : linkedRepository ? 'Change Repository' : 'Connect Repository'}
            </button>
          </div>
        ) : (
          <div className='rounded-xl bg-slate-50 p-4'>
            <p className='text-sm text-slate-600'>No available repositories can currently be linked to this desktop application.</p>

            <Link
              href={`/workspaces/${workspaceId}/repositories`}
              className='mt-3 inline-flex text-sm font-semibold text-brand-600 transition hover:text-brand-700'
            >
              Manage workspace repositories
            </Link>
          </div>
        )}
      </div>

      <p className='mt-4 text-xs leading-5 text-slate-400'>
        Repository browsing through the internal Code Explorer is added in Phase 7. Phase 4 only creates the repository relationship.
      </p>
    </section>
  );
}
