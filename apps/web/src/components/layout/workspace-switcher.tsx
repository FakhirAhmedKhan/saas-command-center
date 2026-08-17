'use client';

import { useAuth } from '@/features/auth/auth-provider';
import { cn } from '@command-center/ui';
import { Check, ChevronsUpDown, Plus, Settings } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

interface WorkspaceSwitcherProps {
  workspaceId: string;
}

export function WorkspaceSwitcher({ workspaceId }: WorkspaceSwitcherProps) {
  const { workspaces } = useAuth();

  const router = useRouter();

  const [open, setOpen] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);

  const activeWorkspace = workspaces.find((workspace) => workspace.id === workspaceId) ?? workspaces[0] ?? null;

  useEffect(() => {
    if (!open) {
      return;
    }

    function handlePointerDown(event: MouseEvent): void {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent): void {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    }

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  if (!activeWorkspace) {
    return (
      <Link
        href='/workspaces/new'
        className='flex items-center gap-2 rounded-lg border border-dashed border-slate-300 px-2.5 py-2 text-sm font-medium text-slate-500 transition hover:border-slate-400 hover:text-slate-700'
      >
        <Plus className='size-4 shrink-0' aria-hidden='true' />
        Create workspace
      </Link>
    );
  }

  return (
    <div ref={containerRef} className='relative'>
      <button
        type='button'
        onClick={() => setOpen((value) => !value)}
        aria-haspopup='listbox'
        aria-expanded={open}
        aria-label='Select workspace'
        className='flex w-full items-center gap-2 rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-left transition hover:bg-slate-50'
      >
        <span className='flex size-6 shrink-0 items-center justify-center rounded-md bg-brand-600 text-[10px] font-bold text-white'>
          {activeWorkspace.name.slice(0, 2).toUpperCase()}
        </span>

        <span className='min-w-0 flex-1 truncate text-[13px] font-semibold text-slate-900'>{activeWorkspace.name}</span>

        <ChevronsUpDown className='size-3.5 shrink-0 text-slate-400' aria-hidden='true' />
      </button>

      {open ? (
        <div role='listbox' className='absolute left-0 top-[calc(100%+4px)] z-40 w-72 rounded-lg border border-slate-200 bg-white p-1.5 shadow-float'>
          <p className='px-2 py-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400'>Workspaces</p>

          <div className='max-h-64 overflow-y-auto'>
            {workspaces.map((workspace) => {
              const isActive = workspace.id === activeWorkspace.id;

              return (
                <button
                  key={workspace.id}
                  type='button'
                  role='option'
                  aria-selected={isActive}
                  onClick={() => {
                    setOpen(false);

                    if (!isActive) {
                      router.push(`/workspaces/${workspace.id}`);
                    }
                  }}
                  className={cn(
                    'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition',
                    isActive ? 'bg-brand-50 text-brand-700' : 'text-slate-700 hover:bg-slate-50',
                  )}
                >
                  <span className='flex size-6 shrink-0 items-center justify-center rounded-md bg-slate-100 text-[10px] font-bold text-slate-600'>
                    {workspace.name.slice(0, 2).toUpperCase()}
                  </span>

                  <span className='min-w-0 flex-1 truncate'>{workspace.name}</span>

                  {isActive ? <Check className='size-3.5 shrink-0 text-brand-600' aria-hidden='true' /> : null}
                </button>
              );
            })}
          </div>

          <div className='mt-1 space-y-0.5 border-t border-slate-100 pt-1'>
            <Link
              href='/workspaces/new'
              onClick={() => setOpen(false)}
              className='flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-slate-700 transition hover:bg-slate-50'
            >
              <Plus className='size-3.5 shrink-0 text-slate-400' aria-hidden='true' />
              Create workspace
            </Link>

            <Link
              href={`/workspaces/${activeWorkspace.id}/settings`}
              onClick={() => setOpen(false)}
              className='flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-slate-700 transition hover:bg-slate-50'
            >
              <Settings className='size-3.5 shrink-0 text-slate-400' aria-hidden='true' />
              Workspace settings
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}
