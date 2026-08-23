import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { WorkspaceRoles } from '../../workspace/decorators/workspace-roles.decorator';
import { WorkspaceAccessGuard } from '../../workspace/guards/workspace-access.guard';
import { WorkspaceRolesGuard } from '../../workspace/guards/workspace-roles.guard';
import { AnalyzeDesktopAppDto } from '../dto/desktop-analysis.dto';
import { DesktopAnalysisService } from '../services/desktop-analysis.service';
import { Body, Controller, Param, ParseUUIDPipe, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { WorkspaceRole } from 'src/generated/prisma/enums';

interface AuthenticatedRequest extends Request {
  user: { id: string };
}

@ApiTags('Desktop AI Analysis')
@ApiBearerAuth('access-token')
@Controller('workspaces/:workspaceId/desktop-apps/:desktopAppId/analysis')
@UseGuards(JwtAuthGuard, WorkspaceAccessGuard, WorkspaceRolesGuard)
export class DesktopAnalysisController {
  constructor(private readonly service: DesktopAnalysisService) {}

  @Post()
  @WorkspaceRoles(WorkspaceRole.OWNER, WorkspaceRole.ADMIN, WorkspaceRole.DEVELOPER)
  analyze(
    @Param('workspaceId', ParseUUIDPipe) workspaceId: string,
    @Param('desktopAppId', ParseUUIDPipe) desktopAppId: string,
    @Req() request: AuthenticatedRequest,
    @Body() dto: AnalyzeDesktopAppDto,
  ) {
    return this.service.analyze(workspaceId, desktopAppId, request.user.id, dto);
  }
}