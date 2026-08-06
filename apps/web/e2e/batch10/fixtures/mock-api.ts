import type {
  Page,
  Route,
} from '@playwright/test';

export const API_BASE_URL =
  'http://localhost:4000/api/v1';

export const PRIMARY_WORKSPACE_ID =
  '11111111-1111-4111-8111-111111111111';

export const SECONDARY_WORKSPACE_ID =
  '22222222-2222-4222-8222-222222222222';

export const APPLICATION_ID =
  '33333333-3333-4333-8333-333333333333';

export const WEBSITE_ID =
  '44444444-4444-4444-8444-444444444444';

const NOW = '2026-08-07T00:00:00.000Z';

export type WorkspaceRole =
  | 'OWNER'
  | 'ADMIN'
  | 'DEVELOPER'
  | 'VIEWER';

export interface MockWorkspace {
  id: string;
  name: string;
  slug: string;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  members: Array<{
    role: WorkspaceRole;
  }>;
  _count: {
    members: number;
    saasApplications?: number;
  };
}

export interface MockApplication {
  id: string;
  workspaceId: string;
  name: string;
  slug: string;
  shortDescription: string | null;
  longDescription: string | null;
  category:
    | 'SAAS'
    | 'AI'
    | 'MOBILE'
    | 'ECOMMERCE'
    | 'API'
    | 'INTERNAL_TOOL'
    | 'OTHER';
  status:
    | 'IDEA'
    | 'PLANNING'
    | 'IN_DEVELOPMENT'
    | 'TESTING'
    | 'LIVE'
    | 'MAINTENANCE'
    | 'PAUSED';
  priority:
    | 'LOW'
    | 'MEDIUM'
    | 'HIGH'
    | 'CRITICAL';
  startedAt: string | null;
  targetLaunchAt: string | null;
  launchedAt: string | null;
  lastActivityAt: string | null;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
  technologies: Array<{
    id: string;
    applicationId: string;
    name: string;
    type:
      | 'FRONTEND'
      | 'BACKEND'
      | 'DATABASE'
      | 'MOBILE'
      | 'AI'
      | 'INFRASTRUCTURE'
      | 'OTHER';
    version: string | null;
    createdAt: string;
    updatedAt: string;
  }>;
  links: Array<{
    id: string;
    applicationId: string;
    label: string;
    type:
      | 'PRODUCTION'
      | 'STAGING'
      | 'REPOSITORY'
      | 'DOCUMENTATION'
      | 'DESIGN'
      | 'API'
      | 'OTHER';
    url: string;
    createdAt: string;
    updatedAt: string;
  }>;
  _count: {
    technologies: number;
    links: number;
    activities: number;
  };
}

export interface MockWebsite {
  id: string;
  workspaceId: string;
  applicationId: string | null;
  name: string;
  domain: string;
  timeZone: string;
  enabled: boolean;
  allowedOrigins: string[];
  trackingKeyPrefix: string;
  trackingKeyRotatedAt: string;
  lastEventAt: string | null;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
  application: {
    id: string;
    name: string;
    slug: string;
    archivedAt: string | null;
  } | null;
}

export interface CapturedRequest {
  method: string;
  path: string;
  search: string;
  body: unknown;
}

interface FailureResponse {
  status: number;
  message: string | string[];
}

export interface MockApiOptions {
  authenticated?: boolean;
  displayName?: string;
  email?: string;
  workspaces?: MockWorkspace[];
  applications?: MockApplication[];
  websites?: MockWebsite[];
  failures?: Record<string, FailureResponse>;
}

export interface MockApiState {
  authenticated: boolean;
  requests: CapturedRequest[];
  workspaces: MockWorkspace[];
  applications: MockApplication[];
  websites: MockWebsite[];
  trackingKey: string;
}

export function makeWorkspace(
  overrides: Partial<MockWorkspace> = {},
): MockWorkspace {
  return {
    id: PRIMARY_WORKSPACE_ID,
    name: 'Command Center Team',
    slug: 'command-center-team',
    ownerId:
      'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    createdAt: NOW,
    updatedAt: NOW,
    deletedAt: null,
    members: [
      {
        role: 'OWNER',
      },
    ],
    _count: {
      members: 3,
      saasApplications: 1,
    },
    ...overrides,
  };
}

export function makeApplication(
  overrides: Partial<MockApplication> = {},
): MockApplication {
  return {
    id: APPLICATION_ID,
    workspaceId: PRIMARY_WORKSPACE_ID,
    name: 'PriceScout AI',
    slug: 'pricescout-ai',
    shortDescription:
      'AI-powered product price comparison.',
    longDescription:
      'Compare product prices across multiple providers.',
    category: 'AI',
    status: 'IN_DEVELOPMENT',
    priority: 'HIGH',
    startedAt: '2026-07-01T00:00:00.000Z',
    targetLaunchAt:
      '2026-09-01T00:00:00.000Z',
    launchedAt: null,
    lastActivityAt: NOW,
    archivedAt: null,
    createdAt: NOW,
    updatedAt: NOW,
    technologies: [
      {
        id:
          '55555555-5555-4555-8555-555555555555',
        applicationId: APPLICATION_ID,
        name: 'Next.js',
        type: 'FRONTEND',
        version: '16',
        createdAt: NOW,
        updatedAt: NOW,
      },
    ],
    links: [],
    _count: {
      technologies: 1,
      links: 0,
      activities: 0,
    },
    ...overrides,
  };
}

export function makeWebsite(
  overrides: Partial<MockWebsite> = {},
): MockWebsite {
  return {
    id: WEBSITE_ID,
    workspaceId: PRIMARY_WORKSPACE_ID,
    applicationId: APPLICATION_ID,
    name: 'Command Center Web',
    domain: 'command-center.example.com',
    timeZone: 'Asia/Dubai',
    enabled: true,
    allowedOrigins: [
      'https://command-center.example.com',
      'http://localhost:3000',
    ],
    trackingKeyPrefix: 'cc_live_ab12',
    trackingKeyRotatedAt: NOW,
    lastEventAt: NOW,
    archivedAt: null,
    createdAt: NOW,
    updatedAt: NOW,
    application: {
      id: APPLICATION_ID,
      name: 'PriceScout AI',
      slug: 'pricescout-ai',
      archivedAt: null,
    },
    ...overrides,
  };
}

export async function installMockApi(
  page: Page,
  options: MockApiOptions = {},
): Promise<MockApiState> {
  const primaryWorkspace = makeWorkspace();

  const secondaryWorkspace = makeWorkspace({
    id: SECONDARY_WORKSPACE_ID,
    name: 'MadadAI Team',
    slug: 'madadai-team',
    members: [
      {
        role: 'DEVELOPER',
      },
    ],
    _count: {
      members: 5,
      saasApplications: 0,
    },
  });

  const state: MockApiState = {
    authenticated:
      options.authenticated ?? true,
    requests: [],
    workspaces:
      options.workspaces ?? [
        primaryWorkspace,
        secondaryWorkspace,
      ],
    applications:
      options.applications ?? [
        makeApplication(),
      ],
    websites:
      options.websites ?? [
        makeWebsite(),
      ],
    trackingKey:
      'cc_live_abcdefghijklmnopqrstuvwxyz123456',
  };

  const user = {
    id:
      'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    email:
      options.email ?? 'owner@example.com',
    displayName:
      options.displayName ?? 'Frontend Owner',
    isActive: true,
    emailVerifiedAt: NOW,
    lastLoginAt: NOW,
    createdAt: NOW,
    updatedAt: NOW,
    deletedAt: null,
  };

  const authResponse = () => ({
    accessToken: 'mock-access-token',
    tokenType: 'Bearer' as const,
    expiresIn: 900,
    user,
    workspaces: state.workspaces,
  });

  await page.route(
    `${API_BASE_URL}/**`,
    async (route) => {
      const request = route.request();
      const method = request.method();
      const url = new URL(request.url());
      const path = url.pathname.replace(
        '/api/v1',
        '',
      );

      if (method === 'OPTIONS') {
        await route.fulfill({
          status: 204,
          headers: corsHeaders(),
        });
        return;
      }

      const body = readRequestBody(request.postData());

      state.requests.push({
        method,
        path,
        search: url.search,
        body,
      });

      const failure =
        options.failures?.[
          `${method} ${path}`
        ];

      if (failure) {
        await fulfillJson(
          route,
          failure.status,
          {
            statusCode: failure.status,
            message: failure.message,
            error: 'Mock API error',
          },
        );
        return;
      }

      if (
        method === 'POST' &&
        path === '/auth/refresh'
      ) {
        if (!state.authenticated) {
          await fulfillJson(route, 401, {
            statusCode: 401,
            message: 'Unauthorized',
          });
          return;
        }

        await fulfillJson(
          route,
          200,
          authResponse(),
        );
        return;
      }

      if (
        method === 'POST' &&
        (
          path === '/auth/login' ||
          path === '/auth/register'
        )
      ) {
        state.authenticated = true;
        await fulfillJson(
          route,
          path === '/auth/register'
            ? 201
            : 200,
          authResponse(),
        );
        return;
      }

      if (
        method === 'POST' &&
        (
          path === '/auth/logout' ||
          path === '/auth/logout-all'
        )
      ) {
        state.authenticated = false;
        await route.fulfill({
          status: 204,
          headers: corsHeaders(),
        });
        return;
      }

      if (
        method === 'GET' &&
        path === '/auth/me'
      ) {
        await fulfillJson(route, 200, {
          user,
          workspaces: state.workspaces.map(
            (workspace) => ({
              ...workspace,
              role:
                workspace.members[0]?.role ??
                'VIEWER',
            }),
          ),
        });
        return;
      }

      const workspaceCollection =
        path.match(/^\/workspaces$/);

      if (
        workspaceCollection &&
        method === 'POST'
      ) {
        const payload = asRecord(body);
        const name = readString(
          payload,
          'name',
          'New Workspace',
        );
        const slug = readString(
          payload,
          'slug',
          slugify(name),
        );
        const workspace = makeWorkspace({
          id:
            '99999999-9999-4999-8999-999999999999',
          name,
          slug,
          members: [
            {
              role: 'OWNER',
            },
          ],
          _count: {
            members: 1,
            saasApplications: 0,
          },
        });

        state.workspaces.push(workspace);

        await fulfillJson(route, 201, {
          ...workspace,
          members: [
            {
              id:
                '99999999-9999-4999-8999-000000000001',
              userId: user.id,
              role: 'OWNER',
              joinedAt: NOW,
            },
          ],
        });
        return;
      }

      const workspaceMatch =
        path.match(
          /^\/workspaces\/([^/]+)$/,
        );

      if (workspaceMatch) {
        const workspaceId = workspaceMatch[1];
        const workspace =
          state.workspaces.find(
            (item) =>
              item.id === workspaceId,
          );

        if (!workspace) {
          await fulfillJson(route, 404, {
            statusCode: 404,
            message: 'Workspace not found',
          });
          return;
        }

        if (method === 'GET') {
          await fulfillJson(
            route,
            200,
            workspace,
          );
          return;
        }

        if (method === 'PATCH') {
          const payload = asRecord(body);
          const nextName = readOptionalString(
            payload,
            'name',
          );
          const nextSlug = readOptionalString(
            payload,
            'slug',
          );

          if (nextName) {
            workspace.name = nextName;
          }

          if (nextSlug) {
            workspace.slug = nextSlug;
          }

          workspace.updatedAt = NOW;

          await fulfillJson(
            route,
            200,
            workspace,
          );
          return;
        }
      }

      const applicationsCollection =
        path.match(
          /^\/workspaces\/([^/]+)\/applications$/,
        );

      if (applicationsCollection) {
        const workspaceId =
          applicationsCollection[1];

        if (method === 'GET') {
          const search =
            url.searchParams.get('search')
              ?.toLowerCase() ?? '';
          const status =
            url.searchParams.get('status');
          const priority =
            url.searchParams.get('priority');
          const category =
            url.searchParams.get('category');
          const archived =
            url.searchParams.get('archived') ===
            'true';

          const filtered =
            state.applications.filter(
              (application) =>
                application.workspaceId ===
                  workspaceId &&
                (
                  !search ||
                  application.name
                    .toLowerCase()
                    .includes(search)
                ) &&
                (
                  !status ||
                  application.status ===
                    status
                ) &&
                (
                  !priority ||
                  application.priority ===
                    priority
                ) &&
                (
                  !category ||
                  application.category ===
                    category
                ) &&
                Boolean(
                  application.archivedAt,
                ) === archived,
            );

          await fulfillJson(route, 200, {
            data: filtered,
            meta: pagination(filtered.length),
          });
          return;
        }

        if (method === 'POST') {
          const payload = asRecord(body);
          const name = readString(
            payload,
            'name',
            'New Application',
          );
          const application = makeApplication({
            id:
              '77777777-7777-4777-8777-777777777777',
            workspaceId,
            name,
            slug: readString(
              payload,
              'slug',
              slugify(name),
            ),
            shortDescription:
              readNullableString(
                payload,
                'shortDescription',
              ),
            longDescription:
              readNullableString(
                payload,
                'longDescription',
              ),
            category: readEnum(
              payload,
              'category',
              'SAAS',
            ),
            status: readEnum(
              payload,
              'status',
              'IDEA',
            ),
            priority: readEnum(
              payload,
              'priority',
              'MEDIUM',
            ),
            startedAt: readNullableString(
              payload,
              'startedAt',
            ),
            targetLaunchAt:
              readNullableString(
                payload,
                'targetLaunchAt',
              ),
            launchedAt: readNullableString(
              payload,
              'launchedAt',
            ),
            technologies: [],
            links: [],
            _count: {
              technologies: 0,
              links: 0,
              activities: 0,
            },
          });

          state.applications.push(application);
          await fulfillJson(
            route,
            201,
            application,
          );
          return;
        }
      }

      const applicationMatch =
        path.match(
          /^\/workspaces\/([^/]+)\/applications\/([^/]+)$/,
        );

      if (
        applicationMatch &&
        method === 'GET'
      ) {
        const application =
          state.applications.find(
            (item) =>
              item.workspaceId ===
                applicationMatch[1] &&
              item.id === applicationMatch[2],
          );

        if (!application) {
          await fulfillJson(route, 404, {
            statusCode: 404,
            message: 'Application not found',
          });
          return;
        }

        await fulfillJson(
          route,
          200,
          application,
        );
        return;
      }

      const websiteCollection =
        path.match(
          /^\/workspaces\/([^/]+)\/websites$/,
        );

      if (websiteCollection) {
        const workspaceId =
          websiteCollection[1];

        if (method === 'GET') {
          const search =
            url.searchParams.get('search')
              ?.toLowerCase() ?? '';
          const archived =
            url.searchParams.get('archived') ===
            'true';
          const enabledValue =
            url.searchParams.get('enabled');
          const connectedValue =
            url.searchParams.get('connected');

          const filtered =
            state.websites.filter(
              (website) =>
                website.workspaceId ===
                  workspaceId &&
                (
                  !search ||
                  website.name
                    .toLowerCase()
                    .includes(search) ||
                  website.domain
                    .toLowerCase()
                    .includes(search)
                ) &&
                Boolean(website.archivedAt) ===
                  archived &&
                (
                  enabledValue === null ||
                  website.enabled ===
                    (enabledValue === 'true')
                ) &&
                (
                  connectedValue === null ||
                  Boolean(
                    website.applicationId,
                  ) ===
                    (connectedValue === 'true')
                ),
            );

          await fulfillJson(route, 200, {
            data: filtered,
            meta: pagination(filtered.length),
          });
          return;
        }

        if (method === 'POST') {
          const payload = asRecord(body);
          const applicationId =
            readNullableString(
              payload,
              'applicationId',
            );
          const application =
            state.applications.find(
              (item) =>
                item.id === applicationId,
            );
          const website = makeWebsite({
            id:
              '88888888-8888-4888-8888-888888888888',
            workspaceId,
            name: readString(
              payload,
              'name',
              'New Website',
            ),
            domain: readString(
              payload,
              'domain',
              'example.com',
            ),
            timeZone: readString(
              payload,
              'timeZone',
              'UTC',
            ),
            enabled: readBoolean(
              payload,
              'enabled',
              true,
            ),
            allowedOrigins:
              readStringArray(
                payload,
                'allowedOrigins',
              ),
            applicationId,
            application: application
              ? {
                  id: application.id,
                  name: application.name,
                  slug: application.slug,
                  archivedAt:
                    application.archivedAt,
                }
              : null,
          });

          state.websites.push(website);
          await fulfillJson(route, 201, {
            website,
            trackingKey: state.trackingKey,
          });
          return;
        }
      }

      const websiteMatch =
        path.match(
          /^\/workspaces\/([^/]+)\/websites\/([^/]+)$/,
        );

      if (
        websiteMatch &&
        method === 'GET'
      ) {
        const website = state.websites.find(
          (item) =>
            item.workspaceId ===
              websiteMatch[1] &&
            item.id === websiteMatch[2],
        );

        if (!website) {
          await fulfillJson(route, 404, {
            statusCode: 404,
            message: 'Website not found',
          });
          return;
        }

        await fulfillJson(
          route,
          200,
          website,
        );
        return;
      }

      const trackingStatusMatch =
        path.match(
          /^\/workspaces\/([^/]+)\/websites\/([^/]+)\/tracking\/status$/,
        );

      if (
        trackingStatusMatch &&
        method === 'GET'
      ) {
        const website = state.websites.find(
          (item) =>
            item.id ===
            trackingStatusMatch[2],
        );

        await fulfillJson(route, 200, {
          website: {
            id: website?.id ?? WEBSITE_ID,
            name:
              website?.name ?? 'Website',
            domain:
              website?.domain ?? 'example.com',
            enabled:
              website?.enabled ?? true,
            lastEventAt:
              website?.lastEventAt ?? NOW,
          },
          connected: true,
          totalEvents: 14,
          counts: {
            PAGE_VIEW: 7,
            HEARTBEAT: 5,
            CUSTOM: 2,
          },
        });
        return;
      }

      const applicationActivityMatch =
        path.match(
          /^\/workspaces\/([^/]+)\/applications\/([^/]+)\/activities$/,
        );

      if (
        applicationActivityMatch &&
        method === 'GET'
      ) {
        await fulfillJson(route, 200, {
          data: [],
          meta: pagination(0),
        });
        return;
      }

      const activityMatch = path.match(
        /^\/workspaces\/([^/]+)\/activities$/,
      );

      if (
        activityMatch &&
        method === 'GET'
      ) {
        await fulfillJson(route, 200, {
          data: [],
          meta: pagination(0),
        });
        return;
      }

      await fulfillJson(route, 404, {
        statusCode: 404,
        message: `No mock for ${method} ${path}`,
      });
    },
  );

  return state;
}

function corsHeaders(): Record<string, string> {
  return {
    'Access-Control-Allow-Origin':
      'http://localhost:3000',
    'Access-Control-Allow-Credentials':
      'true',
    'Access-Control-Allow-Headers':
      'Authorization, Content-Type',
    'Access-Control-Allow-Methods':
      'GET, POST, PATCH, DELETE, OPTIONS',
  };
}

async function fulfillJson(
  route: Route,
  status: number,
  body: unknown,
): Promise<void> {
  await route.fulfill({
    status,
    contentType: 'application/json',
    headers: corsHeaders(),
    body: JSON.stringify(body),
  });
}

function readRequestBody(
  raw: string | null,
): unknown {
  if (!raw) {
    return undefined;
  }

  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return raw;
  }
}

function asRecord(
  value: unknown,
): Record<string, unknown> {
  if (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value)
  ) {
    return value as Record<string, unknown>;
  }

  return {};
}

function readString(
  record: Record<string, unknown>,
  key: string,
  fallback: string,
): string {
  const value = record[key];
  return typeof value === 'string' &&
    value.length > 0
    ? value
    : fallback;
}

function readOptionalString(
  record: Record<string, unknown>,
  key: string,
): string | undefined {
  const value = record[key];
  return typeof value === 'string' &&
    value.length > 0
    ? value
    : undefined;
}

function readNullableString(
  record: Record<string, unknown>,
  key: string,
): string | null {
  const value = record[key];
  return typeof value === 'string'
    ? value
    : null;
}

function readBoolean(
  record: Record<string, unknown>,
  key: string,
  fallback: boolean,
): boolean {
  const value = record[key];
  return typeof value === 'boolean'
    ? value
    : fallback;
}

function readStringArray(
  record: Record<string, unknown>,
  key: string,
): string[] {
  const value = record[key];
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(
    (item): item is string =>
      typeof item === 'string',
  );
}

function readEnum<T extends string>(
  record: Record<string, unknown>,
  key: string,
  fallback: T,
): T {
  const value = record[key];
  return typeof value === 'string'
    ? (value as T)
    : fallback;
}

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function pagination(total: number) {
  return {
    page: 1,
    limit: 12,
    total,
    totalPages: total > 0 ? 1 : 0,
    hasNextPage: false,
    hasPreviousPage: false,
  };
}
