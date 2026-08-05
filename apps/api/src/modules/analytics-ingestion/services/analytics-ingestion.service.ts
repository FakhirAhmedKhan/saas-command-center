import {
    BadRequestException,
    ForbiddenException,
    Injectable,
    PayloadTooLargeException,
    UnauthorizedException,
} from '@nestjs/common';

import {
    plainToInstance,
} from 'class-transformer';

import {
    validate,
} from 'class-validator';

import {
    createHash,
    timingSafeEqual,
} from 'node:crypto';

import {
    Prisma,
} from 'src/generated/prisma/client';

import {
    RawAnalyticsEventType,
} from 'src/generated/prisma/enums';

import {
    PrismaService,
} from 'src/database/prisma.service';

import {
    CollectEventsDto,
} from '../dto/collect-events.dto';

import {
    normalizeRequestOrigin,
    sanitizeEventProperties,
    sanitizeReferrerUrl,
    sanitizeTrackedUrl,
} from '../utils/ingestion-sanitizer';

import {
    IngestionRateLimitService,
} from './ingestion-rate-limit.service';

interface CollectionContext {
    origin?: string;
    ipAddress?: string;
    userAgent?: string;
    countryCode?: string;
}

interface ValidWebsite {
    id: string;
    enabled: boolean;
    archivedAt: Date | null;
    allowedOrigins: string[];
    trackingKeyHash: string;
    trackingKeyPrefix: string;
}

@Injectable()
export class AnalyticsIngestionService {
    private readonly maxBodyLength =
        65_536;
    private readonly trustCountryHeader =
        process.env
            .ANALYTICS_TRUST_COUNTRY_HEADER ===
        'true';
    private readonly ipHashSalt =
        process.env
            .ANALYTICS_IP_HASH_SALT ??
        'local-development-change-this';

    private readonly allowOriginless =
        process.env
            .ANALYTICS_ALLOW_ORIGINLESS ===
        'true';
    countryCode:
        this.normalizeCountryCode(
            context.countryCode,
        ),
    constructor(
        private readonly prisma:private normalizeCountryCode(
  value?: string,
): string | null {
  if (
    !this.trustCountryHeader ||
    !value
  ) {
    return null;
  }

  const code =
    value
      .trim()
      .toUpperCase();

  if (
    !/^[A-Z]{2}$/.test(code) ||
    code === 'XX' ||
    code === 'T1'
  ) {
    return null;
  }

  return code;
}
            PrismaService,

        private readonly rateLimit:
            IngestionRateLimitService,
    ) { }

    async collect(
        rawBody: unknown,
        context: CollectionContext,
    ) {
        const payload =
            await this.parseAndValidatePayload(
                rawBody,
            );

        const website =
            await this.authenticateWebsite(
                payload.websiteId,
                payload.trackingKey,
            );

        this.ensureWebsiteAvailable(
            website,
        );

        const origin =
            this.resolveAndValidateOrigin(
                context.origin,
                website.allowedOrigins,
            );

        const ipHash =
            context.ipAddress
                ? this.hashIpAddress(
                    context.ipAddress,
                )
                : null;

        const rateLimitKey =
            `${website.id}:${ipHash ?? origin}`;

        this.rateLimit.consume(
            rateLimitKey,
            payload.events.length,
        );

        const receivedAt =
            new Date();

        const data:
            Prisma.RawAnalyticsEventCreateManyInput[] =
            payload.events.map(
                (event) => {
                    const occurredAt =
                        this.validateEventTime(
                            event.timestamp,
                        );

                    const trackedUrl =
                        sanitizeTrackedUrl(
                            event.url,
                            origin,
                        );

                    if (
                        event.type ===
                        RawAnalyticsEventType.CUSTOM &&
                        !event.eventName
                    ) {
                        throw new BadRequestException(
                            'Custom events require an event name',
                        );
                    }

                    if (
                        event.type !==
                        RawAnalyticsEventType.CUSTOM &&
                        event.eventName
                    ) {
                        throw new BadRequestException(
                            'Only custom events may contain an event name',
                        );
                    }

                    const properties =
                        sanitizeEventProperties(
                            event.properties,
                        );

                    return {
                        websiteId:
                            website.id,

                        eventId:
                            event.eventId,

                        type:
                            event.type,

                        visitorId:
                            event.visitorId,

                        sessionId:
                            event.sessionId,

                        occurredAt,

                        receivedAt,

                        pageUrl:
                            trackedUrl.url,

                        pagePath:
                            trackedUrl.path,

                        pageTitle:
                            event.title
                                ?.trim()
                                .slice(0, 512) ??
                            null,

                        referrerUrl:
                            sanitizeReferrerUrl(
                                event.referrer,
                            ),

                        eventName:
                            event.eventName ??
                            null,

                        ...(properties
                            ? {
                                properties,
                            }
                            : {}),

                        screenWidth:
                            event.screenWidth ??
                            null,

                        screenHeight:
                            event.screenHeight ??
                            null,

                        viewportWidth:
                            event.viewportWidth ??
                            null,

                        viewportHeight:
                            event.viewportHeight ??
                            null,

                        language:
                            event.language
                                ?.trim()
                                .slice(0, 35) ??
                            null,

                        clientTimeZone:
                            this.sanitizeTimeZone(
                                event.timeZone,
                            ),

                        durationMs:
                            event.durationMs ??
                            null,

                        origin,

                        userAgent:
                            context.userAgent
                                ?.slice(0, 512) ??
                            null,

                        ipHash,

                        sdkVersion:
                            payload.sdkVersion
                                .trim()
                                .slice(0, 32),
                    };
                },
            );

        const result =
            await this.prisma
                .$transaction(
                    async (transaction) => {
                        const created =
                            await transaction
                                .rawAnalyticsEvent
                                .createMany({
                                    data,
                                    skipDuplicates: true,
                                });

                        if (
                            created.count > 0
                        ) {
                            await transaction
                                .website.update({
                                    where: {
                                        id:
                                            website.id,
                                    },

                                    data: {
                                        lastEventAt:
                                            receivedAt,
                                    },
                                });
                        }

                        return created;
                    },
                );

        return {
            accepted:
                result.count,

            duplicates:
                data.length -
                result.count,

            receivedAt:
                receivedAt.toISOString(),
        };
    }

    private async parseAndValidatePayload(
        rawBody: unknown,
    ): Promise<CollectEventsDto> {
        let parsed:
            unknown;

        if (
            typeof rawBody === 'string'
        ) {
            if (
                rawBody.length >
                this.maxBodyLength
            ) {
                throw new PayloadTooLargeException(
                    'Tracking payload exceeds 64 KB',
                );
            }

            try {
                parsed =
                    JSON.parse(rawBody);
            } catch {
                throw new BadRequestException(
                    'Tracking payload must contain valid JSON',
                );
            }
        } else {
            parsed = rawBody;
        }

        const payload =
            plainToInstance(
                CollectEventsDto,
                parsed,
            );

        const errors =
            await validate(payload, {
                whitelist: true,
                forbidNonWhitelisted:
                    true,
                stopAtFirstError:
                    true,
            });

        if (
            errors.length > 0
        ) {
            throw new BadRequestException(
                'Tracking payload validation failed',
            );
        }

        return payload;
    }

    private async authenticateWebsite(
        websiteId: string,
        trackingKey: string,
    ): Promise<ValidWebsite> {
        const prefix =
            this.extractKeyPrefix(
                trackingKey,
            );

        const website =
            await this.prisma.website.findFirst({
                where: {
                    id: websiteId,
                    trackingKeyPrefix:
                        prefix,
                },

                select: {
                    id: true,
                    enabled: true,
                    archivedAt: true,
                    allowedOrigins: true,
                    trackingKeyHash: true,
                    trackingKeyPrefix: true,
                },
            });

        if (!website) {
            throw new UnauthorizedException(
                'Invalid tracking credentials',
            );
        }

        const candidateHash =
            createHash('sha256')
                .update(trackingKey)
                .digest('hex');

        if (
            !this.safeHashEquals(
                candidateHash,
                website.trackingKeyHash,
            )
        ) {
            throw new UnauthorizedException(
                'Invalid tracking credentials',
            );
        }

        return website;
    }

    private extractKeyPrefix(
        trackingKey: string,
    ): string {
        const match =
            /^cc_live_([a-f0-9]{16})_[A-Za-z0-9_-]{20,}$/.exec(
                trackingKey,
            );

        if (!match?.[1]) {
            throw new UnauthorizedException(
                'Invalid tracking credentials',
            );
        }

        return match[1];
    }

    private safeHashEquals(
        first: string,
        second: string,
    ): boolean {
        const firstBuffer =
            Buffer.from(
                first,
                'utf8',
            );

        const secondBuffer =
            Buffer.from(
                second,
                'utf8',
            );

        if (
            firstBuffer.length !==
            secondBuffer.length
        ) {
            return false;
        }

        return timingSafeEqual(
            firstBuffer,
            secondBuffer,
        );
    }

    private ensureWebsiteAvailable(
        website: ValidWebsite,
    ): void {
        if (
            website.archivedAt ||
            !website.enabled
        ) {
            throw new ForbiddenException(
                'Website tracking is disabled',
            );
        }
    }

    private resolveAndValidateOrigin(
        rawOrigin: string | undefined,
        allowedOrigins: string[],
    ): string {
        if (!rawOrigin) {
            if (
                this.allowOriginless
            ) {
                return 'originless://request';
            }

            throw new ForbiddenException(
                'Tracking requests require an Origin header',
            );
        }

        const origin =
            normalizeRequestOrigin(
                rawOrigin,
            );

        const normalizedAllowed =
            allowedOrigins.map(
                (item) =>
                    item.toLowerCase(),
            );

        if (
            !normalizedAllowed.includes(
                origin,
            )
        ) {
            throw new ForbiddenException(
                'Origin is not allowed for this website',
            );
        }

        return origin;
    }

    private validateEventTime(
        value: string,
    ): Date {
        const date =
            new Date(value);

        const timestamp =
            date.getTime();

        if (
            Number.isNaN(timestamp)
        ) {
            throw new BadRequestException(
                'Event timestamp is invalid',
            );
        }

        const now =
            Date.now();

        const maximumFuture =
            now + 5 * 60_000;

        const maximumPast =
            now -
            7 *
            24 *
            60 *
            60_000;

        if (
            timestamp >
            maximumFuture ||
            timestamp <
            maximumPast
        ) {
            throw new BadRequestException(
                'Event timestamp is outside the accepted range',
            );
        }

        return date;
    }

    private hashIpAddress(
        ipAddress: string,
    ): string {
        return createHash(
            'sha256',
        )
            .update(
                `${this.ipHashSalt}:${ipAddress}`,
            )
            .digest('hex');
    }

    private sanitizeTimeZone(
        value?: string,
    ): string | null {
        if (!value) {
            return null;
        }

        const timeZone =
            value
                .trim()
                .slice(0, 64);

        try {
            new Intl.DateTimeFormat(
                'en-US',
                {
                    timeZone,
                },
            ).format();

            return timeZone;
        } catch {
            return null;
        }
    }
}