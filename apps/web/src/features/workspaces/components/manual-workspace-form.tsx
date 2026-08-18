'use client';

import { createWorkspace } from '../workspace-api';
import { Button, Input } from '@command-center/ui';
import { ArrowLeft } from 'lucide-react';
import { useState, type FormEvent } from 'react';

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return 'Unable to create workspace';
}

function generateSlugPreview(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120);
}

interface ManualWorkspaceFormProps {
  onBack: () => void;
}

export function ManualWorkspaceForm({ onBack }: ManualWorkspaceFormProps) {
  const [name, setName] = useState('');

  const [slug, setSlug] = useState('');

  const [submitting, setSubmitting] = useState(false);

  const [error, setError] = useState<string | null>(null);

  const slugPreview = slug.trim() || generateSlugPreview(name);

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();

    const normalizedName = name.trim();

    if (normalizedName.length < 2) {
      setError('Workspace name must contain at least two characters.');

      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const workspace = await createWorkspace({
        name: normalizedName,
        slug: slug.trim() || undefined,
      });

      /*
       * A full navigation refreshes the auth
       * provider, so the new workspace appears
       * immediately on the dashboard.
       */
      window.location.assign(`/workspaces/${workspace.id}/applications`);
    } catch (submitError: unknown) {
      setError(getErrorMessage(submitError));

      setSubmitting(false);
    }
  }

  return (
    <div className='mx-auto w-full max-w-md p-4 pt-16 sm:p-6 sm:pt-24'>
      <button
        type='button'
        onClick={onBack}
        className='inline-flex items-center gap-1.5 text-[13px] font-medium text-slate-500 transition hover:text-slate-800'
      >
        <ArrowLeft className='size-3.5' aria-hidden='true' />
        Back
      </button>

      <h1 className='mt-5 text-2xl font-semibold tracking-tight text-slate-950'>Create your workspace</h1>

      <p className='mt-1.5 text-sm leading-6 text-slate-500'>A workspace contains your applications, websites, analytics, repositories and team.</p>

      <form onSubmit={handleSubmit} className='mt-6 space-y-4'>
        {error ? (
          <div role='alert' className='rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800'>
            {error}
          </div>
        ) : null}

        <Input
          name='workspaceName'
          label='Workspace name'
          placeholder='Demo Command Center'
          value={name}
          required
          minLength={2}
          maxLength={120}
          disabled={submitting}
          onChange={(event) => setName(event.target.value)}
        />

        <Input
          name='workspaceSlug'
          label='Workspace URL'
          placeholder='demo-command-center'
          value={slug}
          maxLength={120}
          disabled={submitting}
          hint={slugPreview ? `command-center.app/${slugPreview}` : 'Leave blank to generate it from the workspace name.'}
          onChange={(event) => setSlug(event.target.value)}
        />

        <div className='flex items-center gap-3 pt-1'>
          <Button type='submit' loading={submitting}>
            Create workspace
          </Button>

          <button type='button' onClick={onBack} className='text-sm font-medium text-slate-500 transition hover:text-slate-800'>
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
