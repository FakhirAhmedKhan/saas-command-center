import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';

import {
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';

import {
  CurrentUser,
} from '../../auth/decorators/current-user.decorator';

import type {
  AuthenticatedUser,
} from '../../auth/interfaces/auth-session.interface';

import {
  JwtAuthGuard,
} from '../../auth/guards/jwt-auth.guard';

import {
  WorkspaceAccessGuard,
} from '../../workspace/guards/workspace-access.guard';

import {
  CreateDeploymentDto,
  DeploymentListQueryDto,
  TransitionDeploymentDto,
} from '../dto/release-deployment.dto';

import {
  ReleaseDeploymentService,
} from '../services/release-deployment.service';

@ApiTags(
  'Deployments',
)
@ApiBearerAuth(
  'access-token',
)
@Controller(
  'workspaces/:workspaceId/applications/:applicationId/deployments',
)
@UseGuards(
  JwtAuthGuard,
  WorkspaceAccessGuard,
)
export class DeploymentsController {
  constructor(
    private readonly service:
      ReleaseDeploymentService,
  ) {}

  @Get('options')
  getOptions(
    @Param(
      'workspaceId',
      ParseUUIDPipe,
    )
    workspaceId:
      string,

    @Param(
      'applicationId',
      ParseUUIDPipe,
    )
    applicationId:
      string,

    @CurrentUser()
    user:
      AuthenticatedUser,
  ) {
    return this.service
      .getOptions(
        workspaceId,
        applicationId,
        user.id,
      );
  }

  @Get('current')
  getCurrentVersions(
    @Param(
      'workspaceId',
      ParseUUIDPipe,
    )
    workspaceId:
      string,

    @Param(
      'applicationId',
      ParseUUIDPipe,
    )
    applicationId:
      string,
  ) {
    return this.service
      .getCurrentVersions(
        workspaceId,
        applicationId,
      );
  }

  @Get()
  list(
    @Param(
      'workspaceId',
      ParseUUIDPipe,
    )
    workspaceId:
      string,

    @Param(
      'applicationId',
      ParseUUIDPipe,
    )
    applicationId:
      string,

    @Query()
    query:
      DeploymentListQueryDto,
  ) {
    return this.service
      .listDeployments(
        workspaceId,
        applicationId,
        query,
      );
  }

  @Post()
  @ApiOperation({
    summary:
      'Create a deployment record',
  })
  create(
    @Param(
      'workspaceId',
      ParseUUIDPipe,
    )
    workspaceId:
      string,

    @Param(
      'applicationId',
      ParseUUIDPipe,
    )
    applicationId:
      string,

    @CurrentUser()
    user:
      AuthenticatedUser,

    @Body()
    input:
      CreateDeploymentDto,
  ) {
    return this.service
      .createDeployment(
        workspaceId,
        applicationId,
        user.id,
        input,
      );
  }

  @Get(':deploymentId')
  getOne(
    @Param(
      'workspaceId',
      ParseUUIDPipe,
    )
    workspaceId:
      string,

    @Param(
      'applicationId',
      ParseUUIDPipe,
    )
    applicationId:
      string,

    @Param(
      'deploymentId',
      ParseUUIDPipe,
    )
    deploymentId:
      string,
  ) {
    return this.service
      .getDeployment(
        workspaceId,
        applicationId,
        deploymentId,
      );
  }

  @Post(
    ':deploymentId/transition',
  )
  @ApiOperation({
    summary:
      'Change deployment status',
  })
  transition(
    @Param(
      'workspaceId',
      ParseUUIDPipe,
    )
    workspaceId:
      string,

    @Param(
      'applicationId',
      ParseUUIDPipe,
    )
    applicationId:
      string,

    @Param(
      'deploymentId',
      ParseUUIDPipe,
    )
    deploymentId:
      string,

    @CurrentUser()
    user:
      AuthenticatedUser,

    @Body()
    input:
      TransitionDeploymentDto,
  ) {
    return this.service
      .transitionDeployment(
        workspaceId,
        applicationId,
        deploymentId,
        user.id,
        input,
      );
  }
}