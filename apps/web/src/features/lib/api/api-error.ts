/* eslint-disable @typescript-eslint/no-unsafe-declaration-merging */
export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly details?: unknown,
    public readonly requestId?: string,
  ) {
    super(message);

    this.name = 'ApiError';
  }

  static fromResponse(response: Response): ApiError {
    const requestId = response.headers.get('x-request-id') ?? undefined;

    return new ApiError(
      `Request failed with status ${response.status}.`,
      response.status,
      undefined,
      requestId,
    );
  }
}

export function getErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'Something went wrong. Please try again.';
}

export interface ApiError {
  readonly requestId?: string;
}
