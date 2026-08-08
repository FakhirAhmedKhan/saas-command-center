import { RawAnalyticsEventType } from 'src/generated/prisma/enums';

export interface SessionMetricEvent {
  occurredAt: Date;
  type: RawAnalyticsEventType;
  durationMs: number | null;
}

export interface SessionMetricPageView {
  occurredAt: Date;
}

export interface SessionMetrics {
  startedAt: Date;
  endedAt: Date;

  durationMs: number;
  engagedDurationMs: number;

  eventCount: number;
  pageViewCount: number;
  customEventCount: number;

  bounced: boolean;
}

const BOUNCE_ENGAGEMENT_THRESHOLD_MS = 10_000;

/**
 * Calculates the final metrics for one analytics session.
 *
 * Bounce definition:
 * - One or fewer page views
 * - No custom events
 * - Less than 10 seconds of tracked engagement
 */
export function calculateSessionMetrics(
  events: readonly SessionMetricEvent[],
  pageViews: readonly SessionMetricPageView[],
): SessionMetrics {
  if (events.length === 0) {
    throw new Error('Session metrics cannot be calculated without events');
  }

  let startedAtMs = Number.POSITIVE_INFINITY;
  let endedAtMs = Number.NEGATIVE_INFINITY;
  let totalEngagedDurationMs = 0;
  let customEventCount = 0;

  for (const event of events) {
    const occurredAtMs = event.occurredAt.getTime();

    if (!Number.isFinite(occurredAtMs)) {
      throw new Error('Session contains an invalid event date');
    }

    const eventDurationMs = normalizeDurationMs(event.durationMs);

    startedAtMs = Math.min(startedAtMs, occurredAtMs);

    endedAtMs = Math.max(endedAtMs, occurredAtMs + eventDurationMs);

    totalEngagedDurationMs = safeAdd(totalEngagedDurationMs, eventDurationMs);

    if (event.type === RawAnalyticsEventType.CUSTOM) {
      customEventCount += 1;
    }
  }

  const durationMs = Math.max(0, endedAtMs - startedAtMs);

  /*
   * Multiple heartbeat events can overlap.
   * Engagement therefore cannot exceed total session duration.
   */
  const engagedDurationMs = Math.min(totalEngagedDurationMs, durationMs);

  const pageViewCount = pageViews.length;
  const eventCount = events.length;

  const bounced =
    pageViewCount <= 1 &&
    customEventCount === 0 &&
    engagedDurationMs < BOUNCE_ENGAGEMENT_THRESHOLD_MS;

  return {
    startedAt: new Date(startedAtMs),
    endedAt: new Date(endedAtMs),

    durationMs,
    engagedDurationMs,

    eventCount,
    pageViewCount,
    customEventCount,

    bounced,
  };
}

function normalizeDurationMs(value: number | null): number {
  if (value === null || !Number.isFinite(value) || value <= 0) {
    return 0;
  }

  return Math.trunc(value);
}

function safeAdd(current: number, value: number): number {
  const result = current + value;

  if (!Number.isSafeInteger(result)) {
    throw new RangeError('Session duration exceeds Number.MAX_SAFE_INTEGER');
  }

  return result;
}
