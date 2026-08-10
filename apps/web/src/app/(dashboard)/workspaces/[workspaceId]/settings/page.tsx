'use client';

import { useParams } from 'next/navigation';
import { type FormEvent, useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PageLoading } from '@/components/states/page-loading';

import { useAuth } from '@/features/auth/auth-provider';
import type { Workspace } from '@/features/auth/auth.types';
import { apiRequest } from '@/features/lib/api/api-client';
import { getErrorMessage } from '@/features/lib/api/api-error';
import { WorkspaceSettingsNav } from '@/features/workspaces/components/workspace-settings-nav';

export default function WorkspaceSettingsPage() {
  const params = useParams<{
    workspaceId: string;
  }>();

  const workspaceId = params.workspaceId;

  const { updateWorkspaceInState } = useAuth();

  const [workspace, setWorkspace] = useState<Workspace | null>(null);

  const [name, setName] = useState('');

  const [slug, setSlug] = useState('');

  const [error, setError] = useState<string | null>(null);

  const [success, setSuccess] = useState<string | null>(null);

  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let active = true;

    async function loadWorkspace() {
      try {
        const response = await apiRequest<Workspace>(`/workspaces/${workspaceId}`);

        if (!active) {
          return;
        }

        setWorkspace(response);
        setName(response.name);
        setSlug(response.slug);
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

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError(null);
    setSuccess(null);
    setSubmitting(true);

    try {
      const updatedWorkspace = await apiRequest<Workspace>(`/workspaces/${workspaceId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          name,
          slug,
        }),
      });

      setWorkspace(updatedWorkspace);
      updateWorkspaceInState(updatedWorkspace);

      setSuccess('Workspace updated successfully.');
    } catch (caughtError) {
      setError(getErrorMessage(caughtError));
    } finally {
      setSubmitting(false);
    }
  }

  if (!workspace && !error) {
    return <PageLoading label="Loading workspace settings…" />;
  }

  const role = workspace?.members?.[0]?.role ?? 'VIEWER';

  const canEdit = role === 'OWNER' || role === 'ADMIN';

  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-5 p-4 sm:p-6 lg:p-8">
      <div>
        <h1 className="text-[26px] font-semibold tracking-tight text-slate-950">Settings</h1>
        <p className="mt-1 text-sm leading-6 text-slate-500">Manage workspace information, members and integrations.</p>
      </div>

      <WorkspaceSettingsNav workspaceId={workspaceId} />

      <div className="max-w-lg space-y-4">
        <div>
          <h2 className="text-[15px] font-semibold text-slate-950">General information</h2>
          <p className="mt-1 text-sm leading-6 text-slate-500">Keep the workspace name and URL identifier clear and consistent.</p>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit}>
          {error ? <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{error}</div> : null}

          {success ? <div role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{success}</div> : null}

          {!canEdit ? (
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">Your role has read-only access to workspace settings.</div>
          ) : null}

          <Input
            label="Workspace name"
            disabled={!canEdit}
            value={name}
            onChange={(event) => setName(event.target.value)}
            minLength={2}
            required
          />

          <Input
            label="Workspace slug"
            disabled={!canEdit}
            value={slug}
            onChange={(event) => setSlug(event.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
            minLength={2}
            required
            hint="Lowercase letters, numbers and hyphens only."
          />

          {canEdit ? (
            <Button type="submit" loading={submitting}>
              Save changes
            </Button>
          ) : null}
        </form>
      </div>
    </div>
  );
}
