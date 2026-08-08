import { WorkspaceMembersModule } from 'src/modules/workspace/modules/workspace-members.module';
import { Module } from '@nestjs/common';

import {
  ApplicationActivityController,
  WorkspaceActivityController,
} from './controllers/activity.controller';

import { ActivityQueryService } from './services/activity-query.service';

import { ActivityWriterService } from './services/activity-writer.service';
import { WorkspaceModule } from '../workspace/modules/workspaces.module';

@Module({
  imports: [WorkspaceMembersModule, WorkspaceModule],

  controllers: [WorkspaceActivityController, ApplicationActivityController],

  providers: [ActivityWriterService, ActivityQueryService],

  exports: [ActivityWriterService, ActivityQueryService],
})
export class ActivityModule {}
