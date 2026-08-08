import {
    SetMetadata,
} from '@nestjs/common';

export const SHARED_RATE_LIMIT_KEY =
    'shared-rate-limit';

export interface SharedRateLimitOptions {
    scope: string;

    limit: number;

    windowSeconds: number;
}

export function SharedRateLimit(
    options:
        SharedRateLimitOptions,
): MethodDecorator &
    ClassDecorator {
    return SetMetadata(
        SHARED_RATE_LIMIT_KEY,
        options,
    );
}