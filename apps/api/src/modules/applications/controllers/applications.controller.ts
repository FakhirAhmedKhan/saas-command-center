import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';

import {
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';

import { WorkspaceRole } from 'src/generated/prisma/enums';

import { WorkspaceAccessGuard } from '../../workspace/guards/workspace-access.guard';
import { WorkspaceRolesGuard } from '../../workspace/guards/workspace-roles.guard';
import { WorkspaceRoles } from '../../workspace/decorators/workspace-roles.decorator';

import {
  ApplicationListQueryDto,
  CreateApplicationDto,
  UpdateApplicationDto,
} from '../dto/application.dto';

import {
  CreateApplicationTechnologyDto,
  UpdateApplicationTechnologyDto,
} from '../dto/application-technology.dto';

import {
  CreateApplicationLinkDto,
  UpdateApplicationLinkDto,
} from '../dto/application-link.dto';

import { ApplicationsService } from '../services/applications.service';

@ApiTags('SaaS Applications')
@ApiBearerAuth('access-token')
@Controller('workspaces/:workspaceId/applications')
@UseGuards(
  WorkspaceAccessGuard,
  WorkspaceRolesGuard,
)
export class ApplicationsController {
  constructor(
    private readonly applicationsService:
      ApplicationsService,
  ) {}

  @Post()
  @WorkspaceRoles(
    WorkspaceRole.OWNER,
    WorkspaceRole.ADMIN,
    WorkspaceRole.DEVELOPER,
  )
  @ApiOperation({
    summary: 'Create a SaaS application',
  })
  create(
    @Param('workspaceId', ParseUUIDPipe)
    workspaceId: string,

    @Body()
    dto: CreateApplicationDto,
  ) {
    return this.applicationsService.create(
      workspaceId,
      dto,
    );
  }

  @Get()
  @ApiOperation({
    summary:
      'List workspace SaaS applications',
  })
  list(
    @Param('workspaceId', ParseUUIDPipe)
    workspaceId: string,

    @Query()
    query: ApplicationListQueryDto,
  ) {
    return this.applicationsService.list(
      workspaceId,
      query,
    );
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
    return this.applicationsService.findOne(
      workspaceId,
      applicationId,
    );
  }

  @Patch(':applicationId')
  @WorkspaceRoles(
    WorkspaceRole.OWNER,
    WorkspaceRole.ADMIN,
    WorkspaceRole.DEVELOPER,
  )
  @ApiOperation({
    summary: 'Update a SaaS application',
  })
  update(
    @Param('workspaceId', ParseUUIDPipe)
    workspaceId: string,

    @Param('applicationId', ParseUUIDPipe)
    applicationId: string,

    @Body()
    dto: UpdateApplicationDto,
  ) {
    return this.applicationsService.update(
      workspaceId,
      applicationId,
      dto,
    );
  }

  @Post(':applicationId/archive')
  @WorkspaceRoles(
    WorkspaceRole.OWNER,
    WorkspaceRole.ADMIN,
  )
  @ApiOperation({
    summary: 'Archive a SaaS application',
  })
  archive(
    @Param('workspaceId', ParseUUIDPipe)
    workspaceId: string,

    @Param('applicationId', ParseUUIDPipe)
    applicationId: string,
  ) {
    return this.applicationsService.archive(
      workspaceId,
      applicationId,
    );
  }

  @Post(':applicationId/restore')
  @WorkspaceRoles(
    WorkspaceRole.OWNER,
    WorkspaceRole.ADMIN,
  )
  @ApiOperation({
    summary: 'Restore an archived application',
  })
  restore(
    @Param('workspaceId', ParseUUIDPipe)
    workspaceId: string,

    @Param('applicationId', ParseUUIDPipe)
    applicationId: string,
  ) {
    return this.applicationsService.restore(
      workspaceId,
      applicationId,
    );
  }

  @Delete(':applicationId')
  @WorkspaceRoles(WorkspaceRole.OWNER)
  @ApiOperation({
    summary:
      'Permanently delete an archived application',
  })
  async permanentDelete(
    @Param('workspaceId', ParseUUIDPipe)
    workspaceId: string,

    @Param('applicationId', ParseUUIDPipe)
    applicationId: string,
  ) {
    await this.applicationsService.permanentDelete(
      workspaceId,
      applicationId,
    );

    return {
      message:
        'SaaS application permanently deleted',
    };
  }

  @Post(':applicationId/technologies')
  @WorkspaceRoles(
    WorkspaceRole.OWNER,
    WorkspaceRole.ADMIN,
    WorkspaceRole.DEVELOPER,
  )
  @ApiOperation({
    summary:
      'Add technology to a SaaS application',
  })
  addTechnology(
    @Param('workspaceId', ParseUUIDPipe)
    workspaceId: string,

    @Param('applicationId', ParseUUIDPipe)
    applicationId: string,

    @Body()
    dto: CreateApplicationTechnologyDto,
  ) {
    return this.applicationsService.addTechnology(
      workspaceId,
      applicationId,
      dto,
    );
  }

  @Patch(
    ':applicationId/technologies/:technologyId',
  )
  @WorkspaceRoles(
    WorkspaceRole.OWNER,
    WorkspaceRole.ADMIN,
    WorkspaceRole.DEVELOPER,
  )
  @ApiOperation({
    summary:
      'Update an application technology',
  })
  updateTechnology(
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
    );
  }

  @Delete(
    ':applicationId/technologies/:technologyId',
  )
  @WorkspaceRoles(
    WorkspaceRole.OWNER,
    WorkspaceRole.ADMIN,
    WorkspaceRole.DEVELOPER,
  )
  @ApiOperation({
    summary:
      'Remove an application technology',
  })
  async removeTechnology(
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
    );

    return {
      message: 'Technology removed',
    };
  }

  @Post(':applicationId/links')
  @WorkspaceRoles(
    WorkspaceRole.OWNER,
    WorkspaceRole.ADMIN,
    WorkspaceRole.DEVELOPER,
  )
  @ApiOperation({
    summary: 'Add an application link',
  })
  addLink(
    @Param('workspaceId', ParseUUIDPipe)
    workspaceId: string,

    @Param('applicationId', ParseUUIDPipe)
    applicationId: string,

    @Body()
    dto: CreateApplicationLinkDto,
  ) {
    return this.applicationsService.addLink(
      workspaceId,
      applicationId,
      dto,
    );
  }

  @Patch(':applicationId/links/:linkId')
  @WorkspaceRoles(
    WorkspaceRole.OWNER,
    WorkspaceRole.ADMIN,
    WorkspaceRole.DEVELOPER,
  )
  @ApiOperation({
    summary: 'Update an application link',
  })
  updateLink(
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
    );
  }

  @Delete(':applicationId/links/:linkId')
  @WorkspaceRoles(
    WorkspaceRole.OWNER,
    WorkspaceRole.ADMIN,
    WorkspaceRole.DEVELOPER,
  )
  @ApiOperation({
    summary: 'Remove an application link',
  })
  async removeLink(
    @Param('workspaceId', ParseUUIDPipe)
    workspaceId: string,

    @Param('applicationId', ParseUUIDPipe)
    applicationId: string,

    @Param('linkId', ParseUUIDPipe)
    linkId: string,
  ) {
    await this.applicationsService.removeLink(
      workspaceId,
      applicationId,
      linkId,
    );

    return {
      message: 'Application link removed',
    };
  }
}