import { DatabaseModule } from '../../database/database.module';
import { ActivityModule } from '../activity/activity.module';
import { RepositoriesModule } from '../repositories/repositories.module';
import { WorkspaceMembersModule } from '../workspace/modules/workspace-members.module';
import { DesktopAppsController } from './controllers/desktop-apps.controller';
import { DesktopBuildArtifactsController } from './controllers/desktop-build-artifacts.controller';
import { DesktopBuildsController } from './controllers/desktop-builds.controller';
import { DesktopOverviewController } from './controllers/desktop-overview.controller';
import { DesktopProjectDetectionController } from './controllers/desktop-project-detection.controller';
import { DesktopRepositoriesController } from './controllers/desktop-repositories.controller';
import { DesktopTestsController } from './controllers/desktop-tests.controller';
import { DesktopAppsService } from './services/desktop-apps.service';
import { DesktopBuildArtifactsService } from './services/desktop-build-artifacts.service';
import { DesktopBuildsService } from './services/desktop-builds.service';
import { DesktopOverviewService } from './services/desktop-overview.service';
import { DesktopProjectDetectionService } from './services/desktop-project-detection.service';
import { DesktopRepositoryService } from './services/desktop-repository.service';
import { Module } from '@nestjs/common';
import { DesktopTestsService } from './services/desktop-tests.service';
import { DesktopReleasesController } from './controllers/desktop-releases.controller';
import { DesktopReleasesService } from './services/desktop-releases.service';

@Module({
  imports: [DatabaseModule, WorkspaceMembersModule, ActivityModule, RepositoriesModule],

  controllers: [
    DesktopAppsController,
    DesktopRepositoriesController,
    DesktopProjectDetectionController,
    DesktopOverviewController,
    DesktopBuildsController,
    DesktopBuildArtifactsController,
    DesktopTestsController,
    DesktopReleasesController,
  ],

  providers: [
    DesktopAppsService,
    DesktopRepositoryService,
    DesktopProjectDetectionService,
    DesktopBuildsService,
    DesktopBuildArtifactsService,
    DesktopTestsService,
    DesktopReleasesService,
    DesktopOverviewService,
  ],

  exports: [DesktopAppsService, DesktopRepositoryService, DesktopBuildsService, DesktopTestsService, DesktopReleasesService],
})
export class DesktopAppsModule {}
