import { Module } from '@nestjs/common';
import { UsersModule } from 'src/modules/users/users.module';
import { WorkspaceMembersController } from '../controllers/workspace-members.controller';
import { WorkspacesController } from '../controllers/workspaces.controller';
import { WorkspaceAccessGuard } from '../guards/workspace-access.guard';
import { WorkspaceRolesGuard } from '../guards/workspace-roles.guard';
import { WorkspaceMembersService } from '../service/workspace-members.service';
import { WorkspacesService } from '../service/workspaces.service';


@Module({
  imports: [UsersModule],

  controllers: [
    WorkspacesController,
    WorkspaceMembersController,
  ],

  providers: [
    WorkspacesService,
    WorkspaceMembersService,
    WorkspaceAccessGuard,
    WorkspaceRolesGuard,
  ],

  exports: [
    WorkspacesService,
    WorkspaceMembersService,
    WorkspaceAccessGuard,
    WorkspaceRolesGuard,
  ],
})
export class WorkspaceModule {}