'use client';

import { useState, type FormEvent } from 'react';

import Link from 'next/link';

import { ArrowLeft, Building2, FolderKanban, Sparkles } from 'lucide-react';

import { Button } from '@/components/ui/button';

import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';

import { Input } from '@/components/ui/input';

import { createWorkspace } from '@/features/workspaces/workspace-api';

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

export default function NewWorkspacePage() {
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
    <div className="mx-auto max-w-3xl space-y-6">
      <header>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-slate-900"
        >
          <ArrowLeft className="size-4" />
          Back to dashboard
        </Link>

        <div className="mt-6 flex items-start gap-4">
          <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
            <Building2 className="size-6" />
          </div>

          <div>
            <p className="text-sm font-semibold text-brand-600">Workspace management</p>

            <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-950">
              Create a new workspace
            </h1>

            <p className="mt-2 max-w-xl text-sm leading-6 text-slate-500">
              Separate your personal products, client applications, and team projects into
              independent workspaces.
            </p>
          </div>
        </div>
      </header>

      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold text-slate-950">Workspace information</h2>

          <p className="mt-1 text-sm leading-6 text-slate-500">
            You will automatically become the owner of this workspace.
          </p>
        </CardHeader>

        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-6">
            {error ? (
              <div
                role="alert"
                className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
              >
                {error}
              </div>
            ) : null}

            <Input
              name="workspaceName"
              label="Workspace name"
              placeholder="MadadAI Team"
              value={name}
              required
              minLength={2}
              maxLength={120}
              disabled={submitting}
              leadingIcon={<Building2 className="size-4" />}
              onChange={(event) => setName(event.target.value)}
            />

            <Input
              name="workspaceSlug"
              label="Workspace slug"
              placeholder="madadai-team"
              value={slug}
              maxLength={120}
              disabled={submitting}
              hint={
                slugPreview
                  ? `Workspace URL identifier: ${slugPreview}`
                  : 'Leave blank to generate it from the workspace name.'
              }
              leadingIcon={<FolderKanban className="size-4" />}
              onChange={(event) => setSlug(event.target.value)}
            />

            <div className="flex items-start gap-3 rounded-2xl border border-blue-200 bg-blue-50 p-4">
              <Sparkles className="mt-0.5 size-5 shrink-0 text-blue-600" />

              <div className="text-sm leading-6 text-blue-800">
                <p className="font-semibold">Independent workspace</p>

                <p className="mt-1">
                  Applications, members, technologies, links, and future activity history will
                  remain separated from your other workspaces.
                </p>
              </div>
            </div>
          </CardContent>

          <CardFooter className="flex flex-wrap justify-end gap-3">
            <Link
              href="/dashboard"
              className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Cancel
            </Link>

            <Button type="submit" loading={submitting}>
              <Building2 className="size-4" />
              Create workspace
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
