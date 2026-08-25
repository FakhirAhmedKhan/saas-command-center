import { SHARED_RATE_LIMIT_KEY, type SharedRateLimitOptions } from './shared-rate-limit.decorator';
import { SharedRateLimitService } from './shared-rate-limit.service';
import { CanActivate, ExecutionContext, HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { FastifyReply, FastifyRequest } from 'fastify';

interface RequestWithOptionalUser extends FastifyRequest {
  user?: {
    id?: string;
  };
}

/**
 * Resolves the identity a rate-limit bucket is keyed on.
 *
 * `JwtAuthGuard` runs before this guard on every non-`@Public()` route (both
 * as the global `APP_GUARD` and, redundantly, on controllers that also list
 * it explicitly), so `request.user` is already server-verified by the time
 * this executes. For those routes we key on that verified identity — plus
 * the workspace the route operates on, when present — so a caller cannot
 * reset their bucket by rotating a request header (SEC-02).
 *
 * Only requests with no verified user (i.e. genuinely `@Public()` routes,
 * such as the analytics ingestion collector) fall back to a caller-supplied
 * tracking/API key, which is the only identity available for them.
 */
export function getIdentity(request: FastifyRequest): string {
  const userId = (request as RequestWithOptionalUser).user?.id;

  if (userId) {
    const rawWorkspaceId = (request.params as { workspaceId?: unknown }).workspaceId;
    const workspaceId = typeof rawWorkspaceId === 'string' ? rawWorkspaceId : undefined;

    return workspaceId ? `user:${userId}:workspace:${workspaceId}` : `user:${userId}`;
  }

  const trackingKey = request.headers['x-tracking-key'];

  if (trackingKey) {
    // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
    return `tracking:${trackingKey}`;
  }

  const apiKey = request.headers['x-api-key'];

  if (apiKey) {
    // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
    return `apikey:${apiKey}`;
  }

  return `ip:${request.ip || request.raw.socket.remoteAddress || 'unknown'}`;
}

@Injectable()
export class SharedRateLimitGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly rateLimit: SharedRateLimitService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const options = this.reflector.getAllAndOverride<SharedRateLimitOptions>(SHARED_RATE_LIMIT_KEY, [context.getHandler(), context.getClass()]);

    if (!options) {
      return true;
    }

    const httpContext = context.switchToHttp();
    const request = httpContext.getRequest<FastifyRequest>();
    const response = httpContext.getResponse<FastifyReply>();
    const result = await this.rateLimit.consume(options.scope, getIdentity(request), options.limit, options.windowSeconds);

    response.header('X-RateLimit-Limit', String(result.limit));
    response.header('X-RateLimit-Remaining', String(result.remaining));
    response.header('X-RateLimit-Reset', String(result.resetAfterSeconds));

    if (!result.allowed) {
      response.header('Retry-After', String(result.retryAfterSeconds));

      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          error: 'Too Many Requests',
          message: 'Analytics ingestion rate limit exceeded.',
          retryAfterSeconds: result.retryAfterSeconds,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    return true;
  }
}
