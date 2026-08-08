import {
    CanActivate,
    ExecutionContext,
    HttpException,
    HttpStatus,
    Injectable,
} from '@nestjs/common';

import {
    Reflector,
} from '@nestjs/core';

import type {
    Request,
    Response,
} from 'express';

import {
    SHARED_RATE_LIMIT_KEY,
} from './shared-rate-limit.decorator';

import type {
    SharedRateLimitOptions,
} from './shared-rate-limit.decorator';

import {
    SharedRateLimitService,
} from './shared-rate-limit.service';

function getIdentity(
    request: Request,
): string {
    const trackingKey =
        request.header(
            'x-tracking-key',
        );

    if (trackingKey) {
        return trackingKey;
    }

    const apiKey =
        request.header(
            'x-api-key',
        );

    if (apiKey) {
        return apiKey;
    }

    return (
        request.ip ||
        request.socket
            .remoteAddress ||
        'unknown'
    );
}

@Injectable()
export class SharedRateLimitGuard
    implements CanActivate {
    constructor(
        private readonly reflector:
            Reflector,

        private readonly rateLimit:
            SharedRateLimitService,
    ) { }

    async canActivate(
        context:
            ExecutionContext,
    ): Promise<boolean> {
        const options =
            this.reflector
                .getAllAndOverride<
                    SharedRateLimitOptions
                >(
                    SHARED_RATE_LIMIT_KEY,
                    [
                        context.getHandler(),
                        context.getClass(),
                    ],
                );

        if (!options) {
            return true;
        }

        const httpContext =
            context.switchToHttp();

        const request =
            httpContext.getRequest<
                Request
            >();

        const response =
            httpContext.getResponse<
                Response
            >();

        const result =
            await this.rateLimit
                .consume(
                    options.scope,
                    getIdentity(
                        request,
                    ),
                    options.limit,
                    options.windowSeconds,
                );

        response.setHeader(
            'X-RateLimit-Limit',
            String(
                result.limit,
            ),
        );

        response.setHeader(
            'X-RateLimit-Remaining',
            String(
                result.remaining,
            ),
        );

        response.setHeader(
            'X-RateLimit-Reset',
            String(
                result.resetAfterSeconds,
            ),
        );

        if (!result.allowed) {
            response.setHeader(
                'Retry-After',
                String(
                    result.retryAfterSeconds,
                ),
            );

            throw new HttpException(
                {
                    statusCode:
                        HttpStatus
                            .TOO_MANY_REQUESTS,

                    error:
                        'Too Many Requests',

                    message:
                        'Analytics ingestion rate limit exceeded.',

                    retryAfterSeconds:
                        result
                            .retryAfterSeconds,
                },

                HttpStatus
                    .TOO_MANY_REQUESTS,
            );
        }

        return true;
    }
}