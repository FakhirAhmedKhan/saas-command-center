import { PrismaService } from '../../../database/prisma.service';
import {
  DesktopSecurityCheckStatus,
  DesktopSecurityCheckType,
  DesktopSecuritySeverity,
} from 'src/generated/prisma/enums';
import { Injectable } from '@nestjs/common';
import { DesktopAppsService } from './desktop-apps.service';
import { DesktopDependencyHealthService } from './desktop-dependency-health.service';
import {
  DesktopRepositoryMetadataService,
  type DesktopRepositoryMetadataSnapshot,
} from './desktop-repository-metadata.service';

interface FindingDraft {
  findingKey: string;
  type: DesktopSecurityCheckType;
  status: DesktopSecurityCheckStatus;
  severity: DesktopSecuritySeverity;
  title: string;
  message: string;
  sourcePath: string | null;
  evidence: string[];
}

@Injectable()
export class DesktopSecurityService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly desktopApps: DesktopAppsService,
    private readonly metadata: DesktopRepositoryMetadataService,
    private readonly dependencies: DesktopDependencyHealthService,
  ) {}

  async get(workspaceId: string, desktopAppId: string) {
    await this.desktopApps.findOne(workspaceId, desktopAppId);

    const findings = await this.prisma.desktopSecurityFinding.findMany({
      where: { workspaceId, desktopAppId },
      orderBy: [
        { severity: 'desc' },
        { type: 'asc' },
      ],
    });

    const normalized = findings.map((finding) => ({
      ...finding,
      evidence: this.stringArray(finding.evidence),
    }));

    const statusFor = (type: DesktopSecurityCheckType) =>
      normalized.find((finding) => finding.type === type)?.status ??
      DesktopSecurityCheckStatus.UNKNOWN;

    return {
      windowsSigning: statusFor(DesktopSecurityCheckType.WINDOWS_SIGNING),
      macosSigning: statusFor(DesktopSecurityCheckType.MACOS_SIGNING),
      notarization: statusFor(
        DesktopSecurityCheckType.MACOS_NOTARIZATION,
      ),
      criticalRisks: normalized.filter(
        (finding) =>
          finding.severity === DesktopSecuritySeverity.CRITICAL &&
          finding.status !== DesktopSecurityCheckStatus.PASS,
      ).length,
      highRisks: normalized.filter(
        (finding) =>
          finding.severity === DesktopSecuritySeverity.HIGH &&
          finding.status !== DesktopSecurityCheckStatus.PASS,
      ).length,
      findings: normalized,
    };
  }

  async scan(workspaceId: string, desktopAppId: string) {
    const app = await this.desktopApps.findOne(workspaceId, desktopAppId);
    const snapshot = await this.metadata.load(workspaceId, desktopAppId);

    // Keep dependency inventory and vulnerability-derived findings aligned.
    const dependencies = await this.dependencies.scan(
      workspaceId,
      desktopAppId,
    );

    const findings = this.evaluate(snapshot, app.framework);

    for (const dependency of dependencies) {
      if (dependency.riskStatus !== 'VULNERABLE') continue;

      findings.push({
        findingKey: `dependency:${dependency.manifestPath}:${dependency.name}`,
        type: DesktopSecurityCheckType.DEPENDENCY_VULNERABILITY,
        status: DesktopSecurityCheckStatus.FAIL,
        severity:
          dependency.severity ?? DesktopSecuritySeverity.HIGH,
        title: `Vulnerable dependency: ${dependency.name}`,
        message:
          'A repository-provided vulnerability report contains this dependency.',
        sourcePath: dependency.manifestPath,
        evidence: dependency.advisoryIds,
      });
    }

    await this.prisma.$transaction(async (transaction) => {
      await transaction.desktopSecurityFinding.deleteMany({
        where: { workspaceId, desktopAppId },
      });

      for (const finding of findings) {
        await transaction.desktopSecurityFinding.create({
          data: {
            workspaceId,
            desktopAppId,
            ...finding,
            evidence: finding.evidence,
          },
        });
      }
    });

    return this.get(workspaceId, desktopAppId);
  }

  evaluate(
    snapshot: DesktopRepositoryMetadataSnapshot,
    framework: string,
  ): FindingDraft[] {
    const findings: FindingDraft[] = [];
    const all = Object.entries(snapshot.files);
    const combined = all.map(([, content]) => content).join('\n');

    const windowsEvidence: string[] = [];
    const macEvidence: string[] = [];
    const notarizationEvidence: string[] = [];

    for (const [path, content] of all) {
      if (
        /certificate(File|SubjectName|Sha1)|certificateThumbprint|signtool|SignAssembly\s*>\s*true/i.test(
          content,
        )
      ) {
        windowsEvidence.push(path);
      }

      if (
        /CODE_SIGN_STYLE|DEVELOPMENT_TEAM|signingIdentity|hardenedRuntime\s*[:=]\s*true/i.test(
          content,
        )
      ) {
        macEvidence.push(path);
      }

      if (
        /notarize|notarytool|APPLE_ID|APPLE_TEAM_ID|APPLE_APP_SPECIFIC_PASSWORD/i.test(
          content,
        )
      ) {
        notarizationEvidence.push(path);
      }
    }

    findings.push(
      this.binaryFinding(
        'windows-signing',
        DesktopSecurityCheckType.WINDOWS_SIGNING,
        windowsEvidence.length > 0,
        'Windows signing configuration',
        windowsEvidence.length > 0
          ? 'Repository metadata contains Windows signing configuration markers.'
          : 'No Windows signing configuration marker was detected in scanned metadata.',
        windowsEvidence,
      ),
    );

    findings.push(
      this.binaryFinding(
        'macos-signing',
        DesktopSecurityCheckType.MACOS_SIGNING,
        macEvidence.length > 0,
        'macOS signing configuration',
        macEvidence.length > 0
          ? 'Repository metadata contains macOS code-signing configuration markers.'
          : 'No macOS code-signing configuration marker was detected in scanned metadata.',
        macEvidence,
      ),
    );

    findings.push(
      this.binaryFinding(
        'macos-notarization',
        DesktopSecurityCheckType.MACOS_NOTARIZATION,
        notarizationEvidence.length > 0,
        'macOS notarization configuration',
        notarizationEvidence.length > 0
          ? 'Repository metadata contains notarization workflow markers.'
          : 'No notarization workflow marker was detected in scanned metadata.',
        notarizationEvidence,
      ),
    );

    if (
      framework === 'ELECTRON' &&
      /nodeIntegration\s*[:=]\s*true/i.test(combined)
    ) {
      findings.push({
        findingKey: 'packaging:electron-node-integration',
        type: DesktopSecurityCheckType.PACKAGING_CONFIGURATION,
        status: DesktopSecurityCheckStatus.WARN,
        severity: DesktopSecuritySeverity.HIGH,
        title: 'Electron nodeIntegration appears enabled',
        message:
          'Enabling Node.js integration in renderer content increases the impact of renderer compromise. Review the BrowserWindow security configuration.',
        sourcePath: null,
        evidence: ['nodeIntegration=true'],
      });
    }

    if (
      framework === 'ELECTRON' &&
      !/asar\s*[:=]\s*(true|['\"]?[^false])/i.test(combined)
    ) {
      findings.push({
        findingKey: 'packaging:electron-asar',
        type: DesktopSecurityCheckType.PACKAGING_CONFIGURATION,
        status: DesktopSecurityCheckStatus.WARN,
        severity: DesktopSecuritySeverity.MEDIUM,
        title: 'Electron package hardening is not explicit',
        message:
          'No explicit ASAR packaging configuration was detected. Verify the release packaging configuration before publication.',
        sourcePath: null,
        evidence: [],
      });
    }

    return findings;
  }

  private binaryFinding(
    findingKey: string,
    type: DesktopSecurityCheckType,
    configured: boolean,
    title: string,
    message: string,
    evidence: string[],
  ): FindingDraft {
    return {
      findingKey,
      type,
      status: configured
        ? DesktopSecurityCheckStatus.PASS
        : DesktopSecurityCheckStatus.UNKNOWN,
      severity: configured
        ? DesktopSecuritySeverity.INFO
        : DesktopSecuritySeverity.MEDIUM,
      title,
      message,
      sourcePath: evidence[0] ?? null,
      evidence,
    };
  }

  private stringArray(value: unknown): string[] {
    return Array.isArray(value)
      ? value.filter((item): item is string => typeof item === 'string')
      : [];
  }
}