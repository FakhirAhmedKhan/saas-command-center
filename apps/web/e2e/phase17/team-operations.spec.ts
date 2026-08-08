import {
    expect,
    test,
} from '@playwright/test';

const workspaceId =
    '11111111-1111-4111-8111-111111111111';

test.describe(
    'Phase 17 team operations',
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
                                        'phase-17-token',

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
                    '**/workspaces/*/invitations',
                    async (
                        route,
                    ) => {
                        if (
                            route.request()
                                .method() ===
                            'POST'
                        ) {
                            await route.fulfill({
                                status:
                                    201,

                                contentType:
                                    'application/json',

                                body:
                                    JSON.stringify({
                                        invitation: {
                                            id:
                                                'invitation-1',

                                            workspaceId,

                                            email:
                                                'developer@example.com',

                                            role:
                                                'DEVELOPER',

                                            status:
                                                'PENDING',

                                            deliveryStatus:
                                                'NOT_REQUESTED',

                                            deliveryError:
                                                null,

                                            expiresAt:
                                                '2026-08-10T00:00:00.000Z',

                                            acceptedAt:
                                                null,

                                            declinedAt:
                                                null,

                                            revokedAt:
                                                null,

                                            lastSentAt:
                                                '2026-08-07T00:00:00.000Z',

                                            sendCount:
                                                1,

                                            createdAt:
                                                '2026-08-07T00:00:00.000Z',

                                            invitedBy: {
                                                id:
                                                    'user-1',

                                                name:
                                                    'Admin',

                                                email:
                                                    'admin@example.com',
                                            },

                                            acceptedBy:
                                                null,
                                        },

                                        invitationUrl:
                                            'http://localhost:3000/invitations/test-token',
                                    }),
                            });

                            return;
                        }

                        await route.fulfill({
                            status:
                                200,

                            contentType:
                                'application/json',

                            body:
                                JSON.stringify([]),
                        });
                    },
                );

                await page.route(
                    '**/notifications?*',
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
                                    items: [
                                        {
                                            id:
                                                'notification-1',

                                            workspaceId,

                                            applicationId:
                                                null,

                                            type:
                                                'HEALTH_INCIDENT_OPENED',

                                            priority:
                                                'CRITICAL',

                                            title:
                                                'Health incident opened',

                                            message:
                                                'Production API is down.',

                                            resourceType:
                                                'HEALTH_INCIDENT',

                                            resourceId:
                                                'incident-1',

                                            actionUrl:
                                                `/workspaces/${workspaceId}/monitoring`,

                                            readAt:
                                                null,

                                            expiresAt:
                                                null,

                                            createdAt:
                                                '2026-08-07T00:00:00.000Z',
                                        },
                                    ],

                                    pagination: {
                                        page: 1,
                                        limit: 20,
                                        total: 1,
                                        totalPages: 1,
                                    },
                                }),
                        });
                    },
                );
            },
        );

        test(
            'creates an invitation and shows the one-time link',
            async ({
                page,
            }) => {
                await page.goto(
                    `/workspaces/${workspaceId}/settings/members`,
                );

                await page
                    .getByLabel(
                        'Email',
                    )
                    .fill(
                        'developer@example.com',
                    );

                await page
                    .getByLabel(
                        'Role',
                    )
                    .selectOption(
                        'DEVELOPER',
                    );

                await page
                    .getByRole(
                        'button',
                        {
                            name:
                                'Send invitation',
                        },
                    )
                    .click();

                await expect(
                    page.getByText(
                        'Invitation created',
                    ),
                ).toBeVisible();

                await expect(
                    page.getByDisplayValue(
                        /invitations\/test-token/,
                    ),
                ).toBeVisible();
            },
        );

        test(
            'shows unread operational notifications',
            async ({
                page,
            }) => {
                await page.goto(
                    '/notifications',
                );

                await expect(
                    page.getByText(
                        'Health incident opened',
                    ),
                ).toBeVisible();

                await expect(
                    page.getByText(
                        'Production API is down.',
                    ),
                ).toBeVisible();
            },
        );
    },
);