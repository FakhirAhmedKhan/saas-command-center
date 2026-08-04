import { Module } from '@nestjs/common';
import { WorkspaceMembersModule } from './workspace-members.module';
import { WorkspacesController } from '../controllers/workspaces.controller';
import { WorkspacesService } from '../service/workspaces.service';


@Module({
  imports: [WorkspaceMembersModule],
  controllers: [WorkspacesController],
  providers: [WorkspacesService],
  exports: [WorkspacesService],
})
export class WorkspacesModule { }