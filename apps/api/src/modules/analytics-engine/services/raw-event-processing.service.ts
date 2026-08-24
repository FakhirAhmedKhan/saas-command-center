import { normalizeAnalyticsPage, normalizeSource, parseUserAgent } from '../utils/analytics-normalization';
import { getAnalyticsBucket } from '../utils/analytics-time';
import { AnalyticsAggregatePeriod } from '@command-center/shared-types';
import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from 'src/generated/prisma/client';
import { RawAnalyticsEventType } from 'src/generated/prisma/enums';

export interface AnalyticsProcessingWebsite {
  id: string;
  workspaceId: string;
  timeZone: string;
}

export type RawAnalyticsEventRecord = Prisma.RawAnalyticsEventGetPayload<Record<string, never>>;

export interface RawEventProcessingResult {
  failedEvents: number;
  processedEvents: number;
  affectedSessionIds: string[];
  affectedVisitorIds: string[];
  hourlyBuckets: string[];
  dailyBuckets: string[];
  lastReceivedAt: Date | null;
}

@Injectable()
export class RawEventProcessingService {
  async process(transaction: Prisma.TransactionClient, website: AnalyticsProcessingWebsite, rawEvents: RawAnalyticsEventRecord[]): Promise<RawEventProcessingResult> {
    const affectedSessions = new Set<string>();
    const affectedVisitors = new Set<string>();
    const hourlyBuckets = new Set<string>();
    const dailyBuckets = new Set<string>();
    let processedEvents = 0;

    for (const raw of rawEvents) {
      const page = normalizeAnalyticsPage(raw.pageUrl);
      const source = normalizeSource(raw.referrerUrl, page.origin);
      const agent = parseUserAgent(raw.userAgent);
      const countryCode = this.readCountryCode(raw);
      let visitor = await transaction.analyticsVisitor.findUnique({
        where: {
          websiteId_externalVisitorId: {
            websiteId: website.id,
            externalVisitorId: raw.visitorId,
          },
        },
      });

      if (!visitor) {
        visitor = await transaction.analyticsVisitor.create({
          data: {
            websiteId: website.id,
            externalVisitorId: raw.visitorId,
            firstSeenAt: raw.occurredAt,
            lastSeenAt: raw.occurredAt,
          },
        });
      }

      let session = await transaction.analyticsSession.findUnique({
        where: {
          websiteId_externalSessionId: {
            websiteId: website.id,
            externalSessionId: raw.sessionId,
          },
        },
      });

      if (session && session.visitorId !== visitor.id) {
        throw new BadRequestException('A session identifier cannot belong to multiple visitors');
      }

      if (!session) {
        session = await transaction.analyticsSession.create({
          data: {
            websiteId: website.id,
            visitorId: visitor.id,
            externalSessionId: raw.sessionId,
            startedAt: raw.occurredAt,
            endedAt: raw.occurredAt,
            lastEventAt: raw.occurredAt,
            referrerUrl: raw.referrerUrl,
            sourceType: source.sourceType,
            sourceName: source.sourceName,
            sourceDomain: source.sourceDomain,

            countryCode,

            deviceType: agent.deviceType,
            browserName: agent.browserName,
            browserVersion: agent.browserVersion,
            operatingSystem: agent.operatingSystem,
            operatingSystemVersion: agent.operatingSystemVersion,
          },
        });
      }

      const eventVisitorId = session.visitorId;
      const analyticsEvent = await transaction.analyticsEvent.upsert({
        where: {
          websiteId_sourceEventId: {
            websiteId: website.id,
            sourceEventId: raw.eventId,
          },
        },

        update: {
          rawEventId: raw.id,
          receivedAt: raw.receivedAt,
          pageUrl: page.pageUrl,
          normalizedPath: page.normalizedPath,
          pageTitle: raw.pageTitle,
          referrerUrl: raw.referrerUrl,
          eventName: raw.eventName,

          ...(raw.properties !== null
            ? {
                properties: raw.properties,
              }
            : {}),

          durationMs: raw.durationMs,
          sourceType: source.sourceType,
          sourceName: source.sourceName,
          sourceDomain: source.sourceDomain,

          countryCode,

          deviceType: agent.deviceType,
          browserName: agent.browserName,
          browserVersion: agent.browserVersion,
          operatingSystem: agent.operatingSystem,
          operatingSystemVersion: agent.operatingSystemVersion,
        },

        create: {
          websiteId: website.id,
          visitorId: eventVisitorId,
          sessionId: session.id,
          rawEventId: raw.id,
          sourceEventId: raw.eventId,
          type: raw.type,
          eventName: raw.eventName,
          occurredAt: raw.occurredAt,
          receivedAt: raw.receivedAt,
          pageUrl: page.pageUrl,
          normalizedPath: page.normalizedPath,
          pageTitle: raw.pageTitle,
          referrerUrl: raw.referrerUrl,

          ...(raw.properties !== null
            ? {
                properties: raw.properties,
              }
            : {}),

          durationMs: raw.durationMs,
          sourceType: source.sourceType,
          sourceName: source.sourceName,
          sourceDomain: source.sourceDomain,

          countryCode,

          deviceType: agent.deviceType,
          browserName: agent.browserName,
          browserVersion: agent.browserVersion,
          operatingSystem: agent.operatingSystem,
          operatingSystemVersion: agent.operatingSystemVersion,
        },
      });

      if (analyticsEvent.sessionId !== session.id || analyticsEvent.visitorId !== eventVisitorId) {
        throw new BadRequestException('An analytics event identifier cannot belong to multiple sessions or visitors');
      }

      if (raw.type === RawAnalyticsEventType.PAGE_VIEW) {
        await transaction.analyticsPageView.upsert({
          where: {
            analyticsEventId: analyticsEvent.id,
          },

          update: {
            visitorId: eventVisitorId,
            sessionId: session.id,
            occurredAt: raw.occurredAt,
            pageUrl: page.pageUrl,
            normalizedPath: page.normalizedPath,
            title: raw.pageTitle,
            referrerUrl: raw.referrerUrl,
            sourceType: source.sourceType,
            sourceName: source.sourceName,
            sourceDomain: source.sourceDomain,

            countryCode,

            deviceType: agent.deviceType,
            browserName: agent.browserName,
            operatingSystem: agent.operatingSystem,
          },

          create: {
            websiteId: website.id,
            visitorId: eventVisitorId,
            sessionId: session.id,
            analyticsEventId: analyticsEvent.id,
            occurredAt: raw.occurredAt,
            pageUrl: page.pageUrl,
            normalizedPath: page.normalizedPath,
            title: raw.pageTitle,
            referrerUrl: raw.referrerUrl,
            sourceType: source.sourceType,
            sourceName: source.sourceName,
            sourceDomain: source.sourceDomain,

            countryCode,

            deviceType: agent.deviceType,
            browserName: agent.browserName,
            operatingSystem: agent.operatingSystem,
          },
        });
      } else {
        await transaction.analyticsPageView.deleteMany({
          where: {
            analyticsEventId: analyticsEvent.id,
          },
        });
      }

      affectedSessions.add(session.id);

      affectedVisitors.add(eventVisitorId);

      this.addAffectedBuckets(hourlyBuckets, dailyBuckets, raw.occurredAt, website.timeZone);

      processedEvents += 1;
    }

    return {
      processedEvents,
      failedEvents: 0,
      affectedSessionIds: [...affectedSessions],
      affectedVisitorIds: [...affectedVisitors],
      hourlyBuckets: [...hourlyBuckets],
      dailyBuckets: [...dailyBuckets],
      lastReceivedAt: rawEvents.at(-1)?.receivedAt ?? null,
    };
  }

  async processBatch(transaction: Prisma.TransactionClient, website: AnalyticsProcessingWebsite, rawEvents: RawAnalyticsEventRecord[]): Promise<RawEventProcessingResult> {
    return this.process(transaction, website, rawEvents);
  }
  async processRange(
    transaction: Prisma.TransactionClient,
    input: {
      workspaceId: string;
      websiteId: string;
      from: Date;
      to: Date;
    },
  ): Promise<RawEventProcessingResult> {
    const website = await transaction.website.findFirstOrThrow({
      where: {
        id: input.websiteId,
        workspaceId: input.workspaceId,
        archivedAt: null,
      },

      select: {
        id: true,
        workspaceId: true,
        timeZone: true,
      },
    });
    const rawEvents = await transaction.rawAnalyticsEvent.findMany({
      where: {
        websiteId: input.websiteId,
        occurredAt: {
          gte: input.from,
          lt: input.to,
        },

        processedAt: null,
      },

      orderBy: [
        {
          receivedAt: 'asc',
        },
        {
          id: 'asc',
        },
      ],
    });
    const result = await this.process(transaction, website, rawEvents);

    if (rawEvents.length > 0) {
      await transaction.rawAnalyticsEvent.updateMany({
        where: {
          id: {
            in: rawEvents.map((event) => event.id),
          },

          processedAt: null,
        },

        data: {
          processedAt: new Date(),
        },
      });
    }

    return result;
  }

  private addAffectedBuckets(hourlyBuckets: Set<string>, dailyBuckets: Set<string>, occurredAt: Date, timeZone: string): void {
    hourlyBuckets.add(getAnalyticsBucket(occurredAt, timeZone, AnalyticsAggregatePeriod.HOURLY).start.toISOString());

    dailyBuckets.add(getAnalyticsBucket(occurredAt, timeZone, AnalyticsAggregatePeriod.DAILY).start.toISOString());
  }

  private readCountryCode(raw: RawAnalyticsEventRecord): string | null {
    const value = (
      raw as RawAnalyticsEventRecord & {
        countryCode?: unknown;
      }
    ).countryCode;

    if (typeof value !== 'string') {
      return null;
    }

    const normalized = value.trim().toUpperCase();

    return /^[A-Z]{2}$/.test(normalized) ? normalized : null;
  }
}
