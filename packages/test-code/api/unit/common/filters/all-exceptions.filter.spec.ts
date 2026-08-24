import { ArgumentsHost, BadRequestException, HttpException, HttpStatus, Logger, NotFoundException } from '@nestjs/common';
import { AllExceptionsFilter } from 'src/common/filters/all-exceptions.filter';
import { Prisma } from 'src/generated/prisma/client';

function prismaKnownError(code: string, message = 'Prisma raw internal error text'): Prisma.PrismaClientKnownRequestError {
  return new Prisma.PrismaClientKnownRequestError(message, {
    code,
    clientVersion: '7.9.1',
    meta: {
      target: ['email'],
      modelName: 'User',
    },
  });
}

interface CapturedResponse {
  status: jest.Mock<CapturedResponse, [number]>;
  json: jest.Mock<CapturedResponse, [Record<string, unknown>]>;
}

function createHost(requestOverrides: Record<string, unknown> = {}): {
  host: ArgumentsHost;
  response: CapturedResponse;
} {
  const response: CapturedResponse = {
    status: jest.fn<CapturedResponse, [number]>().mockReturnThis(),
    json: jest.fn<CapturedResponse, [Record<string, unknown>]>().mockReturnThis(),
  };
  const request = {
    method: 'GET',
    originalUrl: '/api/v1/things',
    requestId: 'req-123',
    ...requestOverrides,
  };
  const host = {
    switchToHttp: () => ({
      getRequest: () => request,
      getResponse: () => response,
    }),
  } as unknown as ArgumentsHost;

  return { host, response };
}

function bodyFrom(response: CapturedResponse): Record<string, unknown> {
  const [firstCall] = response.json.mock.calls;

  return firstCall?.[0] ?? {};
}

describe('AllExceptionsFilter', () => {
  let filter: AllExceptionsFilter;
  let errorLogger: jest.SpyInstance;

  beforeEach(() => {
    filter = new AllExceptionsFilter();

    errorLogger = jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('HttpException handling', () => {
    it('preserves the status and message', () => {
      const { host, response } = createHost();

      filter.catch(new NotFoundException('Thing not found.'), host);

      expect(response.status).toHaveBeenCalledWith(404);

      expect(bodyFrom(response)).toMatchObject({
        statusCode: 404,
        message: 'Thing not found.',
        path: '/api/v1/things',
        requestId: 'req-123',
      });
    });

    it('keeps an array message from validation errors', () => {
      const { host, response } = createHost();

      filter.catch(new BadRequestException(['name must not be empty', 'slug is invalid']), host);

      expect(bodyFrom(response).message).toEqual(['name must not be empty', 'slug is invalid']);
    });

    it('normalizes a plain string exception response', () => {
      const { host, response } = createHost();

      filter.catch(new HttpException('Raw string failure', HttpStatus.FORBIDDEN), host);

      expect(response.status).toHaveBeenCalledWith(403);

      expect(bodyFrom(response).message).toBe('Raw string failure');
    });

    it('carries through the error label when present', () => {
      const { host, response } = createHost();

      filter.catch(new NotFoundException('Missing'), host);

      expect(bodyFrom(response).error).toBe('Not Found');
    });

    it('falls back to the exception message for a non-string, non-array message field', () => {
      const { host, response } = createHost();
      const exception = new HttpException(
        {
          message: {
            nested: true,
          },
        },
        HttpStatus.BAD_REQUEST,
      );

      filter.catch(exception, host);

      expect(typeof bodyFrom(response).message).toBe('string');
    });

    it('does not log HTTP exceptions as server errors', () => {
      const { host } = createHost();

      filter.catch(new NotFoundException('Missing'), host);

      expect(errorLogger).not.toHaveBeenCalled();
    });
  });

  describe('unknown exception handling', () => {
    it('maps an arbitrary Error to a 500 without leaking the message', () => {
      const { host, response } = createHost();

      filter.catch(new Error('Sensitive internal detail'), host);

      expect(response.status).toHaveBeenCalledWith(500);

      expect(bodyFrom(response)).toMatchObject({
        statusCode: 500,
        message: 'Internal server error',
        error: 'Internal Server Error',
      });

      expect(JSON.stringify(bodyFrom(response))).not.toContain('Sensitive internal detail');
    });

    it('logs the stack for unknown exceptions', () => {
      const { host } = createHost();

      filter.catch(new Error('boom'), host);

      expect(errorLogger).toHaveBeenCalledTimes(1);
    });

    it('handles a thrown non-Error value', () => {
      const { host, response } = createHost();

      filter.catch('a thrown string', host);

      expect(response.status).toHaveBeenCalledWith(500);

      expect(bodyFrom(response).message).toBe('Internal server error');
    });
  });

  describe('express middleware errors', () => {
    it('honours a status carried on a plain express error', () => {
      const { host, response } = createHost();
      const payloadTooLarge = Object.assign(new Error('request entity too large'), {
        status: 413,
        type: 'entity.too.large',
      });

      filter.catch(payloadTooLarge, host);

      expect(response.status).toHaveBeenCalledWith(413);

      expect(bodyFrom(response).message).toBe('request entity too large');
    });

    it('accepts statusCode as well as status', () => {
      const { host, response } = createHost();

      filter.catch(Object.assign(new Error('bad request'), { statusCode: 400 }), host);

      expect(response.status).toHaveBeenCalledWith(400);
    });

    it('ignores an out-of-range status and falls back to 500', () => {
      const { host, response } = createHost();

      filter.catch(Object.assign(new Error('weird'), { status: 999 }), host);

      expect(response.status).toHaveBeenCalledWith(500);
    });

    it('ignores a non-numeric status', () => {
      const { host, response } = createHost();

      filter.catch(Object.assign(new Error('weird'), { status: 'nope' }), host);

      expect(response.status).toHaveBeenCalledWith(500);
    });

    it('does not log express client errors as server errors', () => {
      const { host } = createHost();

      filter.catch(Object.assign(new Error('too large'), { status: 413 }), host);

      expect(errorLogger).not.toHaveBeenCalled();
    });
  });

  describe('envelope fields', () => {
    it('emits an ISO timestamp', () => {
      const { host, response } = createHost();

      filter.catch(new NotFoundException('Missing'), host);

      const timestamp = bodyFrom(response).timestamp as string;

      expect(Number.isNaN(Date.parse(timestamp))).toBe(false);
    });

    it('omits requestId when the middleware did not run', () => {
      const { host, response } = createHost({
        requestId: undefined,
      });

      filter.catch(new NotFoundException('Missing'), host);

      expect(bodyFrom(response).requestId).toBeUndefined();
    });
  });

  describe('Prisma error translation (BE-02 safety net)', () => {
    it('translates an uncaught P2002 into a 409 Conflict without leaking Prisma internals', () => {
      const { host, response } = createHost();

      filter.catch(prismaKnownError('P2002', 'Unique constraint failed on the fields: (`email`)'), host);

      expect(response.status).toHaveBeenCalledWith(409);

      expect(bodyFrom(response)).toMatchObject({
        statusCode: 409,
        message: 'A record with this value already exists.',
        error: 'Conflict',
        requestId: 'req-123',
      });

      expect(JSON.stringify(bodyFrom(response))).not.toContain('Unique constraint failed');
      expect(JSON.stringify(bodyFrom(response))).not.toContain('email');
    });

    it('translates an uncaught P2025 into a 404 Not Found without leaking Prisma internals', () => {
      const { host, response } = createHost();

      filter.catch(prismaKnownError('P2025', 'An operation failed because it depends on one or more records that were required but not found.'), host);

      expect(response.status).toHaveBeenCalledWith(404);

      expect(bodyFrom(response)).toMatchObject({
        statusCode: 404,
        message: 'The requested resource was not found.',
        error: 'Not Found',
      });

      expect(JSON.stringify(bodyFrom(response))).not.toContain('records that were required');
    });

    it('preserves requestId on a translated Prisma error', () => {
      const { host, response } = createHost({ requestId: 'req-prisma-1' });

      filter.catch(prismaKnownError('P2002'), host);

      expect(bodyFrom(response).requestId).toBe('req-prisma-1');
    });

    it('logs a warning (not an error) for a P2002/P2025 that reaches the filter unhandled', () => {
      const { host } = createHost();

      filter.catch(prismaKnownError('P2002'), host);

      expect(errorLogger).not.toHaveBeenCalled();
    });

    it('falls back to a safe 500 for a Prisma error code with no explicit mapping, and still logs it', () => {
      const { host, response } = createHost();

      filter.catch(prismaKnownError('P2003', 'Foreign key constraint failed on the field: `workspaceId`'), host);

      expect(response.status).toHaveBeenCalledWith(500);

      expect(bodyFrom(response)).toMatchObject({
        statusCode: 500,
        message: 'Internal server error',
        error: 'Internal Server Error',
      });

      expect(JSON.stringify(bodyFrom(response))).not.toContain('Foreign key constraint');
      expect(JSON.stringify(bodyFrom(response))).not.toContain('workspaceId');
      expect(errorLogger).toHaveBeenCalledTimes(1);
    });

    it('never includes the Prisma error meta field in the response body', () => {
      const { host, response } = createHost();

      filter.catch(prismaKnownError('P2002'), host);

      expect(bodyFrom(response)).not.toHaveProperty('meta');
    });
  });
});
