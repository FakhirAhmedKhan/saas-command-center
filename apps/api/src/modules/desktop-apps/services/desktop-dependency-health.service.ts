import { PrismaService } from '../../../database/prisma.service';
import {
  DesktopDependencyEcosystem,
  DesktopDependencyRiskStatus,
  DesktopSecuritySeverity,
} from 'src/generated/prisma/enums';
import { Injectable } from '@nestjs/common';
import { DesktopAppsService } from './desktop-apps.service';
import {
  DesktopRepositoryMetadataService,
  type DesktopRepositoryMetadataSnapshot,
} from './desktop-repository-metadata.service';

interface ParsedDependency {
  ecosystem: DesktopDependencyEcosystem;
  manifestPath: string;
  name: string;
  currentVersion: string;
  direct: boolean;
}

interface VulnerabilityHint {
  packageName: string;
  advisoryIds: string[];
  severity: DesktopSecuritySeverity;
}

@Injectable()
export class DesktopDependencyHealthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly desktopApps: DesktopAppsService,
    private readonly metadata: DesktopRepositoryMetadataService,
  ) {}

  async list(workspaceId: string, desktopAppId: string) {
    await this.desktopApps.findOne(workspaceId, desktopAppId);

    const rows = await this.prisma.desktopDependency.findMany({
      where: { workspaceId, desktopAppId },
      orderBy: [
        { riskStatus: 'asc' },
        { ecosystem: 'asc' },
        { name: 'asc' },
      ],
    });

    return rows.map((row) => ({
      ...row,
      advisoryIds: this.stringArray(row.advisoryIds),
    }));
  }

  async scan(workspaceId: string, desktopAppId: string) {
    await this.desktopApps.findOne(workspaceId, desktopAppId);
    const snapshot = await this.metadata.load(workspaceId, desktopAppId);
    const parsed = this.parse(snapshot);
    const vulnerabilities = this.vulnerabilities(snapshot);

    const vulnerabilityByName = new Map(
      vulnerabilities.map((item) => [item.packageName.toLowerCase(), item]),
    );

    await this.prisma.$transaction(async (transaction) => {
      await transaction.desktopDependency.deleteMany({
        where: { workspaceId, desktopAppId },
      });

      for (const dependency of parsed) {
        const vulnerability = vulnerabilityByName.get(
          dependency.name.toLowerCase(),
        );

        await transaction.desktopDependency.create({
          data: {
            workspaceId,
            desktopAppId,
            ecosystem: dependency.ecosystem,
            manifestPath: dependency.manifestPath,
            name: dependency.name,
            currentVersion: dependency.currentVersion,
            latestVersion: null,
            direct: dependency.direct,
            riskStatus: vulnerability
              ? DesktopDependencyRiskStatus.VULNERABLE
              : DesktopDependencyRiskStatus.UNKNOWN,
            severity: vulnerability?.severity ?? null,
            advisoryIds: vulnerability?.advisoryIds ?? [],
          },
        });
      }
    });

    return this.list(workspaceId, desktopAppId);
  }

  parse(snapshot: DesktopRepositoryMetadataSnapshot): ParsedDependency[] {
    const output = new Map<string, ParsedDependency>();

    const add = (dependency: ParsedDependency) => {
      const key = [
        dependency.ecosystem,
        dependency.manifestPath,
        dependency.name,
      ].join('|');
      output.set(key, dependency);
    };

    for (const [path, content] of Object.entries(snapshot.files)) {
      if (/(^|\/)package\.json$/i.test(path)) {
        this.parsePackageJson(path, content).forEach(add);
        continue;
      }

      if (/(^|\/)Cargo\.toml$/i.test(path)) {
        this.parseCargo(path, content).forEach(add);
        continue;
      }

      if (/\.(csproj|fsproj|vbproj)$/i.test(path)) {
        this.parseCsproj(path, content).forEach(add);
        continue;
      }

      if (/(^|\/)pom\.xml$/i.test(path)) {
        this.parsePom(path, content).forEach(add);
        continue;
      }

      if (/(^|\/)build\.gradle(\.kts)?$/i.test(path)) {
        this.parseGradle(path, content).forEach(add);
        continue;
      }

      if (/(^|\/)vcpkg\.json$/i.test(path)) {
        this.parseVcpkg(path, content).forEach(add);
        continue;
      }

      if (/(^|\/)conanfile\.txt$/i.test(path)) {
        this.parseConan(path, content).forEach(add);
      }
    }

    return [...output.values()];
  }

  vulnerabilities(
    snapshot: DesktopRepositoryMetadataSnapshot,
  ): VulnerabilityHint[] {
    const output: VulnerabilityHint[] = [];

    for (const [path, content] of Object.entries(snapshot.files)) {
      if (!/(osv-scanner|npm-audit|pnpm-audit)\.json$/i.test(path)) {
        continue;
      }

      let parsed: unknown;

      try {
        parsed = JSON.parse(content);
      } catch {
        continue;
      }

      this.collectVulnerabilities(parsed, output);
    }

    return output;
  }

  private parsePackageJson(path: string, content: string): ParsedDependency[] {
    try {
      const parsed = JSON.parse(content) as {
        dependencies?: Record<string, string>;
        devDependencies?: Record<string, string>;
        optionalDependencies?: Record<string, string>;
      };

      return [
        ...Object.entries(parsed.dependencies ?? {}).map(([name, version]) => ({
          ecosystem: DesktopDependencyEcosystem.NPM,
          manifestPath: path,
          name,
          currentVersion: String(version),
          direct: true,
        })),
        ...Object.entries(parsed.devDependencies ?? {}).map(([name, version]) => ({
          ecosystem: DesktopDependencyEcosystem.NPM,
          manifestPath: path,
          name,
          currentVersion: String(version),
          direct: true,
        })),
        ...Object.entries(parsed.optionalDependencies ?? {}).map(([name, version]) => ({
          ecosystem: DesktopDependencyEcosystem.NPM,
          manifestPath: path,
          name,
          currentVersion: String(version),
          direct: true,
        })),
      ];
    } catch {
      return [];
    }
  }

  private parseCargo(path: string, content: string): ParsedDependency[] {
    const output: ParsedDependency[] = [];
    let inDependencies = false;

    for (const rawLine of content.split(/\r?\n/)) {
      const line = rawLine.trim();

      if (/^\[(dependencies|dev-dependencies|build-dependencies)\]$/.test(line)) {
        inDependencies = true;
        continue;
      }

      if (/^\[.+\]$/.test(line)) {
        inDependencies = false;
        continue;
      }

      if (!inDependencies || !line || line.startsWith('#')) {
        continue;
      }

      const match = line.match(/^([A-Za-z0-9_-]+)\s*=\s*(.+)$/);
      if (!match) continue;

      const name = match[1];
      const rhs = match[2];
      const version =
        rhs.match(/^['\"]([^'\"]+)['\"]/)?.[1] ??
        rhs.match(/version\s*=\s*['\"]([^'\"]+)['\"]/)?.[1] ??
        'workspace/git/path';

      output.push({
        ecosystem: DesktopDependencyEcosystem.CARGO,
        manifestPath: path,
        name,
        currentVersion: version,
        direct: true,
      });
    }

    return output;
  }

  private parseCsproj(path: string, content: string): ParsedDependency[] {
    return [...content.matchAll(
      /<PackageReference\s+Include=["']([^"']+)["'][^>]*(?:Version=["']([^"']+)["'])?[^>]*>(?:[\s\S]*?<Version>([^<]+)<\/Version>)?[\s\S]*?<\/PackageReference>|<PackageReference\s+Include=["']([^"']+)["'][^>]*Version=["']([^"']+)["'][^>]*\/>/gi,
    )].flatMap((match) => {
      const name = match[1] ?? match[4];
      const version = match[2] ?? match[3] ?? match[5];
      return name && version
        ? [{
            ecosystem: DesktopDependencyEcosystem.NUGET,
            manifestPath: path,
            name,
            currentVersion: version.trim(),
            direct: true,
          }]
        : [];
    });
  }

  private parsePom(path: string, content: string): ParsedDependency[] {
    return [...content.matchAll(/<dependency>([\s\S]*?)<\/dependency>/gi)]
      .flatMap((match) => {
        const block = match[1];
        const group = block.match(/<groupId>([^<]+)<\/groupId>/i)?.[1]?.trim();
        const artifact = block.match(/<artifactId>([^<]+)<\/artifactId>/i)?.[1]?.trim();
        const version = block.match(/<version>([^<]+)<\/version>/i)?.[1]?.trim();

        if (!artifact) return [];

        return [{
          ecosystem: DesktopDependencyEcosystem.MAVEN,
          manifestPath: path,
          name: group ? `${group}:${artifact}` : artifact,
          currentVersion: version ?? 'managed',
          direct: true,
        }];
      });
  }

  private parseGradle(path: string, content: string): ParsedDependency[] {
    const output: ParsedDependency[] = [];
    const regex = /(?:implementation|api|compileOnly|runtimeOnly|testImplementation)\s*\(?["']([^:"']+):([^:"']+):([^"']+)["']\)?/g;

    for (const match of content.matchAll(regex)) {
      output.push({
        ecosystem: DesktopDependencyEcosystem.GRADLE,
        manifestPath: path,
        name: `${match[1]}:${match[2]}`,
        currentVersion: match[3],
        direct: true,
      });
    }

    return output;
  }

  private parseVcpkg(path: string, content: string): ParsedDependency[] {
    try {
      const parsed = JSON.parse(content) as {
        dependencies?: Array<string | { name?: string; version?: string }>;
      };

      return (parsed.dependencies ?? []).flatMap((item) => {
        if (typeof item === 'string') {
          return [{
            ecosystem: DesktopDependencyEcosystem.VCPKG,
            manifestPath: path,
            name: item,
            currentVersion: 'manifest',
            direct: true,
          }];
        }

        if (!item.name) return [];

        return [{
          ecosystem: DesktopDependencyEcosystem.VCPKG,
          manifestPath: path,
          name: item.name,
          currentVersion: item.version ?? 'manifest',
          direct: true,
        }];
      });
    } catch {
      return [];
    }
  }

  private parseConan(path: string, content: string): ParsedDependency[] {
    const output: ParsedDependency[] = [];
    let requires = false;

    for (const rawLine of content.split(/\r?\n/)) {
      const line = rawLine.trim();

      if (line.toLowerCase() === '[requires]') {
        requires = true;
        continue;
      }

      if (/^\[.+\]$/.test(line)) {
        requires = false;
        continue;
      }

      if (!requires || !line || line.startsWith('#')) continue;

      const [name, version] = line.split('/', 2);
      if (!name) continue;

      output.push({
        ecosystem: DesktopDependencyEcosystem.CONAN,
        manifestPath: path,
        name,
        currentVersion: version ?? 'unknown',
        direct: true,
      });
    }

    return output;
  }

  private collectVulnerabilities(
    value: unknown,
    output: VulnerabilityHint[],
  ): void {
    if (Array.isArray(value)) {
      value.forEach((item) => this.collectVulnerabilities(item, output));
      return;
    }

    if (!value || typeof value !== 'object') return;

    const record = value as Record<string, unknown>;
    const packageName =
      typeof record.package === 'string'
        ? record.package
        : typeof record.name === 'string'
          ? record.name
          : null;

    const ids = [
      record.id,
      record.advisory,
      record.cve,
    ]
      .filter((item): item is string => typeof item === 'string')
      .map((item) => item.trim())
      .filter(Boolean);

    const severityRaw = String(record.severity ?? '').toUpperCase();
    const severity =
      severityRaw === 'CRITICAL'
        ? DesktopSecuritySeverity.CRITICAL
        : severityRaw === 'HIGH'
          ? DesktopSecuritySeverity.HIGH
          : severityRaw === 'MEDIUM' || severityRaw === 'MODERATE'
            ? DesktopSecuritySeverity.MEDIUM
            : severityRaw === 'LOW'
              ? DesktopSecuritySeverity.LOW
              : DesktopSecuritySeverity.INFO;

    if (packageName && ids.length > 0) {
      output.push({
        packageName,
        advisoryIds: ids,
        severity,
      });
    }

    Object.values(record).forEach((child) =>
      this.collectVulnerabilities(child, output),
    );
  }

  private stringArray(value: unknown): string[] {
    return Array.isArray(value)
      ? value.filter((item): item is string => typeof item === 'string')
      : [];
  }
}