'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { getErrorMessage } from '@/features/applications/application-utils';
import { useSession } from '@/features/auth/use-session';
import { acceptInvitation, declineInvitation, getInvitationPreview } from '@/features/team-operations/team-operations-api';
import type { InvitationPreview } from '@/features/team-operations/team-operations.types';

export default function InvitationPage() {
  const params = useParams<{
    token: string;
  }>();

  const router = useRouter();

  const { status, user } = useSession();

  const [invitation, setInvitation] = useState<InvitationPreview | null>(null);

  const [loading, setLoading] = useState(true);

  const [submitting, setSubmitting] = useState(false);

  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    void getInvitationPreview(params.token, controller.signal)
      .then((result) => {
        setInvitation(result);

        setError(null);
      })
      .catch((caughtError) => {
        setError(getErrorMessage(caughtError));
      })
      .finally(() => {
        setLoading(false);
      });

    return () => {
      controller.abort();
    };
  }, [params.token]);

  async function accept(): Promise<void> {
    setSubmitting(true);
    setError(null);

    try {
      const result = await acceptInvitation(params.token);

      router.replace(`/workspaces/${result.workspaceId}/applications`);
    } catch (caughtError) {
      setError(getErrorMessage(caughtError));

      setSubmitting(false);
    }
  }

  async function decline(): Promise<void> {
    setSubmitting(true);
    setError(null);

    try {
      await declineInvitation(params.token);

      router.replace('/dashboard');
    } catch (caughtError) {
      setError(getErrorMessage(caughtError));

      setSubmitting(false);
    }
  }

  if (loading || status === 'loading') {
    return (
      <main className='flex min-h-screen items-center justify-center p-6'>
        <p>Loading invitation…</p>
      </main>
    );
  }

  if (error || !invitation) {
    return (
      <main className='flex min-h-screen items-center justify-center p-6'>
        <section className='w-full max-w-lg rounded-2xl border border-red-200 bg-white p-7 shadow-sm'>
          <h1 className='text-xl font-bold'>Invitation unavailable</h1>

          <p className='mt-3 text-sm text-red-700'>{error ?? 'Invitation could not be loaded.'}</p>

          <Link href='/dashboard' className='mt-5 inline-block font-medium underline'>
            Return to dashboard
          </Link>
        </section>
      </main>
    );
  }

  const unavailable = invitation.status !== 'PENDING';

  return (
    <main className='flex min-h-screen items-center justify-center p-6'>
      <section className='w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-7 shadow-sm'>
        <p className='text-sm font-medium text-slate-500'>Workspace invitation</p>

        <h1 className='mt-2 text-2xl font-bold text-slate-950'>Join {invitation.workspace.name}</h1>

        <p className='mt-3 text-sm text-slate-600'>
          {invitation.invitedBy.name ?? invitation.invitedBy.email} invited <strong>{invitation.email}</strong> as <strong>{invitation.role}</strong>.
        </p>

        {unavailable ? (
          <div className='mt-5 rounded-xl bg-amber-50 p-4 text-sm text-amber-800'>This invitation is {invitation.status.toLowerCase()}.</div>
        ) : status === 'unauthenticated' ? (
          <div className='mt-6'>
            <p className='text-sm text-slate-600'>Sign in using {invitation.email} before accepting.</p>

            <Link
              href={`/login?next=${encodeURIComponent(`/invitations/${params.token}`)}`}
              className='mt-4 inline-block rounded-lg bg-slate-950 px-4 py-2.5 font-medium text-white'
            >
              Sign in
            </Link>
          </div>
        ) : (
          <>
            {user?.email.toLowerCase() !== invitation.email.toLowerCase() ? (
              <div className='mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800'>
                You are signed in as {user?.email}. This invitation belongs to {invitation.email}.
              </div>
            ) : null}

            <div className='mt-6 flex gap-3'>
              <button
                type='button'
                disabled={submitting || user?.email.toLowerCase() !== invitation.email.toLowerCase()}
                onClick={() => {
                  void accept();
                }}
                className='rounded-lg bg-slate-950 px-4 py-2.5 font-medium text-white disabled:opacity-50'
              >
                Accept invitation
              </button>

              <button
                type='button'
                disabled={submitting || user?.email.toLowerCase() !== invitation.email.toLowerCase()}
                onClick={() => {
                  void decline();
                }}
                className='rounded-lg border border-slate-300 px-4 py-2.5 font-medium'
              >
                Decline
              </button>
            </div>
          </>
        )}
      </section>
    </main>
  );
}
