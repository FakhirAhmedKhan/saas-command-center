/* eslint-disable @typescript-eslint/no-unsafe-argument */

import type { INestApplication } from '@nestjs/common';

import request, { type Response } from 'supertest';

import { RawAnalyticsEventType } from 'src/generated/prisma/enums';

import { asRecord, recordString } from './application';

import { withBearer } from './auth';

import type { WorkspaceTestUser } from './workspace';

import { createWebsite, type CreatedWebsite } from './website';

export interface TrackerEventPayload {
  eventId: string;
  type: RawAnalyticsEventType;
  visitorId: string;
  sessionId: string;
  timestamp: string;
  url: string;
  title?: string;
  referrer?: string;
  eventName?: string;
  properties?: Record<string, unknown>;
  screenWidth?: number;
  screenHeight?: number;
  viewportWidth?: number;
  viewportHeight?: number;
  language?: string;
  timeZone?: string;
  durationMs?: number;
}

export interface CollectEventsPayload {
  websiteId: string;
  trackingKey: string;
  sdkVersion: string;
  sentAt: string;
  events: TrackerEventPayload[];
}

export interface TrackedWebsite {
  id: string;
  origin: string;
  trackingKey: string;
  website: CreatedWebsite;
}

export interface CollectResponseBody {
  accepted: number;
  duplicates: number;
  receivedAt: string;
}

export interface TrackingStatusBody {
  website: Record<string, unknown>;
  connected: boolean;
  totalEvents: number;
  counts: Record<string, number>;
  recentEvents: Record<string, unknown>[];
}

export interface RawEventListBody {
  data: Record<string, unknown>[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}

export const analyticsIngestionRoutes = {
  collect(): string {
    return '/api/v1/collect';
  },

  trackingRoot(workspaceId: string, websiteId: string): string {
    return `/api/v1/workspaces/${workspaceId}/websites/${websiteId}/tracking`;
  },

  status(workspaceId: string, websiteId: string): string {
    return `${this.trackingRoot(workspaceId, websiteId)}/status`;
  },

  events(workspaceId: string, websiteId: string): string {
    return `${this.trackingRoot(workspaceId, websiteId)}/events`;
  },
} as const;

function randomPart(): string {
  return Math.random().toString(36).slice(2, 12);
}

export function uniqueTrackerId(prefix = 'tracker'): string {
  return `${prefix}_${Date.now()}_${randomPart()}`;
}

export function uniqueOrigin(prefix = 'analytics'): string {
  return `https://${prefix}-${Date.now()}-${randomPart()}.example.test`;
}

export function buildTrackerEvent(
  origin: string,
  overrides: Partial<TrackerEventPayload> = {},
): TrackerEventPayload {
  const type = overrides.type ?? RawAnalyticsEventType.PAGE_VIEW;

  const event: TrackerEventPayload = {
    eventId: uniqueTrackerId('event'),

    type,

    visitorId: uniqueTrackerId('visitor'),

    sessionId: uniqueTrackerId('session'),

    timestamp: new Date().toISOString(),

    url: `${origin}/dashboard`,

    title: 'Analytics dashboard',

    referrer: 'https://search.example.test/results',

    screenWidth: 1920,

    screenHeight: 1080,

    viewportWidth: 1440,

    viewportHeight: 900,

    language: 'en-US',

    timeZone: 'Asia/Dubai',

    ...overrides,
  };

  if (event.type === RawAnalyticsEventType.CUSTOM && event.eventName === undefined) {
    event.eventName = 'signup_completed';
  }

  return event;
}

export function buildCollectPayload(
  trackedWebsite: TrackedWebsite,
  events: TrackerEventPayload[],
  overrides: Partial<Omit<CollectEventsPayload, 'events'>> = {},
): CollectEventsPayload {
  return {
    websiteId: trackedWebsite.id,

    trackingKey: trackedWebsite.trackingKey,

    sdkVersion: '1.0.0-e2e',

    sentAt: new Date().toISOString(),

    events,

    ...overrides,
  };
}

export async function createTrackedWebsite(
  actor: WorkspaceTestUser,
  options: {
    origin?: string;
    enabled?: boolean;
    allowedOrigins?: string[];
  } = {},
): Promise<TrackedWebsite> {
  const origin = options.origin ?? uniqueOrigin();

  const parsedOrigin = new URL(origin);

  const website = await createWebsite(actor, {
    domain: parsedOrigin.host,

    allowedOrigins: options.allowedOrigins ?? [origin],

    enabled: options.enabled ?? true,
  });

  const responseBody = asRecord(website.response.body);

  const trackingKey = recordString(responseBody ?? {}, 'trackingKey');

  if (!trackingKey || !trackingKey.startsWith('cc_live_')) {
    throw new Error(
      [
        'Website creation did not return a raw tracking key.',
        `Response: ${JSON.stringify(website.response.body)}`,
      ].join(' '),
    );
  }

  return {
    id: website.id,

    origin,

    trackingKey,

    website,
  };
}
export async function collectEvents(
  app: INestApplication,
  trackedWebsite: TrackedWebsite,
  events: TrackerEventPayload[],
  options: {
    origin?: string | null;
    trackingKey?: string;
    websiteId?: string;
    sdkVersion?: string;
    sentAt?: string;
    userAgent?: string;
    extraHeaders?: Record<string, string>;
  } = {},
): Promise<Response> {
  const payload = buildCollectPayload(trackedWebsite, events, {
    trackingKey: options.trackingKey ?? trackedWebsite.trackingKey,

    websiteId: options.websiteId ?? trackedWebsite.id,

    sdkVersion: options.sdkVersion ?? '1.0.0-e2e',

    sentAt: options.sentAt ?? new Date().toISOString(),
  });

  let testRequest = request(app.getHttpServer())
    .post(analyticsIngestionRoutes.collect())
    .set('User-Agent', options.userAgent ?? 'CommandCenter-E2E/1.0');

  const origin = options.origin === undefined ? trackedWebsite.origin : options.origin;

  if (origin !== null) {
    testRequest = testRequest.set('Origin', origin);
  }

  for (const [key, value] of Object.entries(options.extraHeaders ?? {})) {
    testRequest = testRequest.set(key, value);
  }

  return testRequest.send(payload);
}

export function readCollectResult(response: Response): CollectResponseBody {
  const body = asRecord(response.body);

  if (
    !body ||
    typeof body.accepted !== 'number' ||
    typeof body.duplicates !== 'number' ||
    typeof body.receivedAt !== 'string'
  ) {
    throw new Error(
      ['Unexpected collection response.', `Received: ${JSON.stringify(response.body)}`].join(' '),
    );
  }

  return {
    accepted: body.accepted,

    duplicates: body.duplicates,

    receivedAt: body.receivedAt,
  };
}

export async function getTrackingStatus(
  actor: WorkspaceTestUser,
  websiteId: string,
): Promise<Response> {
  return actor.agent
    .get(analyticsIngestionRoutes.status(actor.workspaceId, websiteId))
    .set(withBearer(actor.accessToken));
}

export async function listRawEvents(
  actor: WorkspaceTestUser,
  websiteId: string,
  query: Record<string, string | number> = {},
): Promise<Response> {
  return actor.agent
    .get(analyticsIngestionRoutes.events(actor.workspaceId, websiteId))
    .set(withBearer(actor.accessToken))
    .query(query);
}

export function readTrackingStatus(response: Response): TrackingStatusBody {
  const body = asRecord(response.body);

  const website = asRecord(body?.website);

  const counts = asRecord(body?.counts);

  const recentEvents = Array.isArray(body?.recentEvents)
    ? body.recentEvents
        .map(asRecord)
        .filter((item): item is Record<string, unknown> => item !== undefined)
    : [];

  if (
    !body ||
    !website ||
    !counts ||
    typeof body.connected !== 'boolean' ||
    typeof body.totalEvents !== 'number'
  ) {
    throw new Error(
      ['Unexpected tracking status response.', `Received: ${JSON.stringify(response.body)}`].join(
        ' ',
      ),
    );
  }

  const normalizedCounts: Record<string, number> = {};

  for (const [key, value] of Object.entries(counts)) {
    if (typeof value === 'number') {
      normalizedCounts[key] = value;
    }
  }

  return {
    website,

    connected: body.connected,

    totalEvents: body.totalEvents,

    counts: normalizedCounts,

    recentEvents,
  };
}

export function readRawEventList(response: Response): RawEventListBody {
  const body = asRecord(response.body);

  const meta = asRecord(body?.meta);

  const data = Array.isArray(body?.data)
    ? body.data.map(asRecord).filter((item): item is Record<string, unknown> => item !== undefined)
    : [];

  if (
    !body ||
    !meta ||
    typeof meta.page !== 'number' ||
    typeof meta.limit !== 'number' ||
    typeof meta.total !== 'number' ||
    typeof meta.totalPages !== 'number' ||
    typeof meta.hasNextPage !== 'boolean' ||
    typeof meta.hasPreviousPage !== 'boolean'
  ) {
    throw new Error(
      ['Unexpected raw-event list response.', `Received: ${JSON.stringify(response.body)}`].join(
        ' ',
      ),
    );
  }

  return {
    data,

    meta: {
      page: meta.page,

      limit: meta.limit,

      total: meta.total,

      totalPages: meta.totalPages,

      hasNextPage: meta.hasNextPage,

      hasPreviousPage: meta.hasPreviousPage,
    },
  };
}

export function findRawEvent(
  events: Record<string, unknown>[],
  eventId: string,
): Record<string, unknown> | undefined {
  return events.find((event) => recordString(event, 'eventId') === eventId);
}

export function expectCollectionAccepted(
  response: Response,
  accepted: number,
  duplicates = 0,
): void {
  if (response.status !== 202) {
    throw new Error(`Collect failed: ${response.status}. Body: ${JSON.stringify(response.body)}`);
  }

  expect(response.status).toBe(202);

  const result = readCollectResult(response);

  expect(result.accepted).toBe(accepted);

  expect(result.duplicates).toBe(duplicates);

  expect(Number.isNaN(Date.parse(result.receivedAt))).toBe(false);
}

export function buildEventBatch(
  origin: string,
  count: number,
  overrides: Partial<TrackerEventPayload> = {},
): TrackerEventPayload[] {
  return Array.from(
    {
      length: count,
    },
    (_, index) =>
      buildTrackerEvent(origin, {
        title: `Batch event ${index + 1}`,

        ...overrides,
      }),
  );
}
