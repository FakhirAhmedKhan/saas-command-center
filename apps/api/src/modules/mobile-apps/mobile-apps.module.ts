import { DatabaseModule } from '../../database/database.module';
import { ActivityModule } from '../activity/activity.module';
import { RepositoriesModule } from '../repositories/repositories.module';
import { MobileAppsController } from './controllers/mobile-apps.controller';
import { MobileProjectDetectionController } from './controllers/mobile-project-detection.controller';
import { MobileRepositoriesController } from './controllers/mobile-repositories.controller';
import { MobileAppsService } from './services/mobile-apps.service';
import { MobileProjectDetectionService } from './services/mobile-project-detection.service';
import { MobileRepositoryService } from './services/mobile-repository.service';
import { WorkspaceMembersModule } from '../workspace/modules/workspace-members.module';
import { Module } from '@nestjs/common';

@Module({
  imports: [DatabaseModule, WorkspaceMembersModule, ActivityModule, RepositoriesModule],

  controllers: [MobileAppsController, MobileRepositoriesController, MobileProjectDetectionController],

  providers: [MobileAppsService, MobileRepositoryService, MobileProjectDetectionService],

  exports: [MobileAppsService, MobileRepositoryService, MobileProjectDetectionService],
})
export class MobileAppsModule {}
