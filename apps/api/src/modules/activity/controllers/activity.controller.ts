import { Controller, Get, Param, ParseUUIDPipe, Query, UseGuards } from '@nestjs/common';

import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

import { WorkspaceAccessGuard } from '../../workspace/guards/workspace-access.guard';

import { ActivityQueryDto } from '../dto/activity-query.dto';

import { ActivityQueryService } from '../services/activity-query.service';

@ApiTags('Workspace Activity')
@ApiBearerAuth('access-token')
@Controller('workspaces/:workspaceId/activities')
@UseGuards(JwtAuthGuard, WorkspaceAccessGuard)
export class WorkspaceActivityController {
  constructor(private readonly activityQueryService: ActivityQueryService) {}

  @Get()
  @ApiOperation({
    summary: 'List workspace activity history',
  })
  list(
    @Param('workspaceId', ParseUUIDPipe)
    workspaceId: string,

    @Query()
    query: ActivityQueryDto,
  ) {
    return this.activityQueryService.listWorkspaceActivities(workspaceId, query);
  }
}

@ApiTags('Application Activity')
@ApiBearerAuth('access-token')
@Controller('workspaces/:workspaceId/applications/:applicationId/activities')
@UseGuards(JwtAuthGuard, WorkspaceAccessGuard)
export class ApplicationActivityController {
  constructor(private readonly activityQueryService: ActivityQueryService) {}

  @Get()
  @ApiOperation({
    summary: 'List application activity history',
  })
  list(
    @Param('workspaceId', ParseUUIDPipe)
    workspaceId: string,

    @Param('applicationId', ParseUUIDPipe)
    applicationId: string,

    @Query()
    query: ActivityQueryDto,
  ) {
    return this.activityQueryService.listApplicationActivities(workspaceId, applicationId, query);
  }
}
