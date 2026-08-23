import { DesktopAppsService } from './desktop-apps.service';
import { DesktopBuildsService } from './desktop-builds.service';
import { DesktopReleasesService } from './desktop-releases.service';
import { DesktopRepositoryService } from './desktop-repository.service';
import { Injectable } from '@nestjs/common';

@Injectable()
export class DesktopOverviewService {
  constructor(
    private readonly desktopApps: DesktopAppsService,
    private readonly desktopRepositories: DesktopRepositoryService,
    private readonly desktopBuilds: DesktopBuildsService,
    private readonly desktopReleases: DesktopReleasesService,
  ) {}

  async get(workspaceId: string, desktopAppId: string) {
    const desktopApp = await this.desktopApps.findOne(workspaceId, desktopAppId);

    const [repository, latestBuild, latestRelease] = await Promise.all([
      this.desktopRepositories.getLinkedRepository(workspaceId, desktopAppId),
      this.desktopBuilds.getLatest(workspaceId, desktopAppId),
      this.desktopReleases.getLatestPublished(workspaceId, desktopAppId),
    ]);

    return {
      desktopApp,
      repository,
      latestBuild,
      latestRelease,
      latestPerformance: null,
    };
  }
}
