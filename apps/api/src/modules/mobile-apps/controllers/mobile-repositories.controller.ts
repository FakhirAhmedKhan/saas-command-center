import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { WorkspaceRoles } from '../../workspace/decorators/workspace-roles.decorator';
import { WorkspaceAccessGuard } from '../../workspace/guards/workspace-access.guard';
import { WorkspaceRolesGuard } from '../../workspace/guards/workspace-roles.guard';
import { LinkMobileRepositoryDto } from '../dto/mobile-repository.dto';
import { MobileRepositoryService } from '../services/mobile-repository.service';
import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { WorkspaceRole } from 'src/generated/prisma/enums';

@ApiTags('Mobile Application Repository')
@ApiBearerAuth('access-token')
@Controller('workspaces/:workspaceId/mobile-apps/:mobileAppId/repository')
@UseGuards(JwtAuthGuard, WorkspaceAccessGuard, WorkspaceRolesGuard)
export class MobileRepositoriesController {
  constructor(private readonly service: MobileRepositoryService) {}

  @Get()
  @ApiOperation({
    summary: 'Get repository linked to mobile application',
  })
  getLinkedRepository(
    @Param('workspaceId', ParseUUIDPipe)
    workspaceId: string,

    @Param('mobileAppId', ParseUUIDPipe)
    mobileAppId: string,
  ) {
    return this.service.getLinkedRepository(workspaceId, mobileAppId);
  }

  @Post()
  @WorkspaceRoles(WorkspaceRole.OWNER, WorkspaceRole.ADMIN, WorkspaceRole.DEVELOPER)
  @ApiOperation({
    summary: 'Link repository to mobile application',
  })
  link(
    @Param('workspaceId', ParseUUIDPipe)
    workspaceId: string,

    @Param('mobileAppId', ParseUUIDPipe)
    mobileAppId: string,

    @Body()
    dto: LinkMobileRepositoryDto,
  ) {
    return this.service.link(workspaceId, mobileAppId, dto.repositoryId);
  }

  @Delete()
  @WorkspaceRoles(WorkspaceRole.OWNER, WorkspaceRole.ADMIN, WorkspaceRole.DEVELOPER)
  @ApiOperation({
    summary: 'Unlink repository from mobile application',
  })
  unlink(
    @Param('workspaceId', ParseUUIDPipe)
    workspaceId: string,

    @Param('mobileAppId', ParseUUIDPipe)
    mobileAppId: string,
  ) {
    return this.service.unlink(workspaceId, mobileAppId);
  }
}
