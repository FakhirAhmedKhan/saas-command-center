function requirePublicUrl(
    name: string,
    value: string | undefined,
): string {
    if (!value) {
        throw new Error(
            `${name} is not configured.`,
        );
    }

    let parsedUrl: URL;

    try {
        parsedUrl = new URL(value);
    } catch {
        throw new Error(
            `${name} must be a valid URL.`,
        );
    }

    if (
        parsedUrl.protocol !==
        'http:' &&
        parsedUrl.protocol !==
        'https:'
    ) {
        throw new Error(
            `${name} must use HTTP or HTTPS.`,
        );
    }

    return parsedUrl
        .toString()
        .replace(
            /\/$/,
            '',
        );
}

export const publicEnv = {
    apiBaseUrl:
        requirePublicUrl(
            'NEXT_PUBLIC_API_BASE_URL',

            process.env
                .NEXT_PUBLIC_API_BASE_URL,
        ),
} as const;