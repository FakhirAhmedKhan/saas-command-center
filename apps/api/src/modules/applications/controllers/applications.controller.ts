import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import type { Request } from 'express';

import { WorkspaceRole } from 'src/generated/prisma/enums';

import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

import { WorkspaceRoles } from '../../workspace/decorators/workspace-roles.decorator';

import { WorkspaceAccessGuard } from '../../workspace/guards/workspace-access.guard';

import { WorkspaceRolesGuard } from '../../workspace/guards/workspace-roles.guard';

import {
  ApplicationListQueryDto,
  CreateApplicationDto,
  UpdateApplicationDto,
} from '../dto/application.dto';

import { CreateApplicationLinkDto, UpdateApplicationLinkDto } from '../dto/application-link.dto';

import {
  CreateApplicationTechnologyDto,
  UpdateApplicationTechnologyDto,
} from '../dto/application-technology.dto';

import { ApplicationsService } from '../services/applications.service';

interface AuthenticatedRequest extends Request {
  user: {
    id: string;
    email?: string;
  };
}

@ApiTags('SaaS Applications')
@ApiBearerAuth('access-token')
@Controller('workspaces/:workspaceId/applications')
@UseGuards(JwtAuthGuard, WorkspaceAccessGuard, WorkspaceRolesGuard)
export class ApplicationsController {
  constructor(private readonly applicationsService: ApplicationsService) { }

  @Post()
  @WorkspaceRoles(WorkspaceRole.OWNER, WorkspaceRole.ADMIN, WorkspaceRole.DEVELOPER)
  @ApiOperation({
    summary: 'Create a SaaS application',
  })
  create(
    @Req()
    request: AuthenticatedRequest,

    @Param('workspaceId', ParseUUIDPipe)
    workspaceId: string,

    @Body()
    dto: CreateApplicationDto,
  ) {
    return this.applicationsService.create(workspaceId, dto, request.user.id);
  }

  @Get()
  @ApiOperation({
    summary: 'List workspace SaaS applications',
  })
  list(
    @Param('workspaceId', ParseUUIDPipe)
    workspaceId: string,

    @Query()
    query: ApplicationListQueryDto,
  ) {
    return this.applicationsService.list(workspaceId, query);
  }

  @Get(':applicationId')
  @ApiOperation({
    summary: 'Get a SaaS application',
  })
  findOne(
    @Param('workspaceId', ParseUUIDPipe)
    workspaceId: string,

    @Param('applicationId', ParseUUIDPipe)
    applicationId: string,
  ) {
    return this.applicationsService.findOne(workspaceId, applicationId);
  }

  @Patch(':applicationId')
  @WorkspaceRoles(WorkspaceRole.OWNER, WorkspaceRole.ADMIN, WorkspaceRole.DEVELOPER)
  @ApiOperation({
    summary: 'Update a SaaS application',
  })
  update(
    @Req()
    request: AuthenticatedRequest,

    @Param('workspaceId', ParseUUIDPipe)
    workspaceId: string,

    @Param('applicationId', ParseUUIDPipe)
    applicationId: string,

    @Body()
    dto: UpdateApplicationDto,
  ) {
    return this.applicationsService.update(workspaceId, applicationId, dto, request.user.id);
  }

  @Post(':applicationId/archive')
  @HttpCode(HttpStatus.OK)
  @WorkspaceRoles(
    WorkspaceRole.OWNER,
    WorkspaceRole.ADMIN,
  )
  archive(
    @Req()
    request: AuthenticatedRequest,

    @Param('workspaceId', ParseUUIDPipe)
    workspaceId: string,

    @Param('applicationId', ParseUUIDPipe)
    applicationId: string,
  ) {
    return this.applicationsService.archive(
      workspaceId,
      applicationId,
      request.user.id,
    );
  }

  @Post(':applicationId/restore')
  @HttpCode(HttpStatus.OK)
  @WorkspaceRoles(
    WorkspaceRole.OWNER,
    WorkspaceRole.ADMIN,
  )
  restore(
    @Req()
    request: AuthenticatedRequest,

    @Param('workspaceId', ParseUUIDPipe)
    workspaceId: string,

    @Param('applicationId', ParseUUIDPipe)
    applicationId: string,
  ) {
    return this.applicationsService.restore(
      workspaceId,
      applicationId,
      request.user.id,
    );
  }

  @Delete(':applicationId')
  @WorkspaceRoles(WorkspaceRole.OWNER)
  async permanentDelete(
    @Req()
    request: AuthenticatedRequest,

    @Param('workspaceId', ParseUUIDPipe)
    workspaceId: string,

    @Param('applicationId', ParseUUIDPipe)
    applicationId: string,
  ) {
    await this.applicationsService.permanentDelete(workspaceId, applicationId, request.user.id);

    return {
      message: 'SaaS application permanently deleted',
    };
  }

  @Post(':applicationId/technologies')
  @WorkspaceRoles(WorkspaceRole.OWNER, WorkspaceRole.ADMIN, WorkspaceRole.DEVELOPER)
  addTechnology(
    @Req()
    request: AuthenticatedRequest,

    @Param('workspaceId', ParseUUIDPipe)
    workspaceId: string,

    @Param('applicationId', ParseUUIDPipe)
    applicationId: string,

    @Body()
    dto: CreateApplicationTechnologyDto,
  ) {
    return this.applicationsService.addTechnology(workspaceId, applicationId, dto, request.user.id);
  }

  @Patch(':applicationId/technologies/:technologyId')
  @WorkspaceRoles(WorkspaceRole.OWNER, WorkspaceRole.ADMIN, WorkspaceRole.DEVELOPER)
  updateTechnology(
    @Req()
    request: AuthenticatedRequest,

    @Param('workspaceId', ParseUUIDPipe)
    workspaceId: string,

    @Param('applicationId', ParseUUIDPipe)
    applicationId: string,

    @Param('technologyId', ParseUUIDPipe)
    technologyId: string,

    @Body()
    dto: UpdateApplicationTechnologyDto,
  ) {
    return this.applicationsService.updateTechnology(
      workspaceId,
      applicationId,
      technologyId,
      dto,
      request.user.id,
    );
  }

  @Delete(':applicationId/technologies/:technologyId')
  @WorkspaceRoles(WorkspaceRole.OWNER, WorkspaceRole.ADMIN, WorkspaceRole.DEVELOPER)
  async removeTechnology(
    @Req()
    request: AuthenticatedRequest,

    @Param('workspaceId', ParseUUIDPipe)
    workspaceId: string,

    @Param('applicationId', ParseUUIDPipe)
    applicationId: string,

    @Param('technologyId', ParseUUIDPipe)
    technologyId: string,
  ) {
    await this.applicationsService.removeTechnology(
      workspaceId,
      applicationId,
      technologyId,
      request.user.id,
    );

    return {
      message: 'Technology removed',
    };
  }

  @Post(':applicationId/links')
  @WorkspaceRoles(WorkspaceRole.OWNER, WorkspaceRole.ADMIN, WorkspaceRole.DEVELOPER)
  addLink(
    @Req()
    request: AuthenticatedRequest,

    @Param('workspaceId', ParseUUIDPipe)
    workspaceId: string,

    @Param('applicationId', ParseUUIDPipe)
    applicationId: string,

    @Body()
    dto: CreateApplicationLinkDto,
  ) {
    return this.applicationsService.addLink(workspaceId, applicationId, dto, request.user.id);
  }

  @Patch(':applicationId/links/:linkId')
  @WorkspaceRoles(WorkspaceRole.OWNER, WorkspaceRole.ADMIN, WorkspaceRole.DEVELOPER)
  updateLink(
    @Req()
    request: AuthenticatedRequest,

    @Param('workspaceId', ParseUUIDPipe)
    workspaceId: string,

    @Param('applicationId', ParseUUIDPipe)
    applicationId: string,

    @Param('linkId', ParseUUIDPipe)
    linkId: string,

    @Body()
    dto: UpdateApplicationLinkDto,
  ) {
    return this.applicationsService.updateLink(
      workspaceId,
      applicationId,
      linkId,
      dto,
      request.user.id,
    );
  }

  @Delete(':applicationId/links/:linkId')
  @WorkspaceRoles(WorkspaceRole.OWNER, WorkspaceRole.ADMIN, WorkspaceRole.DEVELOPER)
  async removeLink(
    @Req()
    request: AuthenticatedRequest,

    @Param('workspaceId', ParseUUIDPipe)
    workspaceId: string,

    @Param('applicationId', ParseUUIDPipe)
    applicationId: string,

    @Param('linkId', ParseUUIDPipe)
    linkId: string,
  ) {
    await this.applicationsService.removeLink(workspaceId, applicationId, linkId, request.user.id);

    return {
      message: 'Application link removed',
    };
  }
}
