import { calculateSessionMetrics } from 'src/modules/analytics-engine/utils/analytics-metrics';
import { RawAnalyticsEventType } from 'src/generated/prisma/enums';

describe('calculateSessionMetrics', () => {
  it('marks a single unengaged page view as a bounce', () => {
    const occurredAt = new Date('2026-08-01T10:00:00.000Z');

    const result = calculateSessionMetrics(
      [
        {
          type: RawAnalyticsEventType.PAGE_VIEW,

          occurredAt,

          durationMs: null,
        },
      ],
      [
        {
          occurredAt,
        },
      ],
    );

    expect(result.pageViewCount).toBe(1);

    expect(result.bounced).toBe(true);

    expect(result.durationMs).toBe(0);
  });

  it('does not mark an engaged session as a bounce', () => {
    const result = calculateSessionMetrics(
      [
        {
          type: RawAnalyticsEventType.PAGE_VIEW,

          occurredAt: new Date('2026-08-01T10:00:00.000Z'),

          durationMs: null,
        },
        {
          type: RawAnalyticsEventType.HEARTBEAT,

          occurredAt: new Date('2026-08-01T10:00:15.000Z'),

          durationMs: 15_000,
        },
      ],
      [
        {
          occurredAt: new Date('2026-08-01T10:00:00.000Z'),
        },
      ],
    );

    expect(result.engagedDurationMs).toBe(15_000);

    expect(result.bounced).toBe(false);
  });

  it('does not mark a two-page session as a bounce', () => {
    const result = calculateSessionMetrics(
      [
        {
          type: RawAnalyticsEventType.PAGE_VIEW,

          occurredAt: new Date('2026-08-01T10:00:00.000Z'),

          durationMs: null,
        },
        {
          type: RawAnalyticsEventType.PAGE_VIEW,

          occurredAt: new Date('2026-08-01T10:00:05.000Z'),

          durationMs: null,
        },
      ],
      [
        {
          occurredAt: new Date('2026-08-01T10:00:00.000Z'),
        },
        {
          occurredAt: new Date('2026-08-01T10:00:05.000Z'),
        },
      ],
    );

    expect(result.pageViewCount).toBe(2);

    expect(result.bounced).toBe(false);
  });
});
