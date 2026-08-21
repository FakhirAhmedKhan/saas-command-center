import { IngestionRateLimitService } from './ingestion-rate-limit.service';
import { CollectEventsDto } from '../dto/collect-events.dto';
import { hashIpAddressWithSalt, normalizeRequestOrigin, sanitizeEventProperties, sanitizeReferrerUrl, sanitizeTrackedUrl } from '../utils/ingestion-sanitizer';
import { BadRequestException, ForbiddenException, Injectable, PayloadTooLargeException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { createHash, timingSafeEqual } from 'node:crypto';
import { PrismaService } from 'src/database/prisma.service';
import { Prisma } from 'src/generated/prisma/client';
import { RawAnalyticsEventType } from 'src/generated/prisma/enums';

const MAX_BODY_BYTES = 64 * 1024;
const MAX_FUTURE_EVENT_AGE_MS = 5 * 60 * 1000;
const MAX_PAST_EVENT_AGE_MS = 7 * 24 * 60 * 60 * 1000;

const TRACKING_KEY_PATTERN = /^cc_live_([a-f0-9]{16})_[A-Za-z0-9_-]{20,}$/;

const SHA_256_HEX_PATTERN = /^[a-f0-9]{64}$/i;

export interface CollectionContext {
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
}

export interface CollectEventsResult {
  accepted: number;
  duplicates: number;
  receivedAt: string;
}

@Injectable()
export class AnalyticsIngestionService {
  private readonly trustCountryHeader: boolean;
  private readonly allowOriginless: boolean;
  private readonly ipHashSalt: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly rateLimit: IngestionRateLimitService,
    private readonly configService: ConfigService,
  ) {
    this.trustCountryHeader = this.isEnabled(this.configService.get('ANALYTICS_TRUST_COUNTRY_HEADER'));

    this.allowOriginless = this.isEnabled(process.env.ANALYTICS_ALLOW_ORIGINLESS ?? this.configService.get<string>('ANALYTICS_ALLOW_ORIGINLESS'));

    /*
     * validateEnvironment() already guarantees this is a valid, non-empty
     * value (required + validated in production, explicit dev-only fallback
     * otherwise) — see SEC-03. getOrThrow keeps that guarantee loud: if this
     * ever regresses, startup fails clearly instead of silently reusing an
     * insecure fallback. The value itself is never logged.
     */
    this.ipHashSalt = this.configService.getOrThrow<string>('ANALYTICS_IP_HASH_SALT');
  }

  async collect(rawBody: unknown, context: CollectionContext): Promise<CollectEventsResult> {
    const suppliedOrigin = context.origin?.trim();

    if ((!suppliedOrigin || suppliedOrigin === 'null') && !this.allowOriginless) {
      throw new ForbiddenException('Tracking requests require a valid Origin header');
    }
    const payload = await this.parseAndValidatePayload(rawBody);

    const website = await this.authenticateWebsite(payload.websiteId, payload.trackingKey);

    this.ensureWebsiteAvailable(website);

    const origin = this.resolveAndValidateOrigin(context.origin, website.allowedOrigins);

    const normalizedIpAddress = this.normalizeIpAddress(context.ipAddress);

    const ipHash = normalizedIpAddress ? this.hashIpAddress(normalizedIpAddress) : null;

    const countryCode = this.normalizeCountryCode(context.countryCode);

    const rateLimitIdentifier = ipHash ?? origin;

    const rateLimitKey = `${website.id}:${rateLimitIdentifier}`;

    this.rateLimit.consume(rateLimitKey, payload.events.length);

    const receivedAt = new Date();

    const sdkVersion = payload.sdkVersion.trim().slice(0, 32);

    if (!sdkVersion) {
      throw new BadRequestException('SDK version is required');
    }

    const data: Prisma.RawAnalyticsEventCreateManyInput[] = payload.events.map((event) => {
      const occurredAt = this.validateEventTime(event.timestamp);

      const trackedUrl = sanitizeTrackedUrl(event.url, origin);

      const eventName = this.normalizeOptionalString(event.eventName, 100);

      this.validateEventName(event.type, eventName);

      const properties = sanitizeEventProperties(event.properties);

      return {
        websiteId: website.id,
        eventId: event.eventId,
        type: event.type,
        visitorId: event.visitorId,
        sessionId: event.sessionId,
        occurredAt,
        receivedAt,

        pageUrl: trackedUrl.url,
        pagePath: trackedUrl.path,
        pageTitle: this.normalizeOptionalString(event.title, 512),
        referrerUrl: sanitizeReferrerUrl(event.referrer),

        eventName,

        ...(properties
          ? {
              properties,
            }
          : {}),

        screenWidth: event.screenWidth ?? null,
        screenHeight: event.screenHeight ?? null,
        viewportWidth: event.viewportWidth ?? null,
        viewportHeight: event.viewportHeight ?? null,
        language: this.normalizeOptionalString(event.language, 35),
        clientTimeZone: this.sanitizeTimeZone(event.timeZone),
        durationMs: event.durationMs ?? null,

        origin,

        userAgent: this.normalizeOptionalString(context.userAgent, 512),

        ipHash,
        countryCode,
        sdkVersion,
      };
    });

    const result = await this.prisma.$transaction(async (transaction) => {
      const created = await transaction.rawAnalyticsEvent.createMany({
        data,
        skipDuplicates: true,
      });

      if (created.count > 0) {
        await transaction.website.update({
          where: {
            id: website.id,
          },
          data: {
            lastEventAt: receivedAt,
          },
        });
      }

      return created;
    });

    return {
      accepted: result.count,
      duplicates: data.length - result.count,
      receivedAt: receivedAt.toISOString(),
    };
  }

  private async parseAndValidatePayload(rawBody: unknown): Promise<CollectEventsDto> {
    const parsed = this.parseRequestBody(rawBody);

    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new BadRequestException('Tracking payload must be a JSON object');
    }

    const payload = plainToInstance(CollectEventsDto, parsed);

    const errors = await validate(payload, {
      whitelist: true,
      forbidNonWhitelisted: true,
      stopAtFirstError: true,
    });

    if (errors.length > 0) {
      throw new BadRequestException({
        message: 'Tracking payload validation failed',
        errors: errors.map((error) => ({
          property: error.property,
          constraints: error.constraints ?? {},
        })),
      });
    }

    return payload;
  }

  private parseRequestBody(rawBody: unknown): unknown {
    if (typeof rawBody === 'string') {
      this.ensureBodySize(rawBody);

      if (!rawBody.trim()) {
        throw new BadRequestException('Tracking payload cannot be empty');
      }

      try {
        return JSON.parse(rawBody);
      } catch {
        throw new BadRequestException('Tracking payload must contain valid JSON');
      }
    }

    if (Buffer.isBuffer(rawBody)) {
      if (rawBody.byteLength > MAX_BODY_BYTES) {
        throw new PayloadTooLargeException('Tracking payload exceeds 64 KB');
      }

      const body = rawBody.toString('utf8');

      if (!body.trim()) {
        throw new BadRequestException('Tracking payload cannot be empty');
      }

      try {
        return JSON.parse(body);
      } catch {
        throw new BadRequestException('Tracking payload must contain valid JSON');
      }
    }

    this.ensureObjectBodySize(rawBody);

    return rawBody;
  }

  private ensureBodySize(body: string): void {
    const bodySize = Buffer.byteLength(body, 'utf8');

    if (bodySize > MAX_BODY_BYTES) {
      throw new PayloadTooLargeException('Tracking payload exceeds 64 KB');
    }
  }

  private ensureObjectBodySize(body: unknown): void {
    if (body === undefined || body === null) {
      return;
    }

    try {
      const serializedBody = JSON.stringify(body);

      this.ensureBodySize(serializedBody);
    } catch (error) {
      if (error instanceof PayloadTooLargeException) {
        throw error;
      }

      throw new BadRequestException('Tracking payload could not be processed');
    }
  }

  private async authenticateWebsite(websiteId: string, trackingKey: string): Promise<ValidWebsite> {
    const normalizedKey = trackingKey.trim();

    const match = TRACKING_KEY_PATTERN.exec(normalizedKey);

    const prefix = match?.[1];

    if (!prefix) {
      throw new UnauthorizedException('Invalid tracking credentials');
    }

    const website = await this.prisma.website.findFirst({
      where: {
        id: websiteId,
        trackingKeyPrefix: prefix,
      },

      select: {
        id: true,
        enabled: true,
        archivedAt: true,
        allowedOrigins: true,
        trackingKeyHash: true,
      },
    });

    if (!website) {
      throw new UnauthorizedException('Invalid tracking credentials');
    }

    const candidateHash = createHash('sha256').update(normalizedKey).digest('hex');

    if (!this.safeHashEquals(candidateHash, website.trackingKeyHash)) {
      throw new UnauthorizedException('Invalid tracking credentials');
    }

    return website;
  }
  private safeHashEquals(candidateHash: string, storedHash: string): boolean {
    if (!SHA_256_HEX_PATTERN.test(candidateHash) || !SHA_256_HEX_PATTERN.test(storedHash)) {
      return false;
    }

    const candidateBuffer = Buffer.from(candidateHash, 'hex');

    const storedBuffer = Buffer.from(storedHash, 'hex');

    return timingSafeEqual(candidateBuffer, storedBuffer);
  }

  private ensureWebsiteAvailable(website: ValidWebsite): void {
    if (website.archivedAt !== null || !website.enabled) {
      throw new ForbiddenException('Website tracking is disabled');
    }
  }

  private resolveAndValidateOrigin(rawOrigin: string | undefined, allowedOrigins: string[]): string {
    const suppliedOrigin = rawOrigin?.trim();

    if (!suppliedOrigin || suppliedOrigin === 'null') {
      if (this.allowOriginless) {
        return 'originless://request';
      }

      throw new ForbiddenException('Tracking requests require a valid Origin header');
    }

    const requestOrigin = normalizeRequestOrigin(suppliedOrigin);

    const normalizedAllowedOrigins = new Set(
      allowedOrigins.map((allowedOrigin) => this.tryNormalizeOrigin(allowedOrigin)).filter((allowedOrigin): allowedOrigin is string => allowedOrigin !== null),
    );

    if (!normalizedAllowedOrigins.has(requestOrigin)) {
      throw new ForbiddenException('Origin is not allowed for this website');
    }

    return requestOrigin;
  }

  private tryNormalizeOrigin(value: string): string | null {
    try {
      return normalizeRequestOrigin(value);
    } catch {
      return null;
    }
  }

  private validateEventName(eventType: RawAnalyticsEventType, eventName: string | null): void {
    if (eventType === RawAnalyticsEventType.CUSTOM && !eventName) {
      throw new BadRequestException('Custom events require an event name');
    }

    if (eventType !== RawAnalyticsEventType.CUSTOM && eventName) {
      throw new BadRequestException('Only custom events may contain an event name');
    }
  }

  private validateEventTime(value: string): Date {
    const date = new Date(value);
    const timestamp = date.getTime();

    if (Number.isNaN(timestamp)) {
      throw new BadRequestException('Event timestamp is invalid');
    }

    const currentTime = Date.now();

    const maximumFutureTime = currentTime + MAX_FUTURE_EVENT_AGE_MS;

    const minimumPastTime = currentTime - MAX_PAST_EVENT_AGE_MS;

    if (timestamp > maximumFutureTime || timestamp < minimumPastTime) {
      throw new BadRequestException('Event timestamp is outside the accepted range');
    }

    return date;
  }

  private normalizeCountryCode(value?: string): string | null {
    if (!this.trustCountryHeader || !value) {
      return null;
    }

    const countryCode = value.trim().toUpperCase();

    if (!/^[A-Z]{2}$/.test(countryCode)) {
      return null;
    }

    if (countryCode === 'XX' || countryCode === 'T1') {
      return null;
    }

    return countryCode;
  }

  private normalizeIpAddress(value?: string): string | null {
    if (!value) {
      return null;
    }

    const normalized = value.trim().replace(/^::ffff:/i, '');

    return normalized || null;
  }

  private hashIpAddress(ipAddress: string): string {
    return hashIpAddressWithSalt(this.ipHashSalt, ipAddress);
  }

  private normalizeOptionalString(value: string | undefined, maximumLength: number): string | null {
    if (!value) {
      return null;
    }

    const normalized = value.trim().slice(0, maximumLength);

    return normalized || null;
  }

  private sanitizeTimeZone(value?: string): string | null {
    const timeZone = this.normalizeOptionalString(value, 64);

    if (!timeZone) {
      return null;
    }

    try {
      new Intl.DateTimeFormat('en-US', {
        timeZone,
      }).format();

      return timeZone;
    } catch {
      return null;
    }
  }

  private isEnabled(value: unknown): boolean {
    if (value === true) {
      return true;
    }

    return typeof value === 'string' && value.trim().toLowerCase() === 'true';
  }
}
