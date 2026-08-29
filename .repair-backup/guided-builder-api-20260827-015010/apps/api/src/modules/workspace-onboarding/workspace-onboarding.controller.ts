import type { FastifyRequest } from 'fastify';
import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Req } from '@nestjs/common';
import type { RequestWithUser } from '../auth/interfaces/request-with-user.interface';
import { UpdateOnboardingAnswersDto } from './dto/update-onboarding-answers.dto';
import { WorkspaceOnboardingService } from './workspace-onboarding.service';

type AuthenticatedRequest = FastifyRequest & RequestWithUser;

@Controller('workspace-onboarding/sessions')
export class WorkspaceOnboardingController {
  constructor(private readonly service: WorkspaceOnboardingService) {}

  @Post()
  create(@Req() request: AuthenticatedRequest) {
    return this.service.create(request.user.id);
  }

  @Get(':id')
  get(@Param('id') id: string, @Req() request: AuthenticatedRequest) {
    return this.service.get(id, request.user.id);
  }

  @Patch(':id/answers')
  updateAnswers(@Param('id') id: string, @Body() input: unknown, @Req() request: AuthenticatedRequest) {
    const body = UpdateOnboardingAnswersDto.parse(input);
    return this.service.updateAnswers(id, request.user.id, body.answers);
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(@Param('id') id: string, @Req() request: AuthenticatedRequest) {
    await this.service.delete(id, request.user.id);
  }
}
