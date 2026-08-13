import { createAgent, createTestUser, registerUser, withBearer } from '../helpers/auth';
import { createTestApp } from '../helpers/create-test-app';
import { resetDatabase } from '../helpers/database';
import { readAccessToken } from '../helpers/response';
import { PrismaService } from 'src/database/prisma.service';
import { AnalyticsAggregateDimension, AnalyticsDeviceType, AnalyticsSourceType, RawAnalyticsEventType, WorkspaceRole } from 'src/generated/prisma/enums';
import type { INestApplication } from '@nestjs/common';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import request, { type Response } from 'supertest';

/**
 * Phase 13 Ã¢â‚¬â€ Analytics Reports E2E
 *
 * Real routes (apps/api/src/modules/analytics-reports/controllers/analytics-reports.controller.ts):
 *   GET /api/v1/workspaces/:workspaceId/websites/:websiteId/analytics/reports/pages
 *   GET /api/v1/workspaces/:workspaceId/websites/:websiteId/analytics/reports/events
 *   GET /api/v1/workspaces/:workspaceId/websites/:websiteId/analytics/reports/dimensions/:dimension
 *   GET /api/v1/workspaces/:workspaceId/websites/:websiteId/analytics/reports/exports/pages
 *   GET /api/v1/workspaces/:workspaceId/websites/:websiteId/analytics/reports/exports/events
 *   GET /api/v1/workspaces/:workspaceId/websites/:websiteId/analytics/reports/exports/dimensions/:dimension
 *
 * Guards: JwtAuthGuard + WorkspaceAccessGuard only (no WorkspaceRolesGuard) -> every
 * workspace member role (OWNER/ADMIN/DEVELOPER/VIEWER) can read reports.
 *
 * Query DTO (apps/api/src/modules/analytics-reports/dto/analytics-report-query.dto.ts,
 * extending AnalyticsOverviewQueryDto from analytics-overview/dto/analytics-overview-query.dto.ts):
 *   - preset: 'today' | '7d' | '30d' | '90d' (default '7d')
 *   - from / to: OPTIONAL, but validated with @Matches(/^\d{4}-\d{2}-\d{2}$/) i.e. YYYY-MM-DD
 *     date KEYS (not ISO datetimes). Supplying either requires both (resolveAnalyticsDateRange).
 *   - page: integer >= 1, default 1
 *   - limit: integer 1..100 (ANALYTICS_REPORT_MAX_LIMIT), default 25
 *   - search: string, max 100 chars
 *   - sortDirection: 'asc' | 'desc', default 'desc'
 *   - sortBy (pages): 'views' | 'visitors' | 'sessions' | 'entrances' | 'exits' |
 *       'bounceRate' | 'averageDuration' | 'path', default 'views'
 *   - sortBy (events): 'events' | 'visitors' | 'sessions' | 'name', default 'events'
 *   - sortBy (dimensions): 'visitors' | 'sessions' | 'pageViews' | 'label', default 'sessions'
 *
 * AnalyticsReportDimension enum (path param for dimensions/:dimension):
 *   'sources' | 'countries' | 'devices' | 'browsers' | 'operating-systems'
 * (mapped internally to Prisma AnalyticsAggregateDimension SOURCE/COUNTRY/DEVICE/BROWSER/OPERATING_SYSTEM)
 *
 * Dimension reports are read from pre-computed AnalyticsDailyAggregate / AnalyticsHourlyAggregate
 * rows (granularity is 'hour' when the resolved range is <= 2 days, else 'day'); pages/events
 * reports are computed live via parameterized raw SQL against analytics_page_views /
 * analytics_events.
 *
 * CSV export limits (analytics-reports.constants.ts):
 *   ANALYTICS_EXPORT_MAX_ROWS = 5000, ANALYTICS_EXPORT_MAX_DAYS = 90
 */

const API_PREFIX = '/api/v1';

// Date keys (YYYY-MM-DD) Ã¢â‚¬â€ the only format the DTO accepts for from/to.
const FROM = '2026-08-01';
const TO = '2026-08-04';

// startOfDateInTimeZone('2026-08-01', 'UTC') .. before startOfDateInTimeZone('2026-08-05', 'UTC')
// Bucket inside the resolved range. Range is 4 days (Aug 1-4 inclusive) => granularity 'day',
// so the pages/events report and the dimension report (read from AnalyticsDailyAggregate) must
// both use bucket/event timestamps within [2026-08-01T00:00:00Z, 2026-08-05T00:00:00Z).
const BUCKET_START = new Date('2026-08-02T00:00:00.000Z');
const DAILY_BUCKET_END = new Date('2026-08-03T00:00:00.000Z');
const HOURLY_BUCKET_END = new Date('2026-08-02T01:00:00.000Z');

const SENSITIVE_IP_HASH = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';

const PRIVATE_PROPERTY_VALUE = 'phase13-private-event-property-must-never-be-exported';

const DANGEROUS_CSV_PATH = '=SUM(A1:A2)';

type JsonRecord = Record<string, unknown>;

function requireValue<T>(value: T | null | undefined, message: string): T {
  if (value === null || value === undefined) {
    throw new Error(message);
  }

  return value;
}

function mustGet<T>(items: readonly T[], index: number): T {
  const item = items[index];

  if (item === undefined) {
    throw new Error(`Expected array item at index ${index}`);
  }

  return item;
}

function dimensionKey(dimension: AnalyticsAggregateDimension, value: string): string {
  return createHash('sha256').update(`${dimension}:${value}`).digest('hex');
}

function body(response: Response): JsonRecord {
  return response.body as JsonRecord;
}

function isRecordArray(value: unknown): value is JsonRecord[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'object' && item !== null);
}

function items(response: Response): JsonRecord[] {
  const value = body(response).items;

  if (!isRecordArray(value)) {
    throw new Error(`Expected items array in response body: ${JSON.stringify(response.body)}`);
  }

  return value;
}

function readResponseText(response: Response): string {
  if (typeof response.text === 'string' && response.text.length > 0) {
    return response.text;
  }

  const raw = response.body as unknown;

  if (Buffer.isBuffer(raw)) {
    return raw.toString('utf8');
  }

  throw new Error(`Expected a text/csv body, received: ${JSON.stringify(raw)}`);
}

function parseCsv(csv: string): string[][] {
  const rows: string[][] = [];

  let row: string[] = [];
  let field = '';
  let quoted = false;

  for (let index = 0; index < csv.length; index += 1) {
    const character = csv[index];

    if (character === '"') {
      if (quoted && csv[index + 1] === '"') {
        field += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }

      continue;
    }

    if (character === ',' && !quoted) {
      row.push(field);
      field = '';
      continue;
    }

    if ((character === '\n' || character === '\r') && !quoted) {
      if (character === '\r' && csv[index + 1] === '\n') {
        index += 1;
      }

      row.push(field);

      if (row.some((value) => value.length > 0)) {
        rows.push(row);
      }

      row = [];
      field = '';
      continue;
    }

    field += character;
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field);

    if (row.some((value) => value.length > 0)) {
      rows.push(row);
    }
  }

  const firstRow = rows[0];
  const firstCell = firstRow?.[0];

  if (firstRow && firstCell !== undefined) {
    firstRow[0] = firstCell.replace(/^\uFEFF/, '');
  }

  return rows;
}

interface AggregateSeed {
  dimension: AnalyticsAggregateDimension;
  value: string;
  label: string;
  visitors: number;
  sessions: number;
  pageViews: number;
  events: number;
  customEvents: number;
  bounces: number;
  totalDurationMs: bigint;
}

const AGGREGATE_ROWS: AggregateSeed[] = [
  {
    dimension: AnalyticsAggregateDimension.SOURCE,
    value: 'Direct',
    label: 'Direct',
    visitors: 7,
    sessions: 7,
    pageViews: 18,
    events: 18,
    customEvents: 0,
    bounces: 2,
    totalDurationMs: 250000n,
  },
  {
    dimension: AnalyticsAggregateDimension.SOURCE,
    value: 'Google',
    label: 'Google',
    visitors: 6,
    sessions: 5,
    pageViews: 14,
    events: 14,
    customEvents: 0,
    bounces: 2,
    totalDurationMs: 210000n,
  },
  {
    dimension: AnalyticsAggregateDimension.SOURCE,
    value: 'Newsletter',
    label: 'Newsletter',
    visitors: 4,
    sessions: 3,
    pageViews: 8,
    events: 11,
    customEvents: 3,
    bounces: 1,
    totalDurationMs: 140000n,
  },
  {
    dimension: AnalyticsAggregateDimension.COUNTRY,
    value: 'US',
    label: 'United States',
    visitors: 7,
    sessions: 9,
    pageViews: 25,
    events: 27,
    customEvents: 2,
    bounces: 3,
    totalDurationMs: 380000n,
  },
  {
    dimension: AnalyticsAggregateDimension.COUNTRY,
    value: 'AE',
    label: 'United Arab Emirates',
    visitors: 5,
    sessions: 6,
    pageViews: 15,
    events: 16,
    customEvents: 1,
    bounces: 2,
    totalDurationMs: 220000n,
  },
  {
    dimension: AnalyticsAggregateDimension.DEVICE,
    value: 'DESKTOP',
    label: 'Desktop',
    visitors: 7,
    sessions: 9,
    pageViews: 26,
    events: 28,
    customEvents: 2,
    bounces: 3,
    totalDurationMs: 390000n,
  },
  {
    dimension: AnalyticsAggregateDimension.DEVICE,
    value: 'MOBILE',
    label: 'Mobile',
    visitors: 5,
    sessions: 6,
    pageViews: 14,
    events: 15,
    customEvents: 1,
    bounces: 2,
    totalDurationMs: 210000n,
  },
  {
    dimension: AnalyticsAggregateDimension.BROWSER,
    value: 'Chrome',
    label: 'Chrome',
    visitors: 7,
    sessions: 10,
    pageViews: 28,
    events: 30,
    customEvents: 2,
    bounces: 3,
    totalDurationMs: 410000n,
  },
  {
    dimension: AnalyticsAggregateDimension.BROWSER,
    value: 'Safari',
    label: 'Safari',
    visitors: 4,
    sessions: 5,
    pageViews: 12,
    events: 13,
    customEvents: 1,
    bounces: 2,
    totalDurationMs: 190000n,
  },
  {
    dimension: AnalyticsAggregateDimension.OPERATING_SYSTEM,
    value: 'Windows',
    label: 'Windows',
    visitors: 7,
    sessions: 9,
    pageViews: 24,
    events: 26,
    customEvents: 2,
    bounces: 3,
    totalDurationMs: 360000n,
  },
  {
    dimension: AnalyticsAggregateDimension.OPERATING_SYSTEM,
    value: 'macOS',
    label: 'macOS',
    visitors: 5,
    sessions: 6,
    pageViews: 16,
    events: 17,
    customEvents: 1,
    bounces: 2,
    totalDurationMs: 240000n,
  },
];

async function seedAggregates(prisma: PrismaService, websiteId: string): Promise<void> {
  await prisma.analyticsDailyAggregate.createMany({
    data: AGGREGATE_ROWS.map((row) => ({
      websiteId,
      bucketStart: BUCKET_START,
      bucketEnd: DAILY_BUCKET_END,
      timeZone: 'UTC',
      dimension: row.dimension,
      dimensionKey: dimensionKey(row.dimension, row.value),
      dimensionValue: row.value,
      dimensionLabel: row.label,
      visitors: row.visitors,
      sessions: row.sessions,
      pageViews: row.pageViews,
      events: row.events,
      customEvents: row.customEvents,
      bounces: row.bounces,
      totalDurationMs: row.totalDurationMs,
    })),
  });

  // Also seed hourly aggregates so a narrower (<=2 day) range would resolve correctly too;
  // not exercised by the default FROM/TO range but keeps fixtures consistent with production
  // behaviour (resolveAnalyticsDateRange picks 'hour' granularity for short ranges).
  await prisma.analyticsHourlyAggregate.createMany({
    data: AGGREGATE_ROWS.map((row) => ({
      websiteId,
      bucketStart: BUCKET_START,
      bucketEnd: HOURLY_BUCKET_END,
      timeZone: 'UTC',
      dimension: row.dimension,
      dimensionKey: dimensionKey(row.dimension, row.value),
      dimensionValue: row.value,
      dimensionLabel: row.label,
      visitors: row.visitors,
      sessions: row.sessions,
      pageViews: row.pageViews,
      events: row.events,
      customEvents: row.customEvents,
      bounces: row.bounces,
      totalDurationMs: row.totalDurationMs,
    })),
  });
}

interface PageFixture {
  path: string;
  title: string;
}

interface SessionFixture {
  id: string;
  visitorId: string;
  pageViewCount: number;
  sourceType: AnalyticsSourceType;
  sourceName: string;
  sourceDomain: string | null;
  countryCode: string;
  deviceType: AnalyticsDeviceType;
  browserName: string;
  operatingSystem: string;
}

function buildRepeatedPages(count: number, path: string, title: string): PageFixture[] {
  return Array.from({ length: count }, () => ({ path, title }));
}

/**
 * Seeds normalized analytics (visitors/sessions/page views/custom events) that the live
 * pages/events raw-SQL reports read directly. Page view distribution:
 *   /pricing = 19, /docs = 12, /blog = 8, DANGEROUS_CSV_PATH = 1  (total 40)
 */
async function seedNormalizedAnalytics(prisma: PrismaService, websiteId: string): Promise<void> {
  const visitors: Array<{ id: string }> = [];

  for (let index = 0; index < 10; index += 1) {
    const visitor = await prisma.analyticsVisitor.create({
      data: {
        websiteId,
        externalVisitorId: `phase13-visitor-${index + 1}`,
        firstSeenAt: new Date(BUCKET_START.getTime() + index * 60_000),
        lastSeenAt: new Date(BUCKET_START.getTime() + (index + 120) * 60_000),
        sessionCount: index < 5 ? 2 : 1,
        pageViewCount: 4,
        eventCount: index < 3 ? 5 : 4,
      },
      select: { id: true },
    });

    visitors.push(visitor);
  }

  const pageViewCounts = [4, 4, 4, 3, 3, 3, 3, 3, 2, 2, 2, 2, 2, 2, 1];

  const sources = [
    { type: AnalyticsSourceType.DIRECT, name: 'Direct', domain: null },
    { type: AnalyticsSourceType.SEARCH, name: 'Google', domain: 'google.com' },
    { type: AnalyticsSourceType.REFERRAL, name: 'Newsletter', domain: 'newsletter.example.test' },
  ] as const;

  const countries = ['US', 'AE'] as const;
  const devices = [AnalyticsDeviceType.DESKTOP, AnalyticsDeviceType.MOBILE] as const;
  const browsers = ['Chrome', 'Safari'] as const;
  const operatingSystems = ['Windows', 'macOS'] as const;

  const sessions: SessionFixture[] = [];

  for (let index = 0; index < pageViewCounts.length; index += 1) {
    const visitor = mustGet(visitors, index % visitors.length);
    const source = mustGet(sources, index % sources.length);
    const countryCode = mustGet(countries, index % countries.length);
    const deviceType = mustGet(devices, index % devices.length);
    const browserName = mustGet(browsers, index % browsers.length);
    const operatingSystem = mustGet(operatingSystems, index % operatingSystems.length);
    const pageViewCount = mustGet(pageViewCounts, index);

    const startedAt = new Date(BUCKET_START.getTime() + index * 5 * 60_000);
    const endedAt = new Date(startedAt.getTime() + (30_000 + index * 1_000));

    const session = await prisma.analyticsSession.create({
      data: {
        websiteId,
        visitorId: visitor.id,
        externalSessionId: `phase13-session-${index + 1}`,
        startedAt,
        endedAt,
        lastEventAt: endedAt,
        durationMs: endedAt.getTime() - startedAt.getTime(),
        engagedDurationMs: endedAt.getTime() - startedAt.getTime(),
        pageViewCount,
        eventCount: pageViewCount + (index < 3 ? 1 : 0),
        customEventCount: index < 3 ? 1 : 0,
        bounced: pageViewCount === 1,
        entryPath: '/pricing',
        exitPath: '/docs',
        entryTitle: 'Pricing',
        exitTitle: 'Docs',
        referrerUrl: null,
        sourceType: source.type,
        sourceName: source.name,
        sourceDomain: source.domain,
        countryCode,
        deviceType,
        browserName,
        browserVersion: '1',
        operatingSystem,
        operatingSystemVersion: '1',
      },
      select: { id: true, visitorId: true },
    });

    sessions.push({
      id: session.id,
      visitorId: session.visitorId,
      pageViewCount,
      sourceType: source.type,
      sourceName: source.name,
      sourceDomain: source.domain,
      countryCode,
      deviceType,
      browserName,
      operatingSystem,
    });
  }

  const pages: PageFixture[] = [
    ...buildRepeatedPages(19, '/pricing', 'Pricing'),
    ...buildRepeatedPages(12, '/docs', 'Docs'),
    ...buildRepeatedPages(8, '/blog', 'Blog'),
    ...buildRepeatedPages(1, DANGEROUS_CSV_PATH, DANGEROUS_CSV_PATH),
  ];

  expect(pages).toHaveLength(40);

  let pageIndex = 0;

  for (const session of sessions) {
    for (let sessionPageIndex = 0; sessionPageIndex < session.pageViewCount; sessionPageIndex += 1) {
      const page = mustGet(pages, pageIndex);

      pageIndex += 1;

      const occurredAt = new Date(BUCKET_START.getTime() + (180 + pageIndex) * 60_000);

      const pageUrl = page.path.startsWith('/') ? `https://phase13.example.test${page.path}` : 'https://phase13.example.test/formula';

      const analyticsEvent = await prisma.analyticsEvent.create({
        data: {
          websiteId,
          visitorId: session.visitorId,
          sessionId: session.id,
          sourceEventId: `phase13-page-${pageIndex}`,
          type: RawAnalyticsEventType.PAGE_VIEW,
          eventName: null,
          occurredAt,
          receivedAt: new Date(occurredAt.getTime() + 1_000),
          pageUrl,
          normalizedPath: page.path,
          pageTitle: page.title,
          referrerUrl: null,
          properties: null,
          durationMs: 15_000,
          sourceType: session.sourceType,
          sourceName: session.sourceName,
          sourceDomain: session.sourceDomain,
          countryCode: session.countryCode,
          deviceType: session.deviceType,
          browserName: session.browserName,
          browserVersion: '1',
          operatingSystem: session.operatingSystem,
          operatingSystemVersion: '1',
        },
        select: { id: true },
      });

      await prisma.analyticsPageView.create({
        data: {
          websiteId,
          visitorId: session.visitorId,
          sessionId: session.id,
          analyticsEventId: analyticsEvent.id,
          occurredAt,
          pageUrl,
          normalizedPath: page.path,
          title: page.title,
          referrerUrl: null,
          sourceType: session.sourceType,
          sourceName: session.sourceName,
          sourceDomain: session.sourceDomain,
          countryCode: session.countryCode,
          deviceType: session.deviceType,
          browserName: session.browserName,
          operatingSystem: session.operatingSystem,
          isEntry: sessionPageIndex === 0,
          isExit: sessionPageIndex === session.pageViewCount - 1,
        },
      });
    }
  }

  expect(pageIndex).toBe(40);

  const customEvents = [
    { name: 'signup', sessionIndex: 0 },
    { name: 'signup', sessionIndex: 1 },
    { name: 'purchase', sessionIndex: 2 },
  ] as const;

  for (let index = 0; index < customEvents.length; index += 1) {
    const custom = mustGet(customEvents, index);
    const session = mustGet(sessions, custom.sessionIndex);

    const occurredAt = new Date(BUCKET_START.getTime() + (300 + index) * 60_000);

    await prisma.analyticsEvent.create({
      data: {
        websiteId,
        visitorId: session.visitorId,
        sessionId: session.id,
        sourceEventId: `phase13-custom-${index + 1}`,
        type: RawAnalyticsEventType.CUSTOM,
        eventName: custom.name,
        occurredAt,
        receivedAt: new Date(occurredAt.getTime() + 1_000),
        pageUrl: 'https://phase13.example.test/events',
        normalizedPath: '/events',
        pageTitle: 'Events',
        referrerUrl: null,
        properties: { publicProperty: 'safe-public-value' },
        durationMs: null,
        sourceType: session.sourceType,
        sourceName: session.sourceName,
        sourceDomain: session.sourceDomain,
        countryCode: session.countryCode,
        deviceType: session.deviceType,
        browserName: session.browserName,
        browserVersion: '1',
        operatingSystem: session.operatingSystem,
        operatingSystemVersion: '1',
      },
    });
  }
}

describe('Phase 13 Analytics Reports E2E', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  let workspaceId: string;
  let websiteId: string;

  let ownerAccessToken: string;
  let viewerAccessToken: string;
  let outsiderAccessToken: string;

  let trackingKeyPrefix: string;
  let trackingKeyHash: string;
  let rawTrackingKey: string;

  function reportsBase(currentWorkspaceId = workspaceId, currentWebsiteId = websiteId): string {
    return `${API_PREFIX}/workspaces/${currentWorkspaceId}/websites/${currentWebsiteId}/analytics/reports`;
  }

  function pagesUrl(currentWebsiteId = websiteId): string {
    return `${reportsBase(workspaceId, currentWebsiteId)}/pages`;
  }

  function eventsUrl(currentWebsiteId = websiteId): string {
    return `${reportsBase(workspaceId, currentWebsiteId)}/events`;
  }

  function dimensionUrl(dimension: 'sources' | 'countries' | 'devices' | 'browsers' | 'operating-systems', currentWebsiteId = websiteId): string {
    return `${reportsBase(workspaceId, currentWebsiteId)}/dimensions/${dimension}`;
  }

  function exportPagesUrl(): string {
    return `${reportsBase()}/exports/pages`;
  }

  function exportEventsUrl(): string {
    return `${reportsBase()}/exports/events`;
  }

  function exportDimensionUrl(dimension: 'sources' | 'countries' | 'devices' | 'browsers' | 'operating-systems'): string {
    return `${reportsBase()}/exports/dimensions/${dimension}`;
  }

  async function get(url: string, token: string, query: Record<string, string | number> = {}): Promise<Response> {
    return request(app.getHttpServer()).get(url).set(withBearer(token)).query(query);
  }

  beforeAll(async () => {
    app = await createTestApp();

    prisma = app.get(PrismaService);

    await resetDatabase(prisma);

    const owner = createTestUser({
      name: 'Phase 13 Owner',
      workspaceName: 'Phase 13 Workspace',
    });

    const ownerRegistration = await registerUser(createAgent(app), owner);

    expect(ownerRegistration.status).toBe(201);

    ownerAccessToken = readAccessToken(ownerRegistration);

    const ownerWorkspaceResponse = await request(app.getHttpServer()).post(`${API_PREFIX}/workspaces`).set(withBearer(ownerAccessToken)).send({
      name: owner.workspaceName,
    });

    expect(ownerWorkspaceResponse.status).toBe(201);

    const ownerRecord = await prisma.user.findUnique({
      where: { email: owner.email.toLowerCase() },
      select: { id: true },
    });

    const ownerId = requireValue(ownerRecord?.id, 'Phase 13 owner was not persisted');

    const ownerMembership = await prisma.workspaceMember.findFirst({
      where: { userId: ownerId, role: WorkspaceRole.OWNER },
      select: { workspaceId: true },
    });

    workspaceId = requireValue(ownerMembership?.workspaceId, 'Phase 13 owner workspace was not found');

    const viewer = createTestUser({
      name: 'Phase 13 Viewer',
      workspaceName: 'Phase 13 Viewer Workspace',
    });

    const viewerRegistration = await registerUser(createAgent(app), viewer);

    expect(viewerRegistration.status).toBe(201);

    viewerAccessToken = readAccessToken(viewerRegistration);

    const viewerRecord = await prisma.user.findUnique({
      where: { email: viewer.email.toLowerCase() },
      select: { id: true },
    });

    const viewerId = requireValue(viewerRecord?.id, 'Phase 13 viewer was not persisted');

    await prisma.workspaceMember.create({
      data: { workspaceId, userId: viewerId, role: WorkspaceRole.VIEWER },
    });

    const outsider = createTestUser({
      name: 'Phase 13 Outsider',
      workspaceName: 'Phase 13 Outsider Workspace',
    });

    const outsiderRegistration = await registerUser(createAgent(app), outsider);

    expect(outsiderRegistration.status).toBe(201);

    outsiderAccessToken = readAccessToken(outsiderRegistration);

    trackingKeyPrefix = randomBytes(8).toString('hex');
    rawTrackingKey = `cc_live_${trackingKeyPrefix}_${randomBytes(24).toString('hex')}`;
    trackingKeyHash = createHash('sha256').update(rawTrackingKey).digest('hex');

    const website = await prisma.website.create({
      data: {
        workspaceId,
        applicationId: null,
        name: 'Phase 13 Analytics Website',
        domain: 'phase13.example.test',
        timeZone: 'UTC',
        enabled: true,
        allowedOrigins: ['https://phase13.example.test', 'http://localhost:3000'],
        trackingKeyPrefix,
        trackingKeyHash,
      },
      select: { id: true },
    });

    websiteId = website.id;

    await seedNormalizedAnalytics(prisma, websiteId);
    await seedAggregates(prisma, websiteId);

    // A raw ingestion event holding data that must never surface in an exported report.
    await prisma.rawAnalyticsEvent.create({
      data: {
        websiteId,
        eventId: 'phase13-sensitive-raw-event',
        type: RawAnalyticsEventType.CUSTOM,
        visitorId: 'phase13-sensitive-visitor',
        sessionId: 'phase13-sensitive-session',
        occurredAt: BUCKET_START,
        receivedAt: BUCKET_START,
        pageUrl: 'https://phase13.example.test/private',
        pagePath: '/private',
        pageTitle: 'Private',
        referrerUrl: null,
        eventName: 'sensitive_event',
        properties: { privateSecret: PRIVATE_PROPERTY_VALUE },
        screenWidth: 1920,
        screenHeight: 1080,
        viewportWidth: 1440,
        viewportHeight: 900,
        language: 'en',
        clientTimeZone: 'UTC',
        durationMs: null,
        origin: 'https://phase13.example.test',
        userAgent: 'Phase13-E2E',
        ipHash: SENSITIVE_IP_HASH,
        sdkVersion: '1.0.0-e2e',
      },
    });
  });

  afterAll(async () => {
    await app.close();
  });

  // ---------------------------------------------------------------------------------------
  // A. Authentication
  // ---------------------------------------------------------------------------------------

  it('rejects anonymous report access', async () => {
    const response = await request(app.getHttpServer()).get(pagesUrl()).query({ from: FROM, to: TO });

    expect(response.status).toBe(401);
  });

  it('allows an authenticated OWNER to read the pages report', async () => {
    const response = await get(pagesUrl(), ownerAccessToken, { from: FROM, to: TO });

    expect(response.status).toBe(200);
  });

  // ---------------------------------------------------------------------------------------
  // B. Authorization
  // ---------------------------------------------------------------------------------------

  it('allows a VIEWER to read the pages report (no WorkspaceRolesGuard on this controller)', async () => {
    const response = await get(pagesUrl(), viewerAccessToken, { from: FROM, to: TO });

    expect(response.status).toBe(200);
  });

  it('blocks an outsider (non-member) from reading another workspace pages report', async () => {
    const response = await get(pagesUrl(), outsiderAccessToken, { from: FROM, to: TO });

    expect(response.status).toBe(403);
  });

  // ---------------------------------------------------------------------------------------
  // C. Page report
  // ---------------------------------------------------------------------------------------

  it('returns page report rows with correct totals reconciling to 40 page views', async () => {
    const response = await get(pagesUrl(), ownerAccessToken, { from: FROM, to: TO });

    expect(response.status).toBe(200);

    const rows = items(response);

    const paths = rows.map((row) => row.path);

    expect(paths).toEqual(expect.arrayContaining(['/pricing', '/docs', '/blog', DANGEROUS_CSV_PATH]));

    const totalViews = rows.reduce((sum, row) => sum + Number(row.views), 0);

    expect(totalViews).toBe(40);

    const pricingRow = rows.find((row) => row.path === '/pricing');

    expect(pricingRow).toMatchObject({
      path: '/pricing',
      title: 'Pricing',
      views: 19,
    });

    expect(body(response).pagination).toMatchObject({
      page: 1,
      limit: 25,
      total: 4,
      totalPages: 1,
      hasPreviousPage: false,
      hasNextPage: false,
    });

    expect(body(response).range).toMatchObject({
      from: FROM,
      to: TO,
      timeZone: 'UTC',
      days: 4,
    });
  });

  it('filters the page report by search text', async () => {
    const response = await get(pagesUrl(), ownerAccessToken, {
      from: FROM,
      to: TO,
      search: 'pricing',
    });

    expect(response.status).toBe(200);

    const rows = items(response);

    expect(rows).toHaveLength(1);
    expect(rows[0]?.path).toBe('/pricing');
  });

  it('sorts the page report by views ascending', async () => {
    const response = await get(pagesUrl(), ownerAccessToken, {
      from: FROM,
      to: TO,
      sortBy: 'views',
      sortDirection: 'asc',
    });

    expect(response.status).toBe(200);

    const values = items(response).map((row) => Number(row.views));

    expect(values).toEqual([1, 8, 12, 19]);
  });

  it('sorts the page report by views descending', async () => {
    const response = await get(pagesUrl(), ownerAccessToken, {
      from: FROM,
      to: TO,
      sortBy: 'views',
      sortDirection: 'desc',
    });

    expect(response.status).toBe(200);

    const values = items(response).map((row) => Number(row.views));

    expect(values).toEqual([19, 12, 8, 1]);
  });

  it('paginates the page report without duplicate or skipped rows', async () => {
    const common = { from: FROM, to: TO, sortBy: 'views', sortDirection: 'desc', limit: 2 };

    const firstResponse = await get(pagesUrl(), ownerAccessToken, { ...common, page: 1 });
    const secondResponse = await get(pagesUrl(), ownerAccessToken, { ...common, page: 2 });

    expect(firstResponse.status).toBe(200);
    expect(secondResponse.status).toBe(200);

    const firstRows = items(firstResponse);
    const secondRows = items(secondResponse);

    expect(firstRows).toHaveLength(2);
    expect(secondRows).toHaveLength(2);

    const combinedPaths = [...firstRows, ...secondRows].map((row) => row.path);

    expect(new Set(combinedPaths).size).toBe(4);
    expect(new Set(combinedPaths)).toEqual(new Set(['/pricing', '/docs', '/blog', DANGEROUS_CSV_PATH]));

    expect(body(firstResponse).pagination).toMatchObject({
      page: 1,
      limit: 2,
      total: 4,
      totalPages: 2,
      hasPreviousPage: false,
      hasNextPage: true,
    });

    expect(body(secondResponse).pagination).toMatchObject({
      page: 2,
      limit: 2,
      total: 4,
      totalPages: 2,
      hasPreviousPage: true,
      hasNextPage: false,
    });
  });

  // ---------------------------------------------------------------------------------------
  // D. Events report
  // ---------------------------------------------------------------------------------------

  it('returns custom event names, counts, and a deterministic sort', async () => {
    const response = await get(eventsUrl(), ownerAccessToken, {
      from: FROM,
      to: TO,
      sortBy: 'events',
      sortDirection: 'desc',
    });

    expect(response.status).toBe(200);

    const rows = items(response);

    expect(rows.map((row) => row.name)).toEqual(['signup', 'purchase']);

    const signupRow = rows.find((row) => row.name === 'signup');
    const purchaseRow = rows.find((row) => row.name === 'purchase');

    expect(signupRow).toMatchObject({ name: 'signup', events: 2, visitors: 2, sessions: 2 });
    expect(purchaseRow).toMatchObject({ name: 'purchase', events: 1, visitors: 1, sessions: 1 });

    expect(body(response).summary).toMatchObject({
      totalEvents: 3,
      uniqueVisitors: 3,
      uniqueSessions: 3,
    });
  });

  // ---------------------------------------------------------------------------------------
  // E. Dimensions report Ã¢â‚¬â€ every implemented AnalyticsReportDimension enum value
  // ---------------------------------------------------------------------------------------

  it('returns the sources dimension report reconciling total page views to 40', async () => {
    const response = await get(dimensionUrl('sources'), ownerAccessToken, { from: FROM, to: TO });

    expect(response.status).toBe(200);

    const rows = items(response);

    expect(rows.map((row) => row.key)).toEqual(expect.arrayContaining(['Direct', 'Google', 'Newsletter']));

    const totalPageViews = rows.reduce((sum, row) => sum + Number(row.pageViews), 0);

    expect(totalPageViews).toBe(40);
  });

  it('returns the countries dimension report', async () => {
    const response = await get(dimensionUrl('countries'), ownerAccessToken, {
      from: FROM,
      to: TO,
    });

    expect(response.status).toBe(200);

    const rows = items(response);

    expect(rows.map((row) => row.key)).toEqual(expect.arrayContaining(['US', 'AE']));
  });

  it('returns the devices dimension report', async () => {
    const response = await get(dimensionUrl('devices'), ownerAccessToken, { from: FROM, to: TO });

    expect(response.status).toBe(200);

    const rows = items(response);

    expect(rows.map((row) => row.key)).toEqual(expect.arrayContaining(['DESKTOP', 'MOBILE']));
  });

  it('returns the browsers dimension report', async () => {
    const response = await get(dimensionUrl('browsers'), ownerAccessToken, { from: FROM, to: TO });

    expect(response.status).toBe(200);

    const rows = items(response);

    expect(rows.map((row) => row.key)).toEqual(expect.arrayContaining(['Chrome', 'Safari']));
  });

  it('returns the operating-systems dimension report', async () => {
    const response = await get(dimensionUrl('operating-systems'), ownerAccessToken, {
      from: FROM,
      to: TO,
    });

    expect(response.status).toBe(200);

    const rows = items(response);

    expect(rows.map((row) => row.key)).toEqual(expect.arrayContaining(['Windows', 'macOS']));
  });

  it('sorts the sources dimension report by sessions with a deterministic tie-break', async () => {
    const response = await get(dimensionUrl('sources'), ownerAccessToken, {
      from: FROM,
      to: TO,
      sortBy: 'sessions',
      sortDirection: 'desc',
    });

    expect(response.status).toBe(200);

    const rows = items(response);

    const sessions = rows.map((row) => Number(row.sessions));

    expect(sessions).toEqual([...sessions].sort((left, right) => right - left));
  });

  // ---------------------------------------------------------------------------------------
  // F. Validation
  // ---------------------------------------------------------------------------------------

  it('rejects an unsupported dimension path parameter', async () => {
    const response = await get(`${reportsBase()}/dimensions/not-a-real-dimension`, ownerAccessToken, { from: FROM, to: TO });

    expect(response.status).toBe(400);
  });

  it('rejects an unsupported sort field on the pages report', async () => {
    const response = await get(pagesUrl(), ownerAccessToken, {
      from: FROM,
      to: TO,
      sortBy: 'notARealSortField',
    });

    expect(response.status).toBe(400);
  });

  it('rejects page 0', async () => {
    const response = await get(pagesUrl(), ownerAccessToken, { from: FROM, to: TO, page: 0 });

    expect(response.status).toBe(400);
  });

  it('rejects limit 0', async () => {
    const response = await get(pagesUrl(), ownerAccessToken, { from: FROM, to: TO, limit: 0 });

    expect(response.status).toBe(400);
  });

  it('rejects limit above the maximum of 100', async () => {
    const response = await get(pagesUrl(), ownerAccessToken, { from: FROM, to: TO, limit: 101 });

    expect(response.status).toBe(400);
  });

  it('rejects a malformed date (not YYYY-MM-DD)', async () => {
    const response = await get(pagesUrl(), ownerAccessToken, {
      from: '2026-08-01T00:00:00.000Z',
      to: TO,
    });

    expect(response.status).toBe(400);
  });

  it('rejects supplying only "from" without "to"', async () => {
    const response = await get(pagesUrl(), ownerAccessToken, { from: FROM });

    expect(response.status).toBe(400);
  });

  it('rejects from > to', async () => {
    const response = await get(pagesUrl(), ownerAccessToken, { from: TO, to: FROM });

    expect(response.status).toBe(400);
  });

  it('rejects a range that exceeds the maximum of 366 days', async () => {
    const response = await get(pagesUrl(), ownerAccessToken, {
      from: '2024-01-01',
      to: '2026-01-05',
    });

    expect(response.status).toBe(400);
  });

  it('rejects a malformed website ID', async () => {
    const response = await get(`${API_PREFIX}/workspaces/${workspaceId}/websites/not-a-uuid/analytics/reports/pages`, ownerAccessToken, { from: FROM, to: TO });

    expect(response.status).toBe(400);
  });

  it('returns 404 for a nonexistent website', async () => {
    const response = await get(pagesUrl(randomUUID()), ownerAccessToken, { from: FROM, to: TO });

    expect(response.status).toBe(404);
  });

  // ---------------------------------------------------------------------------------------
  // G. Tenant/security
  // ---------------------------------------------------------------------------------------

  it('blocks an outsider from reading the dimensions report of a foreign website', async () => {
    const response = await get(dimensionUrl('sources'), outsiderAccessToken, {
      from: FROM,
      to: TO,
    });

    expect(response.status).toBe(403);
  });

  it('blocks an outsider from reading the events report of a foreign website', async () => {
    const response = await get(eventsUrl(), outsiderAccessToken, { from: FROM, to: TO });

    expect(response.status).toBe(403);
  });

  it('never returns raw event secret fields in the JSON report payloads', async () => {
    const response = await get(pagesUrl(), ownerAccessToken, { from: FROM, to: TO });

    expect(response.status).toBe(200);

    const raw = JSON.stringify(response.body);

    expect(raw).not.toContain(rawTrackingKey);
    expect(raw).not.toContain(trackingKeyHash);
    expect(raw).not.toContain(SENSITIVE_IP_HASH);
    expect(raw).not.toContain(PRIVATE_PROPERTY_VALUE);
  });

  // ---------------------------------------------------------------------------------------
  // H. CSV export
  // ---------------------------------------------------------------------------------------

  it('exports the pages report as CSV with the correct headers and content type', async () => {
    const response = await get(exportPagesUrl(), ownerAccessToken, { from: FROM, to: TO });

    expect(response.status).toBe(200);
    expect(String(response.headers['content-type'])).toMatch(/^text\/csv/i);
    expect(String(response.headers['content-disposition'])).toMatch(/^attachment; filename="pages_2026-08-01_2026-08-04\.csv"$/);

    const rows = parseCsv(readResponseText(response));

    expect(rows[0]).toEqual(['Path', 'Title', 'Views', 'Visitors', 'Sessions', 'Entrances', 'Exits', 'Bounce Rate', 'Average Duration Seconds']);

    // header + 4 data rows
    expect(rows).toHaveLength(5);
  });

  it('exported page CSV rows match the JSON pages-report data', async () => {
    const apiResponse = await get(pagesUrl(), ownerAccessToken, { from: FROM, to: TO });

    expect(apiResponse.status).toBe(200);

    const apiRows = items(apiResponse);

    const csvResponse = await get(exportPagesUrl(), ownerAccessToken, { from: FROM, to: TO });

    expect(csvResponse.status).toBe(200);

    const csvRows = parseCsv(readResponseText(csvResponse)).slice(1);

    expect(csvRows).toHaveLength(apiRows.length);

    for (const apiRow of apiRows) {
      const matchingCsvRow = csvRows.find((row) => (apiRow.path === DANGEROUS_CSV_PATH ? row[0] === `'${DANGEROUS_CSV_PATH}` : row[0] === apiRow.path));

      expect(matchingCsvRow).toBeDefined();
      expect(matchingCsvRow?.[2]).toBe(String(apiRow.views));
    }
  });

  it('exports the events report as CSV', async () => {
    const response = await get(exportEventsUrl(), ownerAccessToken, { from: FROM, to: TO });

    expect(response.status).toBe(200);
    expect(String(response.headers['content-type'])).toMatch(/^text\/csv/i);

    const rows = parseCsv(readResponseText(response));

    expect(rows[0]).toEqual(['Event', 'Total Events', 'Unique Visitors', 'Sessions']);
    expect(rows).toHaveLength(3); // header + signup + purchase
  });

  it('exports a dimension report as CSV', async () => {
    const response = await get(exportDimensionUrl('sources'), ownerAccessToken, {
      from: FROM,
      to: TO,
    });

    expect(response.status).toBe(200);
    expect(String(response.headers['content-disposition'])).toMatch(/^attachment; filename="sources_2026-08-01_2026-08-04\.csv"$/);

    const rows = parseCsv(readResponseText(response));

    expect(rows[0]).toEqual(['Value', 'Visitors', 'Sessions', 'Page Views', 'Percentage']);
    expect(rows).toHaveLength(4); // header + Direct + Google + Newsletter
  });

  it('neutralizes spreadsheet formula injection in exported CSV cells', async () => {
    const response = await get(exportPagesUrl(), ownerAccessToken, { from: FROM, to: TO });

    expect(response.status).toBe(200);

    const csvRows = parseCsv(readResponseText(response));

    const dangerousRow = csvRows.find((row) => row[0]?.includes('SUM(A1:A2)'));

    const pathCell = requireValue(dangerousRow?.[0], 'Formula-injection fixture row was not exported');

    expect(pathCell.startsWith('=')).toBe(false);
    expect(pathCell.startsWith('+')).toBe(false);
    expect(pathCell.startsWith('-')).toBe(false);
    expect(pathCell.startsWith('@')).toBe(false);
    expect(pathCell).toBe(`'${DANGEROUS_CSV_PATH}`);
  });

  it('never exports tracking keys, IP hashes, or private raw-event properties', async () => {
    const response = await get(exportPagesUrl(), ownerAccessToken, { from: FROM, to: TO });

    expect(response.status).toBe(200);

    const csv = readResponseText(response);

    expect(csv).not.toContain(rawTrackingKey);
    expect(csv).not.toContain(trackingKeyPrefix);
    expect(csv).not.toContain(trackingKeyHash);
    expect(csv).not.toContain(SENSITIVE_IP_HASH);
    expect(csv).not.toContain(PRIVATE_PROPERTY_VALUE);
  });

  it('rejects unauthenticated CSV export requests', async () => {
    const response = await request(app.getHttpServer()).get(exportPagesUrl()).query({ from: FROM, to: TO });

    expect(response.status).toBe(401);
  });

  it('blocks an outsider from exporting a foreign website CSV report', async () => {
    const response = await get(exportPagesUrl(), outsiderAccessToken, { from: FROM, to: TO });

    expect(response.status).toBe(403);
  });

  it('enforces the maximum CSV export date range of 90 days', async () => {
    const response = await get(exportPagesUrl(), ownerAccessToken, {
      from: '2026-01-01',
      to: '2026-08-04', // 216 days, exceeds ANALYTICS_EXPORT_MAX_DAYS = 90
    });

    expect(response.status).toBe(400);
  });

  it('bounds the CSV export at ANALYTICS_EXPORT_MAX_ROWS regardless of requested limit', async () => {
    // The export routes reuse PageReportQueryDto, whose `limit` caps at 100 via @Max Ã¢â‚¬â€
    // the export path itself always internally requests ANALYTICS_EXPORT_MAX_ROWS (5000)
    // rows via loadPagesReport(..., 1, ANALYTICS_EXPORT_MAX_ROWS), ignoring any client-supplied
    // limit. Only 4 distinct paths exist in the fixture, so the export can never exceed 4 rows Ã¢â‚¬â€
    // verifying the export ignores/ is not bypassable via an oversized `limit` query value.
    const response = await get(exportPagesUrl(), ownerAccessToken, {
      from: FROM,
      to: TO,
      limit: 100,
    });

    expect(response.status).toBe(200);

    const rows = parseCsv(readResponseText(response));

    expect(rows.length - 1).toBe(4);
  });

  it('rejects a limit above the DTO maximum on the export route too', async () => {
    const response = await get(exportPagesUrl(), ownerAccessToken, {
      from: FROM,
      to: TO,
      limit: 101,
    });

    expect(response.status).toBe(400);
  });
});
