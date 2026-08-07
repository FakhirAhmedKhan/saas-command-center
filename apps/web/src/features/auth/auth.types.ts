import { publicEnv } from "config/public-env";
import { ApiError } from '../lib/api/api-error';

export type WorkspaceRole =
  | 'OWNER'
  | 'ADMIN'
  | 'DEVELOPER'
  | 'VIEWER';

export interface User {
  id: string;
  email: string;
  displayName: string | null;
  isActive: boolean;
  emailVerifiedAt: string | null;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}
export interface AuthUser extends User {
  workspaces: Workspace[];
  currentWorkspaceId: string | null;
}
export interface AuthSession {
  accessToken: string;
  tokenType: 'Bearer';
  expiresIn: number;
  user: AuthUser;
}
export interface WorkspaceMembership {
  role: WorkspaceRole;
}

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;

  members?: WorkspaceMembership[];

  _count?: {
    members: number;
  };
}

export interface WorkspaceMember {
  id: string;
  workspaceId: string;
  userId: string;
  role: WorkspaceRole;
  joinedAt: string;
  createdAt: string;
  updatedAt: string;

  user: {
    id: string;
    email: string;
    displayName: string | null;
    isActive: boolean;
  };
}

export interface AuthResponse {
  accessToken: string;
  tokenType: 'Bearer';
  expiresIn: number;
  user: User;
  workspaces: Workspace[];
}

export interface CurrentUserResponse {
  user: User;
  workspaces: Workspace[];
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface RegisterInput {
  name: string;
  email: string;
  password: string;
  displayName?: string;
  workspaceName: string;
  workspaceSlug?: string;
}


interface RequestOptions
  extends Omit<
    RequestInit,
    'body'
  > {
  body?: unknown;

  skipAuthentication?:
  boolean;

  skipRefresh?:
  boolean;
}

interface RefreshResponse {
  accessToken: string;
}

let accessToken:
  | string
  | null = null;

let refreshPromise:
  | Promise<string>
  | null = null;

let unauthorizedHandler:
  | (() => void)
  | null = null;

export function setAccessToken(
  token:
    | string
    | null,
): void {
  accessToken = token;
}

export function setUnauthorizedHandler(
  handler:
    | (() => void)
    | null,
): void {
  unauthorizedHandler =
    handler;
}

function buildUrl(
  path: string,
): string {
  if (
    path.startsWith(
      'http://',
    ) ||
    path.startsWith(
      'https://',
    )
  ) {
    return path;
  }

  const normalizedPath =
    path.replace(
      /^\/+/,
      '',
    );

  return `${publicEnv.apiBaseUrl}/${normalizedPath}`;
}

function serializeBody(
  body: unknown,
): BodyInit | undefined {
  if (
    body === undefined
  ) {
    return undefined;
  }

  if (
    body instanceof
    FormData ||
    body instanceof Blob ||
    body instanceof
    URLSearchParams ||
    typeof body ===
    'string'
  ) {
    return body;
  }

  return JSON.stringify(
    body,
  );
}

function buildHeaders(
  options: RequestOptions,
): Headers {
  const headers =
    new Headers(
      options.headers,
    );

  if (
    options.body !==
    undefined &&
    !(
      options.body instanceof
      FormData
    )
  ) {
    headers.set(
      'Content-Type',
      'application/json',
    );
  }

  headers.set(
    'Accept',
    'application/json',
  );

  if (
    !options
      .skipAuthentication &&
    accessToken
  ) {
    headers.set(
      'Authorization',
      `Bearer ${accessToken}`,
    );
  }

  return headers;
}

async function refreshAccessToken():
  Promise<string> {
  if (refreshPromise) {
    return refreshPromise;
  }

  refreshPromise = (
    async () => {
      const response =
        await fetch(
          buildUrl(
            '/auth/refresh',
          ),
          {
            method:
              'POST',

            credentials:
              'include',

            headers: {
              Accept:
                'application/json',
            },
          },
        );

      if (!response.ok) {
        throw await ApiError
          .fromResponse(
            response,
          );
      }

      const payload =
        await response
          .json() as
        RefreshResponse;

      if (
        typeof payload
          .accessToken !==
        'string' ||
        payload
          .accessToken
          .length === 0
      ) {
        throw new ApiError(
          'Refresh response did not contain an access token.',
          500,
        );
      }

      setAccessToken(
        payload.accessToken,
      );

      return payload
        .accessToken;
    }
  )();

  try {
    return await refreshPromise;
  } catch (error) {
    setAccessToken(null);

    unauthorizedHandler?.();

    throw error;
  } finally {
    refreshPromise =
      null;
  }
}

export async function apiRequest<T>(
  path: string,
  options:
    RequestOptions = {},
): Promise<T> {
  const {
    body,
    skipAuthentication,
    skipRefresh,
    ...requestInit
  } = options;

  const execute =
    async (): Promise<Response> =>
      fetch(
        buildUrl(path),
        {
          ...requestInit,

          body:
            serializeBody(
              body,
            ),

          headers:
            buildHeaders({
              ...options,
              body,
              skipAuthentication,
              skipRefresh,
            }),

          credentials:
            'include',
        },
      );

  let response =
    await execute();

  if (
    response.status ===
    401 &&
    !skipAuthentication &&
    !skipRefresh
  ) {
    await refreshAccessToken();

    response =
      await execute();
  }

  if (!response.ok) {
    throw await ApiError
      .fromResponse(
        response,
      );
  }

  if (
    response.status ===
    204
  ) {
    return undefined as T;
  }

  return await response
    .json() as T;
}

