import { Module } from '@nestjs/common';
import { WorkspaceMembersModule } from 'src/modules/workspace/modules/workspace-members.module';
import { WorkspaceModule } from '../workspace/modules/workspaces.module';
import { ApplicationActivityController, WorkspaceActivityController } from './controllers/activity.controller';
import { ActivityQueryService } from './services/activity-query.service';
import { ActivityWriterService } from './services/activity-writer.service';

@Module({
  imports: [WorkspaceMembersModule, WorkspaceModule],

  controllers: [WorkspaceActivityController, ApplicationActivityController],

  providers: [ActivityWriterService, ActivityQueryService],

  exports: [ActivityWriterService, ActivityQueryService],
})
export class ActivityModule {}
