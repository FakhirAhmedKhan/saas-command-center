import { asRecord } from './application';
import { withBearer } from './auth';
import type { WorkspaceTestUser } from './workspace';
import type { INestApplication } from '@nestjs/common';
import request, { type Response } from 'supertest';

export const analyticsEngineRoutes = {
  root(workspaceId: string, websiteId: string): string {
    return `/api/v1/workspaces/${workspaceId}/websites/${websiteId}/analytics-engine`;
  },

  status(workspaceId: string, websiteId: string): string {
    return `${this.root(workspaceId, websiteId)}/status`;
  },

  process(workspaceId: string, websiteId: string): string {
    return `${this.root(workspaceId, websiteId)}/process`;
  },

  aggregates(workspaceId: string, websiteId: string): string {
    return `${this.root(workspaceId, websiteId)}/aggregates`;
  },

  reprocess(workspaceId: string, websiteId: string): string {
    return `${this.root(workspaceId, websiteId)}/reprocess`;
  },

  retention(workspaceId: string, websiteId: string): string {
    return `${this.root(workspaceId, websiteId)}/retention`;
  },
} as const;

export interface AnalyticsEngineStatusBody {
  website: Record<string, unknown>;
  counts: Record<string, number>;
  processingState: Record<string, unknown> | null;
  latestRun: Record<string, unknown> | null;
  recentSessions: Record<string, unknown>[];
}

export async function getAnalyticsEngineStatus(actor: WorkspaceTestUser, workspaceId: string, websiteId: string): Promise<Response> {
  return actor.agent.get(analyticsEngineRoutes.status(workspaceId, websiteId)).set(withBearer(actor.accessToken));
}

export async function getAnonymousAnalyticsEngineStatus(app: INestApplication, workspaceId: string, websiteId: string): Promise<Response> {
  return request(app.getHttpServer()).get(analyticsEngineRoutes.status(workspaceId, websiteId));
}

export async function processAnalytics(
  actor: WorkspaceTestUser,
  workspaceId: string,
  websiteId: string,
  body: Record<string, unknown> = {},
): Promise<Response> {
  return actor.agent.post(analyticsEngineRoutes.process(workspaceId, websiteId)).set(withBearer(actor.accessToken)).send(body);
}

export function readAnalyticsEngineStatus(response: Response): AnalyticsEngineStatusBody {
  const body = asRecord(response.body);

  const website = asRecord(body?.website);

  const countsRecord = asRecord(body?.counts);

  if (!body || !website || !countsRecord) {
    throw new Error(['Unexpected analytics-engine status response.', `Received: ${JSON.stringify(response.body)}`].join(' '));
  }

  const counts: Record<string, number> = {};

  for (const [key, value] of Object.entries(countsRecord)) {
    if (typeof value === 'number') {
      counts[key] = value;
    }
  }

  const recentSessions = Array.isArray(body.recentSessions)
    ? body.recentSessions.map(asRecord).filter((value): value is Record<string, unknown> => value !== undefined)
    : [];

  return {
    website,
    counts,
    processingState: asRecord(body.processingState) ?? null,
    latestRun: asRecord(body.latestRun) ?? null,
    recentSessions,
  };
}

export function expectAnalyticsSuccess(response: Response): void {
  if (![200, 201, 202].includes(response.status)) {
    throw new Error([`Expected analytics success but received ${response.status}.`, `Response: ${JSON.stringify(response.body)}`].join(' '));
  }
}
