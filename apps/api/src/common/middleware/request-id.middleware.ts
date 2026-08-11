import type { NextFunction, Request, Response } from 'express';
import { randomUUID } from 'node:crypto';

export const REQUEST_ID_HEADER = 'x-request-id';

export interface RequestWithId extends Request {
  requestId: string;
}

function getExistingRequestId(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) {
    const firstValue = value[0]?.trim();

    return firstValue || undefined;
  }

  const normalizedValue = value?.trim();

  return normalizedValue || undefined;
}

export function requestIdMiddleware(request: Request, response: Response, next: NextFunction): void {
  const existingRequestId = getExistingRequestId(request.headers[REQUEST_ID_HEADER]);

  const requestId = existingRequestId ?? randomUUID();

  (request as RequestWithId).requestId = requestId;

  response.setHeader(REQUEST_ID_HEADER, requestId);

  next();
}
