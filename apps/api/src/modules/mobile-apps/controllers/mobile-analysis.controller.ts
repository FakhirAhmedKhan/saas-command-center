import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { WorkspaceRoles } from '../../workspace/decorators/workspace-roles.decorator';
import { WorkspaceAccessGuard } from '../../workspace/guards/workspace-access.guard';
import { WorkspaceRolesGuard } from '../../workspace/guards/workspace-roles.guard';
import { AnalyzeMobileAppDto } from '../dto/mobile-analysis.dto';
import { MobileAnalysisService } from '../services/mobile-analysis.service';
import { Body, Controller, Param, ParseUUIDPipe, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { FastifyRequest } from 'fastify';
import { WorkspaceRole } from 'src/generated/prisma/enums';

interface AuthenticatedRequest extends FastifyRequest {
  user: {
    id: string;
  };
}

@ApiTags('Mobile AI Analysis')
@ApiBearerAuth('access-token')
@Controller('workspaces/:workspaceId/mobile-apps/:mobileAppId/analysis')
@UseGuards(JwtAuthGuard, WorkspaceAccessGuard, WorkspaceRolesGuard)
export class MobileAnalysisController {
  constructor(private readonly service: MobileAnalysisService) {}

  @Post()
  @WorkspaceRoles(WorkspaceRole.OWNER, WorkspaceRole.ADMIN, WorkspaceRole.DEVELOPER)
  analyze(
    @Param('workspaceId', ParseUUIDPipe)
    workspaceId: string,

    @Param('mobileAppId', ParseUUIDPipe)
    mobileAppId: string,

    @Req()
    request: AuthenticatedRequest,

    @Body()
    dto: AnalyzeMobileAppDto,
  ) {
    return this.service.analyze(workspaceId, mobileAppId, request.user.id, dto);
  }
}
