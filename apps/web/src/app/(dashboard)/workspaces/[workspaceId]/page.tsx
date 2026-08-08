'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';

import type { Workspace } from '@/features/auth/auth.types';
import { apiRequest } from '@/features/lib/api/api-client';
import { getErrorMessage } from '@/features/lib/api/api-error';

export default function WorkspacePage() {
  const params = useParams<{
    workspaceId: string;
  }>();

  const workspaceId = params.workspaceId;

  const [workspace, setWorkspace] = useState<Workspace | null>(null);

  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function loadWorkspace() {
      try {
        const response = await apiRequest<Workspace>(`/workspaces/${workspaceId}`);

        if (active) {
          setWorkspace(response);
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
    return <div className="alert alert-error">{error}</div>;
  }

  if (!workspace) {
    return (
      <div className="inline-loader">
        <div className="spinner" />
        Loading workspace…
      </div>
    );
  }

  const role = workspace.members?.[0]?.role ?? 'VIEWER';

  return (
    <div className="page-stack">
      <section className="page-heading split">
        <div>
          <p className="eyebrow">Workspace</p>

          <h1>{workspace.name}</h1>

          <p>Manage access and prepare this workspace for your SaaS portfolio.</p>
        </div>

        <span className="badge badge-large">{role}</span>
      </section>

      <section className="metric-grid">
        <article className="metric-card">
          <span>Members</span>
          <strong>{workspace._count?.members ?? 1}</strong>
          <p>People with workspace access</p>
        </article>

        <article className="metric-card">
          <span>Applications</span>
          <strong>0</strong>
          <p>Application registry comes next</p>
        </article>

        <article className="metric-card">
          <span>Your role</span>
          <strong className="metric-text">{role}</strong>
          <p>Workspace access level</p>
        </article>
      </section>

      <section className="section-card">
        <div className="section-card-header">
          <div>
            <h2>Workspace management</h2>
            <p>Update workspace information or manage member access.</p>
          </div>
        </div>

        <div className="action-grid">
          <Link className="action-card" href={`/workspaces/${workspace.id}/settings`}>
            <h3>Workspace settings</h3>
            <p>Update the workspace name and slug.</p>
            <span>Open settings →</span>
          </Link>

          <Link className="action-card" href={`/workspaces/${workspace.id}/settings/members`}>
            <h3>Members and roles</h3>
            <p>Add users and control workspace permissions.</p>
            <span>Manage members →</span>
          </Link>
        </div>
      </section>
    </div>
  );
}
