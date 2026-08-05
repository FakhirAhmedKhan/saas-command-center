export function getWebsiteError(
    error: unknown,
    fallback =
        'Unable to complete website action',
): string {
    if (
        error instanceof Error
    ) {
        return error.message;
    }

    return fallback;
}

export function formatWebsiteDate(
    value:
        | string
        | null
        | undefined,
): string {
    if (!value) {
        return 'Never';
    }

    const date =
        new Date(value);

    if (
        Number.isNaN(
            date.getTime(),
        )
    ) {
        return 'Invalid date';
    }

    return new Intl.DateTimeFormat(
        'en',
        {
            dateStyle: 'medium',
            timeStyle: 'short',
        },
    ).format(date);
}

export function originsToText(
    origins: string[],
): string {
    return origins.join('\n');
}

export function textToOrigins(
    value: string,
): string[] {
    return [
        ...new Set(
            value
                .split(/\r?\n|,/)
                .map((origin) =>
                    origin.trim(),
                )
                .filter(Boolean),
        ),
    ];
}

export function websiteKeyStorageName(
    websiteId: string,
): string {
    return `command-center:website-key:${websiteId}`;
}