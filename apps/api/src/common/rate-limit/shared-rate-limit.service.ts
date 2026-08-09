import { Injectable } from '@nestjs/common';

import { RedisService } from '../../infrastructure/redis/redis.service';

export interface RateLimitResult {
  allowed: boolean;

  limit: number;

  remaining: number;

  retryAfterSeconds: number;

  resetAfterSeconds: number;
}

const FIXED_WINDOW_SCRIPT = `
local count = redis.call(
  'INCR',
  KEYS[1]
)

if count == 1 then
  redis.call(
    'PEXPIRE',
    KEYS[1],
    ARGV[1]
  )
end

local ttl = redis.call(
  'PTTL',
  KEYS[1]
)

return {
  count,
  ttl
}
`;

@Injectable()
export class SharedRateLimitService {
  constructor(private readonly redis: RedisService) {}

  async consume(scope: string, identity: string, limit: number, windowSeconds: number): Promise<RateLimitResult> {
    const windowMs = windowSeconds * 1_000;

    const key = ['rate-limit', scope, identity].join(':');

    const result = await this.redis.getClient().eval(FIXED_WINDOW_SCRIPT, 1, key, String(windowMs));

    if (!Array.isArray(result)) {
      throw new Error('Invalid Redis rate-limit result.');
    }

    const count = Number(result[0]);

    const ttlMs = Math.max(Number(result[1]), 0);

    const resetAfterSeconds = Math.max(1, Math.ceil(ttlMs / 1_000));

    return {
      allowed: count <= limit,

      limit,

      remaining: Math.max(limit - count, 0),

      retryAfterSeconds: count > limit ? resetAfterSeconds : 0,

      resetAfterSeconds,
    };
  }
}
