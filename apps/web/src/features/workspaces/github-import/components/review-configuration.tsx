'use client';

import type { DetectedApplication, ImportWorkspaceFromGithubInput, RepositoryAnalysisResult } from '../github-import-types';
import { getErrorMessage } from '@/features/lib/api/api-error';
import { Button, Card, CardContent, CardFooter, CardHeader, Checkbox, Input, Textarea } from '@command-center/ui';
import { AlertTriangle, PackageX, Rocket } from 'lucide-react';
import { useMemo, useState } from 'react';

interface ReviewConfigurationProps {
  analysis: RepositoryAnalysisResult;
  onSubmit: (input: ImportWorkspaceFromGithubInput) => Promise<void>;
}

interface EditableApplication extends DetectedApplication {
  selected: boolean;
}

function generateSlugPreview(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120);
}

export function ReviewConfiguration({ analysis, onSubmit }: ReviewConfigurationProps) {
  const [workspaceName, setWorkspaceName] = useState(analysis.suggestedWorkspace.name);

  const [workspaceSlug, setWorkspaceSlug] = useState(analysis.suggestedWorkspace.slug);

  const [workspaceDescription, setWorkspaceDescription] = useState(analysis.suggestedWorkspace.description ?? '');

  const [applications, setApplications] = useState<EditableApplication[]>(() =>
    analysis.applications.map((application) => ({
      ...application,
      selected: application.runnable,
    })),
  );

  const [submitting, setSubmitting] = useState(false);

  const [error, setError] = useState<string | null>(null);

  const slugPreview = workspaceSlug.trim() || generateSlugPreview(workspaceName);

  const selectedCount = useMemo(() => applications.filter((application) => application.selected).length, [applications]);

  function updateApplication(index: number, patch: Partial<EditableApplication>): void {
    setApplications((current) => current.map((application, currentIndex) => (currentIndex === index ? { ...application, ...patch } : application)));
  }

  async function handleSubmit(): Promise<void> {
    const normalizedName = workspaceName.trim();

    if (normalizedName.length < 2) {
      setError('Workspace name must contain at least two characters.');
      return;
    }

    const selectedApplications = applications.filter((application) => application.selected);

    if (selectedApplications.length === 0) {
      setError('Select at least one application to import.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await onSubmit({
        installationId: analysis.repository.installationId,
        repositoryId: analysis.repository.id,
        defaultBranch: analysis.repository.defaultBranch,

        workspace: {
          name: normalizedName,
          slug: workspaceSlug.trim() || undefined,
          description: workspaceDescription.trim() || null,
        },

        applications: selectedApplications.map((application) => ({
          name: application.name.trim(),
          rootDirectory: application.rootDirectory,
          framework: application.framework,
          language: application.language,
          commands: application.commands,
          technologies: application.technologies,
        })),
      });
    } catch (submitError: unknown) {
      setError(getErrorMessage(submitError));
      setSubmitting(false);
    }
  }

  return (
    <div className='space-y-5'>
      {error ? (
        <div role='alert' className='rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800'>
          {error}
        </div>
      ) : null}

      <Card>
        <CardHeader>
          <h2 className='text-lg font-semibold text-slate-950'>Workspace details</h2>
          <p className='mt-1 text-sm leading-6 text-slate-500'>Detected from {analysis.repository.fullName}. Edit anything before creating the workspace.</p>
        </CardHeader>

        <CardContent className='space-y-5'>
          <div className='grid gap-5 md:grid-cols-2'>
            <Input
              name='workspaceName'
              label='Workspace name'
              value={workspaceName}
              required
              minLength={2}
              maxLength={120}
              onChange={(event) => setWorkspaceName(event.target.value)}
            />

            <Input
              name='workspaceSlug'
              label='Workspace URL'
              value={workspaceSlug}
              maxLength={120}
              hint={slugPreview ? `command-center.app/${slugPreview}` : undefined}
              onChange={(event) => setWorkspaceSlug(event.target.value)}
            />
          </div>

          <Textarea
            name='workspaceDescription'
            label='Description'
            rows={3}
            maxLength={280}
            value={workspaceDescription}
            onChange={(event) => setWorkspaceDescription(event.target.value)}
          />

          <p className='text-xs text-slate-400'>
            {analysis.repositoryType === 'monorepo' ? 'Monorepo' : 'Single application'} &middot; Package manager: {analysis.packageManager}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <h2 className='text-lg font-semibold text-slate-950'>Applications</h2>
          <p className='mt-1 text-sm leading-6 text-slate-500'>
            {analysis.repositoryType === 'monorepo' ? 'Choose which detected applications to import.' : 'Review the detected application configuration.'}
          </p>
        </CardHeader>

        <CardContent className='space-y-3'>
          {applications.length === 0 ? (
            <div className='flex flex-col items-center gap-2 py-8 text-center'>
              <PackageX className='size-6 text-slate-300' />
              <p className='text-sm text-slate-500'>No applications were detected in this repository.</p>
            </div>
          ) : (
            applications.map((application, index) => (
              <ApplicationCard key={`${application.rootDirectory}-${index}`} application={application} onChange={(patch) => updateApplication(index, patch)} />
            ))
          )}
        </CardContent>

        <CardFooter className='flex items-center justify-between'>
          <p className='text-xs text-slate-500'>{selectedCount} application(s) selected</p>

          <Button loading={submitting} onClick={() => void handleSubmit()}>
            <Rocket className='size-4' />
            Create workspace
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}

interface ApplicationCardProps {
  application: EditableApplication;
  onChange: (patch: Partial<EditableApplication>) => void;
}

function ApplicationCard({ application, onChange }: ApplicationCardProps) {
  return (
    <div className={`rounded-xl border p-4 transition ${application.selected ? 'border-brand-300 bg-brand-50/30' : 'border-slate-200 bg-white'}`}>
      <div className='flex items-start gap-3'>
        <div className='pt-0.5'>
          <Checkbox checked={application.selected} onChange={(event) => onChange({ selected: event.target.checked })} />
        </div>

        <div className='min-w-0 flex-1 space-y-3'>
          <div className='flex flex-wrap items-center gap-2'>
            {!application.runnable ? (
              <span className='inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-500'>
                <AlertTriangle className='size-3' />
                Not runnable
              </span>
            ) : null}

            {application.framework ? (
              <span className='rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600'>{application.framework}</span>
            ) : null}

            <span className='font-mono text-[11px] text-slate-400'>{application.rootDirectory}</span>
          </div>

          <div className='grid gap-3 sm:grid-cols-2'>
            <Input label='Application name' value={application.name} maxLength={160} onChange={(event) => onChange({ name: event.target.value })} />

            <Input label='Root directory' value={application.rootDirectory} disabled />
          </div>

          {application.technologies.length > 0 ? (
            <div className='flex flex-wrap gap-1.5'>
              {application.technologies.map((technology) => (
                <span key={technology} className='rounded-full border border-slate-200 px-2 py-0.5 text-[11px] text-slate-600'>
                  {technology}
                </span>
              ))}
            </div>
          ) : null}

          {application.commands.dev || application.commands.build || application.commands.start ? (
            <dl className='grid gap-1.5 text-xs text-slate-500 sm:grid-cols-3'>
              {application.commands.dev ? (
                <div>
                  <dt className='font-medium text-slate-400'>Dev</dt>
                  <dd className='truncate font-mono'>{application.commands.dev}</dd>
                </div>
              ) : null}

              {application.commands.build ? (
                <div>
                  <dt className='font-medium text-slate-400'>Build</dt>
                  <dd className='truncate font-mono'>{application.commands.build}</dd>
                </div>
              ) : null}

              {application.commands.start ? (
                <div>
                  <dt className='font-medium text-slate-400'>Start</dt>
                  <dd className='truncate font-mono'>{application.commands.start}</dd>
                </div>
              ) : null}
            </dl>
          ) : null}
        </div>
      </div>
    </div>
  );
}
