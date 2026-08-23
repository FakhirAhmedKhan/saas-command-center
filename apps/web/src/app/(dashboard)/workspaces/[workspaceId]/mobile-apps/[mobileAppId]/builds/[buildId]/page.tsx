'use client';

import { getErrorMessage } from '@/features/lib/api/api-error';
import { getMobileBuild } from '@/features/mobile-apps/mobile-apps-api';
import { formatDuration, MOBILE_TEST_TYPE_LABELS, shortSha } from '@/features/mobile-apps/mobile-build-utils';
import { BuildStatus } from '@/features/mobile-apps/mobile-builds';
import type { MobileBuildDetails } from '@command-center/shared-types';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function MobileBuildDetailPage() {
  const params = useParams<{
    workspaceId: string;
    mobileAppId: string;
    buildId: string;
  }>();

  const [build, setBuild] = useState<MobileBuildDetails | null>(null);

  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void getMobileBuild(params.workspaceId, params.mobileAppId, params.buildId)
      .then(setBuild)
      .catch((loadError) => setError(getErrorMessage(loadError)));
  }, [params.workspaceId, params.mobileAppId, params.buildId]);

  const buildsHref = `/workspaces/${params.workspaceId}` + `/mobile-apps/${params.mobileAppId}` + '/builds';

  if (error) {
    return (
      <main className='p-8'>
        <div role='alert' className='rounded-xl bg-red-50 p-4 text-red-700'>
          {error}
        </div>
      </main>
    );
  }

  if (!build) {
    return <main className='p-8'>Loading build...</main>;
  }

  return (
    <main className='mx-auto w-full max-w-5xl space-y-6 p-4 pt-8 sm:p-6 lg:p-8'>
      <Link href={buildsHref} className='inline-flex items-center gap-2 text-sm text-slate-500'>
        <ArrowLeft className='size-4' />
        Builds
      </Link>

      <header>
        <div className='flex flex-wrap items-center gap-3'>
          <h1 className='text-2xl font-bold'>Build #{build.buildNumber ?? build.workflowRunId}</h1>

          <BuildStatus status={build.status} />
        </div>
      </header>

      <section className='grid gap-4 sm:grid-cols-2 lg:grid-cols-4'>
        <Item label='Version' value={build.version ?? 'â€”'} />

        <Item label='Branch' value={build.branch} />

        <Item label='Commit' value={shortSha(build.commitSha)} />

        <Item label='Duration' value={formatDuration(build.durationMs)} />
      </section>

      <section className='rounded-2xl border border-slate-200 bg-white p-5'>
        <h2 className='font-semibold'>Test Summary</h2>

        <div className='mt-4 grid gap-3 sm:grid-cols-4'>
          <Item label='Runs' value={String(build.testSummary.totalRuns)} />

          <Item label='Passed' value={String(build.testSummary.passed)} />

          <Item label='Failed' value={String(build.testSummary.failed)} />

          <Item label='Skipped' value={String(build.testSummary.skipped)} />
        </div>

        <div className='mt-5 space-y-3'>
          {build.testRuns.map((run) => (
            <div key={run.id} className='rounded-xl border border-slate-200 p-4'>
              <p className='font-medium'>{MOBILE_TEST_TYPE_LABELS[run.type]}</p>

              <p className='mt-1 text-sm text-slate-500'>
                {run.passed} passed â€¢ {run.failed} failed â€¢ {run.skipped} skipped
              </p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}

function Item({ label, value }: { label: string; value: string }) {
  return (
    <div className='rounded-xl border border-slate-200 bg-white p-4'>
      <p className='text-xs uppercase text-slate-400'>{label}</p>

      <p className='mt-2 break-all font-semibold text-slate-800'>{value}</p>
    </div>
  );
}
