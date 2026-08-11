/* eslint-disable react-hooks/set-state-in-effect */
'use client';

import { CodeDiffViewer } from './code-diff-viewer';
import { getRepositoryBranches, getRepositoryCodeFile, getRepositoryFileDiff, getRepositoryTree, searchRepositoryFiles } from './code-explorer-api';
import type { CodeTreeNode, RepositoryBranch, RepositoryCodeFile, RepositoryDiffResponse, RepositorySearchMatch } from './code-explorer.types';
import { CodeTree } from './code-tree';
import { CodeViewer } from './code-viewer';
import { getRepository } from './repositories-api';
import type { RepositoryConnection } from './repository.types';
import { GitBranch, RefreshCw, Search, X } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';

interface CodeExplorerProps {
  workspaceId: string;

  repositoryId: string;
}

interface OpenTab {
  path: string;

  file: RepositoryCodeFile;
}

export function CodeExplorer({ workspaceId, repositoryId }: CodeExplorerProps) {
  const [repository, setRepository] = useState<RepositoryConnection | null>(null);

  const [branches, setBranches] = useState<RepositoryBranch[]>([]);

  const [branch, setBranch] = useState('');

  const [nodes, setNodes] = useState<CodeTreeNode[]>([]);

  const [truncated, setTruncated] = useState(false);

  const [tabs, setTabs] = useState<OpenTab[]>([]);

  const [activePath, setActivePath] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);

  const [fileLoading, setFileLoading] = useState(false);

  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState('');

  const [searchResults, setSearchResults] = useState<RepositorySearchMatch[]>([]);

  const [diff, setDiff] = useState<RepositoryDiffResponse | null>(null);

  const [diffMode, setDiffMode] = useState(false);

  const activeFile = useMemo(() => tabs.find((tab) => tab.path === activePath)?.file ?? null, [tabs, activePath]);

  const loadTree = useCallback(
    async (selectedBranch: string) => {
      const tree = await getRepositoryTree(workspaceId, repositoryId, selectedBranch);

      setNodes(tree.nodes);

      setTruncated(tree.truncated);
    },
    [workspaceId, repositoryId],
  );

  const initialize = useCallback(async () => {
    setLoading(true);

    setError(null);

    try {
      const [repositoryResult, branchResult] = await Promise.all([getRepository(workspaceId, repositoryId), getRepositoryBranches(workspaceId, repositoryId)]);

      setRepository(repositoryResult);

      setBranches(branchResult.branches);

      setBranch(branchResult.defaultBranch);

      await loadTree(branchResult.defaultBranch);
    } catch (caughtError: unknown) {
      setError(caughtError instanceof Error ? caughtError.message : 'Unable to load the repository.');
    } finally {
      setLoading(false);
    }
  }, [workspaceId, repositoryId, loadTree]);

  useEffect(() => {
    void initialize();
  }, [initialize]);

  async function openFile(path: string): Promise<void> {
    const existing = tabs.find((tab) => tab.path === path);

    if (existing) {
      setActivePath(path);

      setDiffMode(false);

      return;
    }

    setFileLoading(true);

    setError(null);

    try {
      const file = await getRepositoryCodeFile(workspaceId, repositoryId, branch, path);

      setTabs((current) => [
        ...current,
        {
          path,
          file,
        },
      ]);

      setActivePath(path);

      setDiffMode(false);
    } catch (caughtError: unknown) {
      setError(caughtError instanceof Error ? caughtError.message : 'Unable to open the file.');
    } finally {
      setFileLoading(false);
    }
  }

  function closeTab(path: string): void {
    setTabs((current) => {
      const index = current.findIndex((tab) => tab.path === path);

      const next = current.filter((tab) => tab.path !== path);

      if (activePath === path) {
        const replacement = next[Math.max(0, index - 1)];

        setActivePath(replacement?.path ?? null);
      }

      return next;
    });

    setDiffMode(false);
  }

  async function changeBranch(nextBranch: string): Promise<void> {
    if (nextBranch === branch) {
      return;
    }

    setBranch(nextBranch);

    setTabs([]);

    setActivePath(null);

    setSearch('');

    setSearchResults([]);

    setDiff(null);

    setDiffMode(false);

    setLoading(true);

    setError(null);

    try {
      await loadTree(nextBranch);
    } catch (caughtError: unknown) {
      setError(caughtError instanceof Error ? caughtError.message : 'Unable to switch branch.');
    } finally {
      setLoading(false);
    }
  }

  async function performSearch(): Promise<void> {
    const query = search.trim();

    if (!query) {
      setSearchResults([]);

      return;
    }

    setError(null);

    try {
      const result = await searchRepositoryFiles(workspaceId, repositoryId, branch, query);

      setSearchResults(result.matches);
    } catch (caughtError: unknown) {
      setError(caughtError instanceof Error ? caughtError.message : 'Search failed.');
    }
  }

  async function compareActiveFile(): Promise<void> {
    if (!activePath || !repository) {
      return;
    }

    setFileLoading(true);

    setError(null);

    try {
      const result = await getRepositoryFileDiff(workspaceId, repositoryId, repository.defaultBranch, branch, activePath);

      setDiff(result);

      setDiffMode(true);
    } catch (caughtError: unknown) {
      setError(caughtError instanceof Error ? caughtError.message : 'Unable to compare the file.');
    } finally {
      setFileLoading(false);
    }
  }

  if (loading && !repository) {
    return (
      <div className='flex min-h-[70vh] items-center justify-center'>
        <RefreshCw className='size-6 animate-spin text-slate-500' />
      </div>
    );
  }

  if (!repository) {
    return (
      <div className='rounded-2xl border border-red-200 bg-red-50 p-6'>
        <p className='text-sm font-medium text-red-800'>{error ?? 'Repository not found.'}</p>
      </div>
    );
  }

  return (
    <div className='overflow-hidden rounded-2xl border border-slate-800 bg-slate-950 shadow-xl'>
      <header className='flex min-h-14 flex-wrap items-center justify-between gap-3 border-b border-slate-800 px-4 py-2'>
        <div className='min-w-0'>
          <h1 className='truncate text-sm font-semibold text-white'>{repository.fullName}</h1>

          <p className='mt-0.5 text-xs text-slate-400'>Code Explorer · Read only</p>
        </div>

        <div className='flex items-center gap-2'>
          <div className='flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900 px-3'>
            <GitBranch className='size-4 text-slate-400' />

            <select
              value={branch}
              onChange={(event) => {
                void changeBranch(event.target.value);
              }}
              className='h-9 max-w-56 bg-transparent text-sm text-slate-200 outline-none'
            >
              {branches.map((item) => (
                <option key={item.name} value={item.name} className='bg-slate-950'>
                  {item.name}
                </option>
              ))}
            </select>
          </div>

          <button
            type='button'
            onClick={() => {
              void loadTree(branch);
            }}
            className='flex size-9 items-center justify-center rounded-lg border border-slate-700 text-slate-300 transition hover:bg-slate-800'
            aria-label='Refresh repository tree'
          >
            <RefreshCw className='size-4' />
          </button>
        </div>
      </header>

      {error ? <div className='border-b border-red-900 bg-red-950/60 px-4 py-2 text-xs text-red-300'>{error}</div> : null}

      {truncated ? (
        <div className='border-b border-amber-900 bg-amber-950/40 px-4 py-2 text-xs text-amber-300'>
          GitHub returned a truncated repository tree. Some files may not appear.
        </div>
      ) : null}

      <div className='grid h-[calc(100vh-190px)] min-h-[620px] grid-cols-[280px_minmax(0,1fr)]'>
        <aside className='flex min-h-0 flex-col border-r border-slate-800 bg-slate-900'>
          <div className='border-b border-slate-800 p-3'>
            <div className='flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-950 px-2'>
              <Search className='size-4 shrink-0 text-slate-500' />

              <input
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);

                  if (!event.target.value) {
                    setSearchResults([]);
                  }
                }}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    void performSearch();
                  }
                }}
                placeholder='Search files...'
                className='h-9 min-w-0 flex-1 bg-transparent text-sm text-slate-200 outline-none placeholder:text-slate-600'
              />
            </div>
          </div>

          <div className='min-h-0 flex-1 overflow-auto'>
            {searchResults.length > 0 ? (
              <div className='py-2'>
                {searchResults.map((item) => (
                  <button
                    key={item.path}
                    type='button'
                    onClick={() => {
                      void openFile(item.path);
                    }}
                    className='block w-full truncate px-3 py-2 text-left text-xs text-slate-300 hover:bg-slate-800'
                    title={item.path}
                  >
                    <span className='block truncate font-medium text-slate-200'>{item.name}</span>

                    <span className='mt-0.5 block truncate text-[11px] text-slate-500'>{item.path}</span>
                  </button>
                ))}
              </div>
            ) : (
              <CodeTree
                nodes={nodes}
                activePath={activePath}
                onOpenFile={(path) => {
                  void openFile(path);
                }}
              />
            )}
          </div>
        </aside>

        <main className='flex min-w-0 flex-col bg-slate-950'>
          <div className='flex h-10 min-w-0 items-center border-b border-slate-800 bg-slate-900'>
            <div className='min-w-0 flex-1 overflow-x-auto'>
              <div className='flex h-full w-max min-w-full'>
                {tabs.map((tab) => (
                  <button
                    key={tab.path}
                    type='button'
                    onClick={() => {
                      setActivePath(tab.path);

                      setDiffMode(false);
                    }}
                    className={`flex h-10 max-w-56 items-center gap-2 border-r border-slate-800 px-3 text-xs ${
                      tab.path === activePath ? 'bg-slate-950 text-white' : 'bg-slate-900 text-slate-400 hover:bg-slate-800'
                    }`}
                  >
                    <span className='truncate'>{tab.file.name}</span>

                    <span
                      role='button'
                      tabIndex={0}
                      onClick={(event) => {
                        event.stopPropagation();

                        closeTab(tab.path);
                      }}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.stopPropagation();

                          closeTab(tab.path);
                        }
                      }}
                      className='rounded p-0.5 hover:bg-slate-700'
                      aria-label={`Close ${tab.file.name}`}
                    >
                      <X className='size-3' />
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {activeFile && branch !== repository.defaultBranch ? (
              <button
                type='button'
                onClick={() => {
                  void compareActiveFile();
                }}
                className='h-10 shrink-0 border-l border-slate-800 px-4 text-xs font-semibold text-slate-300 hover:bg-slate-800'
              >
                Compare with {repository.defaultBranch}
              </button>
            ) : null}
          </div>

          {activePath ? (
            <div className='flex h-9 items-center gap-1 overflow-x-auto border-b border-slate-800 bg-slate-950 px-3'>
              {activePath.split('/').map((segment, index, segments) => (
                <div key={`${segment}-${index}`} className='flex items-center gap-1 whitespace-nowrap text-xs text-slate-500'>
                  <span>{segment}</span>

                  {index < segments.length - 1 ? <span className='text-slate-700'>/</span> : null}
                </div>
              ))}
            </div>
          ) : null}

          <div className='min-h-0 flex-1'>
            {fileLoading ? (
              <div className='flex h-full items-center justify-center'>
                <RefreshCw className='size-5 animate-spin text-slate-500' />
              </div>
            ) : diffMode && diff ? (
              <CodeDiffViewer diff={diff} />
            ) : (
              <CodeViewer file={activeFile} />
            )}
          </div>

          <footer className='flex h-7 items-center justify-between border-t border-slate-800 bg-slate-900 px-3 text-[11px] text-slate-500'>
            <span>{branch}</span>

            <div className='flex items-center gap-4'>
              {activeFile ? (
                <>
                  <span>{activeFile.language}</span>

                  <span>{activeFile.size} bytes</span>
                </>
              ) : null}

              <span>Read only</span>
            </div>
          </footer>
        </main>
      </div>
    </div>
  );
}
