'use client';

import Link from 'next/link';

import { ArrowRight, Boxes, Building2, FolderKanban, TriangleAlert, Plus, Activity, Globe2 } from 'lucide-react';

import { useAuth } from '@/features/auth/auth-provider';
import { NotificationBell } from '@/features/team-operations/notification-bell';
// import { Activity } from 'react';

export default function DashboardPage() {
  const { user, workspaces } = useAuth();

  return (
    <div className="space-y-8">
      {/* Page heading */}
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-card sm:p-8">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-brand-600">Portfolio overview</p>
            <NotificationBell />
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
              Welcome back
              {user?.displayName ? `, ${user.displayName}` : ''}
            </h1>

            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500 sm:text-base">
              Manage your workspaces and SaaS applications from one command center.
            </p>
          </div>

          <Link
            href="/workspaces/new"
            className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700"
          >
            <Plus className="size-4" />
            New workspace
          </Link>
        </div>
      </section>

      {/* Metrics */}
      <section className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        <MetricCard icon={<Building2 className="size-5" />} label="Workspaces" value={workspaces.length} description="Available to your account" />

        <MetricCard icon={<Boxes className="size-5" />} label="SaaS applications" value={0} description="Managed across your workspaces" />

        <MetricCard icon={<TriangleAlert className="size-5" />} label="Open blockers" value={0} description="Development tracking comes later" />
      </section>

      {/* Workspaces */}
      <section className="rounded-3xl border border-slate-200 bg-white shadow-card">
        <div className="border-b border-slate-100 p-6 sm:p-8">
          <h2 className="text-xl font-bold text-slate-950">Your workspaces</h2>

          <p className="mt-2 text-sm leading-6 text-slate-500">Open a workspace to manage its applications, members, and settings.</p>
        </div>

        <div className="p-6 sm:p-8">
          {workspaces.length === 0 ? (
            <div className="flex min-h-64 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 text-center">
              <div className="flex size-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
                <Building2 className="size-6" />
              </div>

              <h3 className="mt-5 text-lg font-semibold text-slate-900">No workspace found</h3>

              <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">Your account does not currently belong to any workspace.</p>
            </div>
          ) : (
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {workspaces.map((workspace: { id: string; name: string; slug: string; members?: { role: string }[] }) => {
                const role = workspace.members?.[0]?.role ?? 'VIEWER';

                return (
                  <article
                    key={workspace.id}
                    className="flex flex-col rounded-2xl border border-slate-200 bg-white p-5 transition duration-200 hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-card-hover"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex size-12 items-center justify-center rounded-2xl bg-brand-50 text-lg font-bold text-brand-700">
                        {workspace.name.charAt(0).toUpperCase()}
                      </div>

                      <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">{role}</span>
                    </div>

                    <div className="mt-5 flex-1">
                      <h3 className="text-lg font-semibold text-slate-950">{workspace.name}</h3>

                      <p className="mt-1 text-sm text-slate-400">/{workspace.slug}</p>
                    </div>

                    <div className="mt-6 grid gap-3">
                      <Link
                        href={`/workspaces/${workspace.id}/applications`}
                        className="inline-flex h-11 items-center justify-between rounded-xl bg-brand-600 px-4 text-sm font-semibold text-white transition hover:bg-brand-700"
                      >
                        <span className="inline-flex items-center gap-2">
                          <FolderKanban className="size-4" />
                          Applications
                        </span>

                        <ArrowRight className="size-4" />
                      </Link>
                      <Link
                        href={`/workspaces/${workspace.id}/repositories`}
                        className="inline-flex h-11 items-center justify-between rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                      >
                        <span>
                          Repositories
                        </span>

                        <ArrowRight className="size-4" />
                      </Link>
                      <Link
                        href={`/workspaces/${workspace.id}/activities`}
                        className="inline-flex h-11 items-center justify-between rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                      >
                        <span className="inline-flex items-center gap-2">
                          <Activity className="size-4" />
                          Activity history
                        </span>

                        <ArrowRight className="size-4" />
                      </Link>

                      <Link
                        href={`/workspaces/${workspace.id}/websites`}
                        className="inline-flex h-11 items-center justify-between rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                      >
                        <span className="inline-flex items-center gap-2">
                          <Activity className="size-4" />
                          Analytics
                        </span>

                        <ArrowRight className="size-4" />
                      </Link>

                      <Link href={`/workspaces/${workspace.id}/websites`}>Processing</Link>
                      <Link href={`/workspaces/${workspace.id}/settings/integrations`}>Integrations</Link>
                      <Link href={`/workspaces/${workspace.id}/monitoring`}>Monitoring</Link>
                      <Link
                        href={`/workspaces/${workspace.id}`}
                        className="inline-flex h-11 items-center justify-between rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                      >
                        Open workspace
                        <ArrowRight className="size-4" />
                      </Link>

                      <Link
                        href={`/workspaces/${workspace.id}/websites`}
                        className="inline-flex h-11 items-center justify-between rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                      >
                        <span className="inline-flex items-center gap-2">
                          <Globe2 className="size-4" />
                          Websites
                        </span>

                        <ArrowRight className="size-4" />
                      </Link>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

interface MetricCardProps {
  icon: React.ReactNode;
  label: string;
  value: number;
  description: string;
}

function MetricCard({ icon, label, value, description }: MetricCardProps) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-slate-500">{label}</p>

          <p className="mt-2 text-3xl font-bold tracking-tight text-slate-950">{value}</p>
        </div>

        <div className="flex size-11 items-center justify-center rounded-xl bg-brand-50 text-brand-600">{icon}</div>
      </div>

      <p className="mt-4 text-sm text-slate-500">{description}</p>
    </article>
  );
}
