import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { WorkspaceRole } from '../../../generated/prisma/client';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../auth/interfaces/authenticated-user.interface';
import { WorkspaceRoles } from '../decorators/workspace-roles.decorator';
import { WorkspaceAccessGuard } from '../guards/workspace-access.guard';
import { WorkspaceRolesGuard } from '../guards/workspace-roles.guard';
import { TransferOwnershipDto } from '../dto/transfer-ownership.dto';
import { UpdateWorkspaceDto } from '../dto/update-workspace.dto';
import { WorkspacesService } from '../service/workspaces.service';

@ApiTags('Workspaces')
@ApiBearerAuth('access-token')
@Controller('workspaces')
export class WorkspacesController {
  constructor(private readonly workspacesService: WorkspacesService) {}

  @Get()
  @ApiOperation({
    summary: 'List authenticated user workspaces',
  })
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.workspacesService.listForUser(user.id);
  }

  @Get(':workspaceId')
  @UseGuards(WorkspaceAccessGuard)
  @ApiOperation({
    summary: 'Get accessible workspace',
  })
  getOne(@Param('workspaceId') workspaceId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.workspacesService.findForUser(workspaceId, user.id);
  }

  @Patch(':workspaceId')
  @UseGuards(WorkspaceAccessGuard, WorkspaceRolesGuard)
  @WorkspaceRoles(WorkspaceRole.OWNER, WorkspaceRole.ADMIN)
  @ApiOperation({
    summary: 'Update workspace',
  })
  update(@Param('workspaceId') workspaceId: string, @Body() dto: UpdateWorkspaceDto) {
    return this.workspacesService.update(workspaceId, dto);
  }

  @Post(':workspaceId/transfer-ownership')
  @UseGuards(WorkspaceAccessGuard, WorkspaceRolesGuard)
  @WorkspaceRoles(WorkspaceRole.OWNER)
  @ApiOperation({
    summary: 'Transfer workspace ownership',
  })
  transferOwnership(@Param('workspaceId') workspaceId: string, @Body() dto: TransferOwnershipDto, @CurrentUser() user: AuthenticatedUser) {
    return this.workspacesService.transferOwnership(workspaceId, user.id, dto.newOwnerUserId);
  }
}
