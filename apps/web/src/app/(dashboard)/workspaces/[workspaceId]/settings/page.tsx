'use client';

import {
  useParams,
} from 'next/navigation';
import {
  type FormEvent,
  useEffect,
  useState,
} from 'react';

import { useAuth } from '@/features/auth/auth-provider';
import type { Workspace } from '@/features/auth/auth.types';
import { apiRequest } from '@/features/lib/api/api-client';
import { getErrorMessage } from '@/features/lib/api/api-error';

export default function WorkspaceSettingsPage() {
  const params = useParams<{
    workspaceId: string;
  }>();

  const workspaceId =
    params.workspaceId;

  const {
    updateWorkspaceInState,
  } = useAuth();

  const [workspace, setWorkspace] =
    useState<Workspace | null>(null);

  const [name, setName] =
    useState('');

  const [slug, setSlug] =
    useState('');

  const [error, setError] =
    useState<string | null>(null);

  const [success, setSuccess] =
    useState<string | null>(null);

  const [submitting, setSubmitting] =
    useState(false);

  useEffect(() => {
    let active = true;

    async function loadWorkspace() {
      try {
        const response =
          await apiRequest<Workspace>(
            `/workspaces/${workspaceId}`,
          );

        if (!active) {
          return;
        }

        setWorkspace(response);
        setName(response.name);
        setSlug(response.slug);
      } catch (caughtError) {
        if (active) {
          setError(
            getErrorMessage(caughtError),
          );
        }
      }
    }

    void loadWorkspace();

    return () => {
      active = false;
    };
  }, [workspaceId]);

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setError(null);
    setSuccess(null);
    setSubmitting(true);

    try {
      const updatedWorkspace =
        await apiRequest<Workspace>(
          `/workspaces/${workspaceId}`,
          {
            method: 'PATCH',
            body: JSON.stringify({
              name,
              slug,
            }),
          },
        );

      setWorkspace(updatedWorkspace);
      updateWorkspaceInState(
        updatedWorkspace,
      );

      setSuccess(
        'Workspace updated successfully.',
      );
    } catch (caughtError) {
      setError(
        getErrorMessage(caughtError),
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (!workspace && !error) {
    return (
      <div className="inline-loader">
        <div className="spinner" />
        Loading workspace settings…
      </div>
    );
  }

  const role =
    workspace?.members?.[0]?.role ??
    'VIEWER';

  const canEdit =
    role === 'OWNER' ||
    role === 'ADMIN';

  return (
    <div className="page-stack narrow">
      <section className="page-heading">
        <div>
          <p className="eyebrow">
            Workspace settings
          </p>

          <h1>General information</h1>

          <p>
            Keep the workspace name and URL
            identifier clear and consistent.
          </p>
        </div>
      </section>

      <section className="section-card">
        <form
          className="form-stack"
          onSubmit={handleSubmit}
        >
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

          {!canEdit && (
            <div className="alert">
              Your role has read-only access to
              workspace settings.
            </div>
          )}

          <label className="field">
            <span>Workspace name</span>

            <input
              disabled={!canEdit}
              value={name}
              onChange={(event) =>
                setName(event.target.value)
              }
              minLength={2}
              required
            />
          </label>

          <label className="field">
            <span>Workspace slug</span>

            <input
              disabled={!canEdit}
              value={slug}
              onChange={(event) =>
                setSlug(
                  event.target.value
                    .toLowerCase()
                    .replace(
                      /[^a-z0-9-]/g,
                      '',
                    ),
                )
              }
              minLength={2}
              required
            />

            <small>
              Lowercase letters, numbers and
              hyphens only.
            </small>
          </label>

          {canEdit && (
            <div className="form-actions">
              <button
                className="button button-primary"
                disabled={submitting}
                type="submit"
              >
                {submitting
                  ? 'Saving…'
                  : 'Save changes'}
              </button>
            </div>
          )}
        </form>
      </section>
    </div>
  );
}