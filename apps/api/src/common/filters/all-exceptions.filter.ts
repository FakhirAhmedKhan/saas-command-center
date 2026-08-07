import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';

import type {
//   Request,
  Response,
} from 'express';

import type {
  RequestWithId,
} from '../middleware/request-id.middleware';

interface ErrorResponse {
  statusCode: number;
  message:
    | string
    | string[];
  error?: string;
  path: string;
  timestamp: string;
  requestId?: string;
}

interface NormalizedException {
  message:
    | string
    | string[];
  error?: string;
}

function isStringArray(
  value: unknown,
): value is string[] {
  return (
    Array.isArray(value) &&
    value.every(
      (item) =>
        typeof item ===
        'string',
    )
  );
}

function normalizeHttpException(
  exception: HttpException,
): NormalizedException {
  const exceptionResponse =
    exception.getResponse();

  if (
    typeof exceptionResponse ===
    'string'
  ) {
    return {
      message:
        exceptionResponse,
    };
  }

  if (
    typeof exceptionResponse !==
      'object' ||
    exceptionResponse === null
  ) {
    return {
      message:
        exception.message,
    };
  }

  const responseRecord =
    exceptionResponse as Record<
      string,
      unknown
    >;

  const rawMessage =
    responseRecord.message;

  const message =
    typeof rawMessage ===
      'string' ||
    isStringArray(rawMessage)
      ? rawMessage
      : exception.message;

  const rawError =
    responseRecord.error;

  return {
    message,
    error:
      typeof rawError ===
      'string'
        ? rawError
        : undefined,
  };
}

@Catch()
export class AllExceptionsFilter
  implements ExceptionFilter
{
  private readonly logger =
    new Logger(
      AllExceptionsFilter.name,
    );

  catch(
    exception: unknown,
    host: ArgumentsHost,
  ): void {
    const context =
      host.switchToHttp();

    const request =
      context.getRequest<
        RequestWithId
      >();

    const response =
      context.getResponse<
        Response
      >();

    const isHttpException =
      exception instanceof
      HttpException;

    const statusCode =
      isHttpException
        ? exception.getStatus()
        : HttpStatus
            .INTERNAL_SERVER_ERROR;

    const normalizedException =
      isHttpException
        ? normalizeHttpException(
            exception,
          )
        : {
            message:
              'Internal server error',
            error:
              'Internal Server Error',
          };

    if (!isHttpException) {
      const stack =
        exception instanceof Error
          ? exception.stack
          : String(exception);

      this.logger.error(
        [
          `${request.method} ${request.originalUrl}`,
          request.requestId
            ? `requestId=${request.requestId}`
            : undefined,
          stack,
        ]
          .filter(Boolean)
          .join(' | '),
      );
    }

    const body: ErrorResponse = {
      statusCode,
      message:
        normalizedException
          .message,
      error:
        normalizedException.error,
      path:
        request.originalUrl,
      timestamp:
        new Date().toISOString(),
      requestId:
        request.requestId,
    };

    response
      .status(statusCode)
      .json(body);
  }
}