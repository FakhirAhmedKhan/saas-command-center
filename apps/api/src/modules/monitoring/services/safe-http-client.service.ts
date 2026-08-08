import {
    BadRequestException,
    Injectable,
} from '@nestjs/common';

import {
    lookup,
} from 'node:dns/promises';

import {
    isIP,
} from 'node:net';

import ipaddr from 'ipaddr.js';

import {
    Agent,
    request,
} from 'undici';

import {
    HealthCheckStatus,
} from '../../../generated/prisma/client';

interface ResolvedAddress {
    address: string;

    family: 4 | 6;
}

export interface SafeHealthRequestInput {
    url: string;

    timeoutMs: number;

    expectedStatusMin:
    number;

    expectedStatusMax:
    number;

    degradedAfterMs:
    number;
}

export interface SafeHealthRequestResult {
    status:
    HealthCheckStatus;

    statusCode:
    number | null;

    responseTimeMs:
    number | null;

    failureReason:
    string | null;
}

const BLOCKED_HOSTNAMES =
    new Set([
        'localhost',

        'localhost.localdomain',

        'metadata.google.internal',

        'metadata',

        'host.docker.internal',
    ]);

const BLOCKED_SUFFIXES = [
    '.localhost',

    '.local',

    '.internal',

    '.home',

    '.lan',
];

function isBlockedHostname(
    hostname: string,
): boolean {
    const normalized =
        hostname
            .trim()
            .toLowerCase()
            .replace(
                /\.$/,
                '',
            );

    if (
        BLOCKED_HOSTNAMES.has(
            normalized,
        )
    ) {
        return true;
    }

    return BLOCKED_SUFFIXES
        .some(
            (suffix) =>
                normalized.endsWith(
                    suffix,
                ),
        );
}

function isPublicAddress(
    address: string,
): boolean {
    let parsed:
        ipaddr.IPv4 |
        ipaddr.IPv6;

    try {
        parsed =
            ipaddr.process(
                address,
            );
    } catch {
        return false;
    }

    return (
        parsed.range() ===
        'unicast'
    );
}

@Injectable()
export class SafeHttpClientService {
    async validateUrl(
        rawUrl: string,
    ): Promise<void> {
        const url =
            this.parseUrl(
                rawUrl,
            );

        await this.resolvePublicAddresses(
            url.hostname,
        );
    }

    async execute(
        input:
            SafeHealthRequestInput,
    ): Promise<SafeHealthRequestResult> {
        let dispatcher:
            Agent | undefined;

        const startedAt =
            performance.now();

        try {
            const url =
                this.parseUrl(
                    input.url,
                );

            const addresses =
                await this
                    .resolvePublicAddresses(
                        url.hostname,
                    );

            const selectedAddress =
                addresses.find(
                    (item) =>
                        item.family ===
                        4,
                ) ??
                addresses[0];

            if (!selectedAddress) {
                throw new Error(
                    'No public IP address was resolved.',
                );
            }

            dispatcher =
                new Agent({
                    connect: {
                        lookup(
                            _hostname,
                            _options,
                            callback,
                        ) {
                            callback(
                                null,
                                selectedAddress.address,
                                selectedAddress.family,
                            );
                        },
                    },
                });

            const response =
                await request(
                    url,
                    {
                        method: 'GET',

                        dispatcher,
                        headersTimeout:
                            input.timeoutMs,

                        bodyTimeout:
                            input.timeoutMs,

                        signal:
                            AbortSignal.timeout(
                                input.timeoutMs,
                            ),

                        headers: {
                            accept:
                                'application/json,text/plain,*/*',

                            'user-agent':
                                'SaaS-Command-Center-Monitor/1.0',

                            'cache-control':
                                'no-cache',
                        },
                    },
                );

            await response.body
                .dump();

            const responseTimeMs =
                Math.max(
                    0,
                    Math.round(
                        performance.now() -
                        startedAt,
                    ),
                );

            const statusCode =
                response.statusCode;

            if (
                statusCode <
                input.expectedStatusMin ||
                statusCode >
                input.expectedStatusMax
            ) {
                return {
                    status:
                        HealthCheckStatus
                            .DOWN,

                    statusCode,

                    responseTimeMs,

                    failureReason:
                        `Unexpected HTTP status ${statusCode}. Expected ${input.expectedStatusMin}-${input.expectedStatusMax}.`,
                };
            }

            if (
                responseTimeMs >
                input.degradedAfterMs
            ) {
                return {
                    status:
                        HealthCheckStatus
                            .DEGRADED,

                    statusCode,

                    responseTimeMs,

                    failureReason:
                        `Response time ${responseTimeMs}ms exceeded the degraded threshold of ${input.degradedAfterMs}ms.`,
                };
            }

            return {
                status:
                    HealthCheckStatus
                        .HEALTHY,

                statusCode,

                responseTimeMs,

                failureReason:
                    null,
            };
        } catch (
        error
        ) {
            const responseTimeMs =
                Math.max(
                    0,
                    Math.round(
                        performance.now() -
                        startedAt,
                    ),
                );

            return {
                status:
                    HealthCheckStatus
                        .DOWN,

                statusCode:
                    null,

                responseTimeMs,

                failureReason:
                    this.normalizeError(
                        error,
                    ),
            };
        } finally {
            if (dispatcher) {
                await dispatcher
                    .close();
            }
        }
    }

    private parseUrl(
        rawUrl: string,
    ): URL {
        let url: URL;

        try {
            url =
                new URL(
                    rawUrl,
                );
        } catch {
            throw new BadRequestException(
                'Health-check URL is invalid.',
            );
        }

        if (
            url.protocol !==
            'http:' &&
            url.protocol !==
            'https:'
        ) {
            throw new BadRequestException(
                'Only HTTP and HTTPS health-check URLs are allowed.',
            );
        }

        if (
            url.username ||
            url.password
        ) {
            throw new BadRequestException(
                'Health-check URLs cannot contain embedded credentials.',
            );
        }

        if (
            isBlockedHostname(
                url.hostname,
            )
        ) {
            throw new BadRequestException(
                'Private or internal health-check destinations are not allowed.',
            );
        }

        return url;
    }

    private async resolvePublicAddresses(
        hostname: string,
    ): Promise<
        ResolvedAddress[]
    > {
        if (
            isIP(hostname)
        ) {
            if (
                !isPublicAddress(
                    hostname,
                )
            ) {
                throw new BadRequestException(
                    'Private, loopback, link-local, multicast, and reserved IP addresses are blocked.',
                );
            }

            return [
                {
                    address:
                        hostname,

                    family:
                        isIP(
                            hostname,
                        ) as 4 | 6,
                },
            ];
        }

        let addresses:
            ResolvedAddress[];

        try {
            addresses =
                (
                    await lookup(
                        hostname,
                        {
                            all: true,

                            verbatim:
                                true,
                        },
                    )
                ).map(
                    (item) => ({
                        address:
                            item.address,

                        family:
                            item.family as
                            | 4
                            | 6,
                    }),
                );
        } catch {
            throw new BadRequestException(
                'Health-check hostname could not be resolved.',
            );
        }

        if (
            addresses.length ===
            0
        ) {
            throw new BadRequestException(
                'Health-check hostname did not resolve to an IP address.',
            );
        }

        const unsafeAddress =
            addresses.find(
                (item) =>
                    !isPublicAddress(
                        item.address,
                    ),
            );

        if (unsafeAddress) {
            throw new BadRequestException(
                `Health-check destination resolved to a blocked address: ${unsafeAddress.address}`,
            );
        }

        return addresses;
    }

    private normalizeError(
        error: unknown,
    ): string {
        if (
            error instanceof
            BadRequestException
        ) {
            return error.message;
        }

        if (
            error instanceof Error
        ) {
            if (
                error.name ===
                'TimeoutError' ||
                error.name ===
                'AbortError'
            ) {
                return (
                    'Health check timed out.'
                );
            }

            return error.message
                .slice(
                    0,
                    500,
                );
        }

        return (
            'Unknown monitoring failure.'
        );
    }
}