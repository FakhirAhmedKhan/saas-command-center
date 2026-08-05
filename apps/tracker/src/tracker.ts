type TrackerEventType =
    | 'PAGE_VIEW'
    | 'HEARTBEAT'
    | 'CUSTOM';

interface TrackerEvent {
    eventId: string;
    type: TrackerEventType;
    visitorId: string;
    sessionId: string;
    timestamp: string;
    url: string;
    title?: string;
    referrer?: string;
    eventName?: string;
    properties?: Record<
        string,
        string | number | boolean | Array<string | number | boolean>
    >;
    screenWidth?: number;
    screenHeight?: number;
    viewportWidth?: number;
    viewportHeight?: number;
    language?: string;
    timeZone?: string;
    durationMs?: number;
}

interface TrackerPayload {
    websiteId: string;
    trackingKey: string;
    sdkVersion: string;
    sentAt: string;
    events: TrackerEvent[];
}

interface TrackerConfiguration {
    websiteId: string;
    trackingKey: string;
    endpoint: string;
    respectDoNotTrack: boolean;
    requireConsent: boolean;
    heartbeatIntervalMs: number;
    flushIntervalMs: number;
    sessionTimeoutMs: number;
}

interface StoredSession {
    id: string;
    lastSeenAt: number;
}

interface AnalyticsApi {
    track(
        eventName: string,
        properties?: Record<
            string,
            unknown
        >,
    ): void;

    pageview(): void;

    flush(): Promise<void>;

    consent(
        decision:
            | 'grant'
            | 'deny',
    ): void;
}

declare global {
    interface Window {
        CommandCenterAnalytics?:
        AnalyticsApi;

        __COMMAND_CENTER_TRACKER__?:
        boolean;
    }
}

const SDK_VERSION =
    '1.0.0';

const MAX_QUEUE_SIZE =
    100;

const MAX_BATCH_SIZE =
    25;

const SENSITIVE_QUERY_PARAMETER =
    /^(access_?token|refresh_?token|token|password|pass|secret|authorization|auth|api_?key|session|session_?id|jwt|email|code|otp)$/i;

const SENSITIVE_PROPERTY_KEY =
    /(password|passcode|token|secret|authorization|cookie|session|email|phone|address|credit|card|cvv|ssn|private|api.?key)/i;

function safely(
    operation: () => void,
): void {
    try {
        operation();
    } catch {
        // Analytics must never break the host website.
    }
}

function createIdentifier(): string {
    try {
        if (
            typeof crypto !==
            'undefined' &&
            typeof crypto.randomUUID ===
            'function'
        ) {
            return crypto
                .randomUUID()
                .replace(/-/g, '');
        }

        const bytes =
            new Uint8Array(16);

        crypto.getRandomValues(
            bytes,
        );

        return Array.from(bytes)
            .map((value) =>
                value
                    .toString(16)
                    .padStart(2, '0'),
            )
            .join('');
    } catch {
        return `${Date.now().toString(
            36,
        )}${Math.random()
            .toString(36)
            .slice(2)}`;
    }
}

function readStorage(
    storage: Storage,
    key: string,
): string | null {
    try {
        return storage.getItem(
            key,
        );
    } catch {
        return null;
    }
}

function writeStorage(
    storage: Storage,
    key: string,
    value: string,
): void {
    try {
        storage.setItem(
            key,
            value,
        );
    } catch {
        // Storage may be unavailable.
    }
}

function removeStorage(
    storage: Storage,
    key: string,
): void {
    try {
        storage.removeItem(key);
    } catch {
        // Storage may be unavailable.
    }
}

function sanitizeUrl(
    rawValue: string,
): string {
    try {
        const url =
            new URL(
                rawValue,
                window.location.href,
            );

        url.username = '';
        url.password = '';
        url.hash = '';

        for (
            const key of [
                ...url.searchParams.keys(),
            ]
        ) {
            if (
                SENSITIVE_QUERY_PARAMETER.test(
                    key,
                )
            ) {
                url.searchParams.delete(
                    key,
                );
            }
        }

        url.searchParams.sort();

        return url
            .toString()
            .slice(0, 2048);
    } catch {
        return window.location
            .origin;
    }
}

function sanitizeProperties(
    source:
        | Record<string, unknown>
        | undefined,
): TrackerEvent['properties'] {
    if (!source) {
        return undefined;
    }

    const result:
        NonNullable<
            TrackerEvent['properties']
        > = {};

    for (
        const [
            rawKey,
            value,
        ] of Object.entries(
            source,
        ).slice(0, 20)
    ) {
        const key =
            rawKey
                .trim()
                .slice(0, 64);

        if (
            !key ||
            SENSITIVE_PROPERTY_KEY.test(
                key,
            )
        ) {
            continue;
        }

        if (
            typeof value ===
            'string'
        ) {
            result[key] =
                value.slice(0, 200);

            continue;
        }

        if (
            typeof value ===
            'number' &&
            Number.isFinite(value)
        ) {
            result[key] = value;
            continue;
        }

        if (
            typeof value ===
            'boolean'
        ) {
            result[key] = value;
            continue;
        }

        if (Array.isArray(value)) {
            result[key] =
                value
                    .slice(0, 20)
                    .filter(
                        (
                            item,
                        ): item is
                            | string
                            | number
                            | boolean =>
                            typeof item ===
                            'string' ||
                            (
                                typeof item ===
                                'number' &&
                                Number.isFinite(
                                    item,
                                )
                            ) ||
                            typeof item ===
                            'boolean',
                    )
                    .map((item) =>
                        typeof item ===
                            'string'
                            ? item.slice(
                                0,
                                200,
                            )
                            : item,
                    );
        }
    }

    return Object.keys(result)
        .length > 0
        ? result
        : undefined;
}

function readConfiguration():
    TrackerConfiguration | null {
    const script =
        document.currentScript as
        | HTMLScriptElement
        | null;

    if (!script) {
        return null;
    }

    const websiteId =
        script.dataset.websiteId
            ?.trim();

    const trackingKey =
        script.dataset.trackingKey
            ?.trim();

    const endpoint =
        script.dataset.endpoint
            ?.trim();

    if (
        !websiteId ||
        !trackingKey ||
        !endpoint
    ) {
        return null;
    }

    return {
        websiteId,
        trackingKey,
        endpoint,

        respectDoNotTrack:
            script.dataset
                .respectDnt !==
            'false',

        requireConsent:
            script.dataset
                .requireConsent ===
            'true',

        heartbeatIntervalMs:
            readPositiveInteger(
                script.dataset
                    .heartbeatInterval,
                15_000,
            ),

        flushIntervalMs:
            readPositiveInteger(
                script.dataset
                    .flushInterval,
                3_000,
            ),

        sessionTimeoutMs:
            readPositiveInteger(
                script.dataset
                    .sessionTimeout,
                30 * 60_000,
            ),
    };
}

function readPositiveInteger(
    value: string | undefined,
    fallback: number,
): number {
    const parsed =
        Number(value);

    return Number.isFinite(
        parsed,
    ) && parsed > 0
        ? Math.round(parsed)
        : fallback;
}

class CommandCenterTracker {
    private readonly visitorKey:
        string;

    private readonly sessionKey:
        string;

    private readonly queueKey:
        string;

    private readonly consentKey:
        string;

    private readonly visitorId:
        string;

    private session:
        StoredSession;

    private queue:
        TrackerEvent[];

    private flushTimer:
        number | null = null;

    private heartbeatTimer:
        number | null = null;

    private flushing = false;

    private started = false;

    private lastPageUrl = '';

    private lastHeartbeatAt =
        Date.now();

    constructor(
        private readonly config:
            TrackerConfiguration,
    ) {
        this.visitorKey =
            `cc_visitor_${config.websiteId}`;

        this.sessionKey =
            `cc_session_${config.websiteId}`;

        this.queueKey =
            `cc_queue_${config.websiteId}`;

        this.consentKey =
            `cc_consent_${config.websiteId}`;

        this.visitorId =
            this.resolveVisitorId();

        this.session =
            this.resolveSession();

        this.queue =
            this.readQueue();
    }

    initialize(): void {
        this.installPublicApi();

        if (
            this.config
                .respectDoNotTrack &&
            navigator.doNotTrack ===
            '1'
        ) {
            return;
        }

        if (
            this.config
                .requireConsent &&
            !this.hasConsent()
        ) {
            return;
        }

        this.start();
    }

    trackCustomEvent(
        eventName: string,
        properties?: Record<
            string,
            unknown
        >,
    ): void {
        if (!this.started) {
            return;
        }

        const normalizedName =
            eventName
                .trim()
                .slice(0, 100);

        if (
            !/^[a-zA-Z][a-zA-Z0-9_.:-]{1,99}$/.test(
                normalizedName,
            )
        ) {
            return;
        }

        this.enqueue({
            ...this.baseEvent(
                'CUSTOM',
            ),

            eventName:
                normalizedName,

            properties:
                sanitizeProperties(
                    properties,
                ),
        });
    }

    trackPageView(): void {
        if (!this.started) {
            return;
        }

        const pageUrl =
            sanitizeUrl(
                window.location.href,
            );

        if (
            pageUrl ===
            this.lastPageUrl
        ) {
            return;
        }

        this.lastPageUrl =
            pageUrl;

        this.enqueue({
            ...this.baseEvent(
                'PAGE_VIEW',
            ),

            url: pageUrl,

            title:
                document.title
                    .trim()
                    .slice(0, 512),

            referrer:
                document.referrer
                    ? sanitizeUrl(
                        document.referrer,
                    )
                    : undefined,
        });
    }

    async flush(
        useBeacon = false,
    ): Promise<void> {
        if (
            this.flushing ||
            this.queue.length === 0
        ) {
            return;
        }

        this.flushing = true;

        const batch =
            this.queue.slice(
                0,
                MAX_BATCH_SIZE,
            );

        const payload:
            TrackerPayload = {
            websiteId:
                this.config.websiteId,

            trackingKey:
                this.config.trackingKey,

            sdkVersion:
                SDK_VERSION,

            sentAt:
                new Date()
                    .toISOString(),

            events: batch,
        };

        const body =
            JSON.stringify(payload);

        try {
            if (
                useBeacon &&
                typeof navigator
                    .sendBeacon ===
                'function'
            ) {
                const sent =
                    navigator.sendBeacon(
                        this.config.endpoint,
                        new Blob(
                            [body],
                            {
                                type:
                                    'text/plain;charset=UTF-8',
                            },
                        ),
                    );

                if (!sent) {
                    throw new Error(
                        'Beacon was rejected',
                    );
                }
            } else {
                await fetch(
                    this.config.endpoint,
                    {
                        method: 'POST',

                        mode:
                            'no-cors',

                        keepalive: true,

                        headers: {
                            'Content-Type':
                                'text/plain;charset=UTF-8',
                        },

                        body,
                    },
                );
            }

            this.queue.splice(
                0,
                batch.length,
            );

            this.persistQueue();
        } catch {
            this.persistQueue();
        } finally {
            this.flushing = false;
        }
    }

    setConsent(
        decision:
            | 'grant'
            | 'deny',
    ): void {
        writeStorage(
            localStorage,
            this.consentKey,
            decision,
        );

        if (
            decision === 'grant'
        ) {
            this.start();
            return;
        }

        this.stop();

        this.queue = [];
        this.persistQueue();
    }

    private start(): void {
        if (this.started) {
            return;
        }

        this.started = true;

        this.installRouteTracking();
        this.installLifecycleTracking();

        this.trackPageView();

        this.flushTimer =
            window.setInterval(
                () => {
                    void this.flush();
                },
                this.config
                    .flushIntervalMs,
            );

        this.heartbeatTimer =
            window.setInterval(
                () => {
                    this.trackHeartbeat();
                },
                this.config
                    .heartbeatIntervalMs,
            );

        if (
            navigator.onLine &&
            this.queue.length > 0
        ) {
            void this.flush();
        }
    }

    private stop(): void {
        this.started = false;

        if (
            this.flushTimer !== null
        ) {
            window.clearInterval(
                this.flushTimer,
            );

            this.flushTimer =
                null;
        }

        if (
            this.heartbeatTimer !==
            null
        ) {
            window.clearInterval(
                this.heartbeatTimer,
            );

            this.heartbeatTimer =
                null;
        }
    }

    private enqueue(
        event: TrackerEvent,
    ): void {
        this.refreshSession();

        this.queue.push({
            ...event,
            sessionId:
                this.session.id,
        });

        if (
            this.queue.length >
            MAX_QUEUE_SIZE
        ) {
            this.queue.splice(
                0,
                this.queue.length -
                MAX_QUEUE_SIZE,
            );
        }

        this.persistQueue();

        if (
            this.queue.length >= 10
        ) {
            void this.flush();
        }
    }

    private baseEvent(
        type: TrackerEventType,
    ): TrackerEvent {
        return {
            eventId:
                createIdentifier(),

            type,

            visitorId:
                this.visitorId,

            sessionId:
                this.session.id,

            timestamp:
                new Date()
                    .toISOString(),

            url:
                sanitizeUrl(
                    window.location.href,
                ),

            title:
                document.title
                    .trim()
                    .slice(0, 512),

            screenWidth:
                window.screen?.width,

            screenHeight:
                window.screen?.height,

            viewportWidth:
                window.innerWidth,

            viewportHeight:
                window.innerHeight,

            language:
                navigator.language,

            timeZone:
                this.resolveTimeZone(),
        };
    }

    private trackHeartbeat(): void {
        if (
            !this.started ||
            document.visibilityState !==
            'visible'
        ) {
            return;
        }

        const now =
            Date.now();

        const durationMs =
            Math.max(
                0,
                Math.min(
                    now -
                    this.lastHeartbeatAt,
                    300_000,
                ),
            );

        this.lastHeartbeatAt =
            now;

        this.enqueue({
            ...this.baseEvent(
                'HEARTBEAT',
            ),

            durationMs,
        });
    }

    private resolveVisitorId():
        string {
        const existing =
            readStorage(
                localStorage,
                this.visitorKey,
            );

        if (existing) {
            return existing;
        }

        const created =
            createIdentifier();

        writeStorage(
            localStorage,
            this.visitorKey,
            created,
        );

        return created;
    }

    private resolveSession():
        StoredSession {
        const now =
            Date.now();

        const stored =
            readStorage(
                localStorage,
                this.sessionKey,
            );

        if (stored) {
            try {
                const parsed =
                    JSON.parse(
                        stored,
                    ) as StoredSession;

                if (
                    parsed.id &&
                    now -
                    parsed.lastSeenAt <
                    this.config
                        .sessionTimeoutMs
                ) {
                    parsed.lastSeenAt =
                        now;

                    this.persistSession(
                        parsed,
                    );

                    return parsed;
                }
            } catch {
                // Create a new session.
            }
        }

        const created = {
            id: createIdentifier(),
            lastSeenAt: now,
        };

        this.persistSession(
            created,
        );

        return created;
    }

    private refreshSession(): void {
        const now =
            Date.now();

        if (
            now -
            this.session
                .lastSeenAt >=
            this.config
                .sessionTimeoutMs
        ) {
            this.session = {
                id:
                    createIdentifier(),

                lastSeenAt: now,
            };
        } else {
            this.session.lastSeenAt =
                now;
        }

        this.persistSession(
            this.session,
        );
    }

    private persistSession(
        session: StoredSession,
    ): void {
        writeStorage(
            localStorage,
            this.sessionKey,
            JSON.stringify(
                session,
            ),
        );
    }

    private readQueue():
        TrackerEvent[] {
        const stored =
            readStorage(
                localStorage,
                this.queueKey,
            );

        if (!stored) {
            return [];
        }

        try {
            const parsed =
                JSON.parse(
                    stored,
                );

            if (
                !Array.isArray(parsed)
            ) {
                return [];
            }

            return parsed
                .slice(
                    -MAX_QUEUE_SIZE,
                ) as TrackerEvent[];
        } catch {
            return [];
        }
    }

    private persistQueue(): void {
        if (
            this.queue.length === 0
        ) {
            removeStorage(
                localStorage,
                this.queueKey,
            );

            return;
        }

        writeStorage(
            localStorage,
            this.queueKey,
            JSON.stringify(
                this.queue,
            ),
        );
    }

    private installRouteTracking():
        void {
        const notify =
            () => {
                window.setTimeout(
                    () => {
                        this.trackPageView();
                    },
                    0,
                );
            };

        const originalPushState =
            history.pushState;

        history.pushState =
            function pushState(
                ...args:
                    Parameters<
                        History['pushState']
                    >
            ) {
                const result =
                    originalPushState.apply(
                        this,
                        args,
                    );

                notify();

                return result;
            };

        const originalReplaceState =
            history.replaceState;

        history.replaceState =
            function replaceState(
                ...args:
                    Parameters<
                        History['replaceState']
                    >
            ) {
                const result =
                    originalReplaceState.apply(
                        this,
                        args,
                    );

                notify();

                return result;
            };

        window.addEventListener(
            'popstate',
            notify,
        );

        window.addEventListener(
            'hashchange',
            notify,
        );
    }

    private installLifecycleTracking():
        void {
        window.addEventListener(
            'online',
            () => {
                void this.flush();
            },
        );

        document.addEventListener(
            'visibilitychange',
            () => {
                if (
                    document.visibilityState ===
                    'hidden'
                ) {
                    this.trackHeartbeat();

                    void this.flush(true);
                } else {
                    this.lastHeartbeatAt =
                        Date.now();
                }
            },
        );

        window.addEventListener(
            'pagehide',
            () => {
                this.trackHeartbeat();

                void this.flush(true);
            },
        );
    }

    private installPublicApi():
        void {
        window.CommandCenterAnalytics =
        {
            track: (
                eventName,
                properties,
            ) => {
                safely(() => {
                    this.trackCustomEvent(
                        eventName,
                        properties,
                    );
                });
            },

            pageview: () => {
                safely(() => {
                    this.trackPageView();
                });
            },

            flush: async () => {
                await this.flush();
            },

            consent: (
                decision,
            ) => {
                safely(() => {
                    this.setConsent(
                        decision,
                    );
                });
            },
        };
    }

    private hasConsent():
        boolean {
        return (
            readStorage(
                localStorage,
                this.consentKey,
            ) === 'grant'
        );
    }

    private resolveTimeZone():
        string | undefined {
        try {
            return Intl
                .DateTimeFormat()
                .resolvedOptions()
                .timeZone;
        } catch {
            return undefined;
        }
    }
}

safely(() => {
    if (
        window
            .__COMMAND_CENTER_TRACKER__
    ) {
        return;
    }

    window
        .__COMMAND_CENTER_TRACKER__ =
        true;

    const configuration =
        readConfiguration();

    if (!configuration) {
        return;
    }

    const tracker =
        new CommandCenterTracker(
            configuration,
        );

    tracker.initialize();
});