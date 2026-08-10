import { applicationRoutes, asRecord, readApiItems, recordString } from './application';
import { withBearer } from './auth';
import type { WorkspaceTestUser } from './workspace';
import type { Response } from 'supertest';

export interface WebsitePayload {
  name: string;
  domain: string;
  timeZone?: string;
  allowedOrigins?: string[];
  applicationId?: string | null;
  enabled?: boolean;
}

export interface CreatedWebsite {
  id: string;
  payload: WebsitePayload;
  record: Record<string, unknown>;
  response: Response;
}

export const websiteRoutes = {
  root(workspaceId: string): string {
    return `/api/v1/workspaces/${workspaceId}/websites`;
  },

  details(workspaceId: string, websiteId: string): string {
    return `${this.root(workspaceId)}/${websiteId}`;
  },

  enable(workspaceId: string, websiteId: string): string {
    return `${this.details(workspaceId, websiteId)}/enable`;
  },

  disable(workspaceId: string, websiteId: string): string {
    return `${this.details(workspaceId, websiteId)}/disable`;
  },

  archive(workspaceId: string, websiteId: string): string {
    return `${this.details(workspaceId, websiteId)}/archive`;
  },

  restore(workspaceId: string, websiteId: string): string {
    return `${this.details(workspaceId, websiteId)}/restore`;
  },

  rotateKey(workspaceId: string, websiteId: string): string {
    return `${this.details(workspaceId, websiteId)}/rotate-key`;
  },

  connect(workspaceId: string, websiteId: string): string {
    return `${this.details(workspaceId, websiteId)}/connect`;
  },

  disconnect(workspaceId: string, websiteId: string): string {
    return `${this.details(workspaceId, websiteId)}/disconnect`;
  },

  workspaceActivities(workspaceId: string): string {
    return applicationRoutes.workspaceActivities(workspaceId);
  },
} as const;

function uniqueSuffix(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function buildWebsitePayload(overrides: Partial<WebsitePayload> = {}): WebsitePayload {
  const suffix = uniqueSuffix();

  return {
    name: `Batch 5 Website ${suffix}`,

    domain: `batch-5-${suffix}.example.test`,

    timeZone: 'Asia/Dubai',

    allowedOrigins: [`https://batch-5-${suffix}.example.test`, 'http://localhost:3000'],

    enabled: true,

    ...overrides,
  };
}

export function expectWebsiteSuccess(response: Response): void {
  expect([200, 201, 202]).toContain(response.status);
}

export function readWebsiteRecord(response: Response): Record<string, unknown> {
  const body = asRecord(response.body);

  const data = asRecord(body?.data);

  const candidates: unknown[] = [body?.website, data?.website, data, body];

  for (const candidate of candidates) {
    const record = asRecord(candidate);

    if (record) {
      return record;
    }
  }

  throw new Error(['Expected a website object in the response.', `Received: ${JSON.stringify(response.body)}`].join(' '));
}

export function readWebsiteItems(response: Response): Record<string, unknown>[] {
  return readApiItems(response, ['websites']);
}

export function findRecordById(records: Record<string, unknown>[], id: string): Record<string, unknown> | undefined {
  return records.find((record) => recordString(record, 'id', 'websiteId') === id);
}

export function findStringDeep(value: unknown, keys: string[]): string | undefined {
  if (typeof value !== 'object' || value === null) {
    return undefined;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findStringDeep(item, keys);

      if (found) {
        return found;
      }
    }

    return undefined;
  }

  const record = value as Record<string, unknown>;

  for (const key of keys) {
    const candidate = record[key];

    if (typeof candidate === 'string') {
      return candidate;
    }
  }

  for (const candidate of Object.values(record)) {
    const found = findStringDeep(candidate, keys);

    if (found) {
      return found;
    }
  }

  return undefined;
}

export function findBooleanDeep(value: unknown, keys: string[]): boolean | undefined {
  if (typeof value !== 'object' || value === null) {
    return undefined;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findBooleanDeep(item, keys);

      if (found !== undefined) {
        return found;
      }
    }

    return undefined;
  }

  const record = value as Record<string, unknown>;

  for (const key of keys) {
    const candidate = record[key];

    if (typeof candidate === 'boolean') {
      return candidate;
    }
  }

  for (const candidate of Object.values(record)) {
    const found = findBooleanDeep(candidate, keys);

    if (found !== undefined) {
      return found;
    }
  }

  return undefined;
}

export function readTrackingKey(response: Response): string {
  const trackingKey = findStringDeep(response.body, ['trackingKey', 'rawTrackingKey', 'writeKey', 'key']);

  if (!trackingKey) {
    throw new Error(['Tracking key was not found in the response.', `Received: ${JSON.stringify(response.body)}`].join(' '));
  }

  return trackingKey;
}

export async function createWebsite(actor: WorkspaceTestUser, overrides: Partial<WebsitePayload> = {}): Promise<CreatedWebsite> {
  const payload = buildWebsitePayload(overrides);

  const response = await actor.agent.post(websiteRoutes.root(actor.workspaceId)).set(withBearer(actor.accessToken)).send(payload);

  expectWebsiteSuccess(response);

  const record = readWebsiteRecord(response);

  const id = recordString(record, 'id', 'websiteId');

  if (!id) {
    throw new Error(['Website response does not contain an ID.', `Received: ${JSON.stringify(response.body)}`].join(' '));
  }

  return {
    id,
    payload,
    record,
    response,
  };
}

export async function listWebsites(actor: WorkspaceTestUser, query: Record<string, string | number | boolean> = {}): Promise<Response> {
  return actor.agent.get(websiteRoutes.root(actor.workspaceId)).set(withBearer(actor.accessToken)).query(query);
}

export async function getWebsite(actor: WorkspaceTestUser, websiteId: string): Promise<Response> {
  return actor.agent.get(websiteRoutes.details(actor.workspaceId, websiteId)).set(withBearer(actor.accessToken));
}

export async function updateWebsite(actor: WorkspaceTestUser, websiteId: string, payload: Partial<WebsitePayload>): Promise<Response> {
  return actor.agent.patch(websiteRoutes.details(actor.workspaceId, websiteId)).set(withBearer(actor.accessToken)).send(payload);
}

export async function enableWebsite(actor: WorkspaceTestUser, websiteId: string): Promise<Response> {
  return actor.agent.post(websiteRoutes.enable(actor.workspaceId, websiteId)).set(withBearer(actor.accessToken));
}

export async function disableWebsite(actor: WorkspaceTestUser, websiteId: string): Promise<Response> {
  return actor.agent.post(websiteRoutes.disable(actor.workspaceId, websiteId)).set(withBearer(actor.accessToken));
}

export async function archiveWebsite(actor: WorkspaceTestUser, websiteId: string): Promise<Response> {
  return actor.agent.post(websiteRoutes.archive(actor.workspaceId, websiteId)).set(withBearer(actor.accessToken));
}

export async function restoreWebsite(actor: WorkspaceTestUser, websiteId: string): Promise<Response> {
  return actor.agent.post(websiteRoutes.restore(actor.workspaceId, websiteId)).set(withBearer(actor.accessToken));
}

export async function rotateWebsiteKey(actor: WorkspaceTestUser, websiteId: string): Promise<Response> {
  return actor.agent.post(websiteRoutes.rotateKey(actor.workspaceId, websiteId)).set(withBearer(actor.accessToken));
}

export async function connectWebsite(actor: WorkspaceTestUser, websiteId: string, applicationId: string): Promise<Response> {
  return actor.agent.post(websiteRoutes.connect(actor.workspaceId, websiteId)).set(withBearer(actor.accessToken)).send({
    applicationId,
  });
}

export async function disconnectWebsite(actor: WorkspaceTestUser, websiteId: string): Promise<Response> {
  return actor.agent.post(websiteRoutes.disconnect(actor.workspaceId, websiteId)).set(withBearer(actor.accessToken));
}

export function nestedRecords(value: unknown): Record<string, unknown>[] {
  if (Array.isArray(value)) {
    return value.map(asRecord).filter((item): item is Record<string, unknown> => item !== undefined);
  }

  return [];
}
