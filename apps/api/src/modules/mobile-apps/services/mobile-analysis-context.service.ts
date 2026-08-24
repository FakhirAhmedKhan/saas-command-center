import { MobileAppsService } from './mobile-apps.service';
import { MobilePerformanceQueryRepository } from './mobile-performance-query.repository';
import { PrismaService } from '../../../database/prisma.service';
import { Injectable } from '@nestjs/common';

@Injectable()
export class MobileAnalysisContextService {
  constructor(
    private readonly prisma: PrismaService,

    private readonly mobileApps: MobileAppsService,

    private readonly performance: MobilePerformanceQueryRepository,
  ) {}

  async build(
    workspaceId: string,
    mobileAppId: string,
    options: {
      buildId?: string;

      releaseId?: string;
    } = {},
  ) {
    const mobileApp = await this.mobileApps.findOne(workspaceId, mobileAppId);
    const [repository, builds, releases, metrics, alerts] = await Promise.all([
      this.prisma.repositoryConnection.findFirst({
        where: {
          workspaceId,

          applicationId: mobileApp.applicationId,
        },

        select: {
          id: true,
          fullName: true,
          defaultBranch: true,
        },
      }),

      this.prisma.mobileBuild.findMany({
        where: {
          workspaceId,
          mobileAppId,

          ...(options.buildId
            ? {
                id: options.buildId,
              }
            : {}),
        },

        include: {
          testRuns: {
            include: {
              failures: true,
            },
          },
        },

        orderBy: {
          createdAt: 'desc',
        },

        take: options.buildId ? 1 : 5,
      }),

      this.prisma.mobileRelease.findMany({
        where: {
          workspaceId,
          mobileAppId,

          ...(options.releaseId
            ? {
                id: options.releaseId,
              }
            : {}),
        },

        orderBy: {
          createdAt: 'desc',
        },

        take: options.releaseId ? 1 : 5,
      }),

      this.performance.find(workspaceId, mobileAppId, {}),

      this.prisma.mobileAlertIncident.findMany({
        where: {
          workspaceId,
          mobileAppId,
        },

        orderBy: {
          triggeredAt: 'desc',
        },

        take: 10,
      }),
    ]);

    /*
     * CRITICAL:
     *
     * Telemetry integration records and encryptedConfig
     * are deliberately never selected here.
     */

    return {
      mobileApp: {
        id: mobileApp.id,

        name: mobileApp.application.name,

        platform: mobileApp.platform,

        framework: mobileApp.framework,

        packageId: mobileApp.packageId,

        bundleId: mobileApp.bundleId,
      },

      repository,

      builds: builds.map((build) => ({
        id: build.id,

        buildNumber: build.buildNumber,

        workflowRunId: build.workflowRunId,

        commitSha: build.commitSha,

        branch: build.branch,

        version: build.version,

        status: build.status,

        tests: build.testRuns.map((run) => ({
          type: run.type,

          status: run.status,

          passed: run.passed,

          failed: run.failed,

          skipped: run.skipped,

          failures: run.failures.map((failure) => ({
            suite: failure.suite,

            testName: failure.testName,

            message: failure.message,

            file: failure.file,
          })),
        })),
      })),

      releases: releases.map((release) => ({
        id: release.id,

        version: release.version,

        buildNumber: release.buildNumber,

        environment: release.environment,

        status: release.status,

        commitSha: release.commitSha,

        releasedAt: release.releasedAt,
      })),

      performance: metrics.slice(-100),

      alerts: alerts.map((incident) => ({
        id: incident.id,

        status: incident.status,

        title: incident.title,

        message: incident.message,

        version: incident.version,

        triggeredAt: incident.triggeredAt,
      })),
    };
  }
}
