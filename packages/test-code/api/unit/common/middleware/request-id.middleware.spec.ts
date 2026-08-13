import { REQUEST_ID_HEADER, requestIdMiddleware, type RequestWithId } from 'src/common/middleware/request-id.middleware';
import type { NextFunction, Request, Response } from 'express';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function run(headerValue?: string | string[]): {
  request: RequestWithId;
  setHeader: jest.Mock;
  next: NextFunction;
} {
  const request = {
    headers: headerValue === undefined ? {} : { [REQUEST_ID_HEADER]: headerValue },
  } as unknown as RequestWithId;

  const setHeader = jest.fn();

  const response = {
    setHeader,
  } as unknown as Response;

  const next = jest.fn() as unknown as NextFunction;

  requestIdMiddleware(request as Request, response, next);

  return { request, setHeader, next };
}

describe('requestIdMiddleware', () => {
  it('generates a UUID when no header is supplied', () => {
    const { request } = run();

    expect(request.requestId).toMatch(UUID_PATTERN);
  });

  it('mirrors the id onto the response header', () => {
    const { request, setHeader } = run();

    expect(setHeader).toHaveBeenCalledWith(REQUEST_ID_HEADER, request.requestId);
  });

  it('always calls next', () => {
    const { next } = run();

    expect(next).toHaveBeenCalledTimes(1);
  });

  it('reuses a client supplied id', () => {
    const { request } = run('client-id-1');

    expect(request.requestId).toBe('client-id-1');
  });

  it('trims a client supplied id', () => {
    const { request } = run('  client-id-2  ');

    expect(request.requestId).toBe('client-id-2');
  });

  it('generates a fresh id when the header is blank', () => {
    const { request } = run('   ');

    expect(request.requestId).toMatch(UUID_PATTERN);
  });

  it('takes the first entry when the header repeats', () => {
    const { request } = run(['first-id', 'second-id']);

    expect(request.requestId).toBe('first-id');
  });

  it('generates a fresh id when the repeated header is blank', () => {
    const { request } = run(['   ', 'second-id']);

    expect(request.requestId).toMatch(UUID_PATTERN);
  });

  it('generates a fresh id for an empty header array', () => {
    const { request } = run([]);

    expect(request.requestId).toMatch(UUID_PATTERN);
  });

  it('issues distinct ids across requests', () => {
    expect(run().request.requestId).not.toBe(run().request.requestId);
  });
});
