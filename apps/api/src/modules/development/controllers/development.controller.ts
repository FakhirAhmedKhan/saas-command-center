import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { WorkspaceRoles } from '../../workspace/decorators/workspace-roles.decorator';
import { WorkspaceAccessGuard } from '../../workspace/guards/workspace-access.guard';
import { WorkspaceRolesGuard } from '../../workspace/guards/workspace-roles.guard';
import {
  ApplyDevelopmentTemplateDto,
  BlockerQueryDto,
  ChangeTaskStatusDto,
  CreateBlockerDto,
  CreateMilestoneDto,
  CreateTaskDto,
  MoveTaskDto,
  ReorderItemsDto,
  ResolveBlockerDto,
  SkipWorkItemDto,
  UpdateBlockerDto,
  UpdateMilestoneDto,
  UpdateTaskDto,
} from '../dto/development.dto';
import { BlockersService } from '../services/blockers.service';
import { DevelopmentSummaryService } from '../services/development-summary.service';
import { DevelopmentTemplatesService } from '../services/development-templates.service';
import { MilestonesService } from '../services/milestones.service';
import { TasksService } from '../services/tasks.service';
import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { FastifyRequest } from 'fastify';
import { WorkspaceRole } from 'src/generated/prisma/enums';

interface AuthenticatedRequest extends FastifyRequest {
  user: {
    id: string;
  };
}

const WRITE_ROLES = [WorkspaceRole.OWNER, WorkspaceRole.ADMIN, WorkspaceRole.DEVELOPER];

@ApiTags('Development Templates')
@ApiBearerAuth('access-token')
@Controller('workspaces/:workspaceId/development/templates')
@UseGuards(JwtAuthGuard, WorkspaceAccessGuard)
export class DevelopmentTemplatesController {
  constructor(private readonly developmentTemplates: DevelopmentTemplatesService) {}

  @Get()
  listTemplates() {
    return this.developmentTemplates.getTemplates();
  }
}

@ApiTags('Application Development')
@ApiBearerAuth('access-token')
@Controller('workspaces/:workspaceId/applications/:applicationId/development')
@UseGuards(JwtAuthGuard, WorkspaceAccessGuard, WorkspaceRolesGuard)
export class DevelopmentController {
  constructor(
    private readonly summary: DevelopmentSummaryService,
    private readonly developmentTemplates: DevelopmentTemplatesService,
    private readonly milestones: MilestonesService,
    private readonly tasks: TasksService,
    private readonly blockers: BlockersService,
  ) {}

  @Get('summary')
  getSummary(
    @Param('workspaceId', ParseUUIDPipe)
    workspaceId: string,

    @Param('applicationId', ParseUUIDPipe)
    applicationId: string,
  ) {
    return this.summary.getSummary(workspaceId, applicationId);
  }

  @Post('apply-template')
  @WorkspaceRoles(...WRITE_ROLES)
  applyTemplate(
    @Req()
    request: AuthenticatedRequest,

    @Param('workspaceId', ParseUUIDPipe)
    workspaceId: string,

    @Param('applicationId', ParseUUIDPipe)
    applicationId: string,

    @Body()
    dto: ApplyDevelopmentTemplateDto,
  ) {
    return this.developmentTemplates.applyTemplate(workspaceId, applicationId, dto, request.user.id);
  }

  @Get('milestones')
  listMilestones(
    @Param('workspaceId', ParseUUIDPipe)
    workspaceId: string,

    @Param('applicationId', ParseUUIDPipe)
    applicationId: string,
  ) {
    return this.milestones.listMilestones(workspaceId, applicationId);
  }

  @Post('milestones')
  @WorkspaceRoles(...WRITE_ROLES)
  createMilestone(
    @Req()
    request: AuthenticatedRequest,

    @Param('workspaceId', ParseUUIDPipe)
    workspaceId: string,

    @Param('applicationId', ParseUUIDPipe)
    applicationId: string,

    @Body()
    dto: CreateMilestoneDto,
  ) {
    return this.milestones.createMilestone(workspaceId, applicationId, dto, request.user.id);
  }

  @Patch('milestones/:milestoneId')
  @WorkspaceRoles(...WRITE_ROLES)
  updateMilestone(
    @Req()
    request: AuthenticatedRequest,

    @Param('workspaceId', ParseUUIDPipe)
    workspaceId: string,

    @Param('applicationId', ParseUUIDPipe)
    applicationId: string,

    @Param('milestoneId', ParseUUIDPipe)
    milestoneId: string,

    @Body()
    dto: UpdateMilestoneDto,
  ) {
    return this.milestones.updateMilestone(workspaceId, applicationId, milestoneId, dto, request.user.id);
  }

  @Post('milestones/:milestoneId/complete')
  @WorkspaceRoles(...WRITE_ROLES)
  completeMilestone(
    @Req()
    request: AuthenticatedRequest,
    @Param('workspaceId', ParseUUIDPipe)
    workspaceId: string,
    @Param('applicationId', ParseUUIDPipe)
    applicationId: string,
    @Param('milestoneId', ParseUUIDPipe)
    milestoneId: string,
  ) {
    return this.milestones.completeMilestone(workspaceId, applicationId, milestoneId, request.user.id);
  }

  @Post('milestones/:milestoneId/reopen')
  @WorkspaceRoles(...WRITE_ROLES)
  reopenMilestone(
    @Req()
    request: AuthenticatedRequest,
    @Param('workspaceId', ParseUUIDPipe)
    workspaceId: string,
    @Param('applicationId', ParseUUIDPipe)
    applicationId: string,
    @Param('milestoneId', ParseUUIDPipe)
    milestoneId: string,
  ) {
    return this.milestones.reopenMilestone(workspaceId, applicationId, milestoneId, request.user.id);
  }

  @Post('milestones/:milestoneId/skip')
  @WorkspaceRoles(...WRITE_ROLES)
  skipMilestone(
    @Req()
    request: AuthenticatedRequest,
    @Param('workspaceId', ParseUUIDPipe)
    workspaceId: string,
    @Param('applicationId', ParseUUIDPipe)
    applicationId: string,
    @Param('milestoneId', ParseUUIDPipe)
    milestoneId: string,
    @Body()
    dto: SkipWorkItemDto,
  ) {
    return this.milestones.skipMilestone(workspaceId, applicationId, milestoneId, dto, request.user.id);
  }

  @Delete('milestones/:milestoneId')
  @WorkspaceRoles(...WRITE_ROLES)
  async deleteMilestone(
    @Req()
    request: AuthenticatedRequest,
    @Param('workspaceId', ParseUUIDPipe)
    workspaceId: string,
    @Param('applicationId', ParseUUIDPipe)
    applicationId: string,
    @Param('milestoneId', ParseUUIDPipe)
    milestoneId: string,
  ) {
    await this.milestones.deleteMilestone(workspaceId, applicationId, milestoneId, request.user.id);

    return {
      message: 'Milestone deleted',
    };
  }

  @Post('milestones/reorder')
  @WorkspaceRoles(...WRITE_ROLES)
  reorderMilestones(
    @Req()
    request: AuthenticatedRequest,
    @Param('workspaceId', ParseUUIDPipe)
    workspaceId: string,
    @Param('applicationId', ParseUUIDPipe)
    applicationId: string,
    @Body()
    dto: ReorderItemsDto,
  ) {
    return this.milestones.reorderMilestones(workspaceId, applicationId, dto, request.user.id);
  }

  @Post('milestones/:milestoneId/tasks')
  @WorkspaceRoles(...WRITE_ROLES)
  createTask(
    @Req()
    request: AuthenticatedRequest,
    @Param('workspaceId', ParseUUIDPipe)
    workspaceId: string,
    @Param('applicationId', ParseUUIDPipe)
    applicationId: string,
    @Param('milestoneId', ParseUUIDPipe)
    milestoneId: string,
    @Body()
    dto: CreateTaskDto,
  ) {
    return this.tasks.createTask(workspaceId, applicationId, milestoneId, dto, request.user.id);
  }

  @Patch('tasks/:taskId')
  @WorkspaceRoles(...WRITE_ROLES)
  updateTask(
    @Req()
    request: AuthenticatedRequest,
    @Param('workspaceId', ParseUUIDPipe)
    workspaceId: string,
    @Param('applicationId', ParseUUIDPipe)
    applicationId: string,
    @Param('taskId', ParseUUIDPipe)
    taskId: string,
    @Body()
    dto: UpdateTaskDto,
  ) {
    return this.tasks.updateTask(workspaceId, applicationId, taskId, dto, request.user.id);
  }

  @Post('tasks/:taskId/status')
  @WorkspaceRoles(...WRITE_ROLES)
  setTaskStatus(
    @Req()
    request: AuthenticatedRequest,
    @Param('workspaceId', ParseUUIDPipe)
    workspaceId: string,
    @Param('applicationId', ParseUUIDPipe)
    applicationId: string,
    @Param('taskId', ParseUUIDPipe)
    taskId: string,
    @Body()
    dto: ChangeTaskStatusDto,
  ) {
    return this.tasks.setTaskStatus(workspaceId, applicationId, taskId, dto, request.user.id);
  }

  @Post('tasks/:taskId/complete')
  @WorkspaceRoles(...WRITE_ROLES)
  completeTask(
    @Req()
    request: AuthenticatedRequest,
    @Param('workspaceId', ParseUUIDPipe)
    workspaceId: string,
    @Param('applicationId', ParseUUIDPipe)
    applicationId: string,
    @Param('taskId', ParseUUIDPipe)
    taskId: string,
  ) {
    return this.tasks.completeTask(workspaceId, applicationId, taskId, request.user.id);
  }

  @Post('tasks/:taskId/reopen')
  @WorkspaceRoles(...WRITE_ROLES)
  reopenTask(
    @Req()
    request: AuthenticatedRequest,
    @Param('workspaceId', ParseUUIDPipe)
    workspaceId: string,
    @Param('applicationId', ParseUUIDPipe)
    applicationId: string,
    @Param('taskId', ParseUUIDPipe)
    taskId: string,
  ) {
    return this.tasks.reopenTask(workspaceId, applicationId, taskId, request.user.id);
  }

  @Post('tasks/:taskId/skip')
  @WorkspaceRoles(...WRITE_ROLES)
  skipTask(
    @Req()
    request: AuthenticatedRequest,
    @Param('workspaceId', ParseUUIDPipe)
    workspaceId: string,
    @Param('applicationId', ParseUUIDPipe)
    applicationId: string,
    @Param('taskId', ParseUUIDPipe)
    taskId: string,
    @Body()
    dto: SkipWorkItemDto,
  ) {
    return this.tasks.skipTask(workspaceId, applicationId, taskId, dto, request.user.id);
  }

  @Post('tasks/:taskId/move')
  @WorkspaceRoles(...WRITE_ROLES)
  moveTask(
    @Req()
    request: AuthenticatedRequest,
    @Param('workspaceId', ParseUUIDPipe)
    workspaceId: string,
    @Param('applicationId', ParseUUIDPipe)
    applicationId: string,
    @Param('taskId', ParseUUIDPipe)
    taskId: string,
    @Body()
    dto: MoveTaskDto,
  ) {
    return this.tasks.moveTask(workspaceId, applicationId, taskId, dto, request.user.id);
  }

  @Post('milestones/:milestoneId/tasks/reorder')
  @WorkspaceRoles(...WRITE_ROLES)
  reorderTasks(
    @Req()
    request: AuthenticatedRequest,
    @Param('workspaceId', ParseUUIDPipe)
    workspaceId: string,
    @Param('applicationId', ParseUUIDPipe)
    applicationId: string,
    @Param('milestoneId', ParseUUIDPipe)
    milestoneId: string,
    @Body()
    dto: ReorderItemsDto,
  ) {
    return this.tasks.reorderTasks(workspaceId, applicationId, milestoneId, dto, request.user.id);
  }

  @Delete('tasks/:taskId')
  @WorkspaceRoles(...WRITE_ROLES)
  async deleteTask(
    @Req()
    request: AuthenticatedRequest,
    @Param('workspaceId', ParseUUIDPipe)
    workspaceId: string,
    @Param('applicationId', ParseUUIDPipe)
    applicationId: string,
    @Param('taskId', ParseUUIDPipe)
    taskId: string,
  ) {
    await this.tasks.deleteTask(workspaceId, applicationId, taskId, request.user.id);

    return {
      message: 'Task deleted',
    };
  }

  @Get('blockers')
  listBlockers(
    @Param('workspaceId', ParseUUIDPipe)
    workspaceId: string,
    @Param('applicationId', ParseUUIDPipe)
    applicationId: string,
    @Query()
    query: BlockerQueryDto,
  ) {
    return this.blockers.listBlockers(workspaceId, applicationId, query);
  }

  @Post('blockers')
  @WorkspaceRoles(...WRITE_ROLES)
  createBlocker(
    @Req()
    request: AuthenticatedRequest,
    @Param('workspaceId', ParseUUIDPipe)
    workspaceId: string,
    @Param('applicationId', ParseUUIDPipe)
    applicationId: string,
    @Body()
    dto: CreateBlockerDto,
  ) {
    return this.blockers.createBlocker(workspaceId, applicationId, dto, request.user.id);
  }

  @Patch('blockers/:blockerId')
  @WorkspaceRoles(...WRITE_ROLES)
  updateBlocker(
    @Req()
    request: AuthenticatedRequest,
    @Param('workspaceId', ParseUUIDPipe)
    workspaceId: string,
    @Param('applicationId', ParseUUIDPipe)
    applicationId: string,
    @Param('blockerId', ParseUUIDPipe)
    blockerId: string,
    @Body()
    dto: UpdateBlockerDto,
  ) {
    return this.blockers.updateBlocker(workspaceId, applicationId, blockerId, dto, request.user.id);
  }

  @Post('blockers/:blockerId/resolve')
  @WorkspaceRoles(...WRITE_ROLES)
  resolveBlocker(
    @Req()
    request: AuthenticatedRequest,
    @Param('workspaceId', ParseUUIDPipe)
    workspaceId: string,
    @Param('applicationId', ParseUUIDPipe)
    applicationId: string,
    @Param('blockerId', ParseUUIDPipe)
    blockerId: string,
    @Body()
    dto: ResolveBlockerDto,
  ) {
    return this.blockers.resolveBlocker(workspaceId, applicationId, blockerId, dto, request.user.id);
  }

  @Post('blockers/:blockerId/reopen')
  @WorkspaceRoles(...WRITE_ROLES)
  reopenBlocker(
    @Req()
    request: AuthenticatedRequest,
    @Param('workspaceId', ParseUUIDPipe)
    workspaceId: string,
    @Param('applicationId', ParseUUIDPipe)
    applicationId: string,
    @Param('blockerId', ParseUUIDPipe)
    blockerId: string,
  ) {
    return this.blockers.reopenBlocker(workspaceId, applicationId, blockerId, request.user.id);
  }

  @Delete('blockers/:blockerId')
  @WorkspaceRoles(...WRITE_ROLES)
  async deleteBlocker(
    @Req()
    request: AuthenticatedRequest,
    @Param('workspaceId', ParseUUIDPipe)
    workspaceId: string,
    @Param('applicationId', ParseUUIDPipe)
    applicationId: string,
    @Param('blockerId', ParseUUIDPipe)
    blockerId: string,
  ) {
    await this.blockers.deleteBlocker(workspaceId, applicationId, blockerId, request.user.id);

    return {
      message: 'Blocker deleted',
    };
  }
}
