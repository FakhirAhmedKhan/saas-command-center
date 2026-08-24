'use client';

import { PageLoading } from '@/components/states/page-loading';
import { getApplications } from '@/features/applications/application-api';
import type { SaasApplication } from '@/features/applications/application-types';
import { WebsiteSubNav } from '@/features/websites/components/website-sub-nav';
import { archiveWebsite, connectWebsite, disableWebsite, disconnectWebsite, enableWebsite, getWebsite, restoreWebsite, rotateWebsiteKey } from '@/features/websites/website-api';
import type { Website } from '@/features/websites/website-types';
import { getWebsiteError, websiteKeyStorageName } from '@/features/websites/website-utils';
import { Select, Card, CardContent, CardHeader, Button } from '@command-center/ui';
import { Archive, Check, Clipboard, KeyRound, Link2, PauseCircle, PlayCircle, RotateCcw, Unlink } from 'lucide-react';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function WebsiteSettingsPage() {
  const params = useParams<{
    workspaceId: string;
    websiteId: string;
  }>();
  const { workspaceId, websiteId } = params;
  const [website, setWebsite] = useState<Website | null>(null);
  const [applications, setApplications] = useState<SaasApplication[]>([]);
  const [selectedApplicationId, setSelectedApplicationId] = useState('');
  const [generatedKey, setGeneratedKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);
  const [action, setAction] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load(): Promise<void> {
      try {
        const [websiteResponse, applicationsResponse] = await Promise.all([
          getWebsite(workspaceId, websiteId),

          getApplications(workspaceId, {
            archived: false,
            page: 1,
            limit: 100,
            sortBy: 'name',
            sortOrder: 'asc',
          }),
        ]);

        if (!cancelled) {
          setWebsite(websiteResponse);

          setApplications(applicationsResponse.data);

          setSelectedApplicationId(websiteResponse.applicationId ?? '');

          setError(null);
        }
      } catch (loadError: unknown) {
        if (!cancelled) {
          setError(getWebsiteError(loadError, 'Unable to load website settings.'));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [workspaceId, websiteId]);

  async function run(actionName: string, operation: () => Promise<Website>): Promise<void> {
    setAction(actionName);
    setError(null);

    try {
      const updated = await operation();

      setWebsite(updated);

      setSelectedApplicationId(updated.applicationId ?? '');
    } catch (actionError: unknown) {
      setError(getWebsiteError(actionError));
    } finally {
      setAction(null);
    }
  }

  async function rotateKey(): Promise<void> {
    const confirmed = window.confirm('Rotate the tracking key? The old key will stop working immediately.');

    if (!confirmed) {
      return;
    }

    setAction('rotate');
    setError(null);

    try {
      const response = await rotateWebsiteKey(workspaceId, websiteId);

      setWebsite(response.website);

      setGeneratedKey(response.trackingKey);

      sessionStorage.setItem(websiteKeyStorageName(websiteId), response.trackingKey);
    } catch (actionError: unknown) {
      setError(getWebsiteError(actionError));
    } finally {
      setAction(null);
    }
  }

  async function copyKey(): Promise<void> {
    if (!generatedKey) {
      return;
    }

    await navigator.clipboard.writeText(generatedKey);

    setCopied(true);

    window.setTimeout(() => {
      setCopied(false);
    }, 1500);
  }

  if (loading) {
    return <PageLoading label='Loading website settings…' />;
  }

  if (!website) {
    return <div className='rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700'>{error}</div>;
  }

  return (
    <div className='mx-auto w-full max-w-[1600px] space-y-5 p-4 sm:p-6 lg:p-8'>
      <WebsiteSubNav workspaceId={workspaceId} websiteId={websiteId} />

      <div className='mx-auto max-w-2xl space-y-5'>
        <header>
          <h1 className='text-xl font-semibold tracking-tight text-slate-950'>Settings</h1>

          <p className='mt-1 text-sm leading-6 text-slate-500'>Manage lifecycle, application connection and tracking-key security.</p>
        </header>

        {error ? <div className='rounded-lg border border-red-200 bg-red-50 p-3.5 text-sm text-red-700'>{error}</div> : null}

        {generatedKey ? (
          <Card className='border-emerald-200'>
            <CardHeader>
              <h2 className='font-semibold text-emerald-800'>New tracking key generated</h2>
            </CardHeader>

            <CardContent>
              <code className='block break-all rounded-xl bg-slate-950 p-4 text-sm text-slate-100'>{generatedKey}</code>

              <Button className='mt-4' variant='outline' onClick={() => void copyKey()}>
                {copied ? <Check className='size-4' /> : <Clipboard className='size-4' />}

                {copied ? 'Copied' : 'Copy key'}
              </Button>
            </CardContent>
          </Card>
        ) : null}

        <Card>
          <CardHeader>
            <div className='flex items-center gap-2'>
              <Link2 className='size-5 text-brand-600' />

              <h2 className='font-semibold text-slate-950'>SaaS application connection</h2>
            </div>
          </CardHeader>

          <CardContent className='space-y-4'>
            <Select label='Application' value={selectedApplicationId} disabled={Boolean(website.archivedAt)} onChange={(event) => setSelectedApplicationId(event.target.value)}>
              <option value=''>Not connected</option>

              {applications.map((application) => (
                <option key={application.id} value={application.id}>
                  {application.name}
                </option>
              ))}
            </Select>

            <div className='flex flex-wrap gap-3'>
              {selectedApplicationId ? (
                <Button loading={action === 'connect'} disabled={Boolean(website.archivedAt)} onClick={() => void run('connect', () => connectWebsite(workspaceId, websiteId, selectedApplicationId))}>
                  <Link2 className='size-4' />
                  Connect application
                </Button>
              ) : null}

              {website.applicationId ? (
                <Button variant='outline' loading={action === 'disconnect'} disabled={Boolean(website.archivedAt)} onClick={() => void run('disconnect', () => disconnectWebsite(workspaceId, websiteId))}>
                  <Unlink className='size-4' />
                  Disconnect
                </Button>
              ) : null}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <h2 className='font-semibold text-slate-950'>Tracking state</h2>
          </CardHeader>

          <CardContent>
            {website.enabled ? (
              <Button variant='outline' loading={action === 'disable'} onClick={() => void run('disable', () => disableWebsite(workspaceId, websiteId))}>
                <PauseCircle className='size-4' />
                Disable tracking
              </Button>
            ) : (
              <Button loading={action === 'enable'} disabled={Boolean(website.archivedAt)} onClick={() => void run('enable', () => enableWebsite(workspaceId, websiteId))}>
                <PlayCircle className='size-4' />
                Enable tracking
              </Button>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className='flex items-center gap-2'>
              <KeyRound className='size-5 text-brand-600' />

              <h2 className='font-semibold text-slate-950'>Tracking key</h2>
            </div>

            <p className='mt-1 text-sm text-slate-500'>
              Key prefix: <code>{website.trackingKeyPrefix}</code>
            </p>
          </CardHeader>

          <CardContent>
            <Button variant='outline' loading={action === 'rotate'} disabled={Boolean(website.archivedAt)} onClick={() => void rotateKey()}>
              <RotateCcw className='size-4' />
              Rotate tracking key
            </Button>

            <p className='mt-3 text-sm text-red-600'>Rotation immediately invalidates the previous key.</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <h2 className='font-semibold text-slate-950'>Archive website</h2>

            <p className='mt-1 text-sm text-slate-500'>Archiving keeps future analytics history safe while disabling new tracking events.</p>
          </CardHeader>

          <CardContent>
            {website.archivedAt ? (
              <Button variant='outline' loading={action === 'restore'} onClick={() => void run('restore', () => restoreWebsite(workspaceId, websiteId))}>
                <RotateCcw className='size-4' />
                Restore website
              </Button>
            ) : (
              <Button
                variant='danger'
                loading={action === 'archive'}
                onClick={() => {
                  const confirmed = window.confirm('Archive this website and disable tracking?');

                  if (confirmed) {
                    void run('archive', () => archiveWebsite(workspaceId, websiteId));
                  }
                }}
              >
                <Archive className='size-4' />
                Archive website
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
