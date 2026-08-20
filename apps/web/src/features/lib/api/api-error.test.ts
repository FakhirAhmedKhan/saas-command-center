import { ApiError, getErrorMessage } from './api-error';
import { describe, expect, it } from 'vitest';

describe('ApiError', () => {
  it('retains status, details and requestId', () => {
    const error = new ApiError('Boom', 500, { field: 'name' }, 'req-1');

    expect(error.message).toBe('Boom');
    expect(error.status).toBe(500);
    expect(error.details).toEqual({ field: 'name' });
    expect(error.requestId).toBe('req-1');
    expect(error.name).toBe('ApiError');
    expect(error).toBeInstanceOf(Error);
  });

  describe('fromResponse', () => {
    it('builds an error from the response status', () => {
      const response = new Response(null, { status: 404 });

      const error = ApiError.fromResponse(response);

      expect(error.status).toBe(404);
      expect(error.message).toBe('Request failed with status 404.');
    });

    it('picks up the x-request-id header when present', () => {
      const response = new Response(null, {
        status: 400,
        headers: { 'x-request-id': 'abc-123' },
      });

      expect(ApiError.fromResponse(response).requestId).toBe('abc-123');
    });

    it('leaves requestId undefined when the header is absent', () => {
      const response = new Response(null, { status: 400 });

      expect(ApiError.fromResponse(response).requestId).toBeUndefined();
    });
  });
});

describe('getErrorMessage', () => {
  it('returns the message of an ApiError', () => {
    expect(getErrorMessage(new ApiError('Not allowed', 403))).toBe('Not allowed');
  });

  it('returns the message of a plain Error', () => {
    expect(getErrorMessage(new Error('Network down'))).toBe('Network down');
  });

  it.each([['a string'], [null], [undefined], [42], [{ message: 'nope' }]])('falls back for non-Error value %s', (value) => {
    expect(getErrorMessage(value)).toBe('Something went wrong. Please try again.');
  });
});
