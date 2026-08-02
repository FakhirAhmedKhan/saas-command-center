import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import type { ApiErrorResponse } from '@command-center/shared-types';

interface ErrorBody {
  message?: string | string[];
  error?: string;
  code?: string;
}

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const context = host.switchToHttp();
    const request = context.getRequest<Request>();
    const response = context.getResponse<Response>();

    const status = exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    const exceptionResponse = exception instanceof HttpException ? exception.getResponse() : undefined;
    const normalized = this.normalizeError(exceptionResponse);
    const requestId = response.getHeader('x-request-id')?.toString() ?? 'unknown';

    if (status >= 500) {
      this.logger.error(
        `${request.method} ${request.originalUrl} failed [requestId=${requestId}]`,
        exception instanceof Error ? exception.stack : undefined,
      );
    }

    const body: ApiErrorResponse = {
      statusCode: status,
      code: normalized.code ?? this.defaultCode(status),
      message:
        status >= 500
          ? 'An unexpected server error occurred'
          : normalized.message ?? 'Request failed',
      path: request.originalUrl,
      requestId,
      timestamp: new Date().toISOString(),
      ...(normalized.details === undefined ? {} : { details: normalized.details }),
    };

    response.status(status).json(body);
  }

  private normalizeError(value: unknown): {
    message?: string;
    code?: string;
    details?: unknown;
  } {
    if (typeof value === 'string') {
      return { message: value };
    }

    if (value && typeof value === 'object') {
      const body = value as ErrorBody;
      if (Array.isArray(body.message)) {
        return {
          message: 'Request validation failed',
          code: body.code ?? 'VALIDATION_ERROR',
          details: body.message,
        };
      }

      return {
        message: body.message,
        code: body.code,
      };
    }

    return {};
  }

  private defaultCode(status: number): string {
    if (status === HttpStatus.BAD_REQUEST) return 'BAD_REQUEST';
    if (status === HttpStatus.UNAUTHORIZED) return 'UNAUTHORIZED';
    if (status === HttpStatus.FORBIDDEN) return 'FORBIDDEN';
    if (status === HttpStatus.NOT_FOUND) return 'NOT_FOUND';
    if (status === HttpStatus.CONFLICT) return 'CONFLICT';
    if (status === HttpStatus.TOO_MANY_REQUESTS) return 'RATE_LIMITED';
    return 'INTERNAL_SERVER_ERROR';
  }
}
