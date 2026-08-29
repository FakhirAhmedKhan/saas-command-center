import { ConfirmWorkspaceBlueprintDto } from './dto/confirm-workspace-blueprint.dto';
import { UpdateOnboardingAnswersDto } from './dto/update-onboarding-answers.dto';
import { UpdateWorkspaceBlueprintDto } from './dto/update-workspace-blueprint.dto';
import { GuidedWorkspaceBuilderEnabledGuard } from './security/guided-workspace-builder-enabled.guard';
import { WorkspaceBlueprintService } from './workspace-blueprint.service';
import { WorkspaceOnboardingCreationService } from './workspace-onboarding-creation.service';
import { WorkspaceOnboardingService } from './workspace-onboarding.service';
import { SharedRateLimit } from '../../common/rate-limit/shared-rate-limit.decorator';
import { SharedRateLimitGuard } from '../../common/rate-limit/shared-rate-limit.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { RequestWithUser } from '../auth/interfaces/request-with-user.interface';
import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Patch, Post, Req, UseGuards } from '@nestjs/common';
import type { FastifyRequest } from 'fastify';

type AuthenticatedRequest = FastifyRequest & RequestWithUser;

@Controller('workspace-onboarding/sessions')
@UseGuards(JwtAuthGuard, GuidedWorkspaceBuilderEnabledGuard, SharedRateLimitGuard)
export class WorkspaceOnboardingController {
  constructor(
    private readonly sessions: WorkspaceOnboardingService,
    private readonly blueprints: WorkspaceBlueprintService,
    private readonly creation: WorkspaceOnboardingCreationService,
  ) {}

  @Post()
  @SharedRateLimit({
    scope: 'workspace-onboarding-create',
    limit: 10,
    windowSeconds: 60,
  })
  create(@Req() request: AuthenticatedRequest) {
    return this.sessions.create(request.user.id);
  }

  @Get(':id')
  get(@Param('id', ParseUUIDPipe) id: string, @Req() request: AuthenticatedRequest) {
    return this.sessions.get(id, request.user.id);
  }

  @Get(':id/questions')
  questions(@Param('id', ParseUUIDPipe) id: string, @Req() request: AuthenticatedRequest) {
    return this.sessions.questions(id, request.user.id);
  }

  @Patch(':id/answers')
  @SharedRateLimit({
    scope: 'workspace-onboarding-answers',
    limit: 60,
    windowSeconds: 60,
  })
  updateAnswers(@Param('id', ParseUUIDPipe) id: string, @Body() input: unknown, @Req() request: AuthenticatedRequest) {
    const body = UpdateOnboardingAnswersDto.parse(input);

    return this.sessions.updateAnswers(id, request.user.id, body.answers);
  }

  @Post(':id/blueprint')
  @SharedRateLimit({
    scope: 'workspace-onboarding-blueprint',
    limit: 10,
    windowSeconds: 60,
  })
  generateBlueprint(@Param('id', ParseUUIDPipe) id: string, @Req() request: AuthenticatedRequest) {
    return this.sessions.generateBlueprint(id, request.user.id);
  }

  @Patch(':id/blueprint')
  updateBlueprint(@Param('id', ParseUUIDPipe) id: string, @Body() input: unknown, @Req() request: AuthenticatedRequest) {
    return this.blueprints.updateOwned(id, request.user.id, UpdateWorkspaceBlueprintDto.parse(input));
  }

  @Post(':id/validate')
  @HttpCode(HttpStatus.OK)
  validateBlueprint(@Param('id', ParseUUIDPipe) id: string, @Req() request: AuthenticatedRequest) {
    return this.blueprints.validateOwned(id, request.user.id);
  }

  @Post(':id/confirm')
  @SharedRateLimit({
    scope: 'workspace-onboarding-confirm',
    limit: 5,
    windowSeconds: 60,
  })
  confirm(@Param('id', ParseUUIDPipe) id: string, @Body() input: unknown, @Req() request: AuthenticatedRequest) {
    return this.creation.confirm(id, request.user.id, ConfirmWorkspaceBlueprintDto.parse(input));
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id', ParseUUIDPipe) id: string, @Req() request: AuthenticatedRequest) {
    await this.sessions.delete(id, request.user.id);
  }
}
