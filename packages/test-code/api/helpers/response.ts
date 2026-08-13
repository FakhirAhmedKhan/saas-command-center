import type { Response } from 'supertest';

export function readAccessToken(response: Response): string {
  const body = response.body as Record<string, any>;

  const token = body?.accessToken ?? body?.data?.accessToken ?? body?.tokens?.accessToken ?? body?.data?.tokens?.accessToken;

  if (typeof token !== 'string' || token.length === 0) {
    throw new Error(['Access token was not found.', `Response body: ${JSON.stringify(response.body)}`].join(' '));
  }

  return token;
}

export function readResourceId(response: Response): string {
  const body = response.body as Record<string, any>;

  const id = body?.id ?? body?.data?.id ?? body?.workspace?.id ?? body?.data?.workspace?.id;

  if (typeof id !== 'string' || id.length === 0) {
    throw new Error(['Resource ID was not found.', `Response body: ${JSON.stringify(response.body)}`].join(' '));
  }

  return id;
}

export function readResponseEmail(response: Response): string | undefined {
  const body = response.body as Record<string, any>;

  return body?.email ?? body?.data?.email ?? body?.user?.email ?? body?.data?.user?.email;
}

export function readResponseArray<T>(response: Response): T[] {
  const body = response.body as Record<string, any>;

  const candidates = [response.body, body?.data, body?.items, body?.workspaces, body?.data?.items, body?.data?.workspaces];

  const result = candidates.find(Array.isArray);

  if (!result) {
    throw new Error(['Expected an array response.', `Response body: ${JSON.stringify(response.body)}`].join(' '));
  }

  return result as T[];
}

export function readSetCookies(response: Response): string[] {
  const header = response.headers['set-cookie'];

  if (Array.isArray(header)) {
    return header;
  }

  if (typeof header === 'string') {
    return [header];
  }

  return [];
}

export function expectSuccessfulStatus(response: Response): void {
  if (response.status !== 200 && response.status !== 201 && response.status !== 202) {
    throw new Error([`Expected success but received ${response.status}.`, `Response body: ${JSON.stringify(response.body)}`].join(' '));
  }
}
