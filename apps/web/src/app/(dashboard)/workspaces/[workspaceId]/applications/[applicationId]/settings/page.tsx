'use client';

import { useEffect, useMemo, useState } from 'react';

import Link from 'next/link';

import { useParams, useRouter } from 'next/navigation';

import { Archive, ArrowLeft, RotateCcw, Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';

import { apiRequest } from '@/features/lib/api/api-client';

import {
  archiveApplication,
  getApplication,
  permanentlyDeleteApplication,
  restoreApplication,
} from '@/features/applications/application-api';

import type { SaasApplication } from '@/features/applications/application-types';

import { getErrorMessage } from '@/features/applications/application-utils';

type WorkspaceRole = 'OWNER' | 'ADMIN' | 'DEVELOPER' | 'VIEWER';

interface AuthMeResponse {
  user: {
    id: string;
    email: string;
  };

  workspaces: Array<{
    id?: string;
    workspaceId?: string;
    role?: WorkspaceRole;
  }>;
}

export default function ApplicationSettingsPage() {
  const params = useParams<{
    workspaceId: string;
    applicationId: string;
  }>();

  const router = useRouter();

  const { workspaceId, applicationId } = params;

  const [application, setApplication] = useState<SaasApplication | null>(null);

  const [me, setMe] = useState<AuthMeResponse | null>(null);

  const [loading, setLoading] = useState(true);

  const [actionLoading, setActionLoading] = useState<'archive' | 'restore' | 'delete' | null>(null);

  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadSettings(): Promise<void> {
      try {
        const [applicationResponse, meResponse] = await Promise.all([
          getApplication(workspaceId, applicationId),

          apiRequest<AuthMeResponse>('/auth/me'),
        ]);

        if (cancelled) {
          return;
        }

        setApplication(applicationResponse);

        setMe(meResponse);
        setError(null);
      } catch (loadError: unknown) {
        if (!cancelled) {
          setError(getErrorMessage(loadError, 'Unable to load application settings.'));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadSettings();

    return () => {
      cancelled = true;
    };
  }, [workspaceId, applicationId]);

  const currentRole = useMemo(() => {
    const workspace = me?.workspaces.find((item) => (item.id ?? item.workspaceId) === workspaceId);

    return workspace?.role ?? 'VIEWER';
  }, [me, workspaceId]);

  const canArchive = currentRole === 'OWNER' || currentRole === 'ADMIN';

  const canDelete = currentRole === 'OWNER';

  const detailsHref = `/workspaces/${workspaceId}/applications/${applicationId}`;

  async function handleArchive(): Promise<void> {
    const confirmed = window.confirm('Archive this application?');

    if (!confirmed) {
      return;
    }

    setActionLoading('archive');
    setError(null);

    try {
      const response = await archiveApplication(workspaceId, applicationId);

      setApplication(response);
    } catch (actionError: unknown) {
      setError(getErrorMessage(actionError, 'Unable to archive application.'));
    } finally {
      setActionLoading(null);
    }
  }

  async function handleRestore(): Promise<void> {
    setActionLoading('restore');
    setError(null);

    try {
      const response = await restoreApplication(workspaceId, applicationId);

      setApplication(response);
    } catch (actionError: unknown) {
      setError(getErrorMessage(actionError, 'Unable to restore application.'));
    } finally {
      setActionLoading(null);
    }
  }

  async function handleDelete(): Promise<void> {
    if (!application) {
      return;
    }

    const confirmation = window.prompt(
      `Type "${application.name}" to permanently delete this application.`,
    );

    if (confirmation !== application.name) {
      return;
    }

    setActionLoading('delete');
    setError(null);

    try {
      await permanentlyDeleteApplication(workspaceId, applicationId);

      router.replace(`/workspaces/${workspaceId}/applications`);

      router.refresh();
    } catch (actionError: unknown) {
      setError(getErrorMessage(actionError, 'Unable to permanently delete application.'));

      setActionLoading(null);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-80 items-center justify-center">
        <Spinner />
      </div>
    );
  }

  if (!application) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700">
        {error ?? 'Application was not found.'}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <header>
        <Link
          href={detailsHref}
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-slate-900"
        >
          <ArrowLeft className="size-4" />
          Back to application
        </Link>

        <h1 className="mt-5 text-3xl font-bold tracking-tight text-slate-950">
          Application settings
        </h1>

        <p className="mt-2 text-sm leading-6 text-slate-500">
          Manage the application lifecycle and deletion settings.
        </p>
      </header>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold text-slate-950">Archive application</h2>

          <p className="mt-1 text-sm text-slate-500">
            Archived applications remain in the database but cannot be edited.
          </p>
        </CardHeader>

        <CardContent>
          {!canArchive ? (
            <p className="text-sm text-slate-500">
              Only workspace owners and administrators can archive or restore applications.
            </p>
          ) : application.archivedAt ? (
            <Button
              variant="outline"
              loading={actionLoading === 'restore'}
              onClick={() => void handleRestore()}
            >
              <RotateCcw className="size-4" />
              Restore application
            </Button>
          ) : (
            <Button
              variant="outline"
              loading={actionLoading === 'archive'}
              onClick={() => void handleArchive()}
            >
              <Archive className="size-4" />
              Archive application
            </Button>
          )}
        </CardContent>
      </Card>

      <Card className="border-red-200">
        <CardHeader>
          <h2 className="text-lg font-semibold text-red-700">Danger zone</h2>

          <p className="mt-1 text-sm text-slate-500">
            Permanent deletion removes the application, technology stack and links forever.
          </p>
        </CardHeader>

        <CardContent>
          {!canDelete ? (
            <p className="text-sm text-slate-500">
              Only the workspace owner can permanently delete an application.
            </p>
          ) : !application.archivedAt ? (
            <p className="text-sm text-amber-700">
              Archive the application before permanently deleting it.
            </p>
          ) : (
            <Button
              variant="danger"
              loading={actionLoading === 'delete'}
              onClick={() => void handleDelete()}
            >
              <Trash2 className="size-4" />
              Permanently delete
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
