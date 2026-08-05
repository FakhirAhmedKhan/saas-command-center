import {
    DateTime,
} from 'luxon';

import {
    AnalyticsAggregatePeriod,
} from '../dto/analytics-engine.dto';

export interface AnalyticsBucket {
    start: Date;
    end: Date;
}

export function getAnalyticsBucket(
    value: Date,
    timeZone: string,
    period:
        AnalyticsAggregatePeriod,
): AnalyticsBucket {
    const local =
        DateTime
            .fromJSDate(value, {
                zone: 'utc',
            })
            .setZone(timeZone);

    if (!local.isValid) {
        throw new Error(
            `Invalid analytics time zone: ${timeZone}`,
        );
    }

    const start =
        period ===
            AnalyticsAggregatePeriod.HOURLY
            ? local.startOf('hour')
            : local.startOf('day');

    const end =
        period ===
            AnalyticsAggregatePeriod.HOURLY
            ? start.plus({
                hours: 1,
            })
            : start.plus({
                days: 1,
            });

    return {
        start:
            start
                .toUTC()
                .toJSDate(),

        end:
            end
                .toUTC()
                .toJSDate(),
    };
}