'use client';

import { BlueprintApplicationEditor } from './blueprint-application-editor';
import { BlueprintValidationSummary } from './blueprint-validation-summary';
import { listImportableRepositories } from '../../workspaces/github-import/github-import-api';
import { workspaceOnboardingApi } from '../api/workspace-onboarding-api';
import type { ImportableGithubRepository, WorkspaceApplicationType, WorkspaceBlueprint, WorkspaceBlueprintValidationIssue, WorkspaceOnboardingSessionResponse } from '@command-center/shared-types';
import { useEffect, useState } from 'react';

interface BlueprintReviewProps {
  initialSession: WorkspaceOnboardingSessionResponse;
  onReady(session: WorkspaceOnboardingSessionResponse): void;
}

export function BlueprintReview({ initialSession, onReady }: BlueprintReviewProps) {
  const requiresRepositorySelection = initialSession.answers.repositories === 'CONNECT_NOW';
  const [blueprint, setBlueprint] = useState<WorkspaceBlueprint>(initialSession.blueprint!);
  const [issues, setIssues] = useState<WorkspaceBlueprintValidationIssue[]>([]);
  const [repositories, setRepositories] = useState<ImportableGithubRepository[]>([]);
  const [loadingRepositories, setLoadingRepositories] = useState(requiresRepositorySelection);
  const [repositoryError, setRepositoryError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!requiresRepositorySelection) {
      return;
    }

    let active = true;
    const timeoutId = window.setTimeout(() => {
      void listImportableRepositories()
        .then((response) => {
          if (active) {
            setRepositories(response.repositories);
            setRepositoryError(null);
          }
        })
        .catch((error: unknown) => {
          if (active) {
            setRepositoryError(error instanceof Error ? error.message : 'Unable to load GitHub repositories');
          }
        })
        .finally(() => {
          if (active) {
            setLoadingRepositories(false);
          }
        });
    }, 0);

    return () => {
      active = false;
      window.clearTimeout(timeoutId);
    };
  }, [requiresRepositorySelection]);

  const selectedRepositoryIds = new Set(
    blueprint.repositories
      .filter(({ strategy }) => strategy === 'CONNECT_NOW')
      .map(({ repositoryId }) => repositoryId)
      .filter((value): value is string => Boolean(value)),
  );
  const repositorySelectionComplete =
    !requiresRepositorySelection ||
    blueprint.applications.every((application) =>
      blueprint.repositories.some((repository) => repository.applicationType === application.type && repository.strategy === 'CONNECT_NOW' && Boolean(repository.repositoryId)),
    );
  const selectRepository = (applicationType: WorkspaceApplicationType, repositoryId: string) => {
    const remaining = blueprint.repositories.filter((repository) => repository.applicationType !== applicationType);

    setBlueprint({
      ...blueprint,
      repositories: repositoryId
        ? [
            ...remaining,
            {
              applicationType,
              strategy: 'CONNECT_NOW',
              repositoryId,
            },
          ]
        : remaining,
    });
  };
  const save = async () => {
    if (!repositorySelectionComplete) {
      setIssues([
        {
          path: 'repositories',
          code: 'REPOSITORY_SELECTION_REQUIRED',
          message: 'Select one verified repository for every application',
        },
      ]);

      return;
    }

    setSaving(true);

    try {
      const session = await workspaceOnboardingApi.updateBlueprint(initialSession.id, {
        expectedRevision: initialSession.blueprintRevision,
        blueprint,
      });
      const validation = await workspaceOnboardingApi.validateBlueprint(initialSession.id);

      setIssues(validation.issues);

      if (validation.valid) {
        onReady(session);
      }
    } catch (error) {
      setIssues([
        {
          path: 'blueprint',
          code: 'SAVE_FAILED',
          message: error instanceof Error ? error.message : 'Save failed',
        },
      ]);
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className='mx-auto grid max-w-5xl gap-6 p-4 lg:grid-cols-[1fr_18rem] lg:p-8'>
      <section className='space-y-4'>
        <h1 className='text-2xl font-bold'>Review guided recommendations</h1>

        <BlueprintValidationSummary issues={issues} />

        {blueprint.applications.map((application, index) => (
          <section className='space-y-3' key={application.type}>
            <BlueprintApplicationEditor
              application={application}
              disabled={saving}
              onChange={(next) => {
                const applications = [...blueprint.applications];

                applications[index] = next;
                setBlueprint({
                  ...blueprint,
                  applications,
                });
              }}
            />

            {requiresRepositorySelection ? (
              <label className='block rounded-xl border border-slate-200 bg-white p-4 text-sm font-medium text-slate-800'>
                Repository for {application.type}
                <select
                  aria-label={`Repository for ${application.type}`}
                  className='mt-2 h-11 w-full rounded-lg border border-slate-300 bg-white px-3'
                  disabled={saving || loadingRepositories}
                  onChange={(event) => {
                    selectRepository(application.type, event.target.value);
                  }}
                  value={blueprint.repositories.find((repository) => repository.applicationType === application.type && repository.strategy === 'CONNECT_NOW')?.repositoryId ?? ''}
                >
                  <option value=''>{loadingRepositories ? 'Loading verified repositories…' : 'Select a verified repository'}</option>

                  {repositories.map((repository) => {
                    const id = String(repository.id);
                    const selectedForThisApplication = blueprint.repositories.some((selection) => selection.applicationType === application.type && selection.repositoryId === id);

                    return (
                      <option disabled={selectedRepositoryIds.has(id) && !selectedForThisApplication} key={id} value={id}>
                        {repository.fullName}
                      </option>
                    );
                  })}
                </select>
              </label>
            ) : null}
          </section>
        ))}

        {repositoryError ? (
          <p className='text-sm text-red-700' role='alert'>
            {repositoryError}
          </p>
        ) : null}

        {requiresRepositorySelection && !loadingRepositories && !repositoryError && repositories.length === 0 ? (
          <p className='rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900'>No verified GitHub repositories are available. Connect GitHub before confirming this workspace.</p>
        ) : null}
      </section>

      <aside className='h-fit rounded-2xl border p-5 lg:sticky lg:top-6'>
        <p className='text-sm text-slate-600'>Revision {initialSession.blueprintRevision}</p>

        <button
          className='mt-4 w-full rounded-xl bg-slate-950 px-4 py-3 text-white disabled:opacity-50'
          disabled={saving || loadingRepositories || !repositorySelectionComplete}
          onClick={() => {
            void save();
          }}
          type='button'
        >
          {saving ? 'Validating…' : 'Save and continue'}
        </button>
      </aside>
    </main>
  );
}
