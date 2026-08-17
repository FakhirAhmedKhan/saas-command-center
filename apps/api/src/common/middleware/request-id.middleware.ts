import type { NextFunction, Request, Response } from 'express';
import { randomUUID } from 'node:crypto';

export const REQUEST_ID_HEADER = 'x-request-id';

export interface RequestWithId extends Request {
  requestId: string;
}

/*
 * This value is echoed into the response header, embedded verbatim into
 * JSON error bodies, and written into application logs on 500-level errors
 * (see AllExceptionsFilter) — all before any other validation runs. A
 * client-supplied value must therefore be bounded and restricted to a safe
 * character set so it can't carry newlines/control characters (log
 * injection) or be used to send an oversized value.
 */
const MAX_REQUEST_ID_LENGTH = 128;

const VALID_REQUEST_ID_PATTERN = /^[A-Za-z0-9:_-]+$/;

function getExistingRequestId(value: string | string[] | undefined): string | undefined {
  const rawValue = Array.isArray(value) ? value[0] : value;

  const normalizedValue = rawValue?.trim();

  if (!normalizedValue) {
    return undefined;
  }

  if (normalizedValue.length > MAX_REQUEST_ID_LENGTH || !VALID_REQUEST_ID_PATTERN.test(normalizedValue)) {
    return undefined;
  }

  return normalizedValue;
}

export function requestIdMiddleware(request: Request, response: Response, next: NextFunction): void {
  const existingRequestId = getExistingRequestId(request.headers[REQUEST_ID_HEADER]);

  const requestId = existingRequestId ?? randomUUID();

  (request as RequestWithId).requestId = requestId;

  response.setHeader(REQUEST_ID_HEADER, requestId);

  next();
}
