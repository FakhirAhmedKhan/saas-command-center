'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import type { ReactNode } from 'react';

import { useAuth } from '@/features/auth/auth-provider';

interface DashboardShellProps {
  children: ReactNode;
}

export function DashboardShell({ children }: DashboardShellProps) {
  const router = useRouter();
  const pathname = usePathname();

  const { user, workspaces, logout } = useAuth();

  const selectedWorkspaceId = pathname.match(/\/workspaces\/([^/]+)/)?.[1] ?? '';

  async function handleLogout() {
    await logout();
    router.replace('/login');
  }

  return (
    <div className="dashboard-layout">
      <aside className="sidebar">
        <Link className="sidebar-brand" href="/dashboard">
          <span className="brand-mark small">SC</span>

          <span>
            SaaS Command
            <strong>Center</strong>
          </span>
        </Link>

        <nav className="sidebar-nav">
          <Link
            className={pathname === '/dashboard' ? 'nav-item active' : 'nav-item'}
            href="/dashboard"
          >
            <span>Overview</span>
          </Link>

          <p className="nav-section-label">Workspaces</p>

          {workspaces.map((workspace) => (
            <Link
              className={selectedWorkspaceId === workspace.id ? 'nav-item active' : 'nav-item'}
              href={`/workspaces/${workspace.id}`}
              key={workspace.id}
            >
              <span className="workspace-dot" />
              <span>{workspace.name}</span>
            </Link>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="user-summary">
            <div className="avatar">
              {(user?.displayName || user?.email || 'U').charAt(0).toUpperCase()}
            </div>

            <div>
              <strong>{user?.displayName || 'Account owner'}</strong>

              <span>{user?.email}</span>
            </div>
          </div>

          <button
            className="button button-ghost button-full"
            onClick={() => void handleLogout()}
            type="button"
          >
            Sign out
          </button>
        </div>
      </aside>

      <div className="dashboard-main">
        <header className="topbar">
          <div>
            <p className="eyebrow">Project visibility</p>

            <strong>SaaS Command Center</strong>
          </div>

          {workspaces.length > 0 && (
            <select
              aria-label="Select workspace"
              className="workspace-select"
              value={selectedWorkspaceId}
              onChange={(event) => {
                const workspaceId = event.target.value;

                if (workspaceId) {
                  router.push(`/workspaces/${workspaceId}`);
                }
              }}
            >
              <option value="">Select workspace</option>

              {workspaces.map((workspace) => (
                <option key={workspace.id} value={workspace.id}>
                  {workspace.name}
                </option>
              ))}
            </select>
          )}
        </header>

        <main className="page-content">{children}</main>
      </div>
    </div>
  );
}
