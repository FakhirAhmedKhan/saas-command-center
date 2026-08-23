import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { WorkspaceAccessGuard } from '../../workspace/guards/workspace-access.guard';
import { MobileProjectDetectionService } from '../services/mobile-project-detection.service';
import { Controller, Param, ParseUUIDPipe, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

@ApiTags('Mobile Project Detection')
@ApiBearerAuth('access-token')
@Controller('workspaces/:workspaceId/mobile-apps/:mobileAppId')
@UseGuards(JwtAuthGuard, WorkspaceAccessGuard)
export class MobileProjectDetectionController {
  constructor(private readonly service: MobileProjectDetectionService) {}

  @Post('detect')
  @ApiOperation({
    summary: 'Detect mobile project configuration from linked repository',
  })
  detect(
    @Param('workspaceId', ParseUUIDPipe)
    workspaceId: string,

    @Param('mobileAppId', ParseUUIDPipe)
    mobileAppId: string,
  ) {
    return this.service.detect(workspaceId, mobileAppId);
  }
}
