import { PrismaService } from '../../../database/prisma.service';
import { Injectable, NotFoundException } from '@nestjs/common';
import { DesktopAppsService } from './desktop-apps.service';
import { DesktopSecretSanitizerService } from '../security/desktop-secret-sanitizer.service';

@Injectable()
export class DesktopAnalysisContextService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly desktopApps: DesktopAppsService,
    private readonly sanitizer: DesktopSecretSanitizerService,
  ) {}

  async build(
    workspaceId: string,
    desktopAppId: string,
    options: {
      buildId?: string;
      releaseId?: string;
      crashId?: string;
    } = {},
  ) {
    const app = await this.desktopApps.findOne(workspaceId, desktopAppId);

    const [repository, builds, releases, crashes, metrics, dependencies, security, alerts] = await Promise.all([
      this.prisma.repositoryConnection.findFirst({
        where: {
          workspaceId,
          applicationId: app.applicationId,
        },
        select: {
          id: true,
          fullName: true,
          defaultBranch: true,
          htmlUrl: true,
          lastSyncedAt: true,
        },
      }),

      this.prisma.desktopBuild.findMany({
        where: {
          workspaceId,
          desktopAppId,
          ...(options.buildId ? { id: options.buildId } : {}),
        },
        include: {
          artifacts: true,
          testRuns: {
            include: { failures: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: options.buildId ? 1 : 5,
      }),

      this.prisma.desktopRelease.findMany({
        where: {
          workspaceId,
          desktopAppId,
          ...(options.releaseId ? { id: options.releaseId } : {}),
        },
        orderBy: { createdAt: 'desc' },
        take: options.releaseId ? 1 : 5,
      }),

      this.prisma.desktopCrash.findMany({
        where: {
          workspaceId,
          desktopAppId,
          ...(options.crashId ? { id: options.crashId } : {}),
        },
        orderBy: { lastSeenAt: 'desc' },
        take: options.crashId ? 1 : 20,
      }),

      this.prisma.desktopMetric.findMany({
        where: { workspaceId, desktopAppId },
        select: {
          id: true,
          type: true,
          value: true,
          unit: true,
          version: true,
          platform: true,
          architecture: true,
          channel: true,
          recordedAt: true,
        },
        orderBy: { recordedAt: 'desc' },
        take: 100,
      }),

      this.prisma.desktopDependency.findMany({
        where: { workspaceId, desktopAppId },
        select: {
          id: true,
          ecosystem: true,
          manifestPath: true,
          name: true,
          currentVersion: true,
          latestVersion: true,
          direct: true,
          riskStatus: true,
          severity: true,
          advisoryIds: true,
        },
        orderBy: { updatedAt: 'desc' },
        take: 100,
      }),

      this.prisma.desktopSecurityFinding.findMany({
        where: { workspaceId, desktopAppId },
        select: {
          id: true,
          findingKey: true,
          type: true,
          status: true,
          severity: true,
          title: true,
          message: true,
          sourcePath: true,
          evidence: true,
        },
        orderBy: { updatedAt: 'desc' },
        take: 100,
      }),

      this.prisma.desktopAlertIncident.findMany({
        where: { workspaceId, desktopAppId },
        select: {
          id: true,
          status: true,
          title: true,
          message: true,
          actualValue: true,
          threshold: true,
          version: true,
          buildId: true,
          triggeredAt: true,
          resolvedAt: true,
        },
        orderBy: { triggeredAt: 'desc' },
        take: 20,
      }),
    ]);

    if (options.buildId && builds.length === 0) {
      throw new NotFoundException('Desktop build not found.');
    }

    if (options.releaseId && releases.length === 0) {
      throw new NotFoundException('Desktop release not found.');
    }

    if (options.crashId && crashes.length === 0) {
      throw new NotFoundException('Desktop crash not found.');
    }

    const context = {
      desktopApp: {
        id: app.id,
        name: app.application.name,
        platform: app.platform,
        framework: app.framework,
        architecture: app.architecture,
        packageName: app.packageName,
        currentVersion: app.currentVersion,
        currentBuildNumber: app.currentBuildNumber,
        updateChannel: app.updateChannel,
      },

      repository,

      // Commits/diffs are represented only by persisted authorized evidence here.
      // The build records contain branch + commitSha. If your repository module
      // already exposes commit/diff context helpers, merge their sanitized output
      // here rather than making direct GitHub calls from this service.
      builds: builds.map((build) => ({
        id: build.id,
        workflowRunId: build.workflowRunId,
        commitSha: build.commitSha,
        branch: build.branch,
        version: build.version,
        buildNumber: build.buildNumber,
        platform: build.platform,
        architecture: build.architecture,
        status: build.status,
        durationMs: build.durationMs,
        startedAt: build.startedAt,
        completedAt: build.completedAt,
        artifacts: build.artifacts.map((artifact) => ({
          id: artifact.id,
          type: artifact.type,
          fileName: artifact.fileName,
          platform: artifact.platform,
          architecture: artifact.architecture,
          sizeBytes: artifact.sizeBytes?.toString() ?? null,
          checksum: artifact.checksum,
          // externalUrl intentionally omitted from AI context.
        })),
        tests: build.testRuns.map((run) => ({
          id: run.id,
          type: run.type,
          status: run.status,
          passed: run.passed,
          failed: run.failed,
          skipped: run.skipped,
          durationMs: run.durationMs,
          failures: run.failures.slice(0, 20).map((failure) => ({
            suite: failure.suite,
            testName: failure.testName,
            message: failure.message,
            file: failure.file,
          })),
        })),
      })),

      releases: releases.map((release) => ({
        id: release.id,
        buildId: release.buildId,
        version: release.version,
        buildNumber: release.buildNumber,
        channel: release.channel,
        platform: release.platform,
        architecture: release.architecture,
        status: release.status,
        releaseNotes: release.releaseNotes,
        releasedAt: release.releasedAt,
      })),

      crashes: crashes.map((crash) => ({
        id: crash.id,
        fingerprint: crash.fingerprint,
        message: crash.message,
        count: crash.count,
        affectedUsers: crash.affectedUsers,
        version: crash.version,
        platform: crash.platform,
        architecture: crash.architecture,
        channel: crash.channel,
        firstSeenAt: crash.firstSeenAt,
        lastSeenAt: crash.lastSeenAt,
      })),

      performance: metrics,
      dependencies,
      securityFindings: security,
      alerts,
    };

    // CRITICAL: telemetry integration records are not selected at all above.
    // Therefore secretCiphertext/provider tokens cannot enter the prompt.
    return this.sanitizer.sanitize(context);
  }
}