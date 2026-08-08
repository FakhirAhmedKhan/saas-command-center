import type {
    INestApplication,
} from '@nestjs/common';

import request from 'supertest';

import {
    createTestApplication,
} from './helpers/create-test-application';

describe(
    'Analytics processing reliability',
    () => {
        let app:
            INestApplication;

        beforeAll(
            async () => {
                const testApplication =
                    await createTestApplication();

                app =
                    testApplication.app;
            },
        );

        afterAll(
            async () => {
                await app.close();
            },
        );

        it(
            'returns processing status',
            async () => {
                const response =
                    await request(
                        app.getHttpServer(),
                    )
                        .get(
                            `/api/v1/workspaces/${workspaceId}/websites/${websiteId}/analytics/processing/status`,
                        )
                        .set(
                            'Authorization',
                            `Bearer ${adminAccessToken}`,
                        )
                        .expect(
                            200,
                        );

                expect(
                    response.body,
                ).toEqual(
                    expect.objectContaining({
                        canReprocess:
                            true,

                        pendingEvents:
                            expect.any(
                                Number,
                            ),

                        unresolvedDeadLetters:
                            expect.any(
                                Number,
                            ),

                        recentRuns:
                            expect.any(
                                Array,
                            ),
                    }),
                );
            },
        );

        it(
            'allows an admin to queue reprocessing',
            async () => {
                await request(
                    app.getHttpServer(),
                )
                    .post(
                        `/api/v1/workspaces/${workspaceId}/websites/${websiteId}/analytics/processing/reprocess`,
                    )
                    .set(
                        'Authorization',
                        `Bearer ${adminAccessToken}`,
                    )
                    .send({
                        from:
                            '2026-08-01T00:00:00.000Z',

                        to:
                            '2026-08-08T00:00:00.000Z',
                    })
                    .expect(
                        201,
                    );
            },
        );

        it(
            'blocks viewer reprocessing',
            async () => {
                await request(
                    app.getHttpServer(),
                )
                    .post(
                        `/api/v1/workspaces/${workspaceId}/websites/${websiteId}/analytics/processing/reprocess`,
                    )
                    .set(
                        'Authorization',
                        `Bearer ${viewerAccessToken}`,
                    )
                    .send({
                        from:
                            '2026-08-01T00:00:00.000Z',

                        to:
                            '2026-08-08T00:00:00.000Z',
                    })
                    .expect(
                        403,
                    );
            },
        );

        it(
            'rejects excessive ranges',
            async () => {
                await request(
                    app.getHttpServer(),
                )
                    .post(
                        `/api/v1/workspaces/${workspaceId}/websites/${websiteId}/analytics/processing/reprocess`,
                    )
                    .set(
                        'Authorization',
                        `Bearer ${adminAccessToken}`,
                    )
                    .send({
                        from:
                            '2026-01-01T00:00:00.000Z',

                        to:
                            '2026-08-01T00:00:00.000Z',
                    })
                    .expect(
                        400,
                    );
            },
        );
    },
);