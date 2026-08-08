import {
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { WorkspaceRole } from 'src/generated/prisma/enums';
import { UsersService } from 'src/modules/users/users.service';
import { WorkspaceRoles } from '../decorators/workspace-roles.decorator';
import { AddWorkspaceMemberDto } from '../dto/add-workspace-member.dto';
import { UpdateWorkspaceMemberRoleDto } from '../dto/update-workspace-member-role.dto';
import { WorkspaceAccessGuard } from '../guards/workspace-access.guard';
import { WorkspaceRolesGuard } from '../guards/workspace-roles.guard';
import { WorkspaceMembersService } from '../service/workspace-members.service';

@ApiTags('Workspace Members')
@ApiBearerAuth('access-token')
@Controller('workspaces/:workspaceId/members')
@UseGuards(WorkspaceAccessGuard, WorkspaceRolesGuard)
export class WorkspaceMembersController {
  constructor(
    private readonly workspaceMembersService: WorkspaceMembersService,
    private readonly usersService: UsersService,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'List workspace members',
  })
  list(@Param('workspaceId') workspaceId: string) {
    return this.workspaceMembersService.listMembers(workspaceId);
  }

  @Post()
  @WorkspaceRoles(WorkspaceRole.OWNER, WorkspaceRole.ADMIN)
  @ApiOperation({
    summary: 'Add an existing user to workspace',
  })
  async add(@Param('workspaceId') workspaceId: string, @Body() dto: AddWorkspaceMemberDto) {
    const user = await this.usersService.findByEmail(dto.email);

    if (!user) {
      throw new NotFoundException('A registered user with this email was not found');
    }

    return this.workspaceMembersService.addMember({
      workspaceId,
      userId: user.id,
      role: dto.role ?? WorkspaceRole.VIEWER,
    });
  }

  @Patch(':userId')
  @WorkspaceRoles(WorkspaceRole.OWNER, WorkspaceRole.ADMIN)
  @ApiOperation({
    summary: 'Update workspace member role',
  })
  updateRole(
    @Param('workspaceId') workspaceId: string,
    @Param('userId') userId: string,
    @Body() dto: UpdateWorkspaceMemberRoleDto,
  ) {
    return this.workspaceMembersService.updateRole(workspaceId, userId, dto.role);
  }

  @Delete(':userId')
  @WorkspaceRoles(WorkspaceRole.OWNER, WorkspaceRole.ADMIN)
  @ApiOperation({
    summary: 'Remove workspace member',
  })
  async remove(@Param('workspaceId') workspaceId: string, @Param('userId') userId: string) {
    await this.workspaceMembersService.removeMember(workspaceId, userId);

    return {
      message: 'Workspace member removed',
    };
  }
}
