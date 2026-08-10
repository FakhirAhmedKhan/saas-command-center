import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { request } from '@playwright/test';
import { fullStackStateDirectory, fullStackStatePath, type FullStackState, type SeedUser } from './fixtures/state';

interface AuthResponse {
  accessToken: string;
  user: {
    id: string;
  };
  workspaces: Array<{
    id: string;
  }>;
}

interface ApplicationResponse {
  id: string;
  name: string;
  slug: string;
}

interface WebsiteResponse {
  website: {
    id: string;
    name: string;
    domain: string;
  };
  trackingKey: string;
}

async function globalSetup(): Promise<void> {
  const apiUrl = process.env.FULLSTACK_API_URL ?? 'http://127.0.0.1:4100/api/v1';

  const webUrl = process.env.FULLSTACK_WEB_URL ?? 'http://127.0.0.1:3100';

  const runId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  const stateDirectory = fullStackStateDirectory();

  mkdirSync(stateDirectory, {
    recursive: true,
  });

  const healthContext = await request.newContext({
    baseURL: apiUrl,
  });

  const healthResponse = await healthContext.get(`${apiUrl}/health`);

  if (!healthResponse.ok()) {
    throw new Error(`Full-stack API health check failed: ${healthResponse.status()}`);
  }

  await healthContext.dispose();

  async function register(roleName: string): Promise<SeedUser> {
    const email = `batch11-${roleName}-${runId}@example.test`;

    const password = 'StrongBatch11Password123!';

    const displayName = `Batch 11 ${roleName}`;

    const context = await request.newContext({
      baseURL: apiUrl,
      extraHTTPHeaders: {
        'Content-Type': 'application/json',
      },
    });

    const response = await context.post(`${apiUrl}/auth/register`, {
      data: {
        email,
        password,
        displayName,
        workspaceName: `Batch 11 ${roleName} Workspace ${runId}`,
      },
    });

    if (response.status() !== 201) {
      throw new Error(`Could not register ${roleName}: ${response.status()} ${await response.text()}`);
    }

    const body = (await response.json()) as AuthResponse;

    const storageStatePath = resolve(stateDirectory, `${roleName.toLowerCase()}.json`);

    await context.storageState({
      path: storageStatePath,
    });

    await context.dispose();

    const workspaceId = body.workspaces[0]?.id;

    if (!workspaceId) {
      throw new Error(`${roleName} registration did not create a workspace`);
    }

    return {
      id: body.user.id,
      email,
      password,
      displayName,
      workspaceId,
      accessToken: body.accessToken,
      storageStatePath,
    };
  }

  const owner = await register('Owner');

  const admin = await register('Admin');

  const developer = await register('Developer');

  const viewer = await register('Viewer');

  const ownerApi = await request.newContext({
    baseURL: apiUrl,
    extraHTTPHeaders: {
      Authorization: `Bearer ${owner.accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  for (const member of [
    {
      user: admin,
      role: 'ADMIN',
    },
    {
      user: developer,
      role: 'DEVELOPER',
    },
    {
      user: viewer,
      role: 'VIEWER',
    },
  ]) {
    const response = await ownerApi.post(`${apiUrl}/workspaces/${owner.workspaceId}/members`, {
      data: {
        email: member.user.email,
        role: member.role,
      },
    });

    if (response.status() !== 201) {
      throw new Error(`Could not add ${member.role}: ${response.status()} ${await response.text()}`);
    }
  }

  const applicationResponse = await ownerApi.post(`${apiUrl}/workspaces/${owner.workspaceId}/applications`, {
    data: {
      name: 'Batch 11 Baseline App',
      slug: `batch11-baseline-app-${runId}`,
      shortDescription: 'Real full-stack baseline application',
      category: 'SAAS',
      status: 'IN_DEVELOPMENT',
      priority: 'HIGH',
    },
  });

  if (applicationResponse.status() !== 201) {
    throw new Error(`Could not create baseline application: ${applicationResponse.status()} ${await applicationResponse.text()}`);
  }

  const baselineApplication = (await applicationResponse.json()) as ApplicationResponse;

  const trackingOrigin = `https://batch11-${runId}.example.test`;

  const websiteResponse = await ownerApi.post(`${apiUrl}/workspaces/${owner.workspaceId}/websites`, {
    data: {
      name: 'Batch 11 Baseline Website',
      domain: `batch11-${runId}.example.test`,
      timeZone: 'Asia/Dubai',
      enabled: true,
      allowedOrigins: [trackingOrigin],
      applicationId: baselineApplication.id,
    },
  });

  if (websiteResponse.status() !== 201) {
    throw new Error(`Could not create baseline website: ${websiteResponse.status()} ${await websiteResponse.text()}`);
  }

  const baselineWebsiteResponse = (await websiteResponse.json()) as WebsiteResponse;

  await ownerApi.dispose();

  const state: FullStackState = {
    runId,
    apiUrl,
    webUrl,
    trackingOrigin,
    owner,
    admin,
    developer,
    viewer,
    baselineApplication: {
      id: baselineApplication.id,
      name: baselineApplication.name,
      slug: baselineApplication.slug,
    },
    baselineWebsite: {
      id: baselineWebsiteResponse.website.id,
      name: baselineWebsiteResponse.website.name,
      domain: baselineWebsiteResponse.website.domain,
      trackingKey: baselineWebsiteResponse.trackingKey,
    },
  };

  writeFileSync(fullStackStatePath(), JSON.stringify(state, null, 2), 'utf8');
}

export default globalSetup;
