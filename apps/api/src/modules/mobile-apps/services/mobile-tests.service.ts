import { MobileAppsService } from './mobile-apps.service';
import { PrismaService } from '../../../database/prisma.service';
import { IngestMobileTestRunDto } from '../dto/mobile-test.dto';
import { Injectable, NotFoundException } from '@nestjs/common';

@Injectable()
export class MobileTestsService {
  constructor(
    private readonly prisma: PrismaService,

    private readonly mobileApps: MobileAppsService,
  ) {}

  async ingest(workspaceId: string, mobileAppId: string, buildId: string, dto: IngestMobileTestRunDto) {
    await this.requireBuild(workspaceId, mobileAppId, buildId);

    return this.prisma.$transaction(async (transaction) => {
      /*
       * buildId + type is unique.
       *
       * A retry updates the same test run instead of
       * creating duplicate CI results.
       */
      const testRun = await transaction.mobileTestRun.upsert({
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

          passed: dto.passed,

          failed: dto.failed,

          skipped: dto.skipped,

          durationMs: dto.durationMs ?? null,
        },

        update: {
          status: dto.status,

          passed: dto.passed,

          failed: dto.failed,

          skipped: dto.skipped,

          durationMs: dto.durationMs ?? null,
        },
      });

      /*
       * Failure list represents the latest CI result.
       * Delete previous rows before replacing them.
       */
      await transaction.mobileTestFailure.deleteMany({
        where: {
          testRunId: testRun.id,
        },
      });

      if (dto.failures?.length) {
        await transaction.mobileTestFailure.createMany({
          data: dto.failures.map((failure) => ({
            testRunId: testRun.id,

            suite: this.optional(failure.suite),

            testName: failure.testName.trim(),

            message: this.optional(failure.message),

            file: this.optional(failure.file),
          })),
        });
      }

      return transaction.mobileTestRun.findUniqueOrThrow({
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

  async listForBuild(workspaceId: string, mobileAppId: string, buildId: string) {
    await this.requireBuild(workspaceId, mobileAppId, buildId);

    return this.prisma.mobileTestRun.findMany({
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
        type: 'asc',
      },
    });
  }

  async dashboard(workspaceId: string, mobileAppId: string) {
    await this.mobileApps.findOne(workspaceId, mobileAppId);

    const builds = await this.prisma.mobileBuild.findMany({
      where: {
        workspaceId,
        mobileAppId,

        testRuns: {
          some: {},
        },
      },

      include: {
        repository: {
          select: {
            id: true,

            fullName: true,

            defaultBranch: true,
          },
        },

        testRuns: {
          include: {
            failures: {
              orderBy: {
                createdAt: 'asc',
              },
            },
          },

          orderBy: {
            type: 'asc',
          },
        },
      },

      orderBy: {
        createdAt: 'desc',
      },

      take: 50,
    });

    return builds.map((build) => {
      const summary = build.testRuns.reduce(
        (total, run) => {
          total.passed += run.passed;

          total.failed += run.failed;

          total.skipped += run.skipped;

          return total;
        },
        {
          passed: 0,
          failed: 0,
          skipped: 0,
        },
      );

      return {
        ...build,

        testSummary: {
          totalRuns: build.testRuns.length,

          ...summary,

          hasFailures: summary.failed > 0,
        },
      };
    });
  }

  private async requireBuild(workspaceId: string, mobileAppId: string, buildId: string) {
    const build = await this.prisma.mobileBuild.findFirst({
      where: {
        id: buildId,

        workspaceId,

        mobileAppId,
      },

      select: {
        id: true,
      },
    });

    if (!build) {
      throw new NotFoundException('Mobile build not found.');
    }

    return build;
  }

  private optional(value: string | null | undefined) {
    const normalized = value?.trim();

    return normalized ? normalized : null;
  }
}
