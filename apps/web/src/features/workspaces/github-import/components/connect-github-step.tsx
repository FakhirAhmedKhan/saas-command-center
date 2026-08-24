'use client';

import { beginPersonalGithubConnect } from '../github-import-api';
import { markGithubImportFlow } from '../github-import-flow-marker';
import { getErrorMessage } from '@/features/lib/api/api-error';
import { assertTrustedGithubUrl } from '@/features/lib/github/github-url';
import { Button, Card, CardContent } from '@command-center/ui';
import { FolderGit2 } from 'lucide-react';
import { useState } from 'react';

interface ConnectGithubStepProps {
  checking: boolean;
}

export function ConnectGithubStep({ checking }: ConnectGithubStepProps) {
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConnect(): Promise<void> {
    setConnecting(true);
    setError(null);

    try {
      const result = await beginPersonalGithubConnect();
      const installationUrl = assertTrustedGithubUrl(result.installationUrl);

      markGithubImportFlow(`${window.location.pathname}?method=github`);

      window.location.assign(installationUrl);
    } catch (caughtError: unknown) {
      setError(getErrorMessage(caughtError));

      setConnecting(false);
    }
  }

  if (checking) {
    return (
      <Card>
        <CardContent className='flex min-h-64 flex-col items-center justify-center'>
          <div className='size-6 animate-spin rounded-full border-2 border-slate-200 border-t-slate-950' />

          <p className='mt-4 text-sm text-slate-500'>Checking your GitHub connection...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className='flex flex-col items-center px-6 py-14 text-center'>
        <div className='flex size-12 items-center justify-center rounded-2xl bg-slate-950 text-white'>
          <FolderGit2 className='size-6' />
        </div>

        <h2 className='mt-5 text-lg font-semibold text-slate-950'>Connect GitHub</h2>

        <p className='mx-auto mt-2 max-w-sm text-sm leading-6 text-slate-500'>Authorize the Command Center GitHub App to let us read your repositories. We never store your GitHub access token.</p>

        {error ? (
          <div role='alert' className='mt-5 w-full max-w-sm rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800'>
            {error}
          </div>
        ) : null}

        <Button className='mt-6' loading={connecting} onClick={() => void handleConnect()}>
          <FolderGit2 className='size-4' />
          Connect GitHub
        </Button>
      </CardContent>
    </Card>
  );
}
