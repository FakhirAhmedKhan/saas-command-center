import type { INestApplication } from '@nestjs/common';
import { PrismaService } from 'src/database/prisma.service';
import type { DesktopAnalysisProvider } from 'src/modules/desktop-apps/analysis/desktop-analysis-provider.interface';
import { DesktopAnalysisService } from 'src/modules/desktop-apps/services/desktop-analysis.service';
import { createTestApp } from '../helpers/create-test-app';
import { resetDatabase } from '../helpers/database';
import { registerWorkspaceTestUser } from '../helpers/workspace';
import { API, createDesktopApp, createRepository } from './helpers/desktop-test-fixtures';

class FakeDesktopAnalysisProvider implements DesktopAnalysisProvider {
    calls: Array<{ system: string; prompt: string }> = [];

    async analyze(input: { system: string; prompt: string }) {
        this.calls.push(input);

        return [
            'Evidence:',
            '- A failed build is present in the supplied context.',
            '',
            'Correlation:',
            '- The build failure is correlated with the latest commit.',
            '',
            'Likely cause:',
            '- Test evidence should be inspected before assigning a root cause.',
            '',
            'Unknown cause:',
            '- The supplied evidence does not prove causation.',
        ].join('\n');
    }
}

function analysisPath(workspaceId: string, desktopAppId: string) {
    return `${API}/workspaces/${workspaceId}/desktop-apps/${desktopAppId}/analysis`;
}

describe('Desktop AI Analysis E2E', () => {
    let app: INestApplication;
    let prisma: PrismaService;
    let analysis: DesktopAnalysisService;
    let fake: FakeDesktopAnalysisProvider;

    beforeEach(async () => {
        process.env.NODE_ENV = 'test';
        app = await createTestApp();
        prisma = app.get(PrismaService);
        analysis = app.get(DesktopAnalysisService);
        fake = new FakeDesktopAnalysisProvider();
        analysis.setProviderForTesting(fake);
    });

    afterEach(async () => {
        await resetDatabase(prisma);
        await app.close();
    });

    it('runs deterministic build-failure analysis and stores evidence', async () => {
        const owner = await registerWorkspaceTestUser(app, prisma);
        const desktop = await createDesktopApp(owner);
        await createRepository(prisma, owner.workspaceId, desktop.applicationId);

        const response = await owner.agent
            .post(analysisPath(owner.workspaceId, desktop.id))
            .set('Authorization', `Bearer ${owner.accessToken}`)
            .send({
                action: 'BUILD_FAILURE',
                question: 'Why did the latest build fail?',
            })
            .expect(201);

        expect(response.body.answer).toContain('Evidence:');
        expect(response.body.answer).toContain('Correlation:');
        expect(response.body.answer).toContain('Likely cause:');
        expect(response.body.answer).toContain('Unknown cause:');
        expect(response.body.id).toEqual(expect.any(String));

        const stored = await prisma.desktopAiAnalysis.findUniqueOrThrow({
            where: { id: response.body.id as string },
        });

        expect(stored.workspaceId).toBe(owner.workspaceId);
        expect(stored.desktopAppId).toBe(desktop.id);
        expect(fake.calls).toHaveLength(1);
    });

    it('never sends telemetry credentials to the AI provider', async () => {
        const owner = await registerWorkspaceTestUser(app, prisma);
        const desktop = await createDesktopApp(owner);

        await prisma.desktopTelemetryIntegration.create({
            data: {
                workspaceId: owner.workspaceId,
                desktopAppId: desktop.id,
                provider: 'CUSTOM',
                status: 'CONNECTED',
                externalProjectId: `desktop-test-${desktop.id}`,
                secretCiphertext: 'SUPER_SECRET_CIPHERTEXT_DO_NOT_SEND',
                endpointUrl: 'https://telemetry.example.test',
                configuredAt: new Date(),
            },
        });

        await owner.agent
            .post(analysisPath(owner.workspaceId, desktop.id))
            .set('Authorization', `Bearer ${owner.accessToken}`)
            .send({ action: 'RELEASE_HEALTH' })
            .expect(201);

        const prompt = fake.calls[0]?.prompt ?? '';

        expect(prompt).not.toContain('SUPER_SECRET_CIPHERTEXT_DO_NOT_SEND');
        expect(prompt).not.toContain('secretCiphertext');
    });

    it('rejects an analysis resource id from another desktop app', async () => {
        const owner = await registerWorkspaceTestUser(app, prisma);
        const first = await createDesktopApp(owner);
        const second = await createDesktopApp(owner);

        const integration = await prisma.desktopTelemetryIntegration.create({
            data: {
                workspaceId: owner.workspaceId,
                desktopAppId: second.id,
                provider: 'CUSTOM',
                status: 'CONNECTED',
                externalProjectId: `foreign-crash-project-${Date.now()}`,
                endpointUrl: 'https://telemetry.example.test',
                secretCiphertext: 'encrypted-test-secret',
                configuredAt: new Date(),
            },
        });

        const crash = await prisma.desktopCrash.create({
            data: {
                workspaceId: owner.workspaceId,
                desktopAppId: second.id,
                telemetryIntegrationId: integration.id,
                externalId: `foreign-crash-${Date.now()}`,
                fingerprint: 'foreign-fingerprint',
                message: 'Foreign crash',
                count: 1,
                affectedUsers: 1,
                firstSeenAt: new Date(),
                lastSeenAt: new Date(),
            },
        });

        await owner.agent
            .post(analysisPath(owner.workspaceId, first.id))
            .set('Authorization', `Bearer ${owner.accessToken}`)
            .send({
                action: 'CRASH_INCREASE',
                crashId: crash.id,
            })
            .expect(404);
    });

    it('does not allow a viewer to invoke AI analysis', async () => {
        const owner = await registerWorkspaceTestUser(app, prisma);
        const viewer = await registerWorkspaceTestUser(app, prisma);
        const desktop = await createDesktopApp(owner);

        await prisma.workspaceMember.create({
            data: {
                workspaceId: owner.workspaceId,
                userId: viewer.userId,
                role: 'VIEWER',
            },
        });

        await viewer.agent
            .post(analysisPath(owner.workspaceId, desktop.id))
            .set('Authorization', `Bearer ${viewer.accessToken}`)
            .send({ action: 'CUSTOM', question: 'Analyze this app' })
            .expect(403);
    });

    it('converts provider failure to a safe 502 response', async () => {
        const owner = await registerWorkspaceTestUser(app, prisma);
        const desktop = await createDesktopApp(owner);

        analysis.setProviderForTesting({
            async analyze() {
                throw new Error('provider leaked internal detail');
            },
        });

        const response = await owner.agent
            .post(analysisPath(owner.workspaceId, desktop.id))
            .set('Authorization', `Bearer ${owner.accessToken}`)
            .send({ action: 'CUSTOM', question: 'What happened?' })
            .expect(502);

        expect(JSON.stringify(response.body)).not.toContain('provider leaked internal detail');
    });
});