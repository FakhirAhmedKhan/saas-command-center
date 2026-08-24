'use client';

import { getDesktopBuild } from '@/features/desktop-apps/desktop-apps-api';
import { DESKTOP_ARTIFACT_TYPE_LABELS, DESKTOP_TEST_TYPE_LABELS, formatDuration, shortSha } from '@/features/desktop-apps/desktop-build-utils';
import { BuildStatus } from '@/features/desktop-apps/desktop-builds';
import { getErrorMessage } from '@/features/lib/api/api-error';
import type { DesktopBuildDetails } from '@command-center/shared-types';
import { ArrowLeft, Download } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function DesktopBuildDetailsPage() {
  const params = useParams<{
    workspaceId: string;
    desktopAppId: string;
    buildId: string;
  }>();

  const [build, setBuild] = useState<DesktopBuildDetails | null>(null);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    void getDesktopBuild(params.workspaceId, params.desktopAppId, params.buildId)
      .then((result) => {
        if (active) setBuild(result as DesktopBuildDetails);
      })
      .catch((caught: unknown) => {
        if (active) {
          setError(getErrorMessage(caught));
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [params.workspaceId, params.desktopAppId, params.buildId]);

  const buildsHref = `/workspaces/${params.workspaceId}` + `/desktop-apps/${params.desktopAppId}/builds`;

  if (loading) {
    return <main className='p-8'>Loading build...</main>;
  }

  if (error || !build) {
    return (
      <main className='p-8'>
        <div role='alert'>{error ?? 'Desktop build was not found.'}</div>
      </main>
    );
  }

  return (
    <main className='space-y-6 p-4 sm:p-6 lg:p-8'>
      <Link href={buildsHref} className='inline-flex items-center gap-2 text-sm font-semibold text-slate-600'>
        <ArrowLeft className='size-4' aria-hidden='true' />
        Back to builds
      </Link>

      <header>
        <div className='flex flex-wrap items-center gap-3'>
          <h1 className='text-2xl font-bold text-slate-950'>Build {build.version ?? build.buildNumber ?? build.workflowRunId}</h1>
          <BuildStatus status={build.status} />
        </div>

        <p className='mt-2 text-sm text-slate-500'>
          {build.platform} · {build.architecture} · {build.branch} · {shortSha(build.commitSha)} · {formatDuration(build.durationMs)}
        </p>
      </header>

      <section className='rounded-2xl border border-slate-200 bg-white p-5'>
        <h2 className='font-semibold text-slate-950'>Artifacts</h2>

        {build.artifacts.length === 0 ? (
          <p className='mt-3 text-sm text-slate-500'>No artifact metadata is available for this build.</p>
        ) : (
          <div className='mt-4 space-y-3'>
            {build.artifacts.map((artifact) => (
              <div key={artifact.id} className='flex flex-col gap-3 rounded-xl border border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between'>
                <div>
                  <p className='font-semibold text-slate-900'>{artifact.fileName}</p>
                  <p className='mt-1 text-xs text-slate-500'>
                    {DESKTOP_ARTIFACT_TYPE_LABELS[artifact.type]} · {artifact.platform} · {artifact.architecture}
                    {artifact.sizeBytes !== null ? ` · ${artifact.sizeBytes.toLocaleString()} bytes` : ''}
                  </p>
                </div>

                {artifact.externalUrl ? (
                  <a
                    href={artifact.externalUrl}
                    target='_blank'
                    rel='noreferrer'
                    className='inline-flex items-center gap-2 text-sm font-semibold text-brand-600'
                  >
                    <Download className='size-4' aria-hidden='true' />
                    Open artifact
                  </a>
                ) : (
                  <span className='text-xs text-slate-400'>Remote artifact unavailable</span>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      <section className='rounded-2xl border border-slate-200 bg-white p-5'>
        <h2 className='font-semibold text-slate-950'>Tests</h2>

        <p className='mt-2 text-sm text-slate-500'>
          {build.testSummary.passedTests} passed · {build.testSummary.failedTests} failed · {build.testSummary.skippedTests} skipped
        </p>

        {build.testRuns.length === 0 ? (
          <p className='mt-4 text-sm text-slate-500'>No tests are attached to this build.</p>
        ) : (
          <div className='mt-4 space-y-4'>
            {build.testRuns.map((run) => (
              <article key={run.id} className='rounded-xl border border-slate-100 p-4'>
                <div className='flex flex-wrap items-center justify-between gap-2'>
                  <p className='font-semibold text-slate-900'>{DESKTOP_TEST_TYPE_LABELS[run.type]}</p>
                  <span className='text-xs font-semibold text-slate-500'>{run.status}</span>
                </div>

                <p className='mt-1 text-sm text-slate-500'>
                  {run.passed} passed · {run.failed} failed · {run.skipped} skipped
                </p>

                {run.failures.map((failure) => (
                  <div key={failure.id} className='mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-800'>
                    <p className='font-semibold'>{failure.testName ?? failure.suite ?? 'Failure'}</p>
                    {failure.message ? <p className='mt-1 whitespace-pre-wrap'>{failure.message}</p> : null}
                  </div>
                ))}
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
