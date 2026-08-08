import {
    expect,
    test,
} from '@playwright/test';

const workspaceId =
    '11111111-1111-4111-8111-111111111111';

const websiteId =
    '22222222-2222-4222-8222-222222222222';

test.describe(
    'Phase 14 analytics processing',
    () => {
        test.beforeEach(
            async ({
                page,
            }) => {
                await page.route(
                    '**/auth/refresh',
                    async (
                        route,
                    ) => {
                        await route.fulfill({
                            status:
                                200,

                            contentType:
                                'application/json',

                            body:
                                JSON.stringify({
                                    accessToken:
                                        'phase-14-token',

                                    user: {
                                        id:
                                            '33333333-3333-4333-8333-333333333333',

                                        email:
                                            'admin@example.com',
                                    },
                                }),
                        });
                    },
                );

                await page.route(
                    '**/analytics/processing/status',
                    async (
                        route,
                    ) => {
                        await route.fulfill({
                            status:
                                200,

                            contentType:
                                'application/json',

                            body:
                                JSON.stringify({
                                    canReprocess:
                                        true,

                                    pendingEvents:
                                        42,

                                    unresolvedDeadLetters:
                                        1,

                                    activeRun:
                                        null,

                                    latestRun:
                                        null,

                                    lastSuccessfulRun: {
                                        id:
                                            'run-success',

                                        status:
                                            'SUCCEEDED',

                                        trigger:
                                            'SCHEDULED',

                                        rangeStart:
                                            '2026-08-01T00:00:00.000Z',

                                        rangeEnd:
                                            '2026-08-02T00:00:00.000Z',

                                        retryCount:
                                            0,

                                        maxRetries:
                                            3,

                                        processedEvents:
                                            100,

                                        failedEvents:
                                            0,

                                        errorMessage:
                                            null,

                                        startedAt:
                                            '2026-08-02T01:00:00.000Z',

                                        finishedAt:
                                            '2026-08-02T01:01:00.000Z',

                                        createdAt:
                                            '2026-08-02T01:00:00.000Z',
                                    },

                                    recentRuns: [],
                                }),
                        });
                    },
                );

                await page.route(
                    '**/analytics/processing/reprocess',
                    async (
                        route,
                    ) => {
                        await route.fulfill({
                            status:
                                201,

                            contentType:
                                'application/json',

                            body:
                                JSON.stringify({
                                    id:
                                        'queued-run',

                                    status:
                                        'QUEUED',
                                }),
                        });
                    },
                );
            },
        );

        test(
            'shows processing status',
            async ({
                page,
            }) => {
                await page.goto(
                    `/workspaces/${workspaceId}/websites/${websiteId}/analytics/processing`,
                );

                await expect(
                    page.getByRole(
                        'heading',
                        {
                            name:
                                'Processing status',
                        },
                    ),
                ).toBeVisible();

                await expect(
                    page.getByText(
                        '42',
                        {
                            exact:
                                true,
                        },
                    ),
                ).toBeVisible();

                await expect(
                    page.getByText(
                        '1',
                        {
                            exact:
                                true,
                        },
                    ),
                ).toBeVisible();

                await expect(
                    page.getByRole(
                        'button',
                        {
                            name:
                                'Reprocess',
                        },
                    ),
                ).toBeVisible();
            },
        );

        test(
            'hides management controls for viewers',
            async ({
                page,
            }) => {
                await page.route(
                    '**/analytics/processing/status',
                    async (
                        route,
                    ) => {
                        await route.fulfill({
                            status:
                                200,

                            contentType:
                                'application/json',

                            body:
                                JSON.stringify({
                                    canReprocess:
                                        false,

                                    pendingEvents:
                                        0,

                                    unresolvedDeadLetters:
                                        0,

                                    activeRun:
                                        null,

                                    latestRun:
                                        null,

                                    lastSuccessfulRun:
                                        null,

                                    recentRuns:
                                        [],
                                }),
                        });
                    },
                );

                await page.goto(
                    `/workspaces/${workspaceId}/websites/${websiteId}/analytics/processing`,
                );

                await expect(
                    page.getByRole(
                        'button',
                        {
                            name:
                                'Reprocess',
                        },
                    ),
                ).toHaveCount(
                    0,
                );
            },
        );
    },
);