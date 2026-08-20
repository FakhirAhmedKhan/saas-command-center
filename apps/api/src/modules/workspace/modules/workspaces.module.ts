import { WorkspaceCreationController } from '../controllers/workspace-creation.controller';
import { WorkspaceMembersController } from '../controllers/workspace-members.controller';
import { WorkspacesController } from '../controllers/workspaces.controller';
import { WorkspaceAccessGuard } from '../guards/workspace-access.guard';
import { WorkspaceRolesGuard } from '../guards/workspace-roles.guard';
import { WorkspaceCreationService } from '../service/workspace-creation.service';
import { WorkspaceMembersService } from '../service/workspace-members.service';
import { WorkspacesService } from '../service/workspaces.service';
import { Module } from '@nestjs/common';
import { UsersModule } from 'src/modules/users/users.module';

@Module({
  imports: [UsersModule],

  controllers: [WorkspacesController, WorkspaceMembersController, WorkspaceCreationController],

  providers: [WorkspacesService, WorkspaceMembersService, WorkspaceCreationService, WorkspaceAccessGuard, WorkspaceRolesGuard],

  exports: [WorkspacesService, WorkspaceMembersService, WorkspaceCreationService, WorkspaceAccessGuard, WorkspaceRolesGuard],
})
export class WorkspaceModule {}
