import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { WorkspaceRoles } from '../../workspace/decorators/workspace-roles.decorator';
import { WorkspaceAccessGuard } from '../../workspace/guards/workspace-access.guard';
import { WorkspaceRolesGuard } from '../../workspace/guards/workspace-roles.guard';
import { LinkRepositoryApplicationDto } from '../dto/repository.dto';
import { RepositoriesService } from '../services/repositories.service';
import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { WorkspaceRole } from 'src/generated/prisma/enums';

const WRITE_ROLES = [WorkspaceRole.OWNER, WorkspaceRole.ADMIN, WorkspaceRole.DEVELOPER];

const ADMIN_ROLES = [WorkspaceRole.OWNER, WorkspaceRole.ADMIN];

@ApiTags('Repositories')
@ApiBearerAuth('access-token')
@Controller('workspaces/:workspaceId/repositories')
@UseGuards(JwtAuthGuard, WorkspaceAccessGuard, WorkspaceRolesGuard)
export class RepositoriesController {
  constructor(private readonly repositoriesService: RepositoriesService) {}

  @Get()
  list(
    @Param('workspaceId', ParseUUIDPipe)
    workspaceId: string,
  ) {
    return this.repositoriesService.list(workspaceId);
  }

  @Get(':repositoryId')
  findOne(
    @Param('workspaceId', ParseUUIDPipe)
    workspaceId: string,

    @Param('repositoryId', ParseUUIDPipe)
    repositoryId: string,
  ) {
    return this.repositoriesService.findOne(workspaceId, repositoryId);
  }

  @Post('sync')
  @WorkspaceRoles(...WRITE_ROLES)
  syncWorkspace(
    @Param('workspaceId', ParseUUIDPipe)
    workspaceId: string,
  ) {
    return this.repositoriesService.syncWorkspace(workspaceId);
  }

  @Post(':repositoryId/sync')
  @WorkspaceRoles(...WRITE_ROLES)
  syncOne(
    @Param('workspaceId', ParseUUIDPipe)
    workspaceId: string,

    @Param('repositoryId', ParseUUIDPipe)
    repositoryId: string,
  ) {
    return this.repositoriesService.syncOne(workspaceId, repositoryId);
  }

  @Patch(':repositoryId/application')
  @WorkspaceRoles(...WRITE_ROLES)
  linkApplication(
    @Param('workspaceId', ParseUUIDPipe)
    workspaceId: string,

    @Param('repositoryId', ParseUUIDPipe)
    repositoryId: string,

    @Body()
    dto: LinkRepositoryApplicationDto,
  ) {
    return this.repositoriesService.linkApplication(workspaceId, repositoryId, dto.applicationId);
  }

  @Delete(':repositoryId/application')
  @WorkspaceRoles(...WRITE_ROLES)
  unlinkApplication(
    @Param('workspaceId', ParseUUIDPipe)
    workspaceId: string,

    @Param('repositoryId', ParseUUIDPipe)
    repositoryId: string,
  ) {
    return this.repositoriesService.unlinkApplication(workspaceId, repositoryId);
  }

  @Delete('github/installations/:installationRecordId')
  @WorkspaceRoles(...ADMIN_ROLES)
  disconnectInstallation(
    @Param('workspaceId', ParseUUIDPipe)
    workspaceId: string,

    @Param('installationRecordId', ParseUUIDPipe)
    installationRecordId: string,
  ) {
    return this.repositoriesService.disconnectInstallation(workspaceId, installationRecordId);
  }
}
