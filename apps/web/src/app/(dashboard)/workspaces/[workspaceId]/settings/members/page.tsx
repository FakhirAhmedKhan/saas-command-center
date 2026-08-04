'use client';

import {
  useParams,
} from 'next/navigation';
import {
  type FormEvent,
  useCallback,
  useEffect,
  useState,
} from 'react';

import type {
  Workspace,
  WorkspaceMember,
  WorkspaceRole,
} from '@/features/auth/auth.types';

import { apiRequest } from '@/features/lib/api/api-client';
import { getErrorMessage } from '@/features/lib/api/api-error'; 

const assignableRoles: WorkspaceRole[] = [
  'ADMIN',
  'DEVELOPER',
  'VIEWER',
];

export default function WorkspaceMembersPage() {
  const params = useParams<{
    workspaceId: string;
  }>();

  const workspaceId =
    params.workspaceId;

  const [workspace, setWorkspace] =
    useState<Workspace | null>(null);

  const [members, setMembers] =
    useState<WorkspaceMember[]>([]);

  const [email, setEmail] =
    useState('');

  const [role, setRole] =
    useState<WorkspaceRole>('VIEWER');

  const [error, setError] =
    useState<string | null>(null);

  const [success, setSuccess] =
    useState<string | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [submitting, setSubmitting] =
    useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [
        workspaceResponse,
        membersResponse,
      ] = await Promise.all([
        apiRequest<Workspace>(
          `/workspaces/${workspaceId}`,
        ),

        apiRequest<WorkspaceMember[]>(
          `/workspaces/${workspaceId}/members`,
        ),
      ]);

      setWorkspace(workspaceResponse);
      setMembers(membersResponse);
    } catch (caughtError) {
      setError(
        getErrorMessage(caughtError),
      );
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const currentRole =
    workspace?.members?.[0]?.role ??
    'VIEWER';

  const canManage =
    currentRole === 'OWNER' ||
    currentRole === 'ADMIN';

  async function handleAddMember(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setError(null);
    setSuccess(null);
    setSubmitting(true);

    try {
      await apiRequest(
        `/workspaces/${workspaceId}/members`,
        {
          method: 'POST',
          body: JSON.stringify({
            email,
            role,
          }),
        },
      );

      setEmail('');
      setRole('VIEWER');

      setSuccess(
        'Workspace member added.',
      );

      await loadData();
    } catch (caughtError) {
      setError(
        getErrorMessage(caughtError),
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRoleChange(
    member: WorkspaceMember,
    nextRole: WorkspaceRole,
  ) {
    setError(null);
    setSuccess(null);

    try {
      await apiRequest(
        `/workspaces/${workspaceId}/members/${member.userId}`,
        {
          method: 'PATCH',
          body: JSON.stringify({
            role: nextRole,
          }),
        },
      );

      setMembers((current) =>
        current.map((item) =>
          item.id === member.id
            ? {
                ...item,
                role: nextRole,
              }
            : item,
        ),
      );

      setSuccess(
        'Member role updated.',
      );
    } catch (caughtError) {
      setError(
        getErrorMessage(caughtError),
      );
    }
  }

  async function handleRemoveMember(
    member: WorkspaceMember,
  ) {
    const confirmed = window.confirm(
      `Remove ${member.user.email} from this workspace?`,
    );

    if (!confirmed) {
      return;
    }

    setError(null);
    setSuccess(null);

    try {
      await apiRequest(
        `/workspaces/${workspaceId}/members/${member.userId}`,
        {
          method: 'DELETE',
        },
      );

      setMembers((current) =>
        current.filter(
          (item) =>
            item.id !== member.id,
        ),
      );

      setSuccess(
        'Workspace member removed.',
      );
    } catch (caughtError) {
      setError(
        getErrorMessage(caughtError),
      );
    }
  }

  if (loading) {
    return (
      <div className="inline-loader">
        <div className="spinner" />
        Loading members…
      </div>
    );
  }

  return (
    <div className="page-stack">
      <section className="page-heading">
        <div>
          <p className="eyebrow">
            Workspace access
          </p>

          <h1>Members and roles</h1>

          <p>
            Add registered users and assign only
            the access they require.
          </p>
        </div>
      </section>

      {error && (
        <div className="alert alert-error">
          {error}
        </div>
      )}

      {success && (
        <div className="alert alert-success">
          {success}
        </div>
      )}

      {canManage && (
        <section className="section-card">
          <div className="section-card-header">
            <div>
              <h2>Add member</h2>
              <p>
                The user must already have a
                registered account.
              </p>
            </div>
          </div>

          <form
            className="member-form"
            onSubmit={handleAddMember}
          >
            <label className="field">
              <span>Email address</span>

              <input
                type="email"
                value={email}
                onChange={(event) =>
                  setEmail(
                    event.target.value,
                  )
                }
                placeholder="developer@example.com"
                required
              />
            </label>

            <label className="field">
              <span>Role</span>

              <select
                value={role}
                onChange={(event) =>
                  setRole(
                    event.target
                      .value as WorkspaceRole,
                  )
                }
              >
                {assignableRoles.map(
                  (item) => (
                    <option
                      key={item}
                      value={item}
                    >
                      {item}
                    </option>
                  ),
                )}
              </select>
            </label>

            <button
              className="button button-primary"
              disabled={submitting}
              type="submit"
            >
              {submitting
                ? 'Adding…'
                : 'Add member'}
            </button>
          </form>
        </section>
      )}

      <section className="section-card">
        <div className="section-card-header">
          <div>
            <h2>
              Workspace members
            </h2>

            <p>
              {members.length}{' '}
              {members.length === 1
                ? 'member'
                : 'members'}
            </p>
          </div>
        </div>

        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Role</th>
                <th>Joined</th>
                <th aria-label="Actions" />
              </tr>
            </thead>

            <tbody>
              {members.map((member) => {
                const isOwner =
                  member.role === 'OWNER';

                return (
                  <tr key={member.id}>
                    <td>
                      <div className="table-user">
                        <div className="avatar">
                          {(
                            member.user
                              .displayName ||
                            member.user.email
                          )
                            .charAt(0)
                            .toUpperCase()}
                        </div>

                        <div>
                          <strong>
                            {member.user
                              .displayName ||
                              'Unnamed user'}
                          </strong>

                          <span>
                            {member.user.email}
                          </span>
                        </div>
                      </div>
                    </td>

                    <td>
                      {canManage &&
                      !isOwner ? (
                        <select
                          className="role-select"
                          value={member.role}
                          onChange={(event) =>
                            void handleRoleChange(
                              member,
                              event.target
                                .value as WorkspaceRole,
                            )
                          }
                        >
                          {assignableRoles.map(
                            (item) => (
                              <option
                                key={item}
                                value={item}
                              >
                                {item}
                              </option>
                            ),
                          )}
                        </select>
                      ) : (
                        <span className="badge">
                          {member.role}
                        </span>
                      )}
                    </td>

                    <td>
                      {new Date(
                        member.joinedAt,
                      ).toLocaleDateString()}
                    </td>

                    <td className="table-actions">
                      {canManage &&
                        !isOwner && (
                          <button
                            className="button-link danger"
                            onClick={() =>
                              void handleRemoveMember(
                                member,
                              )
                            }
                            type="button"
                          >
                            Remove
                          </button>
                        )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}