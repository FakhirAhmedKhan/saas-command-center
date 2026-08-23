import type { INestApplication } from '@nestjs/common';
import { PrismaService } from 'src/database/prisma.service';
import {
  DesktopArchitecture,
  DesktopBuildSource,
  DesktopBuildStatus,
  DesktopPerformanceMetricType,
  DesktopPlatform,
  DesktopSecurityCheckStatus,
  DesktopSecurityCheckType,
  DesktopSecuritySeverity,
  DesktopTelemetryProvider,
  DesktopTelemetryIntegrationStatus,
} from 'src/generated/prisma/enums';
import { createTestApp } from '../helpers/create-test-app';
import { resetDatabase } from '../helpers/database';
import { API, createDesktopApp, createRepository } from './helpers/desktop-test-fixtures';
import { registerWorkspaceTestUser } from '../helpers/workspace';

function alertsPath(workspaceId: string, desktopAppId: string) {
  return `${API}/workspaces/${workspaceId}/desktop-apps/${desktopAppId}/alerts`;
}

async function createTelemetry(prisma: PrismaService, workspaceId: string, desktopAppId: string) {
  return prisma.desktopTelemetryIntegration.create({
    data: {
      workspaceId,
      desktopAppId,
      provider: DesktopTelemetryProvider.CUSTOM,
      status: DesktopTelemetryIntegrationStatus.CONNECTED,
      externalProjectId: `desktop-test-${desktopAppId}`,
      secretCiphertext: 'test-ciphertext',
      endpointUrl: 'https://telemetry.example.test',
      configuredAt: new Date(),
      lastSyncedAt: new Date(),
    },
  });
}

describe('Desktop Alerts E2E', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeEach(async () => {
    process.env.NODE_ENV = 'test';
    app = await createTestApp();
    prisma = app.get(PrismaService);
  });

  afterEach(async () => {
    await resetDatabase(prisma);
    await app.close();
  });

  it('does not create an incident below a crash-rate threshold', async () => {
    const owner = await registerWorkspaceTestUser(app, prisma);
    const desktop = await createDesktopApp(owner);
    const telemetry = await createTelemetry(prisma, owner.workspaceId, desktop.id);

    await owner.agent
      .post(`${alertsPath(owner.workspaceId, desktop.id)}/rules`)
      .set('Authorization', `Bearer ${owner.accessToken}`)
      .send({
        name: 'Crash rate > 2%',
        type: 'CRASH_RATE',
        threshold: 2,
        cooldownMinutes: 60,
        enabled: true,
      })
      .expect(201);

    await prisma.desktopMetric.create({
      data: {
        workspaceId: owner.workspaceId,
        desktopAppId: desktop.id,
        telemetryIntegrationId: telemetry.id,
        externalId: 'crash-free-users-1',
        type: DesktopPerformanceMetricType.CRASH_FREE_USERS_PERCENT,
        value: 99.5,
        unit: 'percent',
        platform: DesktopPlatform.WINDOWS,
        architecture: DesktopArchitecture.X64,
        recordedAt: new Date(),
      },
    });

    const response = await owner.agent
      .post(`${alertsPath(owner.workspaceId, desktop.id)}/evaluate`)
      .set('Authorization', `Bearer ${owner.accessToken}`)
      .send({})
      .expect(201);

    expect(response.body.triggered).toBe(0);
    expect(await prisma.desktopAlertIncident.count()).toBe(0);
  });

  it('creates one incident above threshold and does not spam duplicates', async () => {
    const owner = await registerWorkspaceTestUser(app, prisma);
    const desktop = await createDesktopApp(owner);
    const telemetry = await createTelemetry(prisma, owner.workspaceId, desktop.id);

    await owner.agent
      .post(`${alertsPath(owner.workspaceId, desktop.id)}/rules`)
      .set('Authorization', `Bearer ${owner.accessToken}`)
      .send({
        name: 'Crash rate > 2%',
        type: 'CRASH_RATE',
        threshold: 2,
        cooldownMinutes: 60,
        enabled: true,
      })
      .expect(201);

    await prisma.desktopMetric.create({
      data: {
        workspaceId: owner.workspaceId,
        desktopAppId: desktop.id,
        telemetryIntegrationId: telemetry.id,
        externalId: 'crash-free-users-2',
        type: DesktopPerformanceMetricType.CRASH_FREE_USERS_PERCENT,
        value: 95,
        unit: 'percent',
        recordedAt: new Date(),
      },
    });

    const first = await owner.agent
      .post(`${alertsPath(owner.workspaceId, desktop.id)}/evaluate`)
      .set('Authorization', `Bearer ${owner.accessToken}`)
      .send({})
      .expect(201);

    const second = await owner.agent
      .post(`${alertsPath(owner.workspaceId, desktop.id)}/evaluate`)
      .set('Authorization', `Bearer ${owner.accessToken}`)
      .send({})
      .expect(201);

    expect(first.body.triggered).toBe(1);
    expect(second.body.triggered).toBe(0);
    expect(await prisma.desktopAlertIncident.count()).toBe(1);
  });

  it('resolves an open incident after the metric recovers', async () => {
    const owner = await registerWorkspaceTestUser(app, prisma);
    const desktop = await createDesktopApp(owner);
    const telemetry = await createTelemetry(prisma, owner.workspaceId, desktop.id);

    await owner.agent
      .post(`${alertsPath(owner.workspaceId, desktop.id)}/rules`)
      .set('Authorization', `Bearer ${owner.accessToken}`)
      .send({
        name: 'CPU > 80%',
        type: 'CPU',
        threshold: 80,
        enabled: true,
      })
      .expect(201);

    await prisma.desktopMetric.create({
      data: {
        workspaceId: owner.workspaceId,
        desktopAppId: desktop.id,
        telemetryIntegrationId: telemetry.id,
        externalId: 'cpu-high',
        type: DesktopPerformanceMetricType.CPU_PERCENT,
        value: 92,
        unit: 'percent',
        recordedAt: new Date(Date.now() - 1000),
      },
    });

    await owner.agent
      .post(`${alertsPath(owner.workspaceId, desktop.id)}/evaluate`)
      .set('Authorization', `Bearer ${owner.accessToken}`)
      .send({})
      .expect(201);

    await prisma.desktopMetric.create({
      data: {
        workspaceId: owner.workspaceId,
        desktopAppId: desktop.id,
        telemetryIntegrationId: telemetry.id,
        externalId: 'cpu-recovered',
        type: DesktopPerformanceMetricType.CPU_PERCENT,
        value: 30,
        unit: 'percent',
        recordedAt: new Date(),
      },
    });

    const result = await owner.agent
      .post(`${alertsPath(owner.workspaceId, desktop.id)}/evaluate`)
      .set('Authorization', `Bearer ${owner.accessToken}`)
      .send({})
      .expect(201);

    expect(result.body.resolved).toBe(1);

    const incident = await prisma.desktopAlertIncident.findFirstOrThrow();
    expect(incident.status).toBe('RESOLVED');
    expect(incident.resolvedAt).not.toBeNull();
    expect(incident.activeKey).toBeNull();
  });

  it('does not evaluate a disabled rule', async () => {
    const owner = await registerWorkspaceTestUser(app, prisma);
    const desktop = await createDesktopApp(owner);
    const telemetry = await createTelemetry(prisma, owner.workspaceId, desktop.id);

    await owner.agent
      .post(`${alertsPath(owner.workspaceId, desktop.id)}/rules`)
      .set('Authorization', `Bearer ${owner.accessToken}`)
      .send({
        name: 'Memory > 100 MB',
        type: 'MEMORY',
        threshold: 100,
        enabled: false,
      })
      .expect(201);

    await prisma.desktopMetric.create({
      data: {
        workspaceId: owner.workspaceId,
        desktopAppId: desktop.id,
        telemetryIntegrationId: telemetry.id,
        externalId: 'memory-high',
        type: DesktopPerformanceMetricType.MEMORY_MB,
        value: 900,
        unit: 'MB',
        recordedAt: new Date(),
      },
    });

    const result = await owner.agent
      .post(`${alertsPath(owner.workspaceId, desktop.id)}/evaluate`)
      .set('Authorization', `Bearer ${owner.accessToken}`)
      .send({})
      .expect(201);

    expect(result.body.rulesEvaluated).toBe(0);
    expect(await prisma.desktopAlertIncident.count()).toBe(0);
  });

  it('creates a failed-build alert', async () => {
    const owner = await registerWorkspaceTestUser(app, prisma);
    const desktop = await createDesktopApp(owner);
    const repository = await createRepository(prisma, owner.workspaceId, desktop.applicationId);

    await owner.agent
      .post(`${alertsPath(owner.workspaceId, desktop.id)}/rules`)
      .set('Authorization', `Bearer ${owner.accessToken}`)
      .send({
        name: 'Build failed',
        type: 'BUILD_FAILED',
        enabled: true,
      })
      .expect(201);

    await prisma.desktopBuild.create({
      data: {
        workspaceId: owner.workspaceId,
        desktopAppId: desktop.id,
        repositoryId: repository.id,
        workflowRunId: `failed-${Date.now()}`,
        source: DesktopBuildSource.GITHUB_ACTIONS,
        commitSha: 'abcdef1234567890abcdef1234567890abcdef12',
        branch: 'main',
        platform: DesktopPlatform.WINDOWS,
        architecture: DesktopArchitecture.X64,
        status: DesktopBuildStatus.FAILED,
        startedAt: new Date(Date.now() - 60_000),
        completedAt: new Date(),
      },
    });

    const result = await owner.agent
      .post(`${alertsPath(owner.workspaceId, desktop.id)}/evaluate`)
      .set('Authorization', `Bearer ${owner.accessToken}`)
      .send({})
      .expect(201);

    expect(result.body.triggered).toBe(1);
    expect(
      await prisma.desktopAlertIncident.findFirst({
        where: { desktopAppId: desktop.id },
      }),
    ).toMatchObject({ status: 'OPEN' });
  });

  it('creates a signing-failure alert from Phase 14 security findings', async () => {
    const owner = await registerWorkspaceTestUser(app, prisma);
    const desktop = await createDesktopApp(owner);

    await owner.agent
      .post(`${alertsPath(owner.workspaceId, desktop.id)}/rules`)
      .set('Authorization', `Bearer ${owner.accessToken}`)
      .send({
        name: 'Signing failure',
        type: 'SIGNING_FAILURE',
        enabled: true,
      })
      .expect(201);

    await prisma.desktopSecurityFinding.create({
      data: {
        workspaceId: owner.workspaceId,
        desktopAppId: desktop.id,
        findingKey: 'windows-signing:test-fail',
        type: DesktopSecurityCheckType.WINDOWS_SIGNING,
        status: DesktopSecurityCheckStatus.FAIL,
        severity: DesktopSecuritySeverity.HIGH,
        title: 'Windows signing failed',
        message: 'The Windows signing check failed.',
        evidence: ['signtool returned non-zero'],
      },
    });

    const result = await owner.agent
      .post(`${alertsPath(owner.workspaceId, desktop.id)}/evaluate`)
      .set('Authorization', `Bearer ${owner.accessToken}`)
      .send({})
      .expect(201);

    expect(result.body.triggered).toBe(1);
  });

  it('prevents cross-workspace alert access', async () => {
    const workspaceA = await registerWorkspaceTestUser(app, prisma);
    const workspaceB = await registerWorkspaceTestUser(app, prisma);
    const desktopB = await createDesktopApp(workspaceB);

    await workspaceA.agent
      .get(`${alertsPath(workspaceB.workspaceId, desktopB.id)}/rules`)
      .set('Authorization', `Bearer ${workspaceA.accessToken}`)
      .expect(403);
  });
});