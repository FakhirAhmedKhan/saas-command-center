import {
    authorizedApiRequest,
    loginThroughUi,
    uniqueValue,
} from './fixtures/helpers';
import {
    readFullStackState,
    type FullStackState,
} from './fixtures/state';
import {
    expect,
    test,
    type APIRequestContext,
} from '@playwright/test';

let state: FullStackState;

test.describe.configure({ mode: 'serial' });

async function createDesktopApp(request: APIRequestContext) {
    const response = await authorizedApiRequest(
        request,
        state,
        state.owner.accessToken,
        `/workspaces/${state.owner.workspaceId}/desktop-apps`,
        {
            method: 'POST',
            data: {
                name: uniqueValue('Runtime Desktop', state.runId),
                platform: 'CROSS_PLATFORM',
                framework: 'ELECTRON',
                architecture: 'X64',
                packageName: `com.commandcenter.runtime.${Date.now()}`,
                currentVersion: '2.4.0',
                currentBuildNumber: '184',
            },
        },
    );

    expect(response.status()).toBe(201);
    return (await response.json()) as {
        id: string;
        applicationId: string;
        application: { name: string };
    };
}

test.describe('Desktop phases 12-14 UI', () => {
    test.beforeAll(() => {
        state = readFullStackState();
    });

    test('configures telemetry and renders runtime/security health', async ({
        page,
        request,
    }) => {
        await loginThroughUi(page, state.owner);
        const desktopApp = await createDesktopApp(request);

        const workspaceId = state.owner.workspaceId;
        const root =
            `/workspaces/${workspaceId}/desktop-apps/${desktopApp.id}`;
        const apiRoot = `/api/v1${root}`;

        let integrations: Array<Record<string, unknown>> = [];

        const snapshot = {
            performance: [
                {
                    externalId: 'startup-1',
                    type: 'STARTUP_MS',
                    value: 1800,
                    unit: 'ms',
                    recordedAt: '2026-08-23T00:00:00.000Z',
                    version: '2.4.0',
                    platform: 'WINDOWS',
                    architecture: 'X64',
                    channel: 'STABLE',
                },
            ],
            crashes: [
                {
                    externalId: 'crash-1',
                    fingerprint: 'renderer-crash',
                    message: 'Renderer process exited unexpectedly',
                    count: 12,
                    affectedUsers: 8,
                    firstSeenAt: '2026-08-22T00:00:00.000Z',
                    lastSeenAt: '2026-08-23T00:00:00.000Z',
                    version: '2.4.0',
                    platform: 'WINDOWS',
                    architecture: 'X64',
                    channel: 'STABLE',
                },
            ],
            versions: [{ version: '2.4.0', users: 120, sessions: 440 }],
        };

        await page.route(`**${apiRoot}/telemetry`, async (route) => {
            const method = route.request().method();

            if (method === 'GET') {
                await route.fulfill({
                    status: 200,
                    contentType: 'application/json',
                    body: JSON.stringify(integrations),
                });
                return;
            }

            if (method === 'POST') {
                const body = route.request().postDataJSON() as {
                    provider: string;
                    externalProjectId: string;
                    endpointUrl: string;
                    secret: string;
                };

                integrations = [
                    {
                        id: '11111111-1111-4111-8111-111111111111',
                        workspaceId,
                        desktopAppId: desktopApp.id,
                        provider: body.provider,
                        status: 'CONNECTED',
                        externalProjectId: body.externalProjectId,
                        endpointUrl: body.endpointUrl,
                        configuredAt: '2026-08-23T00:00:00.000Z',
                        lastSyncedAt: null,
                        lastError: null,
                        createdAt: '2026-08-23T00:00:00.000Z',
                        updatedAt: '2026-08-23T00:00:00.000Z',
                        hasSecret: true,
                    },
                ];

                await route.fulfill({
                    status: 201,
                    contentType: 'application/json',
                    body: JSON.stringify(integrations[0]),
                });
                return;
            }

            await route.continue();
        });

        await page.route(`**${apiRoot}/telemetry/*/preview`, async (route) => {
            await route.fulfill({
                status: 201,
                contentType: 'application/json',
                body: JSON.stringify(snapshot),
            });
        });

        await page.route(`**${apiRoot}/telemetry/*/sync`, async (route) => {
            integrations = integrations.map((item) => ({
                ...item,
                lastSyncedAt: '2026-08-23T00:05:00.000Z',
            }));

            await route.fulfill({
                status: 201,
                contentType: 'application/json',
                body: JSON.stringify({
                    integration: integrations[0],
                    performanceInserted: 4,
                    performanceUpdated: 0,
                    crashesUpserted: 1,
                    versionsSeen: 1,
                }),
            });
        });

        await page.route(`**${apiRoot}/telemetry/*`, async (route) => {
            if (route.request().method() === 'DELETE') {
                integrations = integrations.map((item) => ({
                    ...item,
                    status: 'DISCONNECTED',
                    hasSecret: false,
                }));
                await route.fulfill({
                    status: 200,
                    contentType: 'application/json',
                    body: JSON.stringify({ success: true }),
                });
                return;
            }

            await route.continue();
        });

        await page.route(`**${apiRoot}/performance**`, async (route) => {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    summary: {
                        crashFreeUsersPercent: 99.7,
                        crashFreeSessionsPercent: 99.5,
                        startupMs: 1800,
                        memoryMb: 242,
                        cpuPercent: 4.8,
                        hangRatePercent: 0.2,
                        networkLatencyMs: 120,
                        apiFailureRatePercent: 0.4,
                        versionAdoptionPercent: 76,
                        sampleCount: 9,
                        from: null,
                        to: null,
                    },
                    metrics: [],
                }),
            });
        });

        await page.route(`**${apiRoot}/crashes**`, async (route) => {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify([
                    {
                        id: '22222222-2222-4222-8222-222222222222',
                        workspaceId,
                        desktopAppId: desktopApp.id,
                        telemetryIntegrationId:
                            '11111111-1111-4111-8111-111111111111',
                        ...snapshot.crashes[0],
                        createdAt: '2026-08-22T00:00:00.000Z',
                        updatedAt: '2026-08-23T00:00:00.000Z',
                    },
                ]),
            });
        });

        const dependency = {
            id: '33333333-3333-4333-8333-333333333333',
            workspaceId,
            desktopAppId: desktopApp.id,
            ecosystem: 'NPM',
            manifestPath: 'package.json',
            name: 'electron',
            currentVersion: '31.2.0',
            latestVersion: null,
            direct: true,
            riskStatus: 'VULNERABLE',
            severity: 'HIGH',
            advisoryIds: ['GHSA-example'],
            createdAt: '2026-08-23T00:00:00.000Z',
            updatedAt: '2026-08-23T00:00:00.000Z',
        };

        let dependencies: Array<typeof dependency> = [];

        await page.route(`**${apiRoot}/dependencies`, async (route) => {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify(dependencies),
            });
        });

        await page.route(`**${apiRoot}/dependencies/scan`, async (route) => {
            dependencies = [dependency];
            await route.fulfill({
                status: 201,
                contentType: 'application/json',
                body: JSON.stringify(dependencies),
            });
        });

        const security = {
            windowsSigning: 'PASS',
            macosSigning: 'PASS',
            notarization: 'PASS',
            criticalRisks: 0,
            highRisks: 1,
            findings: [
                {
                    id: '44444444-4444-4444-8444-444444444444',
                    workspaceId,
                    desktopAppId: desktopApp.id,
                    findingKey: 'dependency:package.json:electron',
                    type: 'DEPENDENCY_VULNERABILITY',
                    status: 'FAIL',
                    severity: 'HIGH',
                    title: 'Vulnerable dependency: electron',
                    message: 'Repository vulnerability evidence detected.',
                    sourcePath: 'package.json',
                    evidence: ['GHSA-example'],
                    createdAt: '2026-08-23T00:00:00.000Z',
                    updatedAt: '2026-08-23T00:00:00.000Z',
                },
            ],
        };

        await page.route(`**${apiRoot}/security`, async (route) => {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify(security),
            });
        });

        await page.route(`**${apiRoot}/security/scan`, async (route) => {
            await route.fulfill({
                status: 201,
                contentType: 'application/json',
                body: JSON.stringify(security),
            });
        });

        // Phase 12: telemetry settings.
        await page.goto(`${root}/settings`);
        await expect(
            page.getByRole('heading', { name: 'Runtime Monitoring' }),
        ).toBeVisible();

        await page
            .getByLabel('External project ID')
            .fill('command-center/runtime-desktop');
        await page
            .getByLabel('Telemetry endpoint URL')
            .fill('https://telemetry.example.com/snapshot');
        await page
            .getByLabel('Telemetry provider secret')
            .fill('provider-secret-never-render');
        await page
            .getByRole('button', { name: 'Connect Provider' })
            .click();

        await expect(page.getByText('command-center/runtime-desktop')).toBeVisible();
        expect(await page.locator('body').innerText()).not.toContain(
            'provider-secret-never-render',
        );

        await page.getByRole('button', { name: 'Preview' }).click();
        await expect(page.getByText('Normalized Preview')).toBeVisible();
        await expect(page.getByText('1', { exact: true }).first()).toBeVisible();

        await page.getByRole('button', { name: 'Sync Now' }).click();

        // Phase 13: performance.
        await page.goto(`${root}/performance`);
        await expect(page.getByText('99.7%')).toBeVisible();
        await expect(page.getByText('1.80s')).toBeVisible();
        await expect(page.getByText('242.0 MB')).toBeVisible();

        // Phase 13: crashes.
        await page.goto(`${root}/crashes`);
        await expect(
            page.getByText('Renderer process exited unexpectedly'),
        ).toBeVisible();
        await expect(page.getByText('12 events')).toBeVisible();
        await expect(page.getByText('8 users')).toBeVisible();

        // Phase 14: dependencies.
        await page.goto(`${root}/dependencies`);
        await expect(
            page.getByText('No dependency inventory yet. Run a repository scan.'),
        ).toBeVisible();
        await page.getByRole('button', { name: 'Scan Repository' }).click();
        await expect(page.getByText('electron')).toBeVisible();
        await expect(page.getByText('VULNERABLE')).toBeVisible();

        // Phase 14: security.
        await page.goto(`${root}/security`);
        await expect(page.getByText('Vulnerable dependency: electron')).toBeVisible();
        await expect(page.getByText('Windows signing')).toBeVisible();
        await page.getByRole('button', { name: 'Run Security Scan' }).click();
        await expect(page.getByText('Vulnerable dependency: electron')).toBeVisible();

        // Deep refresh must keep all routes valid.
        await page.reload();
        await expect(page.getByText('Security Health')).toBeVisible();
    });
});