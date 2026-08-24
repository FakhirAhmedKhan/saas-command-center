import { DesktopBuildsService } from './desktop-builds.service';
import { PrismaService } from '../../../database/prisma.service';
import { IngestDesktopBuildArtifactDto } from '../dto/desktop-build-artifact.dto';
import { BadRequestException, Injectable } from '@nestjs/common';

@Injectable()
export class DesktopBuildArtifactsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly builds: DesktopBuildsService,
  ) {}

  async list(workspaceId: string, desktopAppId: string, buildId: string) {
    await this.builds.findOne(workspaceId, desktopAppId, buildId);

    const rows = await this.prisma.desktopBuildArtifact.findMany({
      where: {
        buildId,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    return rows.map((row) => this.serialize(row));
  }

  async ingest(workspaceId: string, desktopAppId: string, buildId: string, dto: IngestDesktopBuildArtifactDto) {
    const build = await this.builds.findOne(workspaceId, desktopAppId, buildId);

    if (dto.platform !== build.platform || dto.architecture !== build.architecture) {
      throw new BadRequestException('Artifact platform and architecture must match the build matrix entry.');
    }

    const artifact = await this.prisma.desktopBuildArtifact.upsert({
      where: {
        buildId_providerArtifactId: {
          buildId,
          providerArtifactId: dto.providerArtifactId.trim(),
        },
      },
      create: {
        buildId,
        providerArtifactId: dto.providerArtifactId.trim(),
        platform: dto.platform,
        architecture: dto.architecture,
        type: dto.type,
        fileName: dto.fileName.trim(),
        sizeBytes: dto.sizeBytes === undefined || dto.sizeBytes === null ? null : BigInt(dto.sizeBytes),
        checksum: dto.checksum?.trim() || null,
        externalUrl: dto.externalUrl?.trim() || null,
      },
      update: {
        type: dto.type,
        fileName: dto.fileName.trim(),
        sizeBytes: dto.sizeBytes === undefined || dto.sizeBytes === null ? null : BigInt(dto.sizeBytes),
        checksum: dto.checksum?.trim() || null,
        externalUrl: dto.externalUrl?.trim() || null,
      },
    });

    return this.serialize(artifact);
  }

  private serialize<
    T extends {
      sizeBytes: bigint | null;
    },
  >(row: T) {
    return {
      ...row,
      sizeBytes: row.sizeBytes === null ? null : Number(row.sizeBytes),
    };
  }
}
