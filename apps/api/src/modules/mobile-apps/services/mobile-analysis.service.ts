import { MobileAnalysisContextService } from './mobile-analysis-context.service';
import { PrismaService } from '../../../database/prisma.service';
import type { MobileAnalysisProvider } from '../analysis/mobile-analysis-provider.interface';
import { ConfiguredMobileAnalysisProvider } from '../analysis/mobile-analysis.provider';
import { AnalyzeMobileAppDto } from '../dto/mobile-analysis.dto';
import type { MobileAnalysisEvidence } from '@command-center/shared-types';
import { BadGatewayException, Injectable } from '@nestjs/common';
import { MobileAnalysisConfidence } from 'src/generated/prisma/enums';

@Injectable()
export class MobileAnalysisService {
  private provider: MobileAnalysisProvider;

  constructor(
    private readonly prisma: PrismaService,

    private readonly context: MobileAnalysisContextService,

    configured: ConfiguredMobileAnalysisProvider,
  ) {
    this.provider = configured;
  }

  setProviderForTesting(provider: MobileAnalysisProvider) {
    if (process.env.NODE_ENV !== 'test') {
      throw new Error('AI provider override is test-only.');
    }

    this.provider = provider;
  }

  async analyze(workspaceId: string, mobileAppId: string, userId: string, dto: AnalyzeMobileAppDto) {
    const context = await this.context.build(workspaceId, mobileAppId, {
      buildId: dto.buildId,

      releaseId: dto.releaseId,
    });
    const evidence = this.evidence(context);
    const confidence: MobileAnalysisConfidence = evidence.length >= 2 ? MobileAnalysisConfidence.SUPPORTED : MobileAnalysisConfidence.LIMITED;
    const system = `
You analyze mobile engineering data from SaaS Command Center.

Rules:
- Use only the supplied context.
- Do not invent missing evidence.
- Distinguish correlation from proven causation.
- State uncertainty explicitly.
- Never claim that correlation proves causation.
- Do not mention or infer secrets, credentials or hidden configuration.
- Be concise and actionable.
`.trim();
    const prompt = JSON.stringify(
      {
        action: dto.action,

        question: dto.question ?? null,

        context,
      },
      null,
      2,
    ).slice(0, 50_000);
    let answer: string;

    try {
      answer = await this.provider.analyze({
        system,
        prompt,
      });
    } catch {
      throw new BadGatewayException('Mobile AI analysis is temporarily unavailable.');
    }

    if (!/caus/i.test(answer)) {
      answer += '\n\nEvidence may show correlation; it does not by itself prove causation.';
    }

    const stored = await this.prisma.mobileAiAnalysis.create({
      data: {
        workspaceId,
        mobileAppId,

        createdByUserId: userId,

        action: dto.action,

        question: dto.question ?? null,

        answer,

        confidence,

        evidence: evidence as never,
      },
    });

    return {
      id: stored.id,

      action: stored.action,

      answer: stored.answer,

      confidence: stored.confidence,

      evidence,

      createdAt: stored.createdAt.toISOString(),
    };
  }

  private evidence(context: Awaited<ReturnType<MobileAnalysisContextService['build']>>): MobileAnalysisEvidence[] {
    const evidence: MobileAnalysisEvidence[] = [];

    if (context.repository) {
      evidence.push({
        type: 'REPOSITORY',

        id: context.repository.id,

        label: context.repository.fullName,
      });
    }

    for (const build of context.builds) {
      evidence.push({
        type: 'BUILD',

        id: build.id,

        label: `Build ${build.buildNumber ?? build.workflowRunId}`,
      });

      for (const run of build.tests) {
        if (run.failed > 0) {
          evidence.push({
            type: 'TEST',

            id: `${build.id}:${run.type}`,

            label: `${run.type}: ${run.failed} failed`,
          });
        }
      }
    }

    for (const release of context.releases) {
      evidence.push({
        type: 'RELEASE',

        id: release.id,

        label: `Release ${release.version}`,
      });
    }

    if (context.performance.length > 0) {
      evidence.push({
        type: 'PERFORMANCE',

        id: context.mobileApp.id,

        label: `${context.performance.length} normalized metric records`,
      });
    }

    for (const alert of context.alerts) {
      evidence.push({
        type: 'ALERT',

        id: alert.id,

        label: alert.title,
      });
    }

    return evidence.slice(0, 50);
  }
}
