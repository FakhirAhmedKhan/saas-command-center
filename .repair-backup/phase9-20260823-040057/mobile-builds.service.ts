import { PrismaService } from '../../../database/prisma.service';
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { MobileBuildSource, MobileBuildStatus, MobilePlatform } from 'src/generated/prisma/enums';

interface BuildInput {
  repositoryId?: unknown;
  workflowRunId?: unknown;
  commitSha?: unknown;
  headSha?: unknown;
  branch?: unknown;
  headBranch?: unknown;
  version?: unknown;
  buildNumber?: unknown;
  platform?: unknown;
  status?: unknown;
  conclusion?: unknown;
  startedAt?: unknown;
  completedAt?: unknown;
  durationMs?: unknown;
}

@Injectable()
export class MobileBuildsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(workspaceId: string, mobileAppId: string, query?: unknown) {
    await this.requireApp(workspaceId, mobileAppId);

    const filters = query && typeof query === 'object' ? (query as Record<string, unknown>) : {};

    return this.prisma.mobileBuild.findMany({
      where: {
        workspaceId,
        mobileAppId,
        ...(typeof filters.status === 'string'
          ? {
              status: filters.status as MobileBuildStatus,
            }
          : {}),
        ...(typeof filters.branch === 'string' ? { branch: filters.branch } : {}),
        ...(typeof filters.version === 'string' ? { version: filters.version } : {}),
        ...(typeof filters.platform === 'string'
          ? {
              platform: filters.platform as MobilePlatform,
            }
          : {}),
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findOne(workspaceId: string, mobileAppId: string, buildId: string) {
    const build = await this.prisma.mobileBuild.findFirst({
      where: {
        id: buildId,
        workspaceId,
        mobileAppId,
      },
    });

    if (!build) {
      throw new NotFoundException('Mobile build not found');
    }

    return build;
  }

  async getLatest(workspaceId: string, mobileAppId: string) {
    return this.prisma.mobileBuild.findFirst({
      where: {
        workspaceId,
        mobileAppId,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async ingestGithubBuild(workspaceId: string, mobileAppId: string, rawInput: unknown) {
    const app = await this.requireApp(workspaceId, mobileAppId);

    if (!rawInput || typeof rawInput !== 'object' || Array.isArray(rawInput)) {
      throw new BadRequestException('Invalid build payload');
    }

    const input = rawInput as BuildInput;

    const repositoryId = this.requiredString(input.repositoryId, 'repositoryId');

    const workflowRunId = this.requiredString(input.workflowRunId, 'workflowRunId');

    const commitSha = this.requiredString(input.commitSha ?? input.headSha, 'commitSha');

    const branch = this.requiredString(input.branch ?? input.headBranch, 'branch');

    const repository = await this.prisma.repositoryConnection.findFirst({
      where: {
        id: repositoryId,
        workspaceId,
        applicationId: app.applicationId,
      },
      select: {
        id: true,
      },
    });

    if (!repository) {
      return {
        ignored: true as const,
      };
    }

    const status = this.normalizeStatus(input.status, input.conclusion);

    const startedAt = this.optionalDate(input.startedAt);

    const completedAt = this.optionalDate(input.completedAt);

    const suppliedDurationMs = this.optionalNumber(input.durationMs);

    const durationMs = suppliedDurationMs ?? (startedAt && completedAt ? Math.max(0, completedAt.getTime() - startedAt.getTime()) : null);

    const build = await this.prisma.mobileBuild.upsert({
      where: {
        repositoryId_workflowRunId: {
          repositoryId,
          workflowRunId,
        },
      },
      create: {
        workspaceId,
        mobileAppId,
        repositoryId,
        workflowRunId,
        source: MobileBuildSource.GITHUB_ACTIONS,
        commitSha,
        branch,
        version: this.optionalString(input.version),
        buildNumber: this.optionalString(input.buildNumber),
        platform: this.normalizePlatform(input.platform, app.platform),
        status,
        startedAt,
        completedAt,
        durationMs,
      },
      update: {
        commitSha,
        branch,
        version: this.optionalString(input.version),
        buildNumber: this.optionalString(input.buildNumber),
        platform: this.normalizePlatform(input.platform, app.platform),
        status,
        startedAt,
        completedAt,
        durationMs,
      },
    });

    return {
      ignored: false as const,
      build,
    };
  }

  private async requireApp(workspaceId: string, mobileAppId: string) {
    const app = await this.prisma.mobileApplication.findFirst({
      where: {
        id: mobileAppId,
        application: {
          workspaceId,
          archivedAt: null,
        },
      },
      select: {
        id: true,
        applicationId: true,
        platform: true,
      },
    });

    if (!app) {
      throw new NotFoundException('Mobile application not found');
    }

    return app;
  }

  private requiredString(value: unknown, field: string): string {
    if (typeof value !== 'string' && typeof value !== 'number') {
      throw new BadRequestException(`${field} is required`);
    }

    const normalized = String(value).trim();

    if (!normalized) {
      throw new BadRequestException(`${field} is required`);
    }

    return normalized;
  }

  private optionalString(value: unknown): string | null {
    if (typeof value !== 'string' && typeof value !== 'number') {
      return null;
    }

    const normalized = String(value).trim();

    return normalized || null;
  }

  private optionalNumber(value: unknown): number | null {
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      return null;
    }

    return Math.round(value);
  }

  private optionalDate(value: unknown): Date | null {
    if (typeof value !== 'string' && !(value instanceof Date)) {
      return null;
    }

    const date = value instanceof Date ? value : new Date(value);

    return Number.isNaN(date.getTime()) ? null : date;
  }

  private normalizePlatform(value: unknown, fallback: MobilePlatform): MobilePlatform {
    if (value === MobilePlatform.ANDROID || value === MobilePlatform.IOS || value === MobilePlatform.CROSS_PLATFORM) {
      return value;
    }

    return fallback;
  }

  private normalizeStatus(status: unknown, conclusion: unknown): MobileBuildStatus {
    const normalized = typeof status === 'string' ? status.toLowerCase() : '';

    const result = typeof conclusion === 'string' ? conclusion.toLowerCase() : '';

    if (result === 'success' || normalized === 'success') {
      return MobileBuildStatus.SUCCESS;
    }

    if (result === 'cancelled' || normalized === 'cancelled') {
      return MobileBuildStatus.CANCELLED;
    }

    if (result === 'failure' || result === 'failed' || normalized === 'failure' || normalized === 'failed') {
      return MobileBuildStatus.FAILED;
    }

    if (normalized === 'in_progress' || normalized === 'building') {
      return MobileBuildStatus.BUILDING;
    }

    return MobileBuildStatus.QUEUED;
  }
}
