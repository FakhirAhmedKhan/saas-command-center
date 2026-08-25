import { randomUUID } from 'node:crypto';

export const REQUEST_ID_HEADER = 'x-request-id';

const MAX_REQUEST_ID_LENGTH = 128;
const VALID_REQUEST_ID_PATTERN = /^[A-Za-z0-9:_-]+$/;

function getExistingRequestId(value: unknown): string | undefined {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const rawValue = Array.isArray(value) ? value[0] : value;

  if (typeof rawValue !== 'string') {
    return undefined;
  }

  const normalizedValue = rawValue.trim();

  if (!normalizedValue) {
    return undefined;
  }

  if (normalizedValue.length > MAX_REQUEST_ID_LENGTH || !VALID_REQUEST_ID_PATTERN.test(normalizedValue)) {
    return undefined;
  }

  return normalizedValue;
}

/**
 * Returns a validated client request ID or generates a safe UUID.
 *
 * Fastify calls this function before application hooks, filters and
 * controllers execute. This prevents untrusted request-ID values from
 * reaching response headers or logs.
 */
export function createRequestId(value: unknown): string {
  return getExistingRequestId(value) ?? randomUUID();
}
