import { AllExceptionsFilter } from './all-exceptions.filter';
import { ArgumentsHost, BadRequestException, HttpException, HttpStatus, Logger, NotFoundException } from '@nestjs/common';

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
});
