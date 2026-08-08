import type { Server } from 'node:http';

import type { INestApplication } from '@nestjs/common';

import request, { type Response } from 'supertest';

import { asRecord, recordString } from './application';

import { withBearer } from './auth';

import { RawAnalyticsEventType } from 'src/generated/prisma/enums';

import { PrismaService } from 'src/database/prisma.service';

import type { WorkspaceTestUser } from './workspace';

import { type TrackedWebsite, uniqueTrackerId } from './analytics-ingestion';

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

export async function getAnalyticsEngineStatus(
  actor: WorkspaceTestUser,
  workspaceId: string,
  websiteId: string,
): Promise<Response> {
  return actor.agent
    .get(analyticsEngineRoutes.status(workspaceId, websiteId))
    .set(withBearer(actor.accessToken));
}

export async function getAnonymousAnalyticsEngineStatus(
  app: INestApplication,
  workspaceId: string,
  websiteId: string,
): Promise<Response> {
  return request(app.getHttpServer() as Server).get(
    analyticsEngineRoutes.status(workspaceId, websiteId),
  );
}

export async function processAnalytics(
  actor: WorkspaceTestUser,
  workspaceId: string,
  websiteId: string,
  body: Record<string, unknown> = {},
): Promise<Response> {
  return actor.agent
    .post(analyticsEngineRoutes.process(workspaceId, websiteId))
    .set(withBearer(actor.accessToken))
    .send(body);
}

export function readAnalyticsEngineStatus(response: Response): AnalyticsEngineStatusBody {
  const body = asRecord(response.body);

  const website = asRecord(body?.website);

  const countsRecord = asRecord(body?.counts);

  if (!body || !website || !countsRecord) {
    throw new Error(
      [
        'Unexpected analytics-engine status response.',
        `Received: ${JSON.stringify(response.body)}`,
      ].join(' '),
    );
  }

  const counts: Record<string, number> = {};

  for (const [key, value] of Object.entries(countsRecord)) {
    if (typeof value === 'number') {
      counts[key] = value;
    }
  }

  const recentSessions = Array.isArray(body.recentSessions)
    ? body.recentSessions
        .map(asRecord)
        .filter((value): value is Record<string, unknown> => value !== undefined)
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
    throw new Error(
      [
        `Expected analytics success but received ${response.status}.`,
        `Response: ${JSON.stringify(response.body)}`,
      ].join(' '),
    );
  }
}

export interface AnalyticsAggregateListBody {
  period: string;
  dimension: string;
  data: Record<string, unknown>[];
}

export async function listAnalyticsAggregates(
  actor: WorkspaceTestUser,
  workspaceId: string,
  websiteId: string,
  query: Record<string, string | number> = {},
): Promise<Response> {
  return actor.agent
    .get(analyticsEngineRoutes.aggregates(workspaceId, websiteId))
    .set(withBearer(actor.accessToken))
    .query(query);
}

export async function getAnonymousAnalyticsAggregates(
  app: INestApplication,
  workspaceId: string,
  websiteId: string,
  query: Record<string, string | number> = {},
): Promise<Response> {
  return request(app.getHttpServer() as Server)
    .get(analyticsEngineRoutes.aggregates(workspaceId, websiteId))
    .query(query);
}

export async function reprocessAnalytics(
  actor: WorkspaceTestUser,
  workspaceId: string,
  websiteId: string,
  body: Record<string, unknown>,
): Promise<Response> {
  return actor.agent
    .post(analyticsEngineRoutes.reprocess(workspaceId, websiteId))
    .set(withBearer(actor.accessToken))
    .send(body);
}

export async function runAnalyticsRetention(
  actor: WorkspaceTestUser,
  workspaceId: string,
  websiteId: string,
): Promise<Response> {
  return actor.agent
    .post(analyticsEngineRoutes.retention(workspaceId, websiteId))
    .set(withBearer(actor.accessToken));
}

export async function runAnonymousAnalyticsRetention(
  app: INestApplication,
  workspaceId: string,
  websiteId: string,
): Promise<Response> {
  return request(app.getHttpServer() as Server).post(
    analyticsEngineRoutes.retention(workspaceId, websiteId),
  );
}

export function readAnalyticsAggregateList(response: Response): AnalyticsAggregateListBody {
  const body = asRecord(response.body);

  const data = Array.isArray(body?.data)
    ? body.data.map(asRecord).filter((item): item is Record<string, unknown> => item !== undefined)
    : [];

  if (!body || typeof body.period !== 'string' || typeof body.dimension !== 'string') {
    throw new Error(
      [
        'Unexpected analytics aggregate response.',
        `Received: ${JSON.stringify(response.body)}`,
      ].join(' '),
    );
  }

  return {
    period: body.period,
    dimension: body.dimension,
    data,
  };
}

export function findAggregate(
  data: Record<string, unknown>[],
  dimensionValue: string,
): Record<string, unknown> | undefined {
  return data.find((item) => recordString(item, 'dimensionValue') === dimensionValue);
}

export interface RawAnalyticsEventOverrides {
  eventId: string;
  type: RawAnalyticsEventType;
  visitorId: string;
  sessionId: string;
  occurredAt: Date;
  receivedAt: Date;
  pageUrl: string;
  pageTitle: string | null;
  referrerUrl: string | null;
  eventName: string | null;
  durationMs: number | null;
  countryCode: string | null;
  userAgent: string | null;
  sdkVersion: string;
}

export async function createRawAnalyticsEvent(
  prisma: PrismaService,
  trackedWebsite: TrackedWebsite,
  overrides: Partial<RawAnalyticsEventOverrides> = {},
) {
  const pageUrl = overrides.pageUrl ?? `${trackedWebsite.origin}/dashboard`;

  const parsedUrl = new URL(pageUrl);

  const type = overrides.type ?? RawAnalyticsEventType.PAGE_VIEW;

  const eventName =
    overrides.eventName !== undefined
      ? overrides.eventName
      : type === RawAnalyticsEventType.CUSTOM
        ? 'custom_event'
        : null;

  return prisma.rawAnalyticsEvent.create({
    data: {
      websiteId: trackedWebsite.id,
      eventId: overrides.eventId ?? uniqueTrackerId('raw_event'),
      type,
      visitorId: overrides.visitorId ?? uniqueTrackerId('raw_visitor'),
      sessionId: overrides.sessionId ?? uniqueTrackerId('raw_session'),
      occurredAt: overrides.occurredAt ?? new Date(),
      receivedAt: overrides.receivedAt ?? new Date(),
      pageUrl,
      pagePath: `${parsedUrl.pathname}${parsedUrl.search}`,
      pageTitle: overrides.pageTitle !== undefined ? overrides.pageTitle : 'Analytics page',
      referrerUrl: overrides.referrerUrl !== undefined ? overrides.referrerUrl : null,
      eventName,
      durationMs: overrides.durationMs !== undefined ? overrides.durationMs : null,
      origin: trackedWebsite.origin,
      userAgent: overrides.userAgent !== undefined ? overrides.userAgent : 'CommandCenter-E2E/1.0',
      countryCode: overrides.countryCode !== undefined ? overrides.countryCode : null,
      sdkVersion: overrides.sdkVersion ?? '1.0.0-e2e',
    },
  });
}
