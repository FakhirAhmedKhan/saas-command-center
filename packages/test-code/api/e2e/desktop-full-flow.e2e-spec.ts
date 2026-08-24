import type { INestApplication } from '@nestjs/common';
import { PrismaService } from 'src/database/prisma.service';
import type { DesktopAnalysisProvider } from 'src/modules/desktop-apps/analysis/desktop-analysis-provider.interface';
import { DesktopAnalysisService } from 'src/modules/desktop-apps/services/desktop-analysis.service';
import {
  DesktopArchitecture,
  DesktopBuildArtifactType,
  DesktopPerformanceMetricType,
  DesktopPlatform,
  DesktopReleaseChannel,
  DesktopReleaseStatus,
  DesktopSecurityCheckStatus,
  DesktopSecurityCheckType,
  DesktopSecuritySeverity,
  DesktopTelemetryIntegrationStatus,
  DesktopTelemetryProvider,
  DesktopTestStatus,
  DesktopTestType,
} from 'src/generated/prisma/enums';
import { createTestApp } from '../helpers/create-test-app';
import { resetDatabase } from '../helpers/database';
import { registerWorkspaceTestUser } from '../helpers/workspace';
import { API, createDesktopApp, createRepository, ingestSuccessfulBuild } from './helpers/desktop-test-fixtures';

class FinalDesktopAiProvider implements DesktopAnalysisProvider {
  async analyze() {
    return [
      'Evidence:',
      '- Build, release, runtime, security, and alert evidence is available.',
      '',
      'Correlation:',
      '- Startup degradation correlates with the current release.',
      '',
      'Likely cause:',
      '- The evidence supports investigating the release-specific startup path.',
      '',
      'Unknown cause:',
      '- A definitive root cause is not proven by correlation alone.',
    ].join('\n');
  }
}

function base(workspaceId: string, desktopAppId: string) {
  return `${API}/workspaces/${workspaceId}/desktop-apps/${desktopAppId}`;
}

describe('Desktop Phase 18 full flow E2E', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeEach(async () => {
    process.env.NODE_ENV = 'test';
    app = await createTestApp();
    prisma = app.get(PrismaService);
    app.get(DesktopAnalysisService).setProviderForTesting(new FinalDesktopAiProvider());
  });

  afterEach(async () => {
    await resetDatabase(prisma);
    await app.close();
  });

  it('runs an Electron desktop engineering lifecycle from app to alert and AI analysis', async () => {
    const owner = await registerWorkspaceTestUser(app, prisma);
    const desktop = await createDesktopApp(owner, {
      name: 'Electron Final Flow',
      platform: 'CROSS_PLATFORM',
      framework: 'ELECTRON',
      architecture: 'X64',
      currentVersion: '3.0.0',
      currentBuildNumber: '300',
    });

    const repository = await createRepository(prisma, owner.workspaceId, desktop.applicationId);

    const build = await ingestSuccessfulBuild(owner, desktop.id, repository.id, 'desktop-final-electron');

    const artifact = await prisma.desktopBuildArtifact.create({
      data: {
        buildId: build.id,
        providerArtifactId: 'artifact-final-electron',
        platform: DesktopPlatform.WINDOWS,
        architecture: DesktopArchitecture.X64,
        type: DesktopBuildArtifactType.MSI,
        fileName: 'command-center-3.0.0-x64.msi',
        sizeBytes: BigInt(88_000_000),
        checksum: 'sha256:desktop-final',
        externalUrl: 'https://artifacts.example.test/command-center.msi',
      },
    });

    const testRun = await prisma.desktopTestRun.create({
      data: {
        buildId: build.id,
        type: DesktopTestType.E2E,
        status: DesktopTestStatus.PASSED,
        passed: 42,
        failed: 0,
        skipped: 1,
        total: 43,
        durationMs: 120_000,
        startedAt: new Date(Date.now() - 120_000),
        completedAt: new Date(),
      },
    });

    const release = await prisma.desktopRelease.create({
      data: {
        workspaceId: owner.workspaceId,
        desktopAppId: desktop.id,
        buildId: build.id,
        version: '3.0.0',
        buildNumber: '300',
        channel: DesktopReleaseChannel.STABLE,
        platform: DesktopPlatform.WINDOWS,
        architecture: DesktopArchitecture.X64,
        status: DesktopReleaseStatus.PUBLISHED,
        releaseNotes: 'Desktop final verification release.',
        releasedAt: new Date(),
      },
    });

    const integration = await prisma.desktopTelemetryIntegration.create({
      data: {
        workspaceId: owner.workspaceId,
        desktopAppId: desktop.id,
        provider: DesktopTelemetryProvider.CUSTOM,
        status: DesktopTelemetryIntegrationStatus.CONNECTED,
        externalProjectId: 'desktop-final-project',
        endpointUrl: 'https://telemetry.example.test',
        secretCiphertext: 'encrypted-not-plaintext',
        configuredAt: new Date(),
        lastSyncedAt: new Date(),
      },
    });

    await prisma.desktopMetric.createMany({
      data: [
        {
          workspaceId: owner.workspaceId,
          desktopAppId: desktop.id,
          telemetryIntegrationId: integration.id,
          externalId: 'startup-final',
          type: DesktopPerformanceMetricType.STARTUP_MS,
          value: 1850,
          unit: 'ms',
          version: '3.0.0',
          platform: DesktopPlatform.WINDOWS,
          architecture: DesktopArchitecture.X64,
          channel: DesktopReleaseChannel.STABLE,
          recordedAt: new Date(),
        },
        {
          workspaceId: owner.workspaceId,
          desktopAppId: desktop.id,
          telemetryIntegrationId: integration.id,
          externalId: 'crash-free-final',
          type: DesktopPerformanceMetricType.CRASH_FREE_USERS_PERCENT,
          value: 99.7,
          unit: 'percent',
          version: '3.0.0',
          platform: DesktopPlatform.WINDOWS,
          architecture: DesktopArchitecture.X64,
          channel: DesktopReleaseChannel.STABLE,
          recordedAt: new Date(),
        },
      ],
    });

    const crash = await prisma.desktopCrash.create({
      data: {
        workspaceId: owner.workspaceId,
        desktopAppId: desktop.id,
        telemetryIntegrationId: integration.id,
        externalId: 'crash-final',
        fingerprint: 'main-window:create:final',
        message: 'Renderer startup exception',
        count: 3,
        affectedUsers: 2,
        version: '3.0.0',
        platform: DesktopPlatform.WINDOWS,
        architecture: DesktopArchitecture.X64,
        channel: DesktopReleaseChannel.STABLE,
        firstSeenAt: new Date(Date.now() - 30_000),
        lastSeenAt: new Date(),
      },
    });

    await prisma.desktopSecurityFinding.create({
      data: {
        workspaceId: owner.workspaceId,
        desktopAppId: desktop.id,
        findingKey: 'final:windows-signing',
        type: DesktopSecurityCheckType.WINDOWS_SIGNING,
        status: DesktopSecurityCheckStatus.PASS,
        severity: DesktopSecuritySeverity.INFO,
        title: 'Windows signing configuration',
        message: 'Signing evidence is present.',
        sourcePath: 'electron-builder.yml',
        evidence: ['electron-builder.yml'],
      },
    });

    const rule = await owner.agent
      .post(`${base(owner.workspaceId, desktop.id)}/alerts/rules`)
      .set('Authorization', `Bearer ${owner.accessToken}`)
      .send({
        name: 'Startup above 1500 ms',
        type: 'STARTUP',
        threshold: 1500,
        cooldownMinutes: 60,
        enabled: true,
      })
      .expect(201);

    const evaluation = await owner.agent
      .post(`${base(owner.workspaceId, desktop.id)}/alerts/evaluate`)
      .set('Authorization', `Bearer ${owner.accessToken}`)
      .send({})
      .expect(201);

    expect(evaluation.body.triggered).toBe(1);

    const incidents = await owner.agent
      .get(`${base(owner.workspaceId, desktop.id)}/alerts/incidents`)
      .set('Authorization', `Bearer ${owner.accessToken}`)
      .expect(200);

    expect(incidents.body).toHaveLength(1);
    expect(incidents.body[0]).toMatchObject({
      ruleId: rule.body.id,
      status: 'OPEN',
    });

    const ai = await owner.agent
      .post(`${base(owner.workspaceId, desktop.id)}/analysis`)
      .set('Authorization', `Bearer ${owner.accessToken}`)
      .send({
        action: 'RELEASE_HEALTH',
        releaseId: release.id,
        crashId: crash.id,
        question: 'Is this Electron release healthy?',
      })
      .expect(201);

    expect(ai.body.answer).toContain('Evidence:');
    expect(ai.body.answer).toContain('Correlation:');
    expect(ai.body.answer).toContain('Likely cause:');
    expect(ai.body.answer).toContain('Unknown cause:');

    const persisted = await prisma.desktopApplication.findFirstOrThrow({
      where: {
        id: desktop.id,
        application: { workspaceId: owner.workspaceId },
      },
      include: {
        builds: {
          include: {
            artifacts: true,
            testRuns: true,
            releases: true,
          },
        },
        metrics: true,
        crashes: true,
        securityFindings: true,
        alertRules: true,
        alertIncidents: true,
        aiAnalyses: true,
      },
    });

    expect(persisted.builds[0]?.artifacts.some((item) => item.id === artifact.id)).toBe(true);
    expect(persisted.builds[0]?.testRuns.some((item) => item.id === testRun.id)).toBe(true);
    expect(persisted.builds[0]?.releases.some((item) => item.id === release.id)).toBe(true);
    expect(persisted.metrics.length).toBeGreaterThan(0);
    expect(persisted.crashes.length).toBe(1);
    expect(persisted.alertIncidents.length).toBe(1);
    expect(persisted.aiAnalyses.length).toBe(1);
  });

  it.each([
    ['TAURI', 'WINDOWS', 'X64'],
    ['DOTNET', 'WINDOWS', 'X64'],
    ['NATIVE_MACOS', 'MACOS', 'ARM64'],
  ] as const)('creates and reads %s desktop metadata without breaking workspace isolation', async (framework, platform, architecture) => {
    const owner = await registerWorkspaceTestUser(app, prisma);
    const desktop = await createDesktopApp(owner, {
      name: `${framework} Final`,
      framework,
      platform,
      architecture,
      packageName: `com.commandcenter.${framework.toLowerCase()}.final`,
    });

    const response = await owner.agent
      .get(`${API}/workspaces/${owner.workspaceId}/desktop-apps/${desktop.id}`)
      .set('Authorization', `Bearer ${owner.accessToken}`)
      .expect(200);

    expect(response.body.framework).toBe(framework);
    expect(response.body.platform).toBe(platform);
    expect(response.body.architecture).toBe(architecture);
  });
});
