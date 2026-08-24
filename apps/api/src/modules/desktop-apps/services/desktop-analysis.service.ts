import { DesktopAnalysisContextService } from './desktop-analysis-context.service';
import { PrismaService } from '../../../database/prisma.service';
import type { DesktopAnalysisProvider } from '../analysis/desktop-analysis-provider.interface';
import { ConfiguredDesktopAnalysisProvider } from '../analysis/desktop-analysis.provider';
import { AnalyzeDesktopAppDto } from '../dto/desktop-analysis.dto';
import type { DesktopAnalysisEvidence } from '@command-center/shared-types';
import { BadGatewayException, Injectable } from '@nestjs/common';
import { DesktopAnalysisConfidence, Prisma } from 'src/generated/prisma/client';

@Injectable()
export class DesktopAnalysisService {
  private provider: DesktopAnalysisProvider;

  constructor(
    private readonly prisma: PrismaService,
    private readonly context: DesktopAnalysisContextService,
    configured: ConfiguredDesktopAnalysisProvider,
  ) {
    this.provider = configured;
  }

  setProviderForTesting(provider: DesktopAnalysisProvider) {
    if (process.env.NODE_ENV !== 'test') {
      throw new Error('AI provider override is test-only.');
    }

    this.provider = provider;
  }

  async analyze(workspaceId: string, desktopAppId: string, userId: string, dto: AnalyzeDesktopAppDto) {
    const context = await this.context.build(workspaceId, desktopAppId, {
      buildId: dto.buildId,
      releaseId: dto.releaseId,
      crashId: dto.crashId,
    });

    const evidence = this.evidence(context, workspaceId, desktopAppId);

    const confidence = evidence.length >= 2 ? DesktopAnalysisConfidence.SUPPORTED : DesktopAnalysisConfidence.LIMITED;

    const system = `
You analyze desktop engineering data from SaaS Command Center.

Mandatory answer structure:
Evidence:
- only facts present in supplied context

Correlation:
- relationships observed in the supplied context

Likely cause:
- plausible explanation only when evidence supports it

Unknown cause:
- explicitly state what cannot be proven from available evidence

Rules:
- Never invent logs, commits, files, metrics, releases or root causes.
- Never claim correlation proves causation.
- State uncertainty explicitly.
- Never mention or infer secrets, credentials, private keys, signing certificates, provider tokens or hidden configuration.
- Never use knowledge from another workspace.
- Prefer evidence IDs that can be opened in SaaS Command Center.
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
    ).slice(0, 60_000);

    let answer: string;

    try {
      answer = await this.provider.analyze({ system, prompt });
    } catch {
      throw new BadGatewayException('Desktop AI analysis is temporarily unavailable.');
    }

    answer = this.ensureGroundingSections(answer);

    const stored = await this.prisma.desktopAiAnalysis.create({
      data: {
        workspaceId,
        desktopAppId,
        createdByUserId: userId,
        action: dto.action,
        question: dto.question?.trim() || null,
        answer,
        confidence,
        evidence: evidence as unknown as Prisma.InputJsonValue,
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

  private evidence(context: Awaited<ReturnType<DesktopAnalysisContextService['build']>>, workspaceId: string, desktopAppId: string): DesktopAnalysisEvidence[] {
    const evidence: DesktopAnalysisEvidence[] = [];

    if (context.repository) {
      evidence.push({
        type: 'REPOSITORY',
        id: context.repository.id,
        label: context.repository.fullName,
        href: `/workspaces/${workspaceId}/desktop-apps/${desktopAppId}/code`,
      });
    }

    for (const build of context.builds) {
      evidence.push({
        type: 'BUILD',
        id: build.id,
        label: `Build ${build.buildNumber ?? build.workflowRunId}`,
        href: `/workspaces/${workspaceId}/desktop-apps/${desktopAppId}/builds/${build.id}`,
      });

      for (const artifact of build.artifacts) {
        evidence.push({
          type: 'ARTIFACT',
          id: artifact.id,
          label: artifact.fileName,
          href: `/workspaces/${workspaceId}/desktop-apps/${desktopAppId}/builds/${build.id}`,
        });
      }

      for (const run of build.tests) {
        if (run.failed > 0) {
          evidence.push({
            type: 'TEST',
            id: run.id,
            label: `${run.type}: ${run.failed} failed`,
            href: `/workspaces/${workspaceId}/desktop-apps/${desktopAppId}/tests`,
          });
        }
      }
    }

    for (const release of context.releases) {
      evidence.push({
        type: 'RELEASE',
        id: release.id,
        label: `${release.version} ${release.channel}`,
        href: `/workspaces/${workspaceId}/desktop-apps/${desktopAppId}/releases`,
      });
    }

    for (const crash of context.crashes.slice(0, 10)) {
      evidence.push({
        type: 'CRASH',
        id: crash.id,
        label: `${crash.message.slice(0, 80)} (${crash.count})`,
        href: `/workspaces/${workspaceId}/desktop-apps/${desktopAppId}/crashes`,
      });
    }

    for (const metric of context.performance.slice(0, 10)) {
      evidence.push({
        type: 'PERFORMANCE',
        id: metric.id,
        label: `${metric.type}: ${metric.value} ${metric.unit}`,
        href: `/workspaces/${workspaceId}/desktop-apps/${desktopAppId}/performance`,
      });
    }

    for (const dependency of context.dependencies.filter((item) => item.riskStatus !== 'CURRENT').slice(0, 10)) {
      evidence.push({
        type: 'DEPENDENCY',
        id: dependency.id,
        label: `${dependency.name} ${dependency.currentVersion}`,
        href: `/workspaces/${workspaceId}/desktop-apps/${desktopAppId}/dependencies`,
      });
    }

    for (const finding of context.securityFindings.filter((item) => item.status !== 'PASS').slice(0, 10)) {
      evidence.push({
        type: 'SECURITY',
        id: finding.id,
        label: finding.title,
        href: `/workspaces/${workspaceId}/desktop-apps/${desktopAppId}/security`,
      });
    }

    for (const alert of context.alerts.slice(0, 10)) {
      evidence.push({
        type: 'ALERT',
        id: alert.id,
        label: alert.title,
        href: `/workspaces/${workspaceId}/desktop-apps/${desktopAppId}/alerts`,
      });
    }

    const unique = new Map<string, DesktopAnalysisEvidence>();

    for (const item of evidence) {
      unique.set(`${item.type}:${item.id}`, item);
    }

    return [...unique.values()].slice(0, 50);
  }

  private ensureGroundingSections(answer: string): string {
    const required = ['Evidence:', 'Correlation:', 'Likely cause:', 'Unknown cause:'];

    if (required.every((section) => answer.includes(section))) {
      return answer;
    }

    return [
      answer.trim(),
      '',
      'Evidence:',
      '- See the evidence references attached to this analysis.',
      '',
      'Correlation:',
      '- Available records may show correlation; correlation does not prove causation.',
      '',
      'Likely cause:',
      '- No additional cause can be asserted beyond the supplied evidence.',
      '',
      'Unknown cause:',
      '- Root cause remains uncertain where the available evidence is incomplete.',
    ].join('\n');
  }
}
