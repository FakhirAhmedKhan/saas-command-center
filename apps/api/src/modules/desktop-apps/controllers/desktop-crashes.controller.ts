import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { WorkspaceAccessGuard } from '../../workspace/guards/workspace-access.guard';
import { WorkspaceRolesGuard } from '../../workspace/guards/workspace-roles.guard';
import { DesktopRuntimeQueryDto } from '../dto/desktop-runtime.dto';
import { DesktopCrashesService } from '../services/desktop-crashes.service';
import { Controller, Get, Param, ParseUUIDPipe, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

@ApiTags('Desktop Crashes')
@ApiBearerAuth('access-token')
@Controller('workspaces/:workspaceId/desktop-apps/:desktopAppId/crashes')
@UseGuards(JwtAuthGuard, WorkspaceAccessGuard, WorkspaceRolesGuard)
export class DesktopCrashesController {
  constructor(private readonly service: DesktopCrashesService) {}

  @Get()
  list(@Param('workspaceId', ParseUUIDPipe) workspaceId: string, @Param('desktopAppId', ParseUUIDPipe) desktopAppId: string, @Query() query: DesktopRuntimeQueryDto) {
    return this.service.list(workspaceId, desktopAppId, query);
  }

  @Get(':crashId')
  findOne(@Param('workspaceId', ParseUUIDPipe) workspaceId: string, @Param('desktopAppId', ParseUUIDPipe) desktopAppId: string, @Param('crashId', ParseUUIDPipe) crashId: string) {
    return this.service.findOne(workspaceId, desktopAppId, crashId);
  }
}
