import type { RequestWithId } from '../middleware/request-id.middleware';
import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common';
import type {
  //   Request,
  Response,
} from 'express';
import { Prisma } from 'src/generated/prisma/client';

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

interface PrismaKnownErrorResponse {
  status: number;
  message: string;
  error: string;
}

/*
 * Safety net only: most services translate P2002 (and similar) into a
 * domain-specific ConflictException themselves so callers get a useful
 * message ("Email is already in use", "Workspace slug already exists",
 * etc). This map exists for the Prisma errors that slip past every
 * service-level catch -- it converts them into a safe, generic 4xx
 * instead of an opaque 500, without ever exposing raw Prisma error text,
 * table/column names, or the `meta` field to the client.
 */
const PRISMA_KNOWN_ERROR_RESPONSES: Partial<Record<string, PrismaKnownErrorResponse>> = {
  P2002: {
    status: HttpStatus.CONFLICT,
    message: 'A record with this value already exists.',
    error: 'Conflict',
  },

  P2025: {
    status: HttpStatus.NOT_FOUND,
    message: 'The requested resource was not found.',
    error: 'Not Found',
  },
};

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
    const isPrismaKnownError = !isHttpException && exception instanceof Prisma.PrismaClientKnownRequestError;
    const prismaResponse = isPrismaKnownError ? PRISMA_KNOWN_ERROR_RESPONSES[exception.code] : undefined;
    const expressErrorStatus = isHttpException || isPrismaKnownError ? undefined : getExpressErrorStatus(exception);
    const statusCode = isHttpException ? exception.getStatus() : (prismaResponse?.status ?? expressErrorStatus ?? HttpStatus.INTERNAL_SERVER_ERROR);
    const normalizedException = isHttpException
      ? normalizeHttpException(exception)
      : prismaResponse
        ? {
            message: prismaResponse.message,
            error: prismaResponse.error,
          }
        : expressErrorStatus !== undefined
          ? {
              message: exception instanceof Error ? exception.message : 'Request rejected',
            }
          : {
              message: 'Internal server error',
              error: 'Internal Server Error',
            };

    if (isPrismaKnownError && prismaResponse) {
      /*
       * Handled gracefully, but a service should ideally have caught this
       * itself with a more specific message -- worth knowing about without
       * treating it as a genuine 500-level failure.
       */
      this.logger.warn(
        [`${request.method} ${request.originalUrl}`, request.requestId ? `requestId=${request.requestId}` : undefined, `Unhandled Prisma ${exception.code} reached the global filter; consider a service-level catch.`]
          .filter(Boolean)
          .join(' | '),
      );
    } else if (!isHttpException && expressErrorStatus === undefined) {
      const stack = exception instanceof Error ? exception.stack : String(exception);

      this.logger.error([`${request.method} ${request.originalUrl}`, request.requestId ? `requestId=${request.requestId}` : undefined, stack].filter(Boolean).join(' | '));
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
