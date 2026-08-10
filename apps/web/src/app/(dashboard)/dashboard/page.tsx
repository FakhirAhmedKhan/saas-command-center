'use client';

import Link from 'next/link';

import { ArrowRight, Building2, Plus } from 'lucide-react';

import { EmptyState } from '@/components/ui/empty-state';

import { useAuth } from '@/features/auth/auth-provider';

function getGreeting(): string {
  const hour = new Date().getHours();

  if (hour < 12) {
    return 'Good morning';
  }

  if (hour < 18) {
    return 'Good afternoon';
  }

  return 'Good evening';
}

export default function DashboardPage() {
  const { user, workspaces } = useAuth();

  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-6 p-4 sm:p-6 lg:p-8">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-[26px] font-semibold tracking-tight text-slate-950 sm:text-[28px]">
            {getGreeting()}
            {user?.displayName ? `, ${user.displayName}` : ''}
          </h1>

          <p className="mt-1 text-sm leading-6 text-slate-500">Here&apos;s what needs your attention.</p>
        </div>

        <Link
          href="/workspaces/new"
          className="inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-lg bg-brand-600 px-3.5 text-sm font-semibold text-white transition hover:bg-brand-700"
        >
          <Plus className="size-4" />
          New workspace
        </Link>
      </header>

      <section>
        <h2 className="mb-3 text-[13px] font-semibold uppercase tracking-wide text-slate-400">Your workspaces</h2>

        {workspaces.length === 0 ? (
          <EmptyState
            icon={<Building2 className="size-5" />}
            title="No workspace found"
            description="Create a workspace to start tracking applications, websites, and team activity."
            action={
              <Link
                href="/workspaces/new"
                className="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-brand-600 px-3.5 text-sm font-semibold text-white transition hover:bg-brand-700"
              >
                <Plus className="size-4" />
                Create workspace
              </Link>
            }
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {workspaces.map((workspace: { id: string; name: string; slug: string; members?: { role: string }[] }) => {
              const role = workspace.members?.[0]?.role ?? 'VIEWER';

              return (
                <Link
                  key={workspace.id}
                  href={`/workspaces/${workspace.id}`}
                  className="group flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 transition hover:border-slate-300"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-sm font-bold text-brand-700">
                      {workspace.name.charAt(0).toUpperCase()}
                    </div>

                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">{role}</span>
                  </div>

                  <div>
                    <h3 className="text-[15px] font-semibold text-slate-950">{workspace.name}</h3>
                    <p className="mt-0.5 text-xs text-slate-400">/{workspace.slug}</p>
                  </div>

                  <span className="mt-1 inline-flex items-center gap-1 text-sm font-medium text-brand-700 transition group-hover:gap-1.5">
                    Open workspace
                    <ArrowRight className="size-3.5" aria-hidden="true" />
                  </span>
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
