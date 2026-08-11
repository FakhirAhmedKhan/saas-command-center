import { ActivityModule } from '../activity/activity.module';
import { WebsitesController } from './controllers/websites.controller';
import { WebsitesService } from './services/websites.service';
import { WorkspaceModule } from '../workspace/modules/workspaces.module';
import { Module } from '@nestjs/common';
import { WorkspaceMembersModule } from 'src/modules/workspace/modules/workspace-members.module';

@Module({
  imports: [WorkspaceMembersModule, WorkspaceModule, ActivityModule],

  controllers: [WebsitesController],

  providers: [WebsitesService],

  exports: [WebsitesService],
})
export class WebsitesModule {}
