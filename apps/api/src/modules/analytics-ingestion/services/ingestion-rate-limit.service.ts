import { Injectable, BadRequestException } from '@nestjs/common';

interface RateLimitBucket {
  count: number;
  resetAt: number;
}

@Injectable()
export class IngestionRateLimitService {
  private readonly buckets = new Map<string, RateLimitBucket>();

  private readonly windowMs = this.readPositiveInteger(
    process.env.ANALYTICS_RATE_WINDOW_MS,
    60_000,
  );

  private readonly maxEvents = this.readPositiveInteger(
    process.env.ANALYTICS_RATE_MAX_EVENTS,
    1_000,
  );

  consume(key: string, eventCount: number): void {
    if (eventCount > this.maxEvents) {
      throw new BadRequestException('Tracking rate limit exceeded');
    }
    const now = Date.now();

    this.cleanupExpiredBuckets(now);

    const existing = this.buckets.get(key);

    if (!existing || existing.resetAt <= now) {
      this.buckets.set(key, {
        count: eventCount,
        resetAt: now + this.windowMs,
      });

      return;
    }

    if (existing.count + eventCount > this.maxEvents) {
      throw new BadRequestException('Tracking rate limit exceeded');
    }

    existing.count += eventCount;
  }

  private cleanupExpiredBuckets(now: number): void {
    if (this.buckets.size < 2_000) {
      return;
    }

    for (const [key, bucket] of this.buckets) {
      if (bucket.resetAt <= now) {
        this.buckets.delete(key);
      }
    }
  }

  private readPositiveInteger(value: string | undefined, fallback: number): number {
    const parsed = Number(value);

    return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
  }
}
