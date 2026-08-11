'use client';

import { PageLoading } from '@/components/states/page-loading';
import { TrackingStatusPanel } from '@/features/tracking/components/tracking-status-panel';
import { WebsiteSubNav } from '@/features/websites/components/website-sub-nav';
import { getWebsite } from '@/features/websites/website-api';
import type { Website } from '@/features/websites/website-types';
import { getWebsiteError, websiteKeyStorageName } from '@/features/websites/website-utils';
import { Card, CardContent, CardHeader , Button } from '@command-center/ui';
import { Check, Clipboard, KeyRound } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

const TRACKER_SCRIPT_URL = process.env.NEXT_PUBLIC_TRACKER_SCRIPT_URL ?? 'http://localhost:3002/tracker.js';

const INGESTION_URL = process.env.NEXT_PUBLIC_INGESTION_URL ?? 'http://localhost:4000/api/v1/collect';

export default function WebsiteInstallationPage() {
  const params = useParams<{
    workspaceId: string;
    websiteId: string;
  }>();

  const { workspaceId, websiteId } = params;

  const [website, setWebsite] = useState<Website | null>(null);

  const [trackingKey, setTrackingKey] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState<string | null>(null);

  const [copied, setCopied] = useState<'key' | 'snippet' | 'custom' | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load(): Promise<void> {
      try {
        const response = await getWebsite(workspaceId, websiteId);

        const storedKey = sessionStorage.getItem(websiteKeyStorageName(websiteId));

        if (!cancelled) {
          setWebsite(response);
          setTrackingKey(storedKey);
          setError(null);
          setLoading(false);
        }
      } catch (loadError: unknown) {
        if (!cancelled) {
          setError(getWebsiteError(loadError, 'Unable to load installation configuration.'));

          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [workspaceId, websiteId]);

  const snippet = useMemo(() => {
    const key = trackingKey ?? 'YOUR_TRACKING_KEY';

    return `<script
  async
  src="${TRACKER_SCRIPT_URL}"
  data-website-id="${websiteId}"
  data-tracking-key="${key}"
  data-endpoint="${INGESTION_URL}"
  data-respect-dnt="true"
  data-require-consent="false"
></script>`;
  }, [trackingKey, websiteId]);

  const customEventSnippet = `window.CommandCenterAnalytics?.track(
  'signup_completed',
  {
    plan: 'pro',
    source: 'pricing_page'
  }
);`;

  async function copy(
    type: 'key' | 'snippet' | 'custom',

    value: string,
  ): Promise<void> {
    await navigator.clipboard.writeText(value);

    setCopied(type);

    window.setTimeout(() => {
      setCopied(null);
    }, 1_500);
  }

  if (loading) {
    return <PageLoading label='Loading installation…' />;
  }

  if (!website) {
    return <div className='rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700'>{error}</div>;
  }

  const baseHref = `/workspaces/${workspaceId}/websites/${websiteId}`;

  return (
    <div className='mx-auto w-full max-w-[1600px] space-y-5 p-4 sm:p-6 lg:p-8'>
      <WebsiteSubNav workspaceId={workspaceId} websiteId={websiteId} />

      <div className='mx-auto max-w-3xl space-y-5'>
        <header>
          <h1 className='text-xl font-semibold tracking-tight text-slate-950'>Install tracking</h1>

          <p className='mt-1 text-sm leading-6 text-slate-500'>
            Install the lightweight tracker on <strong className='font-medium text-slate-700'>{website.domain}</strong>.
          </p>
        </header>

        {!trackingKey ? (
          <div className='rounded-lg border border-amber-200 bg-amber-50 p-3.5 text-sm leading-6 text-amber-900'>
            The complete key is shown only after website creation or key rotation. Open{' '}
            <Link href={`${baseHref}/settings`} className='font-semibold underline'>
              Website Settings
            </Link>{' '}
            and rotate the key.
          </div>
        ) : (
          <Card>
            <CardHeader>
              <div className='flex items-center gap-2'>
                <KeyRound className='size-4 text-brand-600' aria-hidden='true' />

                <h2 className='text-[15px] font-semibold text-slate-950'>Tracking key</h2>
              </div>
            </CardHeader>

            <CardContent>
              <div className='flex flex-col gap-2.5 sm:flex-row'>
                <code className='min-w-0 flex-1 break-all rounded-lg bg-slate-950 p-3.5 text-sm text-slate-100'>{trackingKey}</code>

                <Button variant='outline' size='sm' onClick={() => void copy('key', trackingKey)}>
                  {copied === 'key' ? <Check className='size-3.5' /> : <Clipboard className='size-3.5' />}
                  {copied === 'key' ? 'Copied' : 'Copy'}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <h2 className='text-[15px] font-semibold text-slate-950'>HTML installation</h2>

            <p className='mt-1 text-sm text-slate-500'>Add this code before the closing body tag.</p>
          </CardHeader>

          <CardContent>
            <pre className='overflow-x-auto rounded-lg bg-slate-950 p-4 text-sm leading-6 text-slate-100'>
              <code>{snippet}</code>
            </pre>

            <Button className='mt-3' variant='outline' size='sm' onClick={() => void copy('snippet', snippet)}>
              {copied === 'snippet' ? <Check className='size-3.5' /> : <Clipboard className='size-3.5' />}
              {copied === 'snippet' ? 'Copied' : 'Copy snippet'}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <h2 className='text-[15px] font-semibold text-slate-950'>Custom events</h2>

            <p className='mt-1 text-sm text-slate-500'>Form values are never captured automatically. Send only safe, non-sensitive properties.</p>
          </CardHeader>

          <CardContent>
            <pre className='overflow-x-auto rounded-lg bg-slate-950 p-4 text-sm leading-6 text-slate-100'>
              <code>{customEventSnippet}</code>
            </pre>

            <Button className='mt-3' variant='outline' size='sm' onClick={() => void copy('custom', customEventSnippet)}>
              {copied === 'custom' ? <Check className='size-3.5' /> : <Clipboard className='size-3.5' />}
              {copied === 'custom' ? 'Copied' : 'Copy example'}
            </Button>
          </CardContent>
        </Card>

        <TrackingStatusPanel workspaceId={workspaceId} websiteId={websiteId} />
      </div>
    </div>
  );
}
