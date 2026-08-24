import { DesktopBuildsService } from './desktop-builds.service';
import { PrismaService } from '../../../database/prisma.service';
import { IngestDesktopTestRunDto } from '../dto/desktop-test.dto';
import { Injectable } from '@nestjs/common';

@Injectable()
export class DesktopTestsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly builds: DesktopBuildsService,
  ) {}

  async listForBuild(workspaceId: string, desktopAppId: string, buildId: string) {
    await this.builds.findOne(workspaceId, desktopAppId, buildId);

    return this.prisma.desktopTestRun.findMany({
      where: {
        buildId,
      },
      include: {
        failures: {
          orderBy: {
            createdAt: 'asc',
          },
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    });
  }

  async listForApp(workspaceId: string, desktopAppId: string) {
    await this.builds.getLatest(workspaceId, desktopAppId);

    return this.prisma.desktopTestRun.findMany({
      where: {
        build: {
          workspaceId,
          desktopAppId,
        },
      },
      include: {
        build: {
          select: {
            id: true,
            version: true,
            buildNumber: true,
            platform: true,
            architecture: true,
            branch: true,
            commitSha: true,
            createdAt: true,
          },
        },
        failures: {
          orderBy: {
            createdAt: 'asc',
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 100,
    });
  }

  async ingest(workspaceId: string, desktopAppId: string, buildId: string, dto: IngestDesktopTestRunDto) {
    await this.builds.findOne(workspaceId, desktopAppId, buildId);

    const passed = dto.passed;
    const failed = dto.failed;
    const skipped = dto.skipped;
    const total = passed + failed + skipped;

    return this.prisma.$transaction(async (transaction) => {
      const testRun = await transaction.desktopTestRun.upsert({
        where: {
          buildId_type: {
            buildId,
            type: dto.type,
          },
        },
        create: {
          buildId,
          type: dto.type,
          status: dto.status,
          passed,
          failed,
          skipped,
          total,
          durationMs: dto.durationMs ?? null,
          startedAt: dto.startedAt ? new Date(dto.startedAt) : null,
          completedAt: dto.completedAt ? new Date(dto.completedAt) : null,
        },
        update: {
          status: dto.status,
          passed,
          failed,
          skipped,
          total,
          durationMs: dto.durationMs ?? null,
          startedAt: dto.startedAt ? new Date(dto.startedAt) : null,
          completedAt: dto.completedAt ? new Date(dto.completedAt) : null,
        },
      });

      await transaction.desktopTestFailure.deleteMany({
        where: {
          testRunId: testRun.id,
        },
      });

      if (dto.failures?.length) {
        await transaction.desktopTestFailure.createMany({
          data: dto.failures.map((failure) => ({
            testRunId: testRun.id,
            suite: failure.suite?.trim() || null,
            testName: failure.testName?.trim() || null,
            message: failure.message?.trim() || null,
            file: failure.file?.trim() || null,
            line: failure.line ?? null,
            stackTrace: failure.stackTrace?.trim() || null,
          })),
        });
      }

      return transaction.desktopTestRun.findUniqueOrThrow({
        where: {
          id: testRun.id,
        },
        include: {
          failures: {
            orderBy: {
              createdAt: 'asc',
            },
          },
        },
      });
    });
  }

  async summary(workspaceId: string, desktopAppId: string) {
    await this.builds.getLatest(workspaceId, desktopAppId);

    const runs = await this.prisma.desktopTestRun.findMany({
      where: {
        build: {
          workspaceId,
          desktopAppId,
        },
      },
      select: {
        status: true,
        passed: true,
        failed: true,
        skipped: true,
      },
    });

    return {
      totalRuns: runs.length,
      passedRuns: runs.filter((run) => run.status === 'PASSED').length,
      failedRuns: runs.filter((run) => run.status === 'FAILED').length,
      passedTests: runs.reduce((total, run) => total + run.passed, 0),
      failedTests: runs.reduce((total, run) => total + run.failed, 0),
      skippedTests: runs.reduce((total, run) => total + run.skipped, 0),
    };
  }
}
