import { Module } from '@nestjs/common';
import { WorkspaceMembersModule } from 'src/modules/workspace/modules/workspace-members.module';
import { ActivityModule } from '../activity/activity.module';
import { WorkspaceModule } from '../workspace/modules/workspaces.module';
import { ApplicationsController } from './controllers/applications.controller';
import { ApplicationsService } from './services/applications.service';

@Module({
  imports: [WorkspaceMembersModule, WorkspaceModule, ActivityModule],

  controllers: [ApplicationsController],

  providers: [ApplicationsService],

  exports: [ApplicationsService],
})
export class ApplicationsModule {}
