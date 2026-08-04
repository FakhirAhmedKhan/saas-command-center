'use client';

import Link from 'next/link';

import { useAuth } from '@/features/auth/auth-provider';

export default function DashboardPage() {
  const {
    user,
    workspaces,
  } = useAuth();

  return (
    <div className="page-stack">
      <section className="page-heading">
        <div>
          <p className="eyebrow">
            Portfolio overview
          </p>

          <h1>
            Welcome back
            {user?.displayName
              ? `, ${user.displayName}`
              : ''}
          </h1>

          <p>
            Your workspace foundation is ready.
            SaaS applications will be added in
            the next phase.
          </p>
        </div>
      </section>

      <section className="metric-grid">
        <article className="metric-card">
          <span>Workspaces</span>
          <strong>{workspaces.length}</strong>
          <p>Available to your account</p>
        </article>

        <article className="metric-card">
          <span>SaaS applications</span>
          <strong>0</strong>
          <p>Application registry comes next</p>
        </article>

        <article className="metric-card">
          <span>Open blockers</span>
          <strong>0</strong>
          <p>Development tracking comes later</p>
        </article>
      </section>

      <section className="section-card">
        <div className="section-card-header">
          <div>
            <h2>Your workspaces</h2>
            <p>
              Open a workspace to manage its
              settings and members.
            </p>
          </div>
        </div>

        {workspaces.length === 0 ? (
          <div className="empty-state">
            <h3>No workspace found</h3>
            <p>
              Your account does not currently
              belong to a workspace.
            </p>
          </div>
        ) : (
          <div className="workspace-grid">
            {workspaces.map(
              (workspace) => {
                const role =
                  workspace.members?.[0]
                    ?.role ?? 'VIEWER';

                return (
                  <Link
                    className="workspace-card"
                    href={`/workspaces/${workspace.id}`}
                    key={workspace.id}
                  >
                    <div className="workspace-card-top">
                      <div className="workspace-icon">
                        {workspace.name
                          .charAt(0)
                          .toUpperCase()}
                      </div>

                      <span className="badge">
                        {role}
                      </span>
                    </div>

                    <div>
                      <h3>{workspace.name}</h3>
                      <p>/{workspace.slug}</p>
                    </div>

                    <span className="card-link">
                      Open workspace →
                    </span>
                  </Link>
                );
              },
            )}
          </div>
        )}
      </section>
    </div>
  );
}