export type RawEventType =
    | 'PAGE_VIEW'
    | 'HEARTBEAT'
    | 'CUSTOM';

export interface RawTrackingEvent {
    id: string;
    websiteId: string;
    eventId: string;
    type: RawEventType;
    visitorId: string;
    sessionId: string;
    occurredAt: string;
    receivedAt: string;
    pageUrl: string;
    pagePath: string;
    pageTitle: string | null;
    referrerUrl: string | null;
    eventName: string | null;
    properties:
    Record<string, unknown> | null;
    screenWidth: number | null;
    screenHeight: number | null;
    viewportWidth: number | null;
    viewportHeight: number | null;
    language: string | null;
    clientTimeZone: string | null;
    durationMs: number | null;
    origin: string;
    sdkVersion: string;
}

export interface TrackingStatus {
    website: {
        id: string;
        name: string;
        domain: string;
        enabled: boolean;
        archivedAt: string | null;
        lastEventAt: string | null;
        trackingKeyPrefix: string;
    };

    connected: boolean;

    totalEvents: number;

    counts: {
        PAGE_VIEW: number;
        HEARTBEAT: number;
        CUSTOM: number;
    };

    recentEvents:
    RawTrackingEvent[];
}

export interface RawEventsResponse {
    data: RawTrackingEvent[];

    meta: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
        hasNextPage: boolean;
        hasPreviousPage: boolean;
    };
}

export interface RawEventQuery {
    type?: RawEventType;
    eventName?: string;
    visitorId?: string;
    sessionId?: string;
    dateFrom?: string;
    dateTo?: string;
    page?: number;
    limit?: number;
}