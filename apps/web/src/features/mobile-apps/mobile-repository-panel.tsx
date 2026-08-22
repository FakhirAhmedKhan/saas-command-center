'use client';

import type { MobileApplicationDetails, RepositoryConnection } from '@command-center/shared-types';

import { ExternalLink, GitBranch, Loader2, Unlink } from 'lucide-react';

import Link from 'next/link';

import { useCallback, useEffect, useMemo, useState } from 'react';

import { getErrorMessage } from '@/features/lib/api/api-error';

import { getMobileRepository, linkMobileRepository, unlinkMobileRepository } from './mobile-apps-api';

import { listRepositories } from '@/features/repositories/repositories-api';

interface MobileRepositoryPanelProps {
  workspaceId: string;

  mobileApp: MobileApplicationDetails;

  onRepositoryChanged?: () => void;
}

export function MobileRepositoryPanel({ workspaceId, mobileApp, onRepositoryChanged }: MobileRepositoryPanelProps) {
  const [linkedRepository, setLinkedRepository] = useState<RepositoryConnection | null>(null);

  const [repositories, setRepositories] = useState<RepositoryConnection[]>([]);

  const [selectedRepositoryId, setSelectedRepositoryId] = useState('');

  const [loading, setLoading] = useState(true);

  const [saving, setSaving] = useState(false);

  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [linked, repositoryResponse] = await Promise.all([getMobileRepository(workspaceId, mobileApp.id), listRepositories(workspaceId)]);

      setLinkedRepository(linked);

      setRepositories(repositoryResponse.repositories);

      setSelectedRepositoryId(linked?.id ?? '');
    } catch (loadError: unknown) {
      setError(getErrorMessage(loadError));
    } finally {
      setLoading(false);
    }
  }, [mobileApp.id, workspaceId]);

  useEffect(() => {
    void load();
  }, [load]);

  const selectableRepositories = useMemo(
    () =>
      repositories.filter(
        (repository) =>
          !repository.archived && repository.isAvailable && (repository.applicationId === null || repository.applicationId === mobileApp.applicationId),
      ),
    [mobileApp.applicationId, repositories],
  );

  async function connect(): Promise<void> {
    if (!selectedRepositoryId) {
      setError('Select a repository first.');

      return;
    }

    setSaving(true);
    setError(null);

    try {
      const repository = await linkMobileRepository(workspaceId, mobileApp.id, selectedRepositoryId);

      setLinkedRepository(repository);

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
      await unlinkMobileRepository(workspaceId, mobileApp.id);

      setLinkedRepository(null);

      setSelectedRepositoryId('');

      onRepositoryChanged?.();
    } catch (disconnectError: unknown) {
      setError(getErrorMessage(disconnectError));
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className='rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6'>
      <div className='flex items-center gap-3'>
        <div className='flex size-10 items-center justify-center rounded-xl bg-slate-100'>
          <GitBranch className='size-5 text-slate-700' />
        </div>

        <div>
          <h2 className='font-semibold text-slate-950'>Repository</h2>

          <p className='text-sm text-slate-500'>Link this mobile app to a connected GitHub repository.</p>
        </div>
      </div>

      {error ? (
        <div role='alert' className='mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700'>
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className='mt-6 flex items-center gap-2 text-sm text-slate-500'>
          <Loader2 className='size-4 animate-spin' />
          Loading repositories...
        </div>
      ) : null}

      {!loading && linkedRepository ? (
        <div className='mt-6 rounded-xl border border-slate-200 p-4'>
          <div className='flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between'>
            <div>
              <p className='font-medium text-slate-950'>{linkedRepository.fullName}</p>

              <p className='mt-1 text-sm text-slate-500'>Branch: {linkedRepository.defaultBranch}</p>
            </div>

            <div className='flex gap-2'>
              <Link
                href={`/workspaces/${workspaceId}` + `/repositories/${linkedRepository.id}/code`}
                className='inline-flex h-9 items-center gap-2 rounded-lg border border-slate-300 px-3 text-sm font-medium text-slate-700 hover:bg-slate-50'
              >
                <ExternalLink className='size-4' />
                Browse Code
              </Link>

              <button
                type='button'
                disabled={saving}
                onClick={() => void disconnect()}
                className='inline-flex h-9 items-center gap-2 rounded-lg border border-red-200 px-3 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50'
              >
                <Unlink className='size-4' />
                Unlink
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {!loading ? (
        <div className='mt-5 space-y-3'>
          <label className='block'>
            <span className='mb-2 block text-sm font-medium text-slate-700'>{linkedRepository ? 'Change repository' : 'Select repository'}</span>

            <select
              aria-label='Mobile repository'
              value={selectedRepositoryId}
              onChange={(event) => setSelectedRepositoryId(event.target.value)}
              className='h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm'
            >
              <option value=''>Select repository</option>

              {selectableRepositories.map((repository) => (
                <option key={repository.id} value={repository.id}>
                  {repository.fullName}
                </option>
              ))}
            </select>
          </label>

          <button
            type='button'
            disabled={saving || !selectedRepositoryId || selectedRepositoryId === linkedRepository?.id}
            onClick={() => void connect()}
            className='inline-flex h-10 items-center justify-center rounded-lg bg-brand-600 px-4 text-sm font-semibold text-white hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50'
          >
            {saving ? 'Saving...' : linkedRepository ? 'Change Repository' : 'Connect Repository'}
          </button>
        </div>
      ) : null}
    </section>
  );
}
