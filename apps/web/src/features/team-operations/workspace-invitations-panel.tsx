'use client';

import { createWorkspaceInvitation, getWorkspaceInvitations, resendWorkspaceInvitation, revokeWorkspaceInvitation } from './team-operations-api';
import type { WorkspaceInvitation, WorkspaceRole } from './team-operations.types';
import { getErrorMessage } from '../applications/application-utils';
import { useCallback, useEffect, useRef, useState } from 'react';

interface WorkspaceInvitationsPanelProps {
  workspaceId: string;

  canManageMembers: boolean;
}

function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',

    timeStyle: 'short',
  }).format(new Date(value));
}

export function WorkspaceInvitationsPanel({ workspaceId, canManageMembers }: WorkspaceInvitationsPanelProps) {
  const [invitations, setInvitations] = useState<WorkspaceInvitation[]>([]);

  const [loading, setLoading] = useState(true);

  const [email, setEmail] = useState('');

  const [role, setRole] = useState<WorkspaceRole>('VIEWER');

  const [submitting, setSubmitting] = useState(false);

  const [error, setError] = useState<string | null>(null);

  const [invitationUrl, setInvitationUrl] = useState<string | null>(null);

  const controllerRef = useRef<AbortController | null>(null);

  const load = useCallback(async () => {
    controllerRef.current?.abort();

    const controller = new AbortController();

    controllerRef.current = controller;

    setLoading(true);

    try {
      const result = await getWorkspaceInvitations(workspaceId, controller.signal);

      if (controller.signal.aborted) {
        return;
      }

      setInvitations(result);

      setError(null);
    } catch (caughtError) {
      if (controller.signal.aborted) {
        return;
      }

      setError(getErrorMessage(caughtError));
    } finally {
      if (!controller.signal.aborted) {
        setLoading(false);
      }
    }
  }, [workspaceId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();

    return () => {
      controllerRef.current?.abort();
    };
  }, [load]);

  async function invite(): Promise<void> {
    setSubmitting(true);
    setError(null);
    setInvitationUrl(null);

    try {
      const result = await createWorkspaceInvitation(workspaceId, {
        email,
        role,
      });

      setInvitationUrl(result.invitationUrl);

      setEmail('');

      await load();
    } catch (caughtError) {
      setError(getErrorMessage(caughtError));
    } finally {
      setSubmitting(false);
    }
  }

  async function resend(invitation: WorkspaceInvitation): Promise<void> {
    setError(null);
    setInvitationUrl(null);

    try {
      const result = await resendWorkspaceInvitation(workspaceId, invitation.id);

      setInvitationUrl(result.invitationUrl);

      await load();
    } catch (caughtError) {
      setError(getErrorMessage(caughtError));
    }
  }

  async function revoke(invitation: WorkspaceInvitation): Promise<void> {
    const confirmed = window.confirm(`Revoke the invitation for ${invitation.email}?`);

    if (!confirmed) {
      return;
    }

    try {
      await revokeWorkspaceInvitation(workspaceId, invitation.id);

      await load();
    } catch (caughtError) {
      setError(getErrorMessage(caughtError));
    }
  }

  return (
    <section className='space-y-5'>
      {canManageMembers ? (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void invite();
          }}
          className='rounded-2xl border border-slate-200 bg-white p-5 shadow-sm'
        >
          <h2 className='font-semibold text-slate-950'>Invite workspace member</h2>

          <div className='mt-4 grid gap-4 md:grid-cols-[1fr_180px_auto]'>
            <label>
              <span className='text-sm font-medium'>Email</span>

              <input
                required
                type='email'
                value={email}
                onChange={(event) => {
                  setEmail(event.target.value);
                }}
                className='mt-1 w-full rounded-lg border border-slate-300 px-3 py-2'
                placeholder='developer@example.com'
              />
            </label>

            <label>
              <span className='text-sm font-medium'>Role</span>

              <select
                value={role}
                onChange={(event) => {
                  setRole(event.target.value as WorkspaceRole);
                }}
                className='mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2'
              >
                <option value='ADMIN'>Admin</option>

                <option value='DEVELOPER'>Developer</option>

                <option value='VIEWER'>Viewer</option>
              </select>
            </label>

            <button
              type='submit'
              disabled={submitting}
              className='self-end rounded-lg bg-slate-950 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50'
            >
              {submitting ? 'Inviting…' : 'Send invitation'}
            </button>
          </div>
        </form>
      ) : null}

      {invitationUrl ? (
        <div className='rounded-xl border border-blue-200 bg-blue-50 p-4'>
          <p className='font-medium text-blue-950'>Invitation created</p>

          <p className='mt-1 text-sm text-blue-800'>This link is shown only for this request. Copy it now.</p>

          <div className='mt-3 flex gap-2'>
            <input readOnly value={invitationUrl} className='min-w-0 flex-1 rounded-lg border border-blue-200 bg-white px-3 py-2 text-sm' />

            <button
              type='button'
              onClick={() => {
                void navigator.clipboard.writeText(invitationUrl);
              }}
              className='rounded-lg bg-blue-950 px-4 py-2 text-sm font-medium text-white'
            >
              Copy
            </button>
          </div>
        </div>
      ) : null}

      {error ? (
        <div role='alert' className='rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800'>
          {error}
        </div>
      ) : null}

      <section className='overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm'>
        <div className='border-b border-slate-200 px-5 py-4'>
          <h2 className='font-semibold text-slate-950'>Workspace invitations</h2>
        </div>

        {loading ? (
          <div className='m-5 h-36 animate-pulse rounded-xl bg-slate-200' />
        ) : invitations.length === 0 ? (
          <p className='p-5 text-sm text-slate-500'>No workspace invitations have been created.</p>
        ) : (
          <div className='overflow-x-auto'>
            <table className='min-w-[900px] w-full text-sm'>
              <thead>
                <tr className='border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500'>
                  <th className='px-4 py-3'>Email</th>

                  <th className='px-4 py-3'>Role</th>

                  <th className='px-4 py-3'>Status</th>

                  <th className='px-4 py-3'>Delivery</th>

                  <th className='px-4 py-3'>Expires</th>

                  <th className='px-4 py-3'>Sent</th>

                  <th className='px-4 py-3' />
                </tr>
              </thead>

              <tbody>
                {invitations.map((invitation) => (
                  <tr key={invitation.id} className='border-b border-slate-100'>
                    <td className='px-4 py-4 font-medium'>{invitation.email}</td>

                    <td className='px-4 py-4'>{invitation.role}</td>

                    <td className='px-4 py-4'>{invitation.status}</td>

                    <td className='px-4 py-4'>
                      <p>{invitation.deliveryStatus}</p>

                      {invitation.deliveryError ? <p className='mt-1 max-w-xs text-xs text-red-700'>{invitation.deliveryError}</p> : null}
                    </td>

                    <td className='px-4 py-4'>{formatDateTime(invitation.expiresAt)}</td>

                    <td className='px-4 py-4'>{invitation.sendCount}</td>

                    <td className='px-4 py-4'>
                      {canManageMembers && invitation.status === 'PENDING' ? (
                        <div className='flex gap-2'>
                          <button
                            type='button'
                            onClick={() => {
                              void resend(invitation);
                            }}
                            className='rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium'
                          >
                            Resend
                          </button>

                          <button
                            type='button'
                            onClick={() => {
                              void revoke(invitation);
                            }}
                            className='rounded-lg border border-red-300 px-3 py-1.5 text-xs font-medium text-red-700'
                          >
                            Revoke
                          </button>
                        </div>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </section>
  );
}
