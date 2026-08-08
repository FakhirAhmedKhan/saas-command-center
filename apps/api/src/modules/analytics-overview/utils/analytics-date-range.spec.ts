import { AnalyticsDatePreset } from '../dto/analytics-overview-query.dto';

import { resolveAnalyticsDateRange } from './analytics-date-range';

describe('resolveAnalyticsDateRange', () => {
  it('resolves seven days in the website timezone', () => {
    const range = resolveAnalyticsDateRange(
      {
        preset: AnalyticsDatePreset.SEVEN_DAYS,
      },

      'Asia/Dubai',

      new Date('2026-08-07T01:00:00.000Z'),
    );

    expect(range.current.from).toBe('2026-08-01');

    expect(range.current.to).toBe('2026-08-07');

    expect(range.previous.from).toBe('2026-07-25');

    expect(range.previous.to).toBe('2026-07-31');

    expect(range.days).toBe(7);

    expect(range.granularity).toBe('day');
  });

  it('uses hourly data for today', () => {
    const range = resolveAnalyticsDateRange(
      {
        preset: AnalyticsDatePreset.TODAY,
      },

      'UTC',

      new Date('2026-08-07T10:00:00.000Z'),
    );

    expect(range.granularity).toBe('hour');

    expect(range.days).toBe(1);
  });

  it('rejects incomplete custom ranges', () => {
    expect(() =>
      resolveAnalyticsDateRange(
        {
          from: '2026-08-01',
          to: '2026-08-07',
          preset: AnalyticsDatePreset.TODAY,
        },

        'UTC',
      ),
    ).toThrow('Both from and to are required');
  });

  it('rejects reversed ranges', () => {
    expect(() =>
      resolveAnalyticsDateRange(
        {
          from: '2026-08-07',

          to: '2026-08-01',
          preset: AnalyticsDatePreset.TODAY,
        },

        'UTC',
      ),
    ).toThrow('to must be on or after from');
  });
});
