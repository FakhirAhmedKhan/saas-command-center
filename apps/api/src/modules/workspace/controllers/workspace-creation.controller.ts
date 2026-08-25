import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CreateWorkspaceDto } from '../dto/create-workspace.dto';
import { WorkspaceCreationService } from '../service/workspace-creation.service';
import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { FastifyRequest } from 'fastify';

interface AuthenticatedRequest extends FastifyRequest {
  user: {
    id: string;
    email?: string;
  };
}

@ApiTags('Workspaces')
@ApiBearerAuth('access-token')
@Controller('workspaces')
@UseGuards(JwtAuthGuard)
export class WorkspaceCreationController {
  constructor(private readonly workspaceCreationService: WorkspaceCreationService) {}

  @Post()
  @ApiOperation({
    summary: 'Create another workspace',
    description: 'Creates a workspace and assigns the authenticated user as its owner.',
  })
  create(
    @Req()
    request: AuthenticatedRequest,

    @Body()
    dto: CreateWorkspaceDto,
  ) {
    return this.workspaceCreationService.createForUser(request.user.id, dto);
  }
}
