import { DesktopAppsService } from './desktop-apps.service';
import { PrismaService } from '../../../database/prisma.service';
import type { DesktopRuntimeQueryDto } from '../dto/desktop-runtime.dto';
import { Injectable, NotFoundException } from '@nestjs/common';

@Injectable()
export class DesktopCrashesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly desktopApps: DesktopAppsService,
  ) {}

  async list(workspaceId: string, desktopAppId: string, query: DesktopRuntimeQueryDto) {
    await this.desktopApps.findOne(workspaceId, desktopAppId);

    const from = query.from ? new Date(query.from) : null;
    const to = query.to ? new Date(query.to) : null;

    return this.prisma.desktopCrash.findMany({
      where: {
        workspaceId,
        desktopAppId,
        ...(query.version ? { version: query.version } : {}),
        ...(query.platform ? { platform: query.platform } : {}),
        ...(query.architecture ? { architecture: query.architecture } : {}),
        ...(query.channel ? { channel: query.channel } : {}),
        ...(from || to
          ? {
              lastSeenAt: {
                ...(from ? { gte: from } : {}),
                ...(to ? { lte: to } : {}),
              },
            }
          : {}),
      },
      orderBy: [{ affectedUsers: 'desc' }, { count: 'desc' }, { lastSeenAt: 'desc' }],
      take: 500,
    });
  }

  async findOne(workspaceId: string, desktopAppId: string, crashId: string) {
    await this.desktopApps.findOne(workspaceId, desktopAppId);

    const crash = await this.prisma.desktopCrash.findFirst({
      where: {
        id: crashId,
        workspaceId,
        desktopAppId,
      },
    });

    if (!crash) {
      throw new NotFoundException('Desktop crash not found.');
    }

    return crash;
  }
}
