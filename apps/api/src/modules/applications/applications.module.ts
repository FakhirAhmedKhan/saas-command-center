import { WorkspaceMembersModule } from 'src/modules/workspace/modules/workspace-members.module';
import { Module } from '@nestjs/common';

import { ActivityModule } from '../activity/activity.module';

import { ApplicationsController } from './controllers/applications.controller';

import { ApplicationsService } from './services/applications.service';
import { WorkspaceModule } from '../workspace/modules/workspaces.module';

@Module({
  imports: [
        WorkspaceMembersModule,WorkspaceModule, ActivityModule],

  controllers: [ApplicationsController],

  providers: [ApplicationsService],

  exports: [ApplicationsService],
})
export class ApplicationsModule {}
