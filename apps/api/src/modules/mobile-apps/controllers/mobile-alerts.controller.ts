import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { WorkspaceRoles } from '../../workspace/decorators/workspace-roles.decorator';
import { WorkspaceAccessGuard } from '../../workspace/guards/workspace-access.guard';
import { WorkspaceRolesGuard } from '../../workspace/guards/workspace-roles.guard';
import { CreateMobileAlertRuleDto, UpdateMobileAlertRuleDto } from '../dto/mobile-alert.dto';
import { MobileAlertsService } from '../services/mobile-alerts.service';
import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { WorkspaceRole } from 'src/generated/prisma/enums';

@ApiTags('Mobile Alerts')
@ApiBearerAuth('access-token')
@Controller('workspaces/:workspaceId/mobile-apps/:mobileAppId/alerts')
@UseGuards(JwtAuthGuard, WorkspaceAccessGuard, WorkspaceRolesGuard)
export class MobileAlertsController {
  constructor(private readonly service: MobileAlertsService) {}

  @Get('rules')
  rules(
    @Param('workspaceId', ParseUUIDPipe)
    workspaceId: string,

    @Param('mobileAppId', ParseUUIDPipe)
    mobileAppId: string,
  ) {
    return this.service.listRules(workspaceId, mobileAppId);
  }

  @Post('rules')
  @WorkspaceRoles(WorkspaceRole.OWNER, WorkspaceRole.ADMIN, WorkspaceRole.DEVELOPER)
  createRule(
    @Param('workspaceId', ParseUUIDPipe)
    workspaceId: string,

    @Param('mobileAppId', ParseUUIDPipe)
    mobileAppId: string,

    @Body()
    dto: CreateMobileAlertRuleDto,
  ) {
    return this.service.createRule(workspaceId, mobileAppId, dto);
  }

  @Patch('rules/:ruleId')
  @WorkspaceRoles(WorkspaceRole.OWNER, WorkspaceRole.ADMIN, WorkspaceRole.DEVELOPER)
  updateRule(
    @Param('workspaceId', ParseUUIDPipe)
    workspaceId: string,

    @Param('mobileAppId', ParseUUIDPipe)
    mobileAppId: string,

    @Param('ruleId', ParseUUIDPipe)
    ruleId: string,

    @Body()
    dto: UpdateMobileAlertRuleDto,
  ) {
    return this.service.updateRule(workspaceId, mobileAppId, ruleId, dto);
  }

  @Delete('rules/:ruleId')
  @WorkspaceRoles(WorkspaceRole.OWNER, WorkspaceRole.ADMIN)
  deleteRule(
    @Param('workspaceId', ParseUUIDPipe)
    workspaceId: string,

    @Param('mobileAppId', ParseUUIDPipe)
    mobileAppId: string,

    @Param('ruleId', ParseUUIDPipe)
    ruleId: string,
  ) {
    return this.service.deleteRule(workspaceId, mobileAppId, ruleId);
  }

  @Get('incidents')
  incidents(
    @Param('workspaceId', ParseUUIDPipe)
    workspaceId: string,

    @Param('mobileAppId', ParseUUIDPipe)
    mobileAppId: string,
  ) {
    return this.service.listIncidents(workspaceId, mobileAppId);
  }

  @Post('evaluate')
  @WorkspaceRoles(WorkspaceRole.OWNER, WorkspaceRole.ADMIN, WorkspaceRole.DEVELOPER)
  evaluate(
    @Param('workspaceId', ParseUUIDPipe)
    workspaceId: string,

    @Param('mobileAppId', ParseUUIDPipe)
    mobileAppId: string,
  ) {
    return this.service.evaluateApp(workspaceId, mobileAppId);
  }
}
