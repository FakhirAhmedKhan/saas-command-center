import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { WorkspaceRoles } from '../../workspace/decorators/workspace-roles.decorator';
import { WorkspaceAccessGuard } from '../../workspace/guards/workspace-access.guard';
import { WorkspaceRolesGuard } from '../../workspace/guards/workspace-roles.guard';
import { CreateDesktopAlertRuleDto, UpdateDesktopAlertRuleDto } from '../dto/desktop-alert.dto';
import { DesktopAlertsService } from '../services/desktop-alerts.service';
import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { WorkspaceRole } from 'src/generated/prisma/enums';

@ApiTags('Desktop Alerts')
@ApiBearerAuth('access-token')
@Controller('workspaces/:workspaceId/desktop-apps/:desktopAppId/alerts')
@UseGuards(JwtAuthGuard, WorkspaceAccessGuard, WorkspaceRolesGuard)
export class DesktopAlertsController {
  constructor(private readonly service: DesktopAlertsService) {}

  @Get('rules')
  rules(@Param('workspaceId', ParseUUIDPipe) workspaceId: string, @Param('desktopAppId', ParseUUIDPipe) desktopAppId: string) {
    return this.service.listRules(workspaceId, desktopAppId);
  }

  @Post('rules')
  @WorkspaceRoles(WorkspaceRole.OWNER, WorkspaceRole.ADMIN, WorkspaceRole.DEVELOPER)
  createRule(
    @Param('workspaceId', ParseUUIDPipe) workspaceId: string,
    @Param('desktopAppId', ParseUUIDPipe) desktopAppId: string,
    @Body() dto: CreateDesktopAlertRuleDto,
  ) {
    return this.service.createRule(workspaceId, desktopAppId, dto);
  }

  @Patch('rules/:ruleId')
  @WorkspaceRoles(WorkspaceRole.OWNER, WorkspaceRole.ADMIN, WorkspaceRole.DEVELOPER)
  updateRule(
    @Param('workspaceId', ParseUUIDPipe) workspaceId: string,
    @Param('desktopAppId', ParseUUIDPipe) desktopAppId: string,
    @Param('ruleId', ParseUUIDPipe) ruleId: string,
    @Body() dto: UpdateDesktopAlertRuleDto,
  ) {
    return this.service.updateRule(workspaceId, desktopAppId, ruleId, dto);
  }

  @Delete('rules/:ruleId')
  @WorkspaceRoles(WorkspaceRole.OWNER, WorkspaceRole.ADMIN)
  deleteRule(
    @Param('workspaceId', ParseUUIDPipe) workspaceId: string,
    @Param('desktopAppId', ParseUUIDPipe) desktopAppId: string,
    @Param('ruleId', ParseUUIDPipe) ruleId: string,
  ) {
    return this.service.deleteRule(workspaceId, desktopAppId, ruleId);
  }

  @Get('incidents')
  incidents(@Param('workspaceId', ParseUUIDPipe) workspaceId: string, @Param('desktopAppId', ParseUUIDPipe) desktopAppId: string) {
    return this.service.listIncidents(workspaceId, desktopAppId);
  }

  @Post('evaluate')
  @WorkspaceRoles(WorkspaceRole.OWNER, WorkspaceRole.ADMIN, WorkspaceRole.DEVELOPER)
  evaluate(@Param('workspaceId', ParseUUIDPipe) workspaceId: string, @Param('desktopAppId', ParseUUIDPipe) desktopAppId: string) {
    return this.service.evaluateApp(workspaceId, desktopAppId);
  }
}
