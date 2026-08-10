'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';

import { ArrowRight } from 'lucide-react';

import { getApplications } from '@/features/applications/application-api';
import type { Workspace } from '@/features/auth/auth.types';
import { apiRequest } from '@/features/lib/api/api-client';
import { getErrorMessage } from '@/features/lib/api/api-error';
import { PageError } from '@/components/states/page-error';
import { PageLoading } from '@/components/states/page-loading';

export default function WorkspacePage() {
  const params = useParams<{
    workspaceId: string;
  }>();

  const workspaceId = params.workspaceId;

  const [workspace, setWorkspace] = useState<Workspace | null>(null);

  const [applicationCount, setApplicationCount] = useState<number | null>(null);

  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function loadWorkspace() {
      try {
        const [workspaceResponse, applicationsResponse] = await Promise.all([
          apiRequest<Workspace>(`/workspaces/${workspaceId}`),
          getApplications(workspaceId, { limit: 1 }),
        ]);

        if (active) {
          setWorkspace(workspaceResponse);
          setApplicationCount(applicationsResponse.meta.total);
        }
      } catch (caughtError) {
        if (active) {
          setError(getErrorMessage(caughtError));
        }
      }
    }

    void loadWorkspace();

    return () => {
      active = false;
    };
  }, [workspaceId]);

  if (error) {
    return (
      <div className="mx-auto w-full max-w-[1600px] p-4 sm:p-6 lg:p-8">
        <PageError message={error} />
      </div>
    );
  }

  if (!workspace) {
    return <PageLoading label="Loading workspace…" />;
  }

  const role = workspace.members?.[0]?.role ?? 'VIEWER';

  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-6 p-4 sm:p-6 lg:p-8">
      <header className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Workspace</p>

          <h1 className="mt-1 text-[26px] font-semibold tracking-tight text-slate-950">{workspace.name}</h1>

          <p className="mt-1 text-sm leading-6 text-slate-500">Manage access and prepare this workspace for your SaaS portfolio.</p>
        </div>

        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">{role}</span>
      </header>

      <section className="grid gap-4 sm:grid-cols-3">
        <MetricCard label="Applications" value={applicationCount ?? '—'} description="Registered in this workspace" />
        <MetricCard label="Members" value={workspace._count?.members ?? 1} description="People with workspace access" />
        <MetricCard label="Your role" value={role} description="Workspace access level" />
      </section>

      <section className="rounded-xl border border-slate-200 bg-white">
        <div className="border-b border-slate-100 p-4 sm:p-5">
          <h2 className="text-[15px] font-semibold text-slate-950">Workspace management</h2>
          <p className="mt-1 text-sm leading-6 text-slate-500">Update workspace information or manage member access.</p>
        </div>

        <div className="grid gap-3 p-4 sm:grid-cols-2 sm:p-5">
          <Link
            href={`/workspaces/${workspace.id}/settings`}
            className="group flex flex-col gap-1 rounded-lg border border-slate-200 p-3.5 transition hover:border-slate-300"
          >
            <h3 className="text-sm font-semibold text-slate-900">Workspace settings</h3>
            <p className="text-xs leading-5 text-slate-500">Update the workspace name and slug.</p>
            <span className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-brand-700">
              Open settings
              <ArrowRight className="size-3 transition group-hover:translate-x-0.5" aria-hidden="true" />
            </span>
          </Link>

          <Link
            href={`/workspaces/${workspace.id}/settings/members`}
            className="group flex flex-col gap-1 rounded-lg border border-slate-200 p-3.5 transition hover:border-slate-300"
          >
            <h3 className="text-sm font-semibold text-slate-900">Members and roles</h3>
            <p className="text-xs leading-5 text-slate-500">Add users and control workspace permissions.</p>
            <span className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-brand-700">
              Manage members
              <ArrowRight className="size-3 transition group-hover:translate-x-0.5" aria-hidden="true" />
            </span>
          </Link>
        </div>
      </section>
    </div>
  );
}

interface MetricCardProps {
  label: string;
  value: string | number;
  description: string;
}

function MetricCard({ label, value, description }: MetricCardProps) {
  return (
    <article className="rounded-xl border border-slate-200 bg-white p-4">
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p className="mt-1.5 text-2xl font-semibold tracking-tight text-slate-950">{value}</p>
      <p className="mt-1 text-xs text-slate-400">{description}</p>
    </article>
  );
}
