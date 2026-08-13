import type { RequestWithId } from '../middleware/request-id.middleware';
import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common';
import type {
  //   Request,
  Response,
} from 'express';

interface ErrorResponse {
  statusCode: number;
  message: string | string[];
  error?: string;
  path: string;
  timestamp: string;
  requestId?: string;
}

interface NormalizedException {
  message: string | string[];
  error?: string;
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

/*
 * Express middleware (body-parser, CORS) rejects requests with a plain Error
 * carrying an HTTP status rather than a Nest HttpException — an oversized body
 * arrives as `{ status: 413, type: 'entity.too.large' }`. Without this, those
 * client errors would be reported as 500s.
 */
function getExpressErrorStatus(exception: unknown): number | undefined {
  if (typeof exception !== 'object' || exception === null) {
    return undefined;
  }

  const candidate = exception as { status?: unknown; statusCode?: unknown };

  const status = typeof candidate.status === 'number' ? candidate.status : candidate.statusCode;

  if (typeof status !== 'number' || !Number.isInteger(status)) {
    return undefined;
  }

  return status >= 400 && status <= 599 ? status : undefined;
}

function normalizeHttpException(exception: HttpException): NormalizedException {
  const exceptionResponse = exception.getResponse();

  if (typeof exceptionResponse === 'string') {
    return {
      message: exceptionResponse,
    };
  }

  if (typeof exceptionResponse !== 'object' || exceptionResponse === null) {
    return {
      message: exception.message,
    };
  }

  const responseRecord = exceptionResponse as Record<string, unknown>;

  const rawMessage = responseRecord.message;

  const message = typeof rawMessage === 'string' || isStringArray(rawMessage) ? rawMessage : exception.message;

  const rawError = responseRecord.error;

  return {
    message,
    error: typeof rawError === 'string' ? rawError : undefined,
  };
}

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const context = host.switchToHttp();

    const request = context.getRequest<RequestWithId>();

    const response = context.getResponse<Response>();

    const isHttpException = exception instanceof HttpException;

    const expressErrorStatus = isHttpException ? undefined : getExpressErrorStatus(exception);

    const statusCode = isHttpException ? exception.getStatus() : (expressErrorStatus ?? HttpStatus.INTERNAL_SERVER_ERROR);

    const normalizedException = isHttpException
      ? normalizeHttpException(exception)
      : expressErrorStatus !== undefined
        ? {
            message: exception instanceof Error ? exception.message : 'Request rejected',
          }
        : {
            message: 'Internal server error',
            error: 'Internal Server Error',
          };

    if (!isHttpException && expressErrorStatus === undefined) {
      const stack = exception instanceof Error ? exception.stack : String(exception);

      this.logger.error(
        [`${request.method} ${request.originalUrl}`, request.requestId ? `requestId=${request.requestId}` : undefined, stack].filter(Boolean).join(' | '),
      );
    }

    const body: ErrorResponse = {
      statusCode,
      message: normalizedException.message,
      error: normalizedException.error,
      path: request.originalUrl,
      timestamp: new Date().toISOString(),
      requestId: request.requestId,
    };

    response.status(statusCode).json(body);
  }
}
