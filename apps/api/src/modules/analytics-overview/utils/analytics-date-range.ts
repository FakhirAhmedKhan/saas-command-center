import {
    BadRequestException,
} from '@nestjs/common';

import {
    AnalyticsDatePreset,
    AnalyticsOverviewQueryDto,
} from '../dto/analytics-overview-query.dto';

const MILLISECONDS_PER_DAY =
    86_400_000;

const MAXIMUM_RANGE_DAYS =
    366;

export interface DatePeriod {
    from: string;
    to: string;
    start: Date;
    end: Date;
}

export interface ResolvedAnalyticsDateRange {
    preset: string;

    days: number;

    granularity:
    | 'hour'
    | 'day';

    current: DatePeriod;

    previous: DatePeriod;
}

interface DateParts {
    year: number;
    month: number;
    day: number;
    hour: number;
    minute: number;
    second: number;
}

function validateTimeZone(
    timeZone: string,
): void {
    try {
        new Intl.DateTimeFormat(
            'en-US',
            {
                timeZone,
            },
        ).format();
    } catch {
        throw new BadRequestException(
            `Website timezone "${timeZone}" is invalid`,
        );
    }
}

function getDateParts(
    date: Date,
    timeZone: string,
): DateParts {
    const formatter =
        new Intl.DateTimeFormat(
            'en-CA',
            {
                timeZone,

                year: 'numeric',

                month: '2-digit',

                day: '2-digit',

                hour: '2-digit',

                minute: '2-digit',

                second: '2-digit',

                hourCycle: 'h23',
            },
        );

    const values =
        new Map<string, string>();

    for (
        const part of formatter
            .formatToParts(date)
    ) {
        if (
            part.type !==
            'literal'
        ) {
            values.set(
                part.type,
                part.value,
            );
        }
    }

    return {
        year:
            Number(
                values.get('year'),
            ),

        month:
            Number(
                values.get('month'),
            ),

        day:
            Number(
                values.get('day'),
            ),

        hour:
            Number(
                values.get('hour'),
            ),

        minute:
            Number(
                values.get('minute'),
            ),

        second:
            Number(
                values.get('second'),
            ),
    };
}

function formatDateKey(
    year: number,
    month: number,
    day: number,
): string {
    return [
        String(year).padStart(
            4,
            '0',
        ),

        String(month).padStart(
            2,
            '0',
        ),

        String(day).padStart(
            2,
            '0',
        ),
    ].join('-');
}

export function getDateKeyInTimeZone(
    date: Date,
    timeZone: string,
): string {
    const parts =
        getDateParts(
            date,
            timeZone,
        );

    return formatDateKey(
        parts.year,
        parts.month,
        parts.day,
    );
}

function parseDateKey(
    dateKey: string,
): {
    year: number;
    month: number;
    day: number;
} {
    const match =
        /^(\d{4})-(\d{2})-(\d{2})$/
            .exec(dateKey);

    if (!match) {
        throw new BadRequestException(
            `Invalid date ${dateKey}`,
        );
    }

    const year =
        Number(match[1]);

    const month =
        Number(match[2]);

    const day =
        Number(match[3]);

    const date =
        new Date(
            Date.UTC(
                year,
                month - 1,
                day,
            ),
        );

    if (
        date.getUTCFullYear() !==
        year ||
        date.getUTCMonth() !==
        month - 1 ||
        date.getUTCDate() !==
        day
    ) {
        throw new BadRequestException(
            `Invalid calendar date ${dateKey}`,
        );
    }

    return {
        year,
        month,
        day,
    };
}

export function addDateKeyDays(
    dateKey: string,
    amount: number,
): string {
    const {
        year,
        month,
        day,
    } = parseDateKey(
        dateKey,
    );

    const date =
        new Date(
            Date.UTC(
                year,
                month - 1,
                day + amount,
            ),
        );

    return formatDateKey(
        date.getUTCFullYear(),
        date.getUTCMonth() + 1,
        date.getUTCDate(),
    );
}

function getTimeZoneOffsetMilliseconds(
    instant: Date,
    timeZone: string,
): number {
    const parts =
        getDateParts(
            instant,
            timeZone,
        );

    const representedAsUtc =
        Date.UTC(
            parts.year,
            parts.month - 1,
            parts.day,
            parts.hour,
            parts.minute,
            parts.second,
        );

    return (
        representedAsUtc -
        instant.getTime()
    );
}

export function startOfDateInTimeZone(
    dateKey: string,
    timeZone: string,
): Date {
    const {
        year,
        month,
        day,
    } = parseDateKey(
        dateKey,
    );

    const utcGuess =
        Date.UTC(
            year,
            month - 1,
            day,
            0,
            0,
            0,
        );

    const firstOffset =
        getTimeZoneOffsetMilliseconds(
            new Date(utcGuess),
            timeZone,
        );

    let result =
        new Date(
            utcGuess -
            firstOffset,
        );

    const finalOffset =
        getTimeZoneOffsetMilliseconds(
            result,
            timeZone,
        );

    if (
        finalOffset !==
        firstOffset
    ) {
        result =
            new Date(
                utcGuess -
                finalOffset,
            );
    }

    return result;
}

function getInclusiveDayCount(
    from: string,
    to: string,
): number {
    const fromParts =
        parseDateKey(from);

    const toParts =
        parseDateKey(to);

    const fromTimestamp =
        Date.UTC(
            fromParts.year,
            fromParts.month - 1,
            fromParts.day,
        );

    const toTimestamp =
        Date.UTC(
            toParts.year,
            toParts.month - 1,
            toParts.day,
        );

    return (
        Math.floor(
            (
                toTimestamp -
                fromTimestamp
            ) /
            MILLISECONDS_PER_DAY,
        ) + 1
    );
}

function resolvePresetStart(
    preset:
        AnalyticsDatePreset,
    today: string,
): string {
    switch (preset) {
        case AnalyticsDatePreset
            .TODAY:
            return today;

        case AnalyticsDatePreset
            .SEVEN_DAYS:
            return addDateKeyDays(
                today,
                -6,
            );

        case AnalyticsDatePreset
            .THIRTY_DAYS:
            return addDateKeyDays(
                today,
                -29,
            );

        case AnalyticsDatePreset
            .NINETY_DAYS:
            return addDateKeyDays(
                today,
                -89,
            );
    }
}

export function resolveAnalyticsDateRange(
    query:
        AnalyticsOverviewQueryDto,

    timeZone: string,

    now = new Date(),
): ResolvedAnalyticsDateRange {
    validateTimeZone(
        timeZone,
    );

    const hasCustomRange =
        query.from !== undefined ||
        query.to !== undefined;

    if (
        hasCustomRange &&
        (
            !query.from ||
            !query.to
        )
    ) {
        throw new BadRequestException(
            'Both from and to are required for a custom range',
        );
    }

    const today =
        getDateKeyInTimeZone(
            now,
            timeZone,
        );

    const preset =
        query.preset ??
        AnalyticsDatePreset
            .SEVEN_DAYS;

    const currentFrom =
        hasCustomRange
            ? query.from!
            : resolvePresetStart(
                preset,
                today,
            );

    const currentTo =
        hasCustomRange
            ? query.to!
            : today;

    const days =
        getInclusiveDayCount(
            currentFrom,
            currentTo,
        );

    if (days <= 0) {
        throw new BadRequestException(
            'to must be on or after from',
        );
    }

    if (
        days >
        MAXIMUM_RANGE_DAYS
    ) {
        throw new BadRequestException(
            `Analytics range cannot exceed ${MAXIMUM_RANGE_DAYS} days`,
        );
    }

    const previousTo =
        addDateKeyDays(
            currentFrom,
            -1,
        );

    const previousFrom =
        addDateKeyDays(
            previousTo,
            -(days - 1),
        );

    return {
        preset:
            hasCustomRange
                ? 'custom'
                : preset,

        days,

        granularity:
            days <= 2
                ? 'hour'
                : 'day',

        current: {
            from:
                currentFrom,

            to:
                currentTo,

            start:
                startOfDateInTimeZone(
                    currentFrom,
                    timeZone,
                ),

            end:
                startOfDateInTimeZone(
                    addDateKeyDays(
                        currentTo,
                        1,
                    ),
                    timeZone,
                ),
        },

        previous: {
            from:
                previousFrom,

            to:
                previousTo,

            start:
                startOfDateInTimeZone(
                    previousFrom,
                    timeZone,
                ),

            end:
                startOfDateInTimeZone(
                    currentFrom,
                    timeZone,
                ),
        },
    };
}