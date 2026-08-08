import { UsersModule } from 'src/modules/users/users.module';
import { WorkspaceMembersController } from '../controllers/workspace-members.controller';
import { WorkspaceAccessGuard } from '../guards/workspace-access.guard';
import { WorkspaceRolesGuard } from '../guards/workspace-roles.guard';
import { WorkspaceMembersService } from '../service/workspace-members.service';
import { Module } from '@nestjs/common';

@Module({
  imports: [UsersModule],
  controllers: [WorkspaceMembersController],
  providers: [WorkspaceMembersService, WorkspaceAccessGuard, WorkspaceRolesGuard],
  exports: [WorkspaceMembersService, WorkspaceAccessGuard, WorkspaceRolesGuard],
})
export class WorkspaceMembersModule {}
