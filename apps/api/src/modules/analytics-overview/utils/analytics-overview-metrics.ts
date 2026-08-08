import type {
    AnalyticsMetricDto,
} from '../dto/analytics-overview-response.dto';

export type NumericDatabaseValue =
    | bigint
    | number
    | string
    | null
    | undefined;

export function toSafeNumber(
    value:
        NumericDatabaseValue,
): number {
    if (
        value === null ||
        value === undefined
    ) {
        return 0;
    }

    const converted =
        typeof value ===
            'bigint'
            ? Number(value)
            : Number(value);

    if (
        !Number.isFinite(
            converted,
        )
    ) {
        throw new RangeError(
            'Analytics database value is not finite',
        );
    }

    if (
        !Number.isSafeInteger(
            converted,
        ) &&
        Number.isInteger(
            converted,
        )
    ) {
        throw new RangeError(
            'Analytics database value exceeds the JavaScript safe integer range',
        );
    }

    return converted;
}

export function roundMetric(
    value: number,
    decimalPlaces = 1,
): number {
    const multiplier =
        10 ** decimalPlaces;

    return (
        Math.round(
            (
                value +
                Number.EPSILON
            ) *
            multiplier,
        ) /
        multiplier
    );
}

export function calculatePercentageChange(
    current: number,
    previous: number,
): number | null {
    if (previous === 0) {
        return current === 0
            ? 0
            : null;
    }

    return roundMetric(
        (
            (
                current -
                previous
            ) /
            previous
        ) * 100,
        1,
    );
}

export function createMetricComparison(
    current: number,
    previous: number,
): AnalyticsMetricDto {
    return {
        value: current,

        previousValue:
            previous,

        changePercent:
            calculatePercentageChange(
                current,
                previous,
            ),
    };
}