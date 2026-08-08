import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';

import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { CurrentUser } from '../../auth/decorators/current-user.decorator';

import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

import { WorkspaceAccessGuard } from '../../workspace/guards/workspace-access.guard';

import {
  CreateReleaseDto,
  ReleaseListQueryDto,
  UpdateReleaseDto,
} from '../dto/release-deployment.dto';

import { ReleaseDeploymentService } from '../services/release-deployment.service';
import { AuthenticatedUser } from 'src/modules/auth/interfaces/authenticated-user.interface';

@ApiTags('Releases')
@ApiBearerAuth('access-token')
@Controller('workspaces/:workspaceId/applications/:applicationId/releases')
@UseGuards(JwtAuthGuard, WorkspaceAccessGuard)
export class ReleasesController {
  constructor(private readonly service: ReleaseDeploymentService) {}

  @Get()
  list(
    @Param('workspaceId', ParseUUIDPipe)
    workspaceId: string,

    @Param('applicationId', ParseUUIDPipe)
    applicationId: string,

    @Query()
    query: ReleaseListQueryDto,
  ) {
    return this.service.listReleases(workspaceId, applicationId, query);
  }

  @Post()
  @ApiOperation({
    summary: 'Create an application release',
  })
  create(
    @Param('workspaceId', ParseUUIDPipe)
    workspaceId: string,

    @Param('applicationId', ParseUUIDPipe)
    applicationId: string,

    @CurrentUser()
    user: AuthenticatedUser,

    @Body()
    input: CreateReleaseDto,
  ) {
    return this.service.createRelease(workspaceId, applicationId, user.id, input);
  }

  @Get(':releaseId')
  getOne(
    @Param('workspaceId', ParseUUIDPipe)
    workspaceId: string,

    @Param('applicationId', ParseUUIDPipe)
    applicationId: string,

    @Param('releaseId', ParseUUIDPipe)
    releaseId: string,
  ) {
    return this.service.getRelease(workspaceId, applicationId, releaseId);
  }

  @Patch(':releaseId')
  update(
    @Param('workspaceId', ParseUUIDPipe)
    workspaceId: string,

    @Param('applicationId', ParseUUIDPipe)
    applicationId: string,

    @Param('releaseId', ParseUUIDPipe)
    releaseId: string,

    @CurrentUser()
    user: AuthenticatedUser,

    @Body()
    input: UpdateReleaseDto,
  ) {
    return this.service.updateRelease(workspaceId, applicationId, releaseId, user.id, input);
  }
}
