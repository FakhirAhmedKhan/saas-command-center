import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { WorkspaceAccessGuard } from '../../workspace/guards/workspace-access.guard';
import { DesktopProjectDetectionService } from '../services/desktop-project-detection.service';
import { Controller, Param, ParseUUIDPipe, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

@ApiTags('Desktop Project Detection')
@ApiBearerAuth('access-token')
@Controller('workspaces/:workspaceId/desktop-apps/:desktopAppId')
@UseGuards(JwtAuthGuard, WorkspaceAccessGuard)
export class DesktopProjectDetectionController {
  constructor(private readonly service: DesktopProjectDetectionService) {}

  @Post('detect')
  @ApiOperation({
    summary: 'Detect desktop project configuration from the linked repository',
  })
  detect(
    @Param('workspaceId', ParseUUIDPipe)
    workspaceId: string,

    @Param('desktopAppId', ParseUUIDPipe)
    desktopAppId: string,
  ) {
    return this.service.detect(workspaceId, desktopAppId);
  }
}
