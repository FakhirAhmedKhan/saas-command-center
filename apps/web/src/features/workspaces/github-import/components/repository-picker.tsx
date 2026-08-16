/* eslint-disable react-hooks/set-state-in-effect */
'use client';

import { listImportableRepositories } from '../github-import-api';
import type { ImportableGithubRepository } from '../github-import-types';
import { getErrorMessage } from '@/features/lib/api/api-error';
import { Button, EmptyState, ErrorState, SearchInput } from '@command-center/ui';
import { FolderGit2, Lock, RefreshCw, Unlock } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';

interface RepositoryPickerProps {
  error: string | null;
  onSelect: (repository: ImportableGithubRepository) => void;
  onReconnect: () => void;
}

function formatUpdatedAt(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'Unknown';
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
  }).format(date);
}

export function RepositoryPicker({ error, onSelect, onReconnect }: RepositoryPickerProps) {
  const [repositories, setRepositories] = useState<ImportableGithubRepository[]>([]);

  const [loading, setLoading] = useState(true);

  const [loadError, setLoadError] = useState<string | null>(null);

  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);

    try {
      const result = await listImportableRepositories();

      setRepositories(result.repositories);
    } catch (caughtError: unknown) {
      setLoadError(getErrorMessage(caughtError));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filteredRepositories = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return repositories;
    }

    return repositories.filter((repository) => repository.fullName.toLowerCase().includes(query) || (repository.description ?? '').toLowerCase().includes(query));
  }, [repositories, search]);

  if (loading) {
    return (
      <div className='space-y-3'>
        <div className='h-11 animate-pulse rounded-xl bg-slate-100' />
        <div className='h-20 animate-pulse rounded-xl bg-slate-100' />
        <div className='h-20 animate-pulse rounded-xl bg-slate-100' />
        <div className='h-20 animate-pulse rounded-xl bg-slate-100' />
      </div>
    );
  }

  if (loadError) {
    return <ErrorState message={loadError} onRetry={() => void load()} />;
  }

  return (
    <div className='space-y-4'>
      {error ? (
        <div role='alert' className='rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800'>
          {error}
        </div>
      ) : null}

      <div className='flex items-center gap-3'>
        <SearchInput placeholder='Search repositories...' value={search} onChange={(event) => setSearch(event.target.value)} className='flex-1' />

        <Button variant='outline' size='sm' onClick={onReconnect}>
          <RefreshCw className='size-3.5' />
          Reconnect
        </Button>
      </div>

      {filteredRepositories.length === 0 ? (
        <EmptyState
          icon={<FolderGit2 className='size-5' />}
          title={repositories.length === 0 ? 'No repositories found' : 'No repositories match your search'}
          description={
            repositories.length === 0
              ? 'The GitHub App installation you connected has no accessible repositories, or its access was revoked.'
              : 'Try a different search term.'
          }
        />
      ) : (
        <ul className='space-y-2'>
          {filteredRepositories.map((repository) => (
            <li key={repository.id}>
              <button
                type='button'
                onClick={() => onSelect(repository)}
                className='flex w-full items-start gap-3 rounded-xl border border-slate-200 bg-white p-4 text-left transition hover:border-brand-300 hover:bg-brand-50/40'
              >
                <div className='flex size-9 shrink-0 items-center justify-center rounded-lg bg-slate-100'>
                  <FolderGit2 className='size-4 text-slate-700' />
                </div>

                <div className='min-w-0 flex-1'>
                  <div className='flex items-center gap-2'>
                    {repository.private ? <Lock className='size-3.5 shrink-0 text-amber-600' /> : <Unlock className='size-3.5 shrink-0 text-emerald-600' />}

                    <span className='truncate font-semibold text-slate-950'>{repository.fullName}</span>
                  </div>

                  {repository.description ? <p className='mt-1 truncate text-sm text-slate-500'>{repository.description}</p> : null}

                  <p className='mt-1.5 text-xs text-slate-400'>Updated {formatUpdatedAt(repository.updatedAt)}</p>
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
